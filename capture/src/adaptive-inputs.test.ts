import { expect, it } from 'vitest';
import { PoseClassifier, type Landmark } from './classifier';
import { InputStore } from '../../server/src/inputs';
function pose(g:number,tilt=0):Landmark[] {
  const points=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));
  points[11]={x:.6,y:.5,visibility:1};points[12]={x:.4,y:.5,visibility:1};
  points[15]={x:.6,y:.5-g*.2,visibility:1};points[16]={x:.4,y:.5-g*.2,visibility:1};
  points[13]={x:.65,y:.85,visibility:1};points[14]={x:.35,y:.85,visibility:1};
  points[23]={x:.55,y:1.05,visibility:1};points[24]={x:.45,y:1.05,visibility:1};
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

it('uses calibration spread for the release band rather than a fixed0.25',()=>{
  const wide=new PoseClassifier({guardThreshold:.2,guardMedians:{neutral:-1,resting:-.8,guard:1}});
  const narrow=new PoseClassifier({guardThreshold:.2,guardMedians:{neutral:.2,resting:.2,guard:.6}});
  wide.update(pose(.6),0);narrow.update(pose(.6),0);
  expect(wide.update(pose(0),100).state.guard).toBe(true); // band0.5: release−0.3
  expect(narrow.update(pose(0),100).state.guard).toBe(false); // band0.1: release+0.1
  expect(()=>new PoseClassifier({guardThreshold:0,guardReleaseBand:0})).toThrow();
  expect(()=>new PoseClassifier({guardThreshold:0,guardMedians:{neutral:1,resting:0,guard:0}})).toThrow();
});
it('requires each wrist above its own elbow and the raw mid-torso even when fine guard height passes',()=>{
  const classifier=new PoseClassifier({guardThreshold:-.5});
  expect(classifier.update(pose(.5),0).state.guard).toBe(true);
  const elbow=pose(.5);elbow[13]!.y=.3;
  expect(classifier.update(elbow,100).state.guard).toBe(false);
  classifier.update(pose(.5),200);
  const torso=pose(-.45);torso[23]!.y=.65;torso[24]!.y=.65;
  expect(classifier.update(torso,300).state.guard).toBe(false);
  const rightElbow=pose(.5);rightElbow[14]!.y=.3;
  expect(classifier.update(rightElbow,400).state.guard).toBe(false);
});
it('fails guard closed on missing anatomy while preserving shoulder-based lean',()=>{
  const classifier=new PoseClassifier({guardThreshold:0,leanThresholds:{L:.3,R:.3}});
  const points=pose(.5,.4);points[23]!.x=NaN;
  classifier.update(points,0);
  expect(classifier.update(points,200).state).toMatchObject({guard:false,lean:'L'});
});
it('raises both side floors using neutral sway so standing-still excursions do not start a lean',()=>{
  const classifier=new PoseClassifier({guardThreshold:0,leanThresholds:{L:.3,R:.3},neutralSwayP95:.25});
  for(let at=0;at<=3000;at+=50) {
    const tilt=at<1500?.34:-.34;
    expect(classifier.update(pose(.5,tilt),at).state.lean).toBeNull();
  }
  classifier.update(pose(.5,.45),3100);
  expect(classifier.update(pose(.5,.45),3300).state.lean).toBe('L');
  expect(()=>new PoseClassifier({guardThreshold:0,neutralSwayP95:NaN})).toThrow();
});
