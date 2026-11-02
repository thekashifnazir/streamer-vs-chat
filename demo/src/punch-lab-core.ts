import {GUARD_MIN_ON,measurePose,PoseClassifier,type Landmark,type PoseCalibration} from '../../capture/src/classifier';
import {TRAINER_MOVES,TrainerMoveDetector} from '../../capture/src/trainer-moves';
import {STRAIGHT_PUNCH,type PunchDebug,type PunchThresholds} from '../../capture/src/straight-punch';
/**
 * Punch lab (?lab=punch, offline demo only, not linked): both punch detectors side by side on the live camera, with no fight and
 * no Twitch. Pure session logic here; punch-lab.ts is the page. Boss Fight is PoseClassifier (its straight-punch.ts detector) and
 * Crowd Trainer is TrainerMoveDetector, fed the same frames exactly as demo/src/main.ts feeds them. Nothing leaves the browser.
 */
export type Side='L'|'R';
export type LabEvent={at:number;detector:'boss'|'trainer'|'camera';kind:'punch'|'slip'|'lean'|'guard'|'wrists-out'|'wrists-in';side?:Side};
export type DrillStep={id:string;prompt:string;seconds:number;expected:{L:number;R:number};dodges?:number};
export const DRILL:readonly DrillStep[]=[
 {id:'jab-L',prompt:'Throw 10 LEFT jabs',seconds:25,expected:{L:10,R:0}},
 {id:'jab-R',prompt:'Throw 10 RIGHT crosses (your 2)',seconds:25,expected:{L:0,R:10}},
 {id:'one-two',prompt:'Throw 5 one-twos · left, right',seconds:25,expected:{L:5,R:5}},
 {id:'dodge',prompt:'Dodge left and right 5 times each · don’t punch',seconds:30,expected:{L:0,R:0},dodges:10},
];
/** Without a saved calibration: a 3 s "stand in your guard" hold, instead of the 5-step setup. */
export const LAB_BASELINE_MS=3000;
export const DRILL_READY_MS=3000;
// Guard is not what the lab tunes: from a guard-only hold, ON sits this far under the held guard height and OFF a further band
// below (Kash's 31 Oct calibration: guard 0.87, ON 0.02, band 0.71).
const LAB_GUARD_MARGIN=.85,LAB_GUARD_BAND=.7;
const MAX_FRAMES=36000;// 20 minutes at 30 fps
const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[sorted.length>>1]!;};
export const wristTracked=(p:Landmark|undefined)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&(p.visibility??1)>=.5;
/** A guard-only hold's calibration: lean thresholds stay at the classifier default, floored by the measured sway. */
export function baselineCalibration(samples:readonly {g:number;tilt:number}[]):PoseCalibration{
 const g=median(samples.map(s=>s.g)),tilt=median(samples.map(s=>s.tilt)),sway=[...samples.map(s=>Math.abs(s.tilt-tilt))].sort((a,b)=>a-b);
 return {guardThreshold:Math.max(GUARD_MIN_ON,g-LAB_GUARD_MARGIN),guardReleaseBand:LAB_GUARD_BAND,neutralSwayP95:sway[Math.min(sway.length-1,Math.floor(sway.length*.95))]??0,leanThresholds:{L:.5,R:.5}};
}
type Counts={boss:{L:number;R:number};trainer:{L:number;R:number};leans:{L:number;R:number};slips:{L:number;R:number}};
const zero=():Counts=>({boss:{L:0,R:0},trainer:{L:0,R:0},leans:{L:0,R:0},slips:{L:0,R:0}});
export type DrillResult={step:DrillStep;counts:Counts;from:number;to:number};
export type LabFrame={phase:'baseline'|'live';baselineProgress:number;events:LabEvent[];guard:boolean;lean:Side|null;tilt:number|null;
 boss:PunchDebug|null;trainer:PunchDebug|null;wrists:{L:boolean;R:boolean};drill:DrillView|null};
