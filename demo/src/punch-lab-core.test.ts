import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {leanThresholdsFromPeaks,PoseClassifier,type Landmark} from '../../capture/src/classifier';
import {TrainerMoveDetector} from '../../capture/src/trainer-moves';
import {baselineCalibration,createPunchLab,DRILL,DRILL_READY_MS,drillRow,LAB_BASELINE_MS,punchThresholdsInUse} from './punch-lab-core';
// Kash's 1 Nov drill clip (see its provenance): the lab must count exactly what the two fight detectors count on the same frames.
const drill=JSON.parse(readFileSync(new URL('../../test/fixtures/kash-trainer-punches.frames.json',import.meta.url),'utf8'));
const frames:{at:number;landmarks:Landmark[]}[]=drill.frames.map((f:{at:number;landmarks:number[][]})=>({at:f.at,landmarks:f.landmarks.map(([x,y,z,visibility])=>({x:x!,y:y!,z,visibility}))}));
const {leanPeaks,leanFloor,...guard}=drill.calibration;
const saved={...guard,leanThresholds:leanThresholdsFromPeaks(leanPeaks,leanFloor),punchThresholds:null};

describe('punch lab session',()=>{
 it('counts the same Boss Fight and Crowd Trainer punches as the fight detectors on Kash’s recorded drill',()=>{
  const lab=createPunchLab({saved}),classifier=new PoseClassifier(saved),trainer=new TrainerMoveDetector();
  const seen={boss:[] as string[],trainer:[] as string[]},direct={boss:[] as string[],trainer:[] as string[]};
  for(const f of frames){
   for(const e of lab.frame(f.landmarks,f.at).events)if(e.kind==='punch')seen[e.detector as 'boss'|'trainer'].push(`${e.side}@${e.at}`);
   for(const p of classifier.update(f.landmarks,f.at).punches)direct.boss.push(`${p.side}@${f.at}`);
   for(const p of trainer.update(f.landmarks,f.at).punches)direct.trainer.push(`${p.side}@${f.at}`);
  }
  expect(lab.calibrationSource).toBe('saved');expect(seen).toEqual(direct);
  expect(seen.boss.length).toBeGreaterThan(30);expect(lab.totals.boss.L+lab.totals.boss.R).toBe(seen.boss.length);
 });
 it('shows each wrist’s live score and threshold for both detectors',()=>{
  const lab=createPunchLab({saved});let view=lab.frame(frames[0]!.landmarks,frames[0]!.at);
  for(const f of frames.slice(1,60))view=lab.frame(f.landmarks,f.at);
  expect(view.phase).toBe('live');expect(view.boss!.threshold).toEqual({L:.7,R:.7});expect(view.trainer!.threshold).toEqual({L:.6,R:.6});
  for(const d of [view.boss!,view.trainer!])for(const side of ['L','R'] as const){expect(Number.isFinite(d.excursion[side])).toBe(true);expect(typeof d.armed[side]).toBe('boolean');}
  expect(punchThresholdsInUse({L:.6,R:.7})).toEqual({boss:{L:.6,R:.7},trainer:{L:.6*.6/.7,R:.6}});
 });
 it('takes a 3 s guard baseline when nothing is saved, and restarts it when tracking drops',()=>{
  const lab=createPunchLab();let view=lab.frame(frames[0]!.landmarks,0);expect(view.phase).toBe('baseline');
  view=lab.frame([],500);expect(view.baselineProgress).toBe(0);
  let at=600;for(const f of frames.slice(1,120)){view=lab.frame(f.landmarks,at);at+=33;if(view.phase==='live')break;}
  expect(view.phase).toBe('live');expect(at-600).toBeGreaterThanOrEqual(LAB_BASELINE_MS);expect(lab.calibrationSource).toBe('baseline');
  const calibration=baselineCalibration([{g:.87,tilt:0},{g:.9,tilt:.02},{g:.85,tilt:-.01}]);
  expect(calibration.guardThreshold).toBeCloseTo(.02,5);expect(calibration.leanThresholds).toEqual({L:.5,R:.5});
  expect(baselineCalibration([{g:-2,tilt:0}]).guardThreshold).toBe(-.5);
 });
 it('runs the guided drill and scores what each detector saw per step, false punches in the dodge step',()=>{
  const lab=createPunchLab({saved});lab.frame(frames[0]!.landmarks,0);
  lab.startDrill(0);let view=lab.frame(frames[1]!.landmarks,100);expect(view.drill).toMatchObject({index:0,phase:'ready'});
  view=lab.frame(frames[2]!.landmarks,DRILL_READY_MS);expect(view.drill).toMatchObject({index:0,phase:'go'});
  lab.nextStep(5000);// ends LEFT jabs early
  view=lab.frame(frames[3]!.landmarks,5100);expect(view.drill).toMatchObject({index:1,phase:'ready'});
  for(let i=1;i<DRILL.length;i++){lab.nextStep();lab.nextStep();}
  expect(lab.drilling).toBe(false);expect(lab.results.map(r=>r.step.id)).toEqual(DRILL.map(s=>s.id));
  const jab={step:DRILL[0]!,counts:{boss:{L:8,R:1},trainer:{L:10,R:0},leans:{L:0,R:0},slips:{L:0,R:0}},from:0,to:1};
  expect(drillRow(jab)).toMatchObject({expected:10,boss:{caught:8,extra:1},trainer:{caught:10,extra:0},dodge:false});
  const dodge={step:DRILL[3]!,counts:{boss:{L:1,R:1},trainer:{L:0,R:3},leans:{L:4,R:5},slips:{L:3,R:2}},from:0,to:1};
  expect(drillRow(dodge)).toMatchObject({expected:0,boss:{caught:0,extra:2},trainer:{extra:3},dodge:true,dodges:10,leans:9,slips:5});
 });
 it('only counts punches thrown while a step is live',()=>{
  const lab=createPunchLab({saved}),start=frames[0]!.at;lab.frame(frames[0]!.landmarks,start);lab.startDrill(start);
  // Kash's left punches (12.3-28 s): the drill's 3 s get-ready runs first, so punches before GO stay out of the step.
  for(const f of frames)if(f.at<28000)lab.frame(f.landmarks,f.at);
  expect(lab.results).toHaveLength(0);lab.frame(frames[1]!.landmarks,start+28001);// the 25 s step ends at 28 s
  const inStep=lab.results[0]!.counts;expect(inStep.boss.L).toBeGreaterThanOrEqual(5);expect(inStep.boss.L).toBeLessThanOrEqual(lab.totals.boss.L);expect(inStep.boss.R).toBeLessThanOrEqual(1);
 });
 it('records frames, prompts and events in the recorded-fixture shape, with times from the first frame',()=>{
  const lab=createPunchLab({saved}),base=frames[0]!.at+5000;
  for(const [i,f] of frames.slice(0,200).entries())lab.frame(i===150?f.landmarks.map((p,j)=>j===15?{...p,visibility:.1}:p):f.landmarks,base+i*33);
  lab.startDrill();lab.nextStep();lab.nextStep();
  const json=lab.recording({startedAt:'2026-11-01T22:00:00.000Z',camera:{width:1280,height:720}});
  expect(json.frames).toHaveLength(200);expect(json.frames[0]!.at).toBe(0);expect(json.frames[1]!.at).toBe(33);
  expect(json.frames[0]!.landmarks).toHaveLength(33);expect(json.frames[0]!.landmarks[0]).toHaveLength(4);
  expect(json.prompts.map(p=>p.text)).toEqual([`READY: ${DRILL[0]!.prompt}`,`GO: ${DRILL[0]!.prompt}`,`READY: ${DRILL[1]!.prompt}`]);
  expect(json.sections).toEqual([{name:'jab-L',from:6.567,to:6.567,expected:{L:10}}]);
  expect(json.events.filter(e=>e.detector==='camera').map(e=>`${e.kind}:${e.side}@${e.at}`)).toEqual(['wrists-out:L@4950','wrists-in:L@4983']);
  expect(json.calibration).toMatchObject({guardThreshold:saved.guardThreshold});expect(json.provenance).toContain('nothing was sent');
  expect(JSON.parse(JSON.stringify(json)).frames[0].landmarks[11]).toEqual(drill.frames[0].landmarks[11]);
 });
});
