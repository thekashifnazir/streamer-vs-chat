import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {leanThresholdsFromPeaks,PoseClassifier,type Landmark,type LeanThresholds} from '../../capture/src/classifier';
import {TRAINER_MOVES,TrainerMoveDetector} from '../../capture/src/trainer-moves';
// Kash's 1 Nov Crowd Trainer drill clip, replayed from recorded landmarks (see the fixture's provenance).
type Section={name:string;from:number;to:number;expected:Record<string,number>};
const fixture=JSON.parse(readFileSync(new URL('../fixtures/kash-trainer-punches.frames.json',import.meta.url),'utf8')) as {
 calibration:{guardThreshold:number;guardReleaseBand:number;guardMedians:{neutral:number;resting:number;guard:number};neutralSwayP95:number;leanFloor:number;leanPeaks:LeanThresholds};
 sections:Section[];frames:{at:number;landmarks:[number,number,number,number][]}[];
};
type Event={t:number;kind:'punch'|'slip'|'old-punch'|'lean'|'guard';side?:'L'|'R'};
function replay(){
 const {leanPeaks,leanFloor,...guard}=fixture.calibration;
 const detector=new TrainerMoveDetector(),classifier=new PoseClassifier({...guard,leanThresholds:leanThresholdsFromPeaks(leanPeaks,leanFloor)});
 const events:Event[]=[];let lean:'L'|'R'|null=null,guardOn=false,guardFrom=0;
 for(const frame of fixture.frames){
  const landmarks=frame.landmarks.map(([x,y,z,visibility]):Landmark=>({x,y,z,visibility}));
  const moves=detector.update(landmarks,frame.at),boss=classifier.update(landmarks,frame.at);
  for(const p of moves.punches)events.push({t:p.at/1000,kind:'punch',side:p.side});
  for(const s of moves.slips)events.push({t:s.at/1000,kind:'slip',side:s.side});
  for(const p of boss.punches)events.push({t:p.at/1000,kind:'old-punch',side:p.side});
  if(boss.state.lean&&boss.state.lean!==lean)events.push({t:frame.at/1000,kind:'lean',side:boss.state.lean});lean=boss.state.lean;
  if(boss.state.guard&&!guardOn)guardFrom=frame.at;if(guardOn&&!boss.state.guard&&frame.at-guardFrom>=500)events.push({t:guardFrom/1000,kind:'guard'});guardOn=boss.state.guard;
 }
 return events;
}
const events=replay();
const section=(name:string)=>{const s=fixture.sections.find(item=>item.name===name)!;return events.filter(e=>e.t>=s.from&&e.t<s.to);};
const count=(list:Event[],kind:Event['kind'],side?:'L'|'R')=>list.filter(e=>e.kind===kind&&(side===undefined||e.side===side)).length;
/** A one-two: a left punch then a right punch within 1 s. */
const oneTwos=(list:Event[])=>{const punches=list.filter(e=>e.kind==='punch');return punches.filter((p,i)=>p.side==='L'&&punches[i+1]?.side==='R'&&punches[i+1]!.t-p.t<=1).length;};
describe('Crowd Trainer moves on Kash’s recorded drills (1 Nov, Logitech)',()=>{
 it('uses the tuned Trainer-only thresholds',()=>{expect(TRAINER_MOVES.punch).toMatchObject({on:.6,dominance:.35});expect(TRAINER_MOVES.slip).toMatchObject({on:.55,shoulders:.25});});
 it('reads nothing while relaxed',()=>{const s=section('relaxed');expect(count(s,'punch')+count(s,'slip')).toBe(0);});
 it('reads his own left hand as L and his right as R (raw, unmirrored landmarks)',()=>{
  const left=section('left punches'),right=section('right punches');
  // 6 left punches are visible; one extra L is the slow first retraction.
  expect(count(left,'punch','L')).toBeGreaterThanOrEqual(6);expect(count(left,'punch','R')).toBeLessThanOrEqual(1);
  expect(count(right,'punch','R')).toBe(5);expect(count(right,'punch','L')).toBe(0);
 });
 it('Boss Fight now catches the same punches: its old 1.6-width extension gate caught 0 of 5 right and 4 of 6 left (straight-punch.ts)',()=>{
  const right=section('right punches'),left=section('left punches');
  expect(count(right,'old-punch','R')).toBe(5);expect(count(left,'old-punch','L')).toBeGreaterThanOrEqual(6);expect(count(left,'old-punch','R')).toBeLessThanOrEqual(1);
 });
 it('finds one-twos in order',()=>{
  expect(oneTwos(section('one-twos'))).toBeGreaterThanOrEqual(2);expect(count(section('one-twos'),'punch')).toBeGreaterThanOrEqual(7);
  expect(oneTwos(section('one-two-slip and one-two-guard'))).toBeGreaterThanOrEqual(5);
 });
 it('reads slips to both sides; the Boss Fight lean catches the right slips the detector can miss',()=>{
  const left=section('slips left'),right=section('slips right');
  expect(count(left,'slip','L')).toBe(3);expect(count(right,'slip','R')).toBeGreaterThanOrEqual(2);expect(count(right,'lean','R')).toBe(3);
  expect(count(left,'lean','L')).toBeLessThanOrEqual(1);
 });
 it('catches the jabs that start combos and reads no slip from a cross (1 Nov live playtest: the first token was dashed)',()=>{
  // Frame-labelled from the drill video at 5 fps: 12 one-twos (6 in the one-two drill, 6 in the combo drill). Before the merge with
  // the straight-punch detector: jabs 8, crosses 10. Before the slip confirm wait: 4 slips in the one-two drill, all mid-cross.
  const jabs=[44.8,47.3,49.8,52.1,54.8,57.6,91.1,97.7,103.7,108.5,112.7,117.3],crosses=[45.6,47.9,50.3,52.8,55.5,58.3,92.1,98.5,104.5,109.3,113.5,117.9];
  const punches=events.filter(e=>e.kind==='punch'),near=(t:number,side:'L'|'R')=>punches.some(e=>e.side===side&&Math.abs(e.t-t)<=.35);
  expect(jabs.filter(t=>near(t,'L')).length).toBeGreaterThanOrEqual(11);expect(crosses.filter(t=>near(t,'R')).length).toBeGreaterThanOrEqual(10);
  expect([...jabs.filter(t=>near(t,'R')&&!near(t,'L')),...crosses.filter(t=>near(t,'L')&&!near(t,'R'))]).toEqual([]);
  expect(count(section('one-twos'),'slip')).toBeLessThanOrEqual(1);
 });
 it('throws no punches or slips during guard holds, and the guard holds register',()=>{
  const s=section('guard holds');expect(count(s,'punch')+count(s,'slip')).toBe(0);expect(count(s,'guard')).toBe(2);
 });
});
