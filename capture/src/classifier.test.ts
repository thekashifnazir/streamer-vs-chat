import { describe, expect, it } from 'vitest';
import { LEAN_DWELL_MS, measurePose, PoseClassifier, type Landmark } from './classifier.js';
function frame(tilt = 0, leftExtension = .6, rightExtension = .6): Landmark[] {
  const lm = Array.from({length:33}, () => ({x:0,y:0,visibility:1}));
  lm[11] = {x:.6,y:.5 + tilt*.1,visibility:1}; lm[12] = {x:.4,y:.5 - tilt*.1,visibility:1};
  lm[15] = {x:.6+leftExtension*.2,y:lm[11]!.y,visibility:1};
  lm[16] = {x:.4-rightExtension*.2,y:lm[12]!.y,visibility:1};
  lm[13]={x:.7,y:.85,visibility:1};lm[14]={x:.3,y:.85,visibility:1};
  lm[23]={x:.56,y:1.05,visibility:1};lm[24]={x:.44,y:1.05,visibility:1};
  return lm;
}
describe('raw landmark classifier', () => {
  it('requires both wrists above the calibrated guard threshold', () => {
    const lm=frame(); lm[15]!.y=.3; lm[16]!.y=.7;
    expect(measurePose(lm)!.g).toBeCloseTo(-1);
    const c=new PoseClassifier({guardThreshold:-.5});
    expect(c.update(lm,0).state.guard).toBe(false);
    lm[16]!.y=.3;
    expect(c.update(lm,1).state.guard).toBe(true);
  });
  it('rejects wide arms even when wrists exceed the vertical guard threshold', () => {
    const c=new PoseClassifier({guardThreshold:-.5});
    const lm=frame(); lm[15]={x:.05,y:.3}; lm[16]={x:.95,y:.3};
    expect(c.update(lm,0).state.guard).toBe(false);
  });
  it('maps positive raw tilt to player L, waits the lean dwell and uses .25 release hysteresis', () => {
    expect(LEAN_DWELL_MS).toBe(170);
    const c=new PoseClassifier({guardThreshold:0});
    expect(c.update(frame(.6),0).state.lean).toBe(null);
    expect(c.update(frame(.6),LEAN_DWELL_MS-1).state.lean).toBe(null);
    expect(c.update(frame(.6),LEAN_DWELL_MS).state.lean).toBe('L');
    expect(c.update(frame(.3),LEAN_DWELL_MS+1).state.lean).toBe('L');
    expect(c.update(frame(.24),LEAN_DWELL_MS+2).state.lean).toBe(null);
    c.update(frame(-.6),300);
    expect(c.update(frame(-.6),300+LEAN_DWELL_MS-1).state.lean).toBe(null);
    expect(c.update(frame(-.6),300+LEAN_DWELL_MS).state.lean).toBe('R');
  });
  it('requires continuous dwell; a neutral frame interrupts it', () => {
    const c=new PoseClassifier({guardThreshold:0});
    c.update(frame(.7),0); c.update(frame(),150); c.update(frame(.7),200);
    expect(c.update(frame(.7),200+LEAN_DWELL_MS-1).state.lean).toBe(null);
    expect(c.update(frame(.7),200+LEAN_DWELL_MS).state.lean).toBe('L');
  });
  it('freezes held lean during the300ms punch gate then restarts dwell', () => {
    const c=new PoseClassifier({guardThreshold:0});
    c.update(frame(.7),0); c.update(frame(.7),200);
    // 2.0 horizontal widths at tilt .7 is ~1.77 shoulder-axis lengths: a real raised extension.
    const raisedPunch=frame(-.7,2); raisedPunch[15]!.y-=.16;
    expect(c.update(raisedPunch,300).state.lean).toBe('L');
    c.update(frame(-.7),500);
    expect(c.update(frame(-.7),599).state.lean).toBe('L');
    expect(c.update(frame(-.7),600).state.lean).toBe(null);
    expect(c.update(frame(-.7),600+LEAN_DWELL_MS-1).state.lean).toBe(null);
    expect(c.update(frame(-.7),600+LEAN_DWELL_MS).state.lean).toBe('R');
  });
  // Punch detector: straight-punch.ts. It needs a short resting history before a wrist excursion counts.
  const rest=(c:PoseClassifier,until=200)=>{for(let t=0;t<=until;t+=33)c.update(frame(),t);};
  it('emits a bonus punch at the observed peak only after retraction and rearms on return', () => {
    const c=new PoseClassifier({guardThreshold:0});rest(c);
    expect(c.update(frame(0,1.8),233).punches).toEqual([]);
    expect(c.update(frame(0,2),266).punches).toEqual([]);
    expect(c.update(frame(0,1.8),300).punches).toEqual([{kind:'punch',side:'L',at:266,source:'pose'}]);
    expect(c.update(frame(0,2),333).punches).toEqual([]);
    expect(c.update(frame(0,1.7),366).punches).toEqual([]);
    c.update(frame(),400); c.update(frame(0,2),600);
    expect(c.update(frame(),633).punches).toHaveLength(1);
  });
  it('uses a200ms global refractory across arms', () => {
    const c=new PoseClassifier({guardThreshold:0});rest(c);
    c.update(frame(0,2),233);
    expect(c.update(frame(0,1.7),266).punches).toHaveLength(1);
    c.update(frame(0,.6,2),300);
    expect(c.update(frame(),333).punches).toEqual([]);
  });
  it('a straight punch at the camera counts without the arm lengthening past 1.6 widths', () => {
    // Guard at the chin, then the fist rises and drifts out in front of the face: 2D extension stays near 1.
    const c=new PoseClassifier({guardThreshold:0}),guard=(dy=0,dx=0)=>{const lm=frame();lm[15]={x:.62+dx,y:.42+dy,visibility:1};lm[16]={x:.38,y:.42,visibility:1};return lm;};
    for(let t=0;t<=200;t+=33)c.update(guard(),t);
    expect(measurePose(guard(-.15,.04))!.leftExtension).toBeLessThan(1.6);
    c.update(guard(-.15,.04),233);
    expect(c.update(guard(-.05),266).punches).toEqual([{kind:'punch',side:'L',at:233,source:'pose'}]);
  });
  it('a guard raise, a lean with guard up and a dropped hand are not punches', () => {
    const c=new PoseClassifier({guardThreshold:0}),both=(dy:number,tilt=0)=>{const lm=frame(tilt);lm[15]={x:.62,y:lm[11]!.y+dy,visibility:1};lm[16]={x:.38,y:lm[12]!.y+dy,visibility:1};return lm;};
    for(let t=0;t<=200;t+=33)c.update(both(.3),t);
    const punches=[];for(let t=233;t<=1500;t+=33)punches.push(...c.update(t<600?both(-.08):t<1100?both(-.08,.9):both(.35),t).punches);
    expect(punches).toEqual([]);
  });
  it('per-player thresholds from the punch setup step lower or raise the bar per side', () => {
    const c=new PoseClassifier({guardThreshold:0,punchThresholds:{L:1.5,R:.7}});rest(c);
    c.update(frame(0,1.8),233);expect(c.update(frame(),266).punches).toEqual([]);
    expect(()=>new PoseClassifier({guardThreshold:0,punchThresholds:{L:.1,R:.7}})).toThrow();
  });
  it('clears stale lean and pending dwell after a camera gap over250ms', () => {
    const c=new PoseClassifier({guardThreshold:-1});
    c.update(frame(.7),0); c.update(frame(.7),200);
    expect(c.update(frame(.7),451).state.lean).toBe(null);
    expect(c.update(frame(.7),451+LEAN_DWELL_MS-1).state.lean).toBe(null);
    expect(c.update(frame(.7),451+LEAN_DWELL_MS).state.lean).toBe('L');
    c.reset(); c.update(frame(.7),0);
    expect(c.update(frame(.7),1000).state.lean).toBe(null);
  });
  it('clears held input on invalid landmarks and invalidates calibration cleanly', () => {
    const c=new PoseClassifier({guardThreshold:-1});
    c.update(frame(.7),0); c.update(frame(.7),200);
    const bad=frame(); bad[15]!.visibility=.1;
    expect(c.update(bad,210).state).toEqual({kind:'pose',guard:false,lean:null,at:210,source:'pose'});
    expect(c.update(frame(.7),220).state.lean).toBe(null);
    c.setGuardThreshold(1);
    expect(c.update(frame(),230).state.guard).toBe(false);
    expect(()=>c.setGuardThreshold(NaN)).toThrow();
  });
});

