import { expect, it } from 'vitest';
import { PoseClassifier, type Landmark } from './classifier';
import { InputStore } from '../../server/src/inputs';
function pose(g:number,tilt=0):Landmark[] {
  const points=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));
  points[11]={x:.6,y:.5,visibility:1};points[12]={x:.4,y:.5,visibility:1};
  points[15]={x:.6,y:.5-g*.2,visibility:1};points[16]={x:.4,y:.5-g*.2,visibility:1};
  const angle=Math.atan(tilt),cos=Math.cos(angle),sin=Math.sin(angle);
  return points.map(p=>({...p,x:.5+(p.x-.5)*cos-(p.y-.5)*sin,y:.5+(p.x-.5)*sin+(p.y-.5)*cos}));
}
it('releases a previously held guard at waist height even with the old low threshold',()=>{
  const classifier=new PoseClassifier({guardThreshold:-1.2});
  const server=new InputStore();
  expect(server.receive(classifier.update(pose(.5),0).state,0).state.guard).toBe(true);
  for(let at=100;at<=10000;at+=100) {
    const g=[-1.3,-1.46,-1.09][(at/100)%3]!;
    expect(server.receive(classifier.update(pose(g,at<5000?.57:-.88),at).state,at).state.guard).toBe(false);
  }
  expect(classifier.update(pose(.5),10100).state.guard).toBe(true);
});
it('applies each calibrated side threshold and release hysteresis independently',()=>{
  const classifier=new PoseClassifier({guardThreshold:0,leanThresholds:{L:.6*.57,R:.6*.88}});
  expect(classifier.update(pose(.5,.45),0).state.lean).toBeNull();
  expect(classifier.update(pose(.5,.45),200).state.lean).toBe('L');
  expect(classifier.update(pose(.5,.31),300).state.lean).toBe('L');
  expect(classifier.update(pose(.5,.16),400).state.lean).toBeNull();
  classifier.update(pose(.5,-.8),500);
  expect(classifier.update(pose(.5,-.8),700).state.lean).toBe('R');
  expect(classifier.update(pose(.5,-.31),800).state.lean).toBe('R');
  expect(classifier.update(pose(.5,-.25),900).state.lean).toBeNull();
});
it('detects at least80% of sustained comfortable weak-L and strong-R frames with hands raised or relaxed',()=>{
  for(const g of [.5,-1.3])for(const side of ['L','R'] as const) {
    const classifier=new PoseClassifier({guardThreshold:0,leanThresholds:{L:.342,R:.528}});
    const states=[];
    for(let at=0;at<3000;at+=50)states.push(classifier.update(pose(g,side==='L'?.45:-.8),at).state);
    expect(states.filter(state=>state.lean===side).length/states.length).toBeGreaterThanOrEqual(.8);
    expect(states.every(state=>state.guard===(g>0))).toBe(true);
  }
});
it('validates calibrated thresholds and clears held state on recalibration',()=>{
  const classifier=new PoseClassifier({guardThreshold:0,leanThresholds:{L:.3,R:.4}});
  classifier.update(pose(.5,.4),0);classifier.update(pose(.5,.4),200);
  classifier.setCalibration({guardThreshold:0,leanThresholds:{L:.5,R:.6}});
  expect(classifier.update(pose(.5,.4),300).state.lean).toBeNull();
  expect(()=>classifier.setCalibration({guardThreshold:0,leanThresholds:{L:NaN,R:.5}})).toThrow();
  expect(()=>classifier.setCalibration({guardThreshold:0,leanThresholds:{L:.1,R:.5}})).toThrow();
});
