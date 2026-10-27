import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { PoseClassifier, type Landmark } from './classifier';
import { normalizeLandmarks, type Fixture } from '../../test/pose/replay';
import { InputStore } from '../../server/src/inputs';
import { NO_POSE_MESSAGE, trackingMessage } from './tracking-status';

function frame(g:number,tilt=0):Landmark[] {
  const lm=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));
  lm[11]={x:.6,y:.5+tilt*.1,visibility:1};
  lm[12]={x:.4,y:.5-tilt*.1,visibility:1};
  lm[15]={x:.6,y:.5-g*.2,visibility:1};
  lm[16]={x:.4,y:.5-g*.2,visibility:1};
  return lm;
}
it('retains guard through reported lean noise, releases at the lower boundary, and rearms at midpoint',()=>{
  const classifier=new PoseClassifier({guardThreshold:-.44});
  expect(classifier.update(frame(-.52),0).state.guard).toBe(false);
  expect(classifier.update(frame(-.17),100).state.guard).toBe(true);
  for(const [i,g] of [-.52,-.30,-.44,-.35,-.45].entries()) {
    expect(classifier.update(frame(g),200+i*100).state.guard).toBe(true);
  }
  expect(classifier.update(frame(-.70),700).state.guard).toBe(false);
  expect(classifier.update(frame(-.52),800).state.guard).toBe(false);
  expect(classifier.update(frame(-.30),900).state.guard).toBe(true);
  classifier.reset();
  expect(classifier.update(frame(-.52),1000).state.guard).toBe(false);
});
it('keeps one guard edge at the server throughout a recorded ten-second guard-and-lean segment',()=>{
  const fixture=JSON.parse(readFileSync(new URL('../../test/fixtures/kash-webcam.landmarks.json',import.meta.url),'utf8')) as Fixture;
  // Existing raw recording, unchanged. 0.30 is a deliberate stress threshold,
  // not a claimed calibration measurement: screen-space g in this segment crosses it repeatedly.
  const classifier=new PoseClassifier({guardThreshold:.30});
  const server=new InputStore();
  let previous=false;let edges=0;let leanSeen=false;let belowMidpoint=false;
  const frames=fixture.frames.filter(f=>f.t>=29000&&f.t<=39000);
  expect(frames).toHaveLength(101);
  for(const frame of frames) {
    const result=classifier.update(normalizeLandmarks(frame.lm),frame.t);
    const state=server.receive(result.state,frame.t+10).state;
    if(state.guard!==previous)edges++;
    previous=state.guard;
    leanSeen ||= state.lean!==null;
    const raw=normalizeLandmarks(frame.lm);
    const screenG=((raw[11]!.y+raw[12]!.y)/2-Math.max(raw[15]!.y,raw[16]!.y))/Math.abs(raw[11]!.x-raw[12]!.x);
    belowMidpoint ||= screenG<.30;
    expect(state.guard).toBe(true);
  }
  expect(leanSeen).toBe(true);expect(belowMidpoint).toBe(true);expect(edges).toBe(1);
});
it('shows NO POSE and immediately releases held guard/lean on the server throughout tracking loss',()=>{
  const classifier=new PoseClassifier({guardThreshold:-.44});
  const server=new InputStore();
  classifier.update(frame(.5,.7),0);
  const held=classifier.update(frame(.5,.7),200);
  expect(server.receive(held.state,210).state).toMatchObject({guard:true,lean:'L'});
  for(let at=300;at<=10300;at+=100) {
    const lost=classifier.update([],at);
    expect(trackingMessage(lost.metrics!==null,false,false)).toBe(NO_POSE_MESSAGE);
    expect(server.receive(lost.state,at+10).state).toMatchObject({guard:false,lean:null});
  }
  expect(classifier.update(frame(-.52),10400).state.guard).toBe(false);
});
it('still releases immediately when wrists leave the guard envelope or calibration changes',()=>{
  const classifier=new PoseClassifier({guardThreshold:-.44});
  classifier.update(frame(.5),0);
  const wide=frame(.5);wide[15]!.x=0;
  expect(classifier.update(wide,100).state.guard).toBe(false);
  classifier.update(frame(.5),200);
  classifier.setGuardThreshold(.6);
  expect(classifier.update(frame(.5),300).state.guard).toBe(false);
});
