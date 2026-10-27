import { scoreCueDirections } from './cue';
import { PoseClassifier, measurePose, type Landmark } from '../../capture/src/classifier.js';

export type Frame = {t:number;lm: Array<Landmark | number[]> | null};
export type Fixture = {version?:number;calibration?:{guardThreshold:number|null;guardMetric?:string};frames:Frame[]};
export type Labels = {
  version?:number; label_source?:'key'|'cue'; onset_verified?:boolean; labeller?:string;
  events?:Array<{t?:number;t_ms?:number;event?:string;type?:string;side?:string}>;
  intervals?:Array<{start:number;end:number;event?:string;type?:string}>;
};
export type ScoredEvent = {event:string;t:number};
export function normalizeLandmarks(raw: Frame['lm']): Landmark[] {
  return (raw ?? []).map(p => Array.isArray(p) ? {x:p[0]!,y:p[1]!,z:p[2],visibility:p[3]} : p);
}
export function replayFixture(fixture:Fixture, guardThreshold = fixture.calibration?.guardThreshold ?? -1.01) {
  const classifier=new PoseClassifier({guardThreshold});
  const events:ScoredEvent[]=[];
  const states:Array<{t:number;guard:boolean;lean:'L'|'R'|null;valid:boolean}>=[];
  let previous={guard:false,lean:null as 'L'|'R'|null};
  for(const frame of fixture.frames) {
    const result=classifier.update(normalizeLandmarks(frame.lm),frame.t);
    const {guard,lean}=result.state;
    if(guard!==previous.guard) events.push({event:`guard_${guard?'on':'off'}`,t:frame.t});
    for(const side of ['L','R'] as const) {
      if((lean===side)!==(previous.lean===side)) events.push({event:`lean_${side}_${lean===side?'on':'off'}`,t:frame.t});
    }
    for(const punch of result.punches) events.push({event:punch.side==='L'?'left_punch':'right_punch',t:punch.at});
    previous={guard,lean}; states.push({t:frame.t,guard,lean,valid:result.metrics!==null});
  }
  return {events,states};
}
/** One prediction can match only one label; matching never changes the150ms gate. */
export function scoreEvents(predicted:ScoredEvent[],expected:ScoredEvent[],toleranceMs=150) {
  const remaining=new Set(predicted.map((_,i)=>i));
  let matched=0;
  const matches:Array<{expected:ScoredEvent;predicted:ScoredEvent;delta:number}>=[];
  for(const label of [...expected].sort((a,b)=>a.t-b.t)) {
    const candidates=[...remaining].filter(i=>predicted[i]!.event===label.event && Math.abs(predicted[i]!.t-label.t)<=toleranceMs);
    // Earliest feasible prediction preserves later matches when tolerance windows overlap.
    candidates.sort((a,b)=>predicted[a]!.t-predicted[b]!.t);
    const index=candidates[0];
    if(index!==undefined) {remaining.delete(index);matched++;matches.push({expected:label,predicted:predicted[index]!,delta:predicted[index]!.t-label.t});}
  }
  return {expected:expected.length,predicted:predicted.length,matched,
    recall:expected.length?matched/expected.length:1,precision:predicted.length?matched/predicted.length:0,matches};
}
export function expectedRecordedEvents(labels:Labels):ScoredEvent[] {
  return [
    ...(labels.intervals??[]).flatMap(interval=> interval.event ? [
      {event:`${interval.event}_on`,t:interval.start}, {event:`${interval.event}_off`,t:interval.end},
    ] : []),
    ...(labels.events??[]).filter(e=>e.event && e.t!==undefined).map(e=>({event:e.event!,t:e.t!})),
  ];
}
export function legacyPunchScore(events:ScoredEvent[],labels:Labels) {
  // Legacy side labels describe image sides, not reliably anatomical wrists; score detection only.
  return scoreEvents(events.filter(e=>e.event.endsWith('_punch')).map(e=>({...e,event:'punch'})),
    (labels.events??[]).filter(e=>['jab','hook','punch'].includes(e.type??'')).map(e=>({event:'punch',t:e.t!})));
}
export function heldIntervalReport(states:ReturnType<typeof replayFixture>['states'],labels:Labels) {
  return (labels.intervals??[]).filter(i=>i.type==='guard').map(interval=>{
    const frames=states.filter(s=>s.t>=interval.start&&s.t<=interval.end);
    return {...interval,frames:frames.length,guardFrames:frames.filter(f=>f.guard).length};
  });
}
export function medianGuard(fixture:Fixture,start:number,end:number) {
  const values=fixture.frames.filter(f=>f.t>=start&&f.t<end).map(f=>measurePose(normalizeLandmarks(f.lm))?.g).filter((v):v is number=>v!==undefined).sort((a,b)=>a-b);
  if(!values.length) throw new Error('Calibration window has no usable landmarks');
  return values[Math.floor(values.length/2)]!;
}

export type PunchGate = {minRecall:number;minPrecision:number};
export function scoreRecordedFixture(fixture:Fixture,labels:Labels,punchGate?:PunchGate) {
  if(labels.version!==1) throw new Error('Expected recorder labels version1; legacy cues need their separate report');
  if(!Number.isFinite(fixture.calibration?.guardThreshold)) throw new Error('Recording is missing its calibrated guard threshold');
  if(!fixture.frames.length) throw new Error('Recording has no observed frames');
  const replay=replayFixture(fixture);
  const first=fixture.frames[0]!.t;
  const last=fixture.frames[fixture.frames.length-1]!.t;
  const isDefence=(event:ScoredEvent)=>event.event.startsWith('guard_')||event.event.startsWith('lean_');
  const rawExpected=expectedRecordedEvents(labels);
  // Recorder stop closes held intervals after the last camera frame. Such releases
  // cannot be inferred from landmarks; report them without inventing an off frame.
  const notScored=rawExpected.filter(e=>isDefence(e)&&(e.t<first||e.t>last)).map(e=>({...e,reason:'Interval boundary outside observed frame horizon'}));
  const expected=rawExpected.filter(e=>!isDefence(e)||(e.t>=first&&e.t<=last));
  const names=[...new Set([...expected,...replay.events].map(e=>e.event))];
  const perEvent=Object.fromEntries(names.map(event=>[event,scoreEvents(replay.events.filter(e=>e.event===event),expected.filter(e=>e.event===event))]));
  const overall=scoreEvents(replay.events,expected);
  const defence=scoreEvents(replay.events.filter(isDefence),expected.filter(isDefence));
  const punches=scoreEvents(replay.events.filter(e=>e.event.endsWith('_punch')),expected.filter(e=>e.event.endsWith('_punch')));
  const defenceLabelsMatched=defence.matched===defence.expected;
  const cue=labels.label_source==='cue'?scoreCueDirections(replay,labels):null;
  const gate=punchGate?{...punchGate,pass:punches.recall>=punchGate.minRecall&&punches.precision>=punchGate.minPrecision}:null;
  return {labelSource:labels.label_source??'key',onsetVerified:labels.onset_verified??null,cue,toleranceMs:150,observedHorizon:{first,last},notScored,overall,perEvent,defence,punches,
    allLabelsMatched:overall.matched===overall.expected,defenceLabelsMatched,punchGate:gate,
    strictTimingAcceptancePass:defenceLabelsMatched&&(gate?.pass??true),
    acceptancePass:(cue?cue.pass:defenceLabelsMatched)&&(gate?.pass??true)};
}
