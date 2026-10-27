import { expect, test } from 'vitest';
import { createCalibration } from './calibration.js';
import type { Landmark } from './classifier.js';

function frame(g=-1.2,tilt=0,width=.18):Landmark[] {
  const landmarks=Array.from({length:33},()=>({x:.5,y:.1,z:0,visibility:1}));
  landmarks[11]={x:.5-width/2,y:.4+tilt*width/2,z:0,visibility:1};
  landmarks[12]={x:.5+width/2,y:.4-tilt*width/2,z:0,visibility:1};
  landmarks[13]={x:landmarks[11]!.x,y:.7,z:0,visibility:1};
  landmarks[14]={x:landmarks[12]!.x,y:.7,z:0,visibility:1};
  landmarks[23]={x:landmarks[11]!.x,y:.9,z:0,visibility:.004};
  landmarks[24]={x:landmarks[12]!.x,y:.9,z:0,visibility:.004};
  landmarks[15]={...landmarks[11]!,y:.4-g*width};
  landmarks[16]={...landmarks[12]!,y:.4-g*width};
  return landmarks;
}
type Calibration=ReturnType<typeof createCalibration>;
function hold(calibration:Calibration,points:Landmark[],start:number,duration=3000) {
  for(let at=start;at<=start+duration;at+=100)calibration.update(points,at);
}
function guardCalibration(calibration:Calibration,mode:'standing'|'seated'='standing',values={neutral:-2.5,resting:-1.2,guard:.6}) {
  calibration.start(mode,0);
  hold(calibration,frame(values.neutral),0);
  expect(calibration.snapshot.stage).toBe('resting');
  hold(calibration,frame(values.resting),3100);
  expect(calibration.snapshot.stage).toBe('guard');
  hold(calibration,frame(values.guard),6200);
}
function leans(calibration:Calibration,left=.57,right=.88) {
  hold(calibration,frame(-1.2,left),9300,1500);
  expect(calibration.snapshot.stage).toBe('lean-right');
  hold(calibration,frame(-1.2,-right),10900,1500);
}

test('calibrates neutral, waist and near-face guard for3s then comfortable asymmetric leans for1.5s',()=>{
  const calibration=createCalibration();
  guardCalibration(calibration);
  expect(calibration.snapshot.guardThreshold).toBeCloseTo(-1.2+.7*(.6+1.2));
  expect(calibration.snapshot.guardMedians).toEqual({neutral:expect.closeTo(-2.5),resting:expect.closeTo(-1.2),guard:expect.closeTo(.6)});
  expect(calibration.snapshot.stage).toBe('lean-left');
  hold(calibration,frame(-1.2,.57),9300,1400);
  expect(calibration.snapshot.stage).toBe('lean-left');
  calibration.update(frame(-1.2,.57),10800);
  expect(calibration.snapshot.stage).toBe('lean-right');
  hold(calibration,frame(-1.2,-.88),10900,1500);
  expect(calibration.snapshot.ready).toBe(true);
  expect(calibration.snapshot.leanPeaks).toEqual({L:expect.closeTo(.57),R:expect.closeTo(.88)});
  expect(calibration.snapshot.leanThresholds).toEqual({L:expect.closeTo(.342),R:expect.closeTo(.528)});
});

test('uses the higher neutral/resting baseline and clamps guard engage to upper chest',()=>{
  const higherNeutral=createCalibration();
  guardCalibration(higherNeutral,'standing',{neutral:-.8,resting:-1.2,guard:.6});
  expect(higherNeutral.snapshot.guardThreshold).toBeCloseTo(-.8+.7*(.6+.8));
  const floor=createCalibration();
  guardCalibration(floor,'standing',{neutral:-3,resting:-2,guard:-.1});
  expect(floor.snapshot.guardThreshold).toBe(-.5);
});

test('rejects a low guard that cannot clear the chest floor and allows a fresh guard retry',()=>{
  const calibration=createCalibration();
  guardCalibration(calibration,'standing',{neutral:-2.5,resting:-1.2,guard:-.6});
  expect(calibration.snapshot.stage).toBe('guard');
  expect(calibration.snapshot.guardThreshold).toBeNull();
  expect(calibration.snapshot.message).toContain('near your face');
  hold(calibration,frame(.1),9300);
  expect(calibration.snapshot.stage).toBe('lean-left');
  expect(calibration.snapshot.guardThreshold).toBeGreaterThanOrEqual(-.5);
});