export type DrillView={index:number;step:DrillStep;phase:'ready'|'go';remainingMs:number;counts:Counts};
export type LabCalibration=PoseCalibration&{punchThresholds?:PunchThresholds|null};
/** `saved`: the player's saved calibration (skips the 3 s baseline). */
export function createPunchLab(options:{saved?:LabCalibration|null}={}){
 const classifier=new PoseClassifier({guardThreshold:0}),trainer=new TrainerMoveDetector();
 let calibration:{source:'saved'|'baseline';settings:LabCalibration}|null=null;
 let baseline:{at:number;g:number;tilt:number}[]=[];
 const frames:{at:number;lm:number[]}[]=[],events:LabEvent[]=[],prompts:{at:number;text:string}[]=[];
 let total=zero(),results:DrillResult[]=[],drill:{index:number;phase:'ready'|'go';at:number;counts:Counts}|null=null;
 let firstAt:number|null=null,lastAt=0,pose={guard:false,lean:null as Side|null},wrists={L:true,R:true};
 function apply(source:'saved'|'baseline',settings:LabCalibration){
  calibration={source,settings};classifier.setCalibration(settings);trainer.setPunchThresholds(settings.punchThresholds??null);trainer.reset();
 }
 if(options.saved)apply('saved',options.saved);
 const prompt=(at:number,text:string)=>{prompts.push({at,text});};
 function advance(at:number){
  if(!drill)return;
  if(drill.phase==='ready'&&at-drill.at>=DRILL_READY_MS){drill={...drill,phase:'go',at};prompt(at,`GO: ${DRILL[drill.index]!.prompt}`);}
  else if(drill.phase==='go'&&at-drill.at>=DRILL[drill.index]!.seconds*1000)finishStep(at);
 }
 function finishStep(at:number){
  if(!drill)return;
  if(drill.phase==='go')results.push({step:DRILL[drill.index]!,counts:drill.counts,from:drill.at,to:at});
  const next=drill.index+1;
  if(next>=DRILL.length){drill=null;prompt(at,'DRILL DONE');return;}
  drill={index:next,phase:'ready',at,counts:zero()};prompt(at,`READY: ${DRILL[next]!.prompt}`);
 }
 function count(event:LabEvent){
  events.push(event);if(!event.side)return;
  const into=(c:Counts)=>{if(event.kind==='punch'&&(event.detector==='boss'||event.detector==='trainer'))c[event.detector][event.side!]++;else if(event.kind==='lean')c.leans[event.side!]++;else if(event.kind==='slip')c.slips[event.side!]++;};
  into(total);if(drill?.phase==='go')into(drill.counts);
 }
 return {
  get calibrationSource(){return calibration?.source??null;},
  get frameCount(){return frames.length;},
  get full(){return frames.length>=MAX_FRAMES;},
  get totals(){return total;},
  get results(){return results;},
  get drilling(){return drill!==null;},
  /** Re-take the 3 s guard baseline (also used when no calibration is saved). */
  rebaseline(){calibration=null;baseline=[];},
  resetCounts(){total=zero();},
  startDrill(at=lastAt){results=[];drill={index:0,phase:'ready',at,counts:zero()};prompt(at,`READY: ${DRILL[0]!.prompt}`);},
  /** Space: end the live step now (or skip the get-ready wait). */
  nextStep(at=lastAt){if(!drill)return;if(drill.phase==='ready'){drill={...drill,phase:'go',at};prompt(at,`GO: ${DRILL[drill.index]!.prompt}`);}else finishStep(at);},
  stopDrill(at=lastAt){if(drill){drill=null;prompt(at,'DRILL STOPPED');}},
  frame(landmarks:Landmark[],at:number):LabFrame{
   firstAt??=at;lastAt=at;
   if(frames.length<MAX_FRAMES)frames.push({at,lm:landmarks.flatMap(p=>[p.x,p.y,p.z??0,p.visibility??1])});
   const out:LabEvent[]=[],emit=(event:LabEvent)=>{out.push(event);count(event);};
   const next={L:wristTracked(landmarks[15]),R:wristTracked(landmarks[16])};
   for(const side of ['L','R'] as const)if(next[side]!==wrists[side])emit({at,detector:'camera',kind:next[side]?'wrists-in':'wrists-out',side});
   wrists=next;
   const metrics=measurePose(landmarks);
   if(!calibration){
    if(metrics)baseline.push({at,g:metrics.g,tilt:metrics.tilt});
    // A held guard: only frames from the last unbroken run of tracked frames count.
    else baseline=[];
    if(baseline.length&&at-baseline[0]!.at>=LAB_BASELINE_MS&&baseline.length>=10)apply('baseline',baselineCalibration(baseline));
    else{classifier.update(landmarks,at);trainer.update(landmarks,at);
     return {phase:'baseline',baselineProgress:baseline.length?Math.min(1,(at-baseline[0]!.at)/LAB_BASELINE_MS):0,events:out,guard:false,lean:null,tilt:metrics?.tilt??null,boss:null,trainer:null,wrists,drill:null};}
   }
   advance(at);
   const result=classifier.update(landmarks,at),moves=trainer.update(landmarks,at);
   for(const punch of result.punches)emit({at,detector:'boss',kind:'punch',side:punch.side});
   for(const punch of moves.punches)emit({at,detector:'trainer',kind:'punch',side:punch.side});
   for(const slip of moves.slips)emit({at,detector:'trainer',kind:'slip',side:slip.side});
   if(result.state.lean&&result.state.lean!==pose.lean)emit({at,detector:'boss',kind:'lean',side:result.state.lean});
   if(result.state.guard&&!pose.guard)emit({at,detector:'boss',kind:'guard'});
   pose={guard:result.state.guard,lean:result.state.lean};
   const view:DrillView|null=drill?{index:drill.index,step:DRILL[drill.index]!,phase:drill.phase,remainingMs:Math.max(0,(drill.phase==='ready'?DRILL_READY_MS:DRILL[drill.index]!.seconds*1000)-(at-drill.at)),counts:drill.counts}:null;
   return {phase:'live',baselineProgress:1,events:out,guard:pose.guard,lean:pose.lean,tilt:metrics?.tilt??null,boss:classifier.punchDebug,trainer:trainer.debug,wrists,drill:view};
  },
  /** Lean thresholds in use (for the tilt bar). */
  leanThresholds():{L:number;R:number}{const t=calibration?.settings.leanThresholds??{L:.5,R:.5},floor=Math.max(.3,1.5*(calibration?.settings.neutralSwayP95??0));return {L:Math.max(floor,t.L),R:Math.max(floor,t.R)};},
  /** The session in the shape of test/fixtures/kash-*.frames.json (times from the first frame: frames, prompts and events in ms,
   * sections in s), plus the drill prompts, every detector event and the results. */
  recording(meta:{startedAt:string;camera?:{width:number;height:number}}){
   const t0=firstAt??0,ms=(at:number)=>Math.round((at-t0)*10)/10,r3=(v:number)=>Math.round(v*1000)/1000;
   return {
    provenance:`Punch lab recording (?lab=punch), ${meta.startedAt}. Raw unmirrored MediaPipe pose_landmarker_lite landmarks [x,y,z,visibility] (3 dp) with capture timestamps in ms from the first frame${meta.camera?`; camera ${meta.camera.width}x${meta.camera.height}`:''}. Recorded in the browser and saved by the player; nothing was sent anywhere.`,
    script:DRILL.map(step=>`${step.prompt} (${step.seconds} s)`).join('; '),
    labels:'Sections are the drill steps’ GO windows in seconds from the first frame. Expected counts are what the prompt asked for. Events are what each detector emitted live (at = emit time).',
    calibration:calibration?.settings??null,calibrationSource:calibration?.source??null,
    thresholds:punchThresholdsInUse(calibration?.settings.punchThresholds??null),
    sections:results.map(item=>({name:item.step.id,from:Math.round(ms(item.from))/1000,to:Math.round(ms(item.to))/1000,expected:{...(item.step.expected.L?{L:item.step.expected.L}:{}),...(item.step.expected.R?{R:item.step.expected.R}:{}),...(item.step.dodges?{dodges:item.step.dodges,punches:0}:{})}})),
    prompts:prompts.map(p=>({at:ms(p.at),text:p.text})),
    events:events.map(e=>({...e,at:ms(e.at)})),
    results:results.map(item=>({step:item.step.id,prompt:item.step.prompt,...item.counts})),
    frames:frames.map(f=>{const landmarks:number[][]=[];for(let i=0;i<f.lm.length;i+=4)landmarks.push([r3(f.lm[i]!),r3(f.lm[i+1]!),r3(f.lm[i+2]!),r3(f.lm[i+3]!)]);return {at:ms(f.at),landmarks};}),
   };
  },
 };
}
/** Each detector's per-wrist punch threshold: Boss Fight in shoulder lengths, Crowd Trainer's own score in shoulder widths. */
export function punchThresholdsInUse(measured:PunchThresholds|null){
 const boss=measured??{L:STRAIGHT_PUNCH.on,R:STRAIGHT_PUNCH.on},own=(side:Side)=>measured?TRAINER_MOVES.punch.on*measured[side]/STRAIGHT_PUNCH.on:TRAINER_MOVES.punch.on;
 return {boss:{L:boss.L,R:boss.R},trainer:{L:own('L'),R:own('R')}};
}
/** One results-table row: caught = punches on the asked side (capped at the ask); extra = more than asked or the other side. */
export function drillRow(result:DrillResult){
 const {expected}=result.step,score=(got:{L:number;R:number})=>({caught:Math.min(expected.L,got.L)+Math.min(expected.R,got.R),extra:Math.max(0,got.L-expected.L)+Math.max(0,got.R-expected.R)});
 return {expected:expected.L+expected.R,boss:score(result.counts.boss),trainer:score(result.counts.trainer),dodge:!!result.step.dodges,dodges:result.step.dodges??0,leans:result.counts.leans.L+result.counts.leans.R,slips:result.counts.slips.L+result.counts.slips.R};
}
