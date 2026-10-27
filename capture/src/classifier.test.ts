import { describe, expect, it } from 'vitest';
import { measurePose, PoseClassifier, type Landmark } from './classifier.js';
function frame(tilt = 0, leftExtension = .6, rightExtension = .6): Landmark[] {
  const lm = Array.from({length:33}, () => ({x:0,y:0,visibility:1}));
  lm[11] = {x:.6,y:.5 + tilt*.1,visibility:1}; lm[12] = {x:.4,y:.5 - tilt*.1,visibility:1};
  lm[15] = {x:.6+leftExtension*.2,y:lm[11]!.y,visibility:1};
  lm[16] = {x:.4-rightExtension*.2,y:lm[12]!.y,visibility:1};
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
    expect(c.update(frame(-.7,1.7),300).state.lean).toBe('L');
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
