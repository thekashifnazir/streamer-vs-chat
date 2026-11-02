import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PoseClassifier,type Landmark} from '../../capture/src/classifier';
// Kash's 2 Nov punch-lab recordings (?lab=punch, Logitech 720p; see each fixture's provenance), after the live game missed fast
// one-twos. burst: 20 s of alternating 1-2s, then punches straight after leans. paired: recorded alongside a screen recording,
// 1-2s from fight distance, then lean-and-punch, both hands above the head, and guard plus leans without punching (58.5-67 s).
// Punch times are INFERRED from the wrist moving in towards the centre line (left dips, right peaks), checked against the screen
// recording for the paired clip; the two crosses in the paired clip that stay under ON (12.48, 22.64) are still labelled.
type Fixture={calibration:ConstructorParameters<typeof PoseClassifier>[0];frames:{at:number;landmarks:[number,number,number,number][]}[]};
const load=(name:string)=>JSON.parse(readFileSync(new URL(`../fixtures/${name}`,import.meta.url),'utf8')) as Fixture;
type Punch={side:'L'|'R';t:number};
function boss(fixture:Fixture){
 const c=new PoseClassifier(fixture.calibration);
 return fixture.frames.flatMap(f=>c.update(f.landmarks.map(([x,y,z,visibility]):Landmark=>({x,y,z,visibility})),f.at).punches.map((p):Punch=>({side:p.side,t:p.at/1000})));
}
function score(punches:Punch[],from:number,to:number,labels:{L:number[];R:number[]}){
 const inside=punches.filter(p=>p.t>=from&&p.t<to),used=new Set<Punch>();let caught=0;
 for(const side of ['L','R'] as const)for(const t of labels[side]){const hit=inside.find(p=>!used.has(p)&&p.side===side&&Math.abs(p.t-t)<.35);if(hit){used.add(hit);caught++;}}
 return {caught,extra:inside.length-used.size};
}
const burst={L:[14.56,15.88,17.2,18.52,19.9,21.16,22.44,23.63,24.92,26.24,27.52,29.01,30.36,31.68,33.07],R:[15.12,16.4,17.89,19.14,20.53,21.75,23.03,24.26,25.61,26.9,28.22,29.73,30.99,32.44]};
const paired={L:[8.98,10.36,11.78,13.2,14.62,16.11,17.62,19.07,20.49,21.85,23.4,24.79,26.34,27.75,29.17],R:[9.6,11,12.48,13.9,15.4,16.9,18.25,19.77,21.09,22.64,23.99,25.58,26.93,28.38,29.77]};
describe('Kash’s fast one-twos (2 Nov punch lab)',()=>{
 it('Boss Fight catches the punch even when the other hand drops back to chamber',()=>{
  // Before (the other hand's whole movement counted against dominance): 23/29 and 23/30. Most misses were a jab whose rear hand
  // was already dropping for the cross. Left misses now: the first jab out of the guard raise, and jabs where the cross starts early.
  expect(score(boss(load('kash-punchlab-2nov-burst.frames.json')),13.5,33.4,burst)).toEqual({caught:26,extra:0});
  const result=score(boss(load('kash-punchlab-2nov-paired.frames.json')),8.5,30.5,paired);
  expect(result).toEqual({caught:25,extra:0});
 });
 it('throws no punch during guard and leans without punching',()=>{
  expect(boss(load('kash-punchlab-2nov-paired.frames.json')).filter(p=>p.t>=58.5&&p.t<67)).toEqual([]);
 });
});