test('calibrates seated comfortable small leans independently, keeping the0.3 onset floor',()=>{
  const calibration=createCalibration();
  guardCalibration(calibration,'seated');
  leans(calibration,.31,.52);
  expect(calibration.snapshot.ready).toBe(true);
  expect(calibration.snapshot.mode).toBe('seated');
  expect(calibration.snapshot.leanThresholds).toEqual({L:.3,R:expect.closeTo(.312)});
  expect(calibration.snapshot.leanPeaks).toEqual({L:expect.closeTo(.31),R:expect.closeTo(.52)});
});

test('records each actual peak and resets pending lean samples on wrong direction or interrupted holds',()=>{
  const calibration=createCalibration();
  guardCalibration(calibration);
  hold(calibration,frame(-1.2,.4),9300,500);
  calibration.update(frame(-1.2,-.4),9900);
  hold(calibration,frame(-1.2,.4),10000,1400);
  expect(calibration.snapshot.stage).toBe('lean-left');
  calibration.update(frame(-1.2,.7),11500);
  expect(calibration.snapshot.stage).toBe('lean-right');
  hold(calibration,frame(-1.2,-.5),11600,1500);
  expect(calibration.snapshot.leanPeaks).toEqual({L:expect.closeTo(.7),R:expect.closeTo(.5)});
  expect(calibration.snapshot.leanThresholds?.L).toBeCloseTo(.42);
});

test('seated calibration rejects close framing and resets all calibration metadata for a new posture',()=>{
  const calibration=createCalibration();
  guardCalibration(calibration);leans(calibration);
  calibration.start('seated',13000);
  hold(calibration,frame(-1.2,0,.25),13000,4000);
  expect(calibration.snapshot.stage).toBe('neutral');
  expect(calibration.snapshot.message).toContain('20%');
  expect(calibration.snapshot.progress).toBe(0);
  expect(calibration.snapshot.guardThreshold).toBeNull();
  expect(calibration.snapshot.leanThresholds).toBeNull();
  expect(calibration.snapshot.leanPeaks).toBeNull();
  expect(calibration.snapshot.guardMedians).toBeNull();
});

test('missing head, a camera pause, or an extended raised arm cannot complete a hold',()=>{
  const calibration=createCalibration();
  calibration.start('standing',0);
  calibration.update(frame(),0);calibration.update(frame(),3000);
  expect(calibration.snapshot.stage).toBe('neutral');
  expect(calibration.snapshot.progress).toBe(0);
  const hidden=frame();hidden[0]!.visibility=0;
  calibration.update(hidden,3100);
  expect(calibration.snapshot.message).toContain('head');
  guardCalibration(calibration);
  hold(calibration,frame(-1.2,.4),9300,1000);
  calibration.update(frame(-1.2,.4),12000);
  expect(calibration.snapshot.stage).toBe('lean-left');
  expect(calibration.snapshot.progress).toBe(0);
  const extended=frame(0,.4);extended[15]!.x-=.4;
  calibration.update(extended,12100);
  expect(calibration.snapshot.message).toContain('extension');
  expect(calibration.snapshot.progress).toBe(0);
});

test('returned calibration metadata cannot mutate stored per-side settings',()=>{
  const calibration=createCalibration();guardCalibration(calibration);leans(calibration);
  const snapshot=calibration.snapshot;snapshot.leanThresholds!.L=99;snapshot.leanPeaks!.R=99;snapshot.guardMedians!.neutral=99;
  expect(calibration.snapshot.leanThresholds?.L).toBeCloseTo(.342);
  expect(calibration.snapshot.leanPeaks?.R).toBeCloseTo(.88);
  expect(calibration.snapshot.guardMedians?.neutral).toBeCloseTo(-2.5);
});


test('rejects a resting sample inside the guard release band even when the guard clears onset',()=>{
  const calibration=createCalibration();
  guardCalibration(calibration,'standing',{neutral:-1.6,resting:-.6,guard:-.3});
  // The70% onset is-.39 and release is-.715: waistg-.6 would retain guard.
  expect(calibration.snapshot.stage).toBe('guard');
  expect(calibration.snapshot.ready).toBe(false);
  expect(calibration.snapshot.guardThreshold).toBeNull();
  expect(calibration.snapshot.guardMedians).toEqual({neutral:expect.closeTo(-1.6),resting:expect.closeTo(-.6),guard:expect.closeTo(-.3)});
  expect(calibration.snapshot.guardReleaseBand).toBeCloseTo(.325);
  expect(calibration.snapshot.message).toContain('near your face');
  expect(calibration.snapshot.message).toContain('restart calibration');
});

