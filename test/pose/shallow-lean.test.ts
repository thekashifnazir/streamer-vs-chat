import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEAN_THRESHOLD_FRACTION, leanThresholdsFromPeaks, PoseClassifier, type Landmark, type LeanThresholds } from '../../capture/src/classifier';
import { normalizeLandmarks, replayFixture, type Fixture } from './replay';

// Kash's 31 Oct calibration clip, replayed from recorded landmarks (see the fixture's provenance).
type Segment = {name:string;from:number;to:number;lean?:'L'|'R';guard?:boolean};
type Recorded = {at:number;clip:number;landmarks:[number,number,number,number][]};
const fixture=JSON.parse(readFileSync(new URL('../fixtures/kash-shallow-leans.frames.json',import.meta.url),'utf8')) as {
  calibration:{guardThreshold:number;guardReleaseBand:number;guardMedians:{neutral:number;resting:number;guard:number};neutralSwayP95:number;leanFloor:number;leanPeaks:LeanThresholds};
  segments:Record<'quiet'|'shallow',{labels:Segment[];frames:Recorded[]}>;
};
const {leanPeaks,leanFloor,...guardCalibration}=fixture.calibration;

function replay(frames:Recorded[],leanThresholds:LeanThresholds) {
  const classifier=new PoseClassifier({...guardCalibration,leanThresholds});
  return frames.map(({at,clip,landmarks})=>{
    const {state,metrics}=classifier.update(landmarks.map(([x,y,z,visibility]):Landmark=>({x,y,z,visibility})),at);
    return {at,clip,lean:state.lean,guard:state.guard,tilt:metrics?.tilt??null};
  });
}
function scoreShallow(leanThresholds:LeanThresholds) {
  const states=replay(fixture.segments.shallow.frames,leanThresholds);
  return fixture.segments.shallow.labels.map(segment=>{
    const sign=segment.lean==='L'?1:-1;
    const window=states.filter(s=>s.clip>=segment.from-1&&s.clip<segment.to+.3);
    const onset=window.find(s=>s.tilt!==null&&sign*s.tilt>=.15);
    const registered=window.find(s=>s.clip>=segment.from-.5&&s.lean===segment.lean);
    const wrongSide=window.filter(s=>s.clip>=segment.from&&s.clip<segment.to&&s.lean!==null&&s.lean!==segment.lean).length;
    return {name:segment.name,hit:registered!==undefined,latency:registered&&onset?registered.at-onset.at:null,wrongSide};
  });
}

describe('recorded shallow leans (owner calibration clip, 31 Oct)',()=>{
  const thresholds=leanThresholdsFromPeaks(leanPeaks,leanFloor);

  it('registers all six shallow leans on the correct side at the calibrated fraction',()=>{
    expect(LEAN_THRESHOLD_FRACTION).toBe(.48);
    const results=scoreShallow(thresholds);
    expect(results.map(r=>[r.name,r.hit])).toEqual(fixture.segments.shallow.labels.map(s=>[s.name,true]));
    expect(results.every(r=>r.wrongSide===0)).toBe(true);
  });

  it('the previous 60% fraction misses several of the same leans and registers the rest later',()=>{
    const old=scoreShallow({L:Math.max(leanFloor,.6*leanPeaks.L),R:Math.max(leanFloor,.6*leanPeaks.R)});
    const now=scoreShallow(thresholds);
    expect(old.filter(r=>r.hit).length).toBeLessThanOrEqual(4);
    // Movement onset (|tilt| >= 0.15) to registration on the leans both settings catch:
    // 570/466/533 ms before, ~100 ms sooner now (the dwell part depends on frame rate).
    const both=old.filter(r=>r.hit&&r.latency!==null);
    expect(both.length).toBeGreaterThanOrEqual(3);
    for(const before of both) {
      const after=now.find(r=>r.name===before.name)!;
      expect(after.latency).not.toBeNull();
      expect(after.latency!).toBeLessThanOrEqual(before.latency!-60);
    }
  });

  it('never leans while relaxed, at the waist or holding guard upright, and guard is unchanged',()=>{
    const states=replay(fixture.segments.quiet.frames,thresholds);
    expect(states.filter(s=>s.lean!==null)).toEqual([]);
    for(const segment of fixture.segments.quiet.labels) {
      const inside=states.filter(s=>s.clip>=segment.from+.3&&s.clip<segment.to-.3);
      expect(inside.length).toBeGreaterThan(60);
      expect(inside.filter(s=>s.guard!==segment.guard)).toEqual([]);
    }
  });
});

describe('false-lean guards for the lower fraction and shorter dwell',()=>{
  const lmFrames=(fixturePath:string)=>JSON.parse(readFileSync(new URL(fixturePath,import.meta.url),'utf8')) as Fixture;

  it("Kash's recorded jabs (27 Oct webcam) never register a lean at thresholds from his 31 Oct peaks",()=>{
    // At 46% of these peaks one jab registered as a lean; 48% leaves a step of margin.
    const recording=lmFrames('../fixtures/kash-webcam.landmarks.json');
    const labels=JSON.parse(readFileSync(new URL('../fixtures/kash-webcam.labels.json',import.meta.url),'utf8')) as {events:{t_ms:number;type:string}[]};
    const classifier=new PoseClassifier({guardThreshold:-1.01,leanThresholds:leanThresholdsFromPeaks(leanPeaks,leanFloor)});
    const states=recording.frames.map(frame=>({t:frame.t,lean:classifier.update(normalizeLandmarks(frame.lm),frame.t).state.lean}));
    const quiet=labels.events.flatMap((event,i)=>['neutral','guard','guard_drop','jabs','angled_jabs'].includes(event.type)
      ?[{type:event.type,from:event.t_ms+1000,to:labels.events[i+1]!.t_ms-500}]:[]);
    expect(quiet.filter(w=>w.type.endsWith('jabs'))).toHaveLength(3);
    for(const window of quiet) expect(states.filter(s=>s.t>=window.from&&s.t<window.to&&s.lean!==null)).toEqual([]);
  });

  it('Pexels punch clips produce no more lean episodes than the 200 ms dwell did',()=>{
    // Baseline at 200 ms with the default 0.5 thresholds. A 150 ms (or shorter) dwell adds brief
    // torso-twist leans during punches in 5752495 and 6296572; 170 ms adds none at 30 or 15 fps.
    const baseline:Record<string,number>={'10988078':0,'4761764':0,'4804855':1,'5752495':0,'6296572':5,'6296644':2,'7187405':1,'7314350':0};
    const directory=new URL('../fixtures/pexels/',import.meta.url);
    const names=readdirSync(directory).filter(name=>name.endsWith('.landmarks.json'));
    expect(names).toHaveLength(8);
    for(const name of names) {
      const {events}=replayFixture(lmFrames(`../fixtures/pexels/${name}`));
      const id=name.replace('.landmarks.json','');
      expect([id,events.filter(e=>/^lean_[LR]_on$/.test(e.event)).length]).toEqual([id,baseline[id]]);
    }
  });
});
