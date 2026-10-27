import { describe, expect, it } from 'vitest';
import { measurePose, PoseClassifier, type Landmark } from './classifier.js';
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
  it('maps positive raw tilt to player L, waits200ms and uses .25 release hysteresis', () => {
    const c=new PoseClassifier({guardThreshold:0});
    expect(c.update(frame(.6),0).state.lean).toBe(null);
    expect(c.update(frame(.6),199).state.lean).toBe(null);
    expect(c.update(frame(.6),200).state.lean).toBe('L');
    expect(c.update(frame(.3),201).state.lean).toBe('L');
    expect(c.update(frame(.24),202).state.lean).toBe(null);
    c.update(frame(-.6),300);
    expect(c.update(frame(-.6),500).state.lean).toBe('R');
  });
  it('requires continuous dwell; a neutral frame interrupts it', () => {
    const c=new PoseClassifier({guardThreshold:0});
    c.update(frame(.7),0); c.update(frame(),150); c.update(frame(.7),200);
    expect(c.update(frame(.7),399).state.lean).toBe(null);
    expect(c.update(frame(.7),400).state.lean).toBe('L');
  });
  it('freezes held lean during the300ms punch gate then restarts dwell', () => {
    const c=new PoseClassifier({guardThreshold:0});
    c.update(frame(.7),0); c.update(frame(.7),200);
    const raisedPunch=frame(-.7,1.7); raisedPunch[15]!.y-=.13;
    expect(c.update(raisedPunch,300).state.lean).toBe('L');
    c.update(frame(-.7),500);
    expect(c.update(frame(-.7),599).state.lean).toBe('L');
    expect(c.update(frame(-.7),600).state.lean).toBe(null);
    expect(c.update(frame(-.7),799).state.lean).toBe(null);
    expect(c.update(frame(-.7),800).state.lean).toBe('R');
  });
  it('emits a bonus punch at the observed peak only after retraction and rearms on return', () => {
    const c=new PoseClassifier({guardThreshold:0});
    c.update(frame(),0);
    expect(c.update(frame(0,1.8),100).punches).toEqual([]);
    expect(c.update(frame(0,2),120).punches).toEqual([]);
    expect(c.update(frame(0,1.8),140).punches).toEqual([{kind:'punch',side:'L',at:120,source:'pose'}]);
    expect(c.update(frame(0,2),400).punches).toEqual([]);
    expect(c.update(frame(0,1.7),420).punches).toEqual([]);
    c.update(frame(),440); c.update(frame(0,2),460);
    expect(c.update(frame(),480).punches).toHaveLength(1);
  });
  it('uses a200ms global refractory across arms', () => {
    const c=new PoseClassifier({guardThreshold:0});
    c.update(frame(),0); c.update(frame(0,2),100);
    expect(c.update(frame(0,1.7),120).punches).toHaveLength(1);
    c.update(frame(0,.6,2),150);
    expect(c.update(frame(),180).punches).toEqual([]);
  });
  it('clears stale lean and pending dwell after a camera gap over250ms', () => {
    const c=new PoseClassifier({guardThreshold:-1});
    c.update(frame(.7),0); c.update(frame(.7),200);
    expect(c.update(frame(.7),451).state.lean).toBe(null);
    expect(c.update(frame(.7),650).state.lean).toBe(null);
    expect(c.update(frame(.7),651).state.lean).toBe('L');
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