test('sets the release band to one quarter of each measured neutral-to-guard spread',()=>{
  const broad=createCalibration();
  guardCalibration(broad,'standing',{neutral:-3,resting:-1.2,guard:.6});
  expect(broad.snapshot.stage).toBe('lean-left');
  expect(broad.snapshot.guardReleaseBand).toBeCloseTo(.9);
  const narrow=createCalibration();
  guardCalibration(narrow,'standing',{neutral:-1,resting:-1.2,guard:.6});
  expect(narrow.snapshot.stage).toBe('lean-left');
  expect(narrow.snapshot.guardReleaseBand).toBeCloseTo(.4);
  expect(broad.snapshot.guardReleaseBand).toBeGreaterThan(narrow.snapshot.guardReleaseBand!);
});

test('requires wrists above elbows and mid torso during the guard hold',()=>{
  const calibration=createCalibration();
  calibration.start('standing',0);
  hold(calibration,frame(-2.5),0);hold(calibration,frame(-1.2),3100);
  const belowElbows=frame(.6);
  belowElbows[13]!.y=.2;belowElbows[14]!.y=.2;
  hold(calibration,belowElbows,6200);
  expect(calibration.snapshot.stage).toBe('guard');
  expect(calibration.snapshot.guardThreshold).toBeNull();
  expect(calibration.snapshot.message).toContain('above your elbows');
  const belowTorso=frame(-.4);
  belowTorso[23]!.y=.5;belowTorso[24]!.y=.5;
  hold(calibration,belowTorso,9300);
  expect(calibration.snapshot.stage).toBe('guard');
  expect(calibration.snapshot.progress).toBe(0);
  hold(calibration,frame(.6),12400);
  expect(calibration.snapshot.stage).toBe('lean-left');
});

test('measures neutral sway p95 and prevents resting sway from completing lean calibration',()=>{
  const calibration=createCalibration();
  calibration.start('standing',0);
  for(let at=0;at<=3000;at+=100)calibration.update(frame(-2.5,at%200===0?.22:-.22),at);
  expect(calibration.snapshot.neutralSwayP95).toBeCloseTo(.22);
  expect(calibration.snapshot.leanFloor).toBeCloseTo(.33);
  hold(calibration,frame(-1.2),3100);hold(calibration,frame(.6),6200);
  hold(calibration,frame(-1.2,.31),9300,1500);
  expect(calibration.snapshot.stage).toBe('lean-left');
  expect(calibration.snapshot.progress).toBe(0);
  hold(calibration,frame(-1.2,.4),10900,1500);
  expect(calibration.snapshot.stage).toBe('lean-right');
  hold(calibration,frame(-1.2,-.7),12500,1500);
  expect(calibration.snapshot.ready).toBe(true);
  expect(calibration.snapshot.leanThresholds).toEqual({L:expect.closeTo(.33),R:expect.closeTo(.42)});
});

test('neutral sway uses p95 rather than maximum and discards samples from interrupted holds',()=>{
  const calibration=createCalibration();
  calibration.start('standing',0);
  for(let at=0;at<=3000;at+=100)calibration.update(frame(-2.5,at===0?.8:.2),at);
  expect(calibration.snapshot.neutralSwayP95).toBeCloseTo(.2);
  expect(calibration.snapshot.leanFloor).toBeCloseTo(.3);
  calibration.start('seated',4000);
  expect(calibration.snapshot.neutralSwayP95).toBeNull();
  expect(calibration.snapshot.leanFloor).toBeNull();
  hold(calibration,frame(-2.5,.7),4000,1000);
  calibration.update(frame(-2.5,.1),6000); // Camera gap starts a new continuous window.
  hold(calibration,frame(-2.5,.1),6100,2900);
  expect(calibration.snapshot.stage).toBe('resting');
  expect(calibration.snapshot.neutralSwayP95).toBeCloseTo(.1);
  expect(calibration.snapshot.leanFloor).toBe(.3);
});
