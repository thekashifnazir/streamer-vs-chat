import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PoseClassifier,type Landmark} from '../../capture/src/classifier';
import {TrainerMoveDetector} from '../../capture/src/trainer-moves';
// Kash's 1 Nov night punch-lab session (?lab=punch, Logitech 720p, 264.6 s; see the fixture's provenance): 117 s of free punching
// and dodging, then the guided drill. Punch times are INFERRED: peaks of either detector's wrist score (wrist excursion in the
// torso frame, plus forearm shrink) with a dip between peaks, kept when they fit the drill's rhythm and checked against both
// detectors' live events. The first jab of each jab drill comes out of a guard raise (both hands moving).
type Fixture={calibration:ConstructorParameters<typeof PoseClassifier>[0];sections:{name:string;from:number;to:number}[];frames:{at:number;landmarks:[number,number,number,number][]}[]};
const fixture=JSON.parse(readFileSync(new URL('../fixtures/kash-punchlab-1nov.frames.json',import.meta.url),'utf8')) as Fixture;
const labels:Record<string,{L:number[];R:number[]}>={
 'jab-L':{L:[140.38,141.41,142.63,143.75,144.67,145.83,147.02,147.94,149.23,150.18],R:[]},
 'jab-R':{L:[],R:[168.63,169.75,170.87,171.97,173.15,174.37,175.66,176.98,177.94,179.13]},
 'one-two':{L:[199.19,201.27,203.15,205.26,207.21],R:[199.81,201.83,203.97,205.85,207.83]},
 dodge:{L:[],R:[]},
};
type Punch={side:'L'|'R';t:number};
const frames=fixture.frames.map(f=>({at:f.at,landmarks:f.landmarks.map(([x,y,z,visibility]):Landmark=>({x,y,z,visibility}))}));
// The lab's own 3 s guard baseline calibrated this session; replaying from that calibration matches the live events.
function boss(){const c=new PoseClassifier(fixture.calibration);return frames.flatMap(f=>c.update(f.landmarks,f.at).punches.map((p):Punch=>({side:p.side,t:p.at/1000})));}
function trainer(){const d=new TrainerMoveDetector();return frames.flatMap(f=>d.update(f.landmarks,f.at).punches.map((p):Punch=>({side:p.side,t:p.at/1000})));}
/** Per drill section: labelled punches matched by a same-side punch within 0.45 s (each used once), and unmatched punches. */
function score(punches:Punch[]){
 return Object.fromEntries(fixture.sections.map(s=>{
  const inside=punches.filter(p=>p.t>=s.from&&p.t<s.to),used=new Set<Punch>();let caught=0;
  for(const side of ['L','R'] as const)for(const t of labels[s.name]![side]){const hit=inside.find(p=>!used.has(p)&&p.side===side&&Math.abs(p.t-t)<.45);if(hit){used.add(hit);caught++;}}
  return [s.name,{caught,extra:inside.length-used.size}];
 }));
}
describe('Kash’s guided punch-lab drill (1 Nov night, 10 left jabs, 10 right crosses, 5 one-twos, 10 dodges)',()=>{
 const b=score(boss()),t=score(trainer());
 it('Boss Fight catches the right crosses and one-twos it used to miss, and nothing during the dodges',()=>{
  // Before (ON 0.7): left 9/10, right 4/10, one-twos 6/10 (live in the lab: 9, 4, 5). The missed left is the first jab, thrown
  // out of a guard raise: both hands moved, so the peak did not count and the wrist stayed disarmed until it came home.
  expect(b['jab-L']).toEqual({caught:9,extra:0});expect(b['jab-R']!.caught).toBeGreaterThanOrEqual(7);
  expect(b['one-two']).toEqual({caught:10,extra:0});expect(b['jab-R']!.extra).toBe(0);
  expect(b.dodge).toEqual({caught:0,extra:0});
 });
 it('Boss Fight catches at least as many as the Crowd Trainer in every section',()=>{
  // Crowd Trainer here: 9, 7, 7 (+1 extra), 0 in the dodges.
  for(const name of ['jab-L','jab-R','one-two'])expect(b[name]!.caught).toBeGreaterThanOrEqual(t[name]!.caught);
  expect(t.dodge!.extra).toBe(0);
 });
 it('throws no punch while Kash dodges without punching in the free session (about 80-103 s)',()=>{
  expect(boss().filter(p=>p.t>=79&&p.t<104)).toEqual([]);
 });
});
