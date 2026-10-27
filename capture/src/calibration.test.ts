import { expect, test } from 'vitest';
import { createCalibration } from './calibration.js';
import type { Landmark } from './classifier.js';

function frame(g=-1.2,tilt=0,width=.18):Landmark[] {
  const landmarks=Array.from({length:33},()=>({x:.5,y:.1,z:0,visibility:1}));
  landmarks[11]={x:.5-width/2,y:.4+tilt*width/2,z:0,visibility:1};
  landmarks[12]={x:.5+width/2,y:.4-tilt*width/2,z:0,visibility:1};
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
  // The70% onset is-.39 and release is-.64: waistg-.6 would retain guard.
  expect(calibration.snapshot.stage).toBe('guard');
  expect(calibration.snapshot.ready).toBe(false);
  expect(calibration.snapshot.guardThreshold).toBeNull();
  expect(calibration.snapshot.guardMedians).toEqual({neutral:expect.closeTo(-1.6),resting:expect.closeTo(-.6),guard:expect.closeTo(-.3)});
  expect(calibration.snapshot.message).toContain('near your face');
  expect(calibration.snapshot.message).toContain('restart calibration');
});
