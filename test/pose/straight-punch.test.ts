import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {leanThresholdsFromPeaks,PoseClassifier,type Landmark} from '../../capture/src/classifier';
import {punchThresholdsFromReach,STRAIGHT_PUNCH} from '../../capture/src/straight-punch';
import {TrainerMoveDetector} from '../../capture/src/trainer-moves';
// Kash's recorded landmarks (see each fixture's provenance). Punch sections and counts: kash-trainer-punches sections and
// kash-webcam.labels.json cues; 6 standing straight jabs at the camera were counted from the 27 Oct landmarks.
type Frame={at:number;landmarks:Landmark[]};
const read=(name:string)=>JSON.parse(readFileSync(new URL(`../fixtures/${name}`,import.meta.url),'utf8'));
const tuple=(raw:number[][])=>raw.map(([x,y,z,visibility]):Landmark=>({x:x!,y:y!,z,visibility}));
const drill=read('kash-trainer-punches.frames.json'),webcam=read('kash-webcam.landmarks.json'),shallow=read('kash-shallow-leans.frames.json'),deep=read('kash-deep-lean-guard.frames.json'),logitech=read('kash-guard-through-leans-logitech.landmarks.json');
const {leanPeaks,leanFloor,...guard}=drill.calibration;
const calibration={...guard,leanThresholds:leanThresholdsFromPeaks(leanPeaks,leanFloor)};
const atFrames=(frames:{at:number;landmarks:number[][]}[]):Frame[]=>frames.map(f=>({at:f.at,landmarks:tuple(f.landmarks)}));
const tFrames=(frames:{t:number;lm:number[][]|null}[]):Frame[]=>frames.filter(f=>f.lm).map(f=>({at:f.t,landmarks:tuple(f.lm!)}));
function boss(frames:Frame[],cal:ConstructorParameters<typeof PoseClassifier>[0]=calibration){const c=new PoseClassifier(cal);return frames.flatMap(f=>c.update(f.landmarks,f.at).punches.map(p=>p.at/1000));}
function trainer(frames:Frame[]){const d=new TrainerMoveDetector();return frames.flatMap(f=>d.update(f.landmarks,f.at).punches.map(p=>p.at/1000));}
const sets={drill:atFrames(drill.frames),webcam:tFrames(webcam.frames)};
const punches=[['drill',12.3,28,6],['drill',31,43.3,5],['drill',43.3,59.8,10],['drill',89.6,124,12],['webcam',76.2,94,6],['webcam',180.4,186.4,5]] as const;
const quiet=[['drill',0,12.3],['drill',61.5,75.6],['drill',75.6,89.6],['webcam',0,76.2],['webcam',142,180.4]] as const;
function score(detect:(frames:Frame[])=>number[]){
 const events={drill:detect(sets.drill),webcam:detect(sets.webcam)},n=(k:'drill'|'webcam',a:number,b:number)=>events[k].filter(t=>t>=a&&t<b).length;
 const other=[...Object.values(shallow.segments as Record<string,{frames:{at:number;landmarks:number[][]}[]}>).map(s=>atFrames(s.frames)),atFrames(deep.frames),tFrames(logitech.frames)];
 return {caught:punches.reduce((sum,[k,a,b,expected])=>sum+Math.min(expected,n(k,a,b)),0),
  falsePunches:quiet.reduce((sum,[k,a,b])=>sum+n(k,a,b),0)+other.reduce((sum,frames)=>sum+detect(frames).length,0)};
}
describe('straight punches on Kash’s recorded webcam footage (44 punches; guard, lean and slip footage for false punches)',()=>{
 it('Boss Fight catches most ordinary punches without turning guard or leans into punches',()=>{
  // Before (1.6-width extension gate): 13 of 44 caught, 30 false punches. 1 Nov wrist excursion alone: 36, 3.
  // With the forearm foreshortening cue: 42 caught (one-twos 9/10, from 5/10), 4 false punches.
  const result=score(frames=>boss(frames));
  expect(result.caught).toBeGreaterThanOrEqual(42);expect(result.falsePunches).toBeLessThanOrEqual(4);
 });
 it('Crowd Trainer keeps its catches and drops most false punches',()=>{
  // Before (no drop, edge or tilt filters): 41 of 44 caught, 32 false punches. With them: 40, 9. Merged with the straight-punch
  // detector (1 Nov live playtest: jabs at the camera were missed, so combos lost their first token): 42, 11; frame-labelled
  // drill one-twos: jabs 8 -> 11 of 12.
  const result=score(trainer);
  expect(result.caught).toBeGreaterThanOrEqual(42);expect(result.falsePunches).toBeLessThanOrEqual(11);
 });
 it('Crowd Trainer reads setup thresholds as a ratio to the Boss Fight default, not in its own units',()=>{
  // Raw Boss Fight units (0.7-0.9) in the Trainer's shoulder-width units cut its catches from 40 to 34 of 44.
  const calibrated=(frames:Frame[])=>{const d=new TrainerMoveDetector();d.setPunchThresholds({L:.7,R:.7});return frames.flatMap(f=>d.update(f.landmarks,f.at).punches.map(p=>p.at/1000));};
  expect(score(calibrated)).toEqual(score(trainer));
 });
 it('derives per-side thresholds from a measured punch, keeping the default for a small one',()=>{
  expect(STRAIGHT_PUNCH.on).toBe(.7);
  // A big setup punch never raises the threshold (0.9 caught 33 of 44 here); a short one lowers it to at most 0.6.
  expect(punchThresholdsFromReach({L:1.4,R:2.6})).toEqual({L:.7,R:.7});
  expect(punchThresholdsFromReach({L:1.2,R:.8})).toEqual({L:.6,R:.7});
  expect(punchThresholdsFromReach({L:1,R:1.3})).toEqual({L:.6,R:.65});
  const result=score(frames=>boss(frames,{...calibration,punchThresholds:punchThresholdsFromReach({L:2.2,R:1.75})}));
  expect(result.caught).toBeGreaterThanOrEqual(42);
 });
});