describe('body-relative guard and raised-arm punch gate', () => {
  function rotate(points:Landmark[],angle:number):Landmark[] {
    const cos=Math.cos(angle),sin=Math.sin(angle);
    return points.map(p=>({...p,x:.5+(p.x-.5)*cos-(p.y-.5)*sin,y:.5+(p.x-.5)*sin+(p.y-.5)*cos}));
  }
  function hands(up:boolean):Landmark[] {
    const lm=frame();
    lm[15]={x:.57,y:up?.38:.92,visibility:1};lm[16]={x:.43,y:up?.38:.92,visibility:1};
    lm[13]={x:.7,y:.85,visibility:1};lm[14]={x:.3,y:.85,visibility:1};
  lm[23]={x:.56,y:1.05,visibility:1};lm[24]={x:.44,y:1.05,visibility:1};
  return lm;
  }
  it('retains calibrated guard through rigid leans in either direction', () => {
    const upright=hands(true);
    const original=measurePose(upright)!;
    for(const angle of [-.8,-.5,.5,.8]) {
      const leaned=rotate(upright,angle);
      expect(measurePose(leaned)!.g).toBeCloseTo(original.g);
      expect(measurePose(leaned)!.wristsNearBody).toBe(true);
      const c=new PoseClassifier({guardThreshold:original.g-.05});
      c.update(upright,0);
      expect(c.update(leaned,100).state.guard).toBe(true);
      expect(c.update(leaned,300).state.guard).toBe(true);
      expect(c.update(leaned,300).state.lean).toBe(angle>0?'L':'R');
    }
  });
  it('releases guard when either wrist drops in the tilted body frame', () => {
    const c=new PoseClassifier({guardThreshold:.5});
    const up=rotate(hands(true),.7);c.update(up,0);
    const dropped=hands(true);dropped[16]!.y=.9;
    expect(c.update(rotate(dropped,.7),100).state.guard).toBe(false);
  });
  it('does not freeze a new lean merely because relaxed wrists hang far below shoulders', () => {
    for(const angle of [-.8,.8]) {
      const c=new PoseClassifier({guardThreshold:.3});
      const leaned=rotate(hands(false),angle);
      const metrics=measurePose(leaned)!;
      expect(Math.max(metrics.leftExtension,metrics.rightExtension)).toBeGreaterThan(1.6);
      expect(metrics.punchExtended).toBe(false);
      expect(c.update(leaned,0).state.lean).toBe(null);
      expect(c.update(leaned,200).state.lean).toBe(angle>0?'L':'R');
      expect(c.update(leaned,200).state.guard).toBe(false);
    }
  });
  it('continues to gate a raised sideways extension while excluding arms dropping from guard', () => {
    const raised=frame(0,1.8);expect(measurePose(raised)!.punchExtended).toBe(true);
    expect(measurePose(hands(false))!.punchExtended).toBe(false);
  });
});
