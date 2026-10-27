import { expect, it } from 'vitest';
import { FixtureRecorder } from './recorder';
it('records frame-relative tuples, held intervals and punch keys without runtime source dependence',()=>{
  const recorder=new FixtureRecorder();
  recorder.start(1000,'seated',-.8,{guard:true,lean:null});
  recorder.frame(Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:1})),1100);
  recorder.key({guard:true,lean:'L',punch:true},1150);
  recorder.key({guard:false,lean:'L'},1300);
  const result=recorder.stop(1500)!;
  expect(result.landmarks.calibration.guardThreshold).toBe(-.8);
  expect(result.landmarks.frames[0].t).toBe(100);
  expect(result.landmarks.frames[0].lm).toHaveLength(33);
  expect(result.labels).toEqual({version:1,label_source:'key',mode:'seated',intervals:[{event:'guard',start:0,end:300},{event:'lean_L',start:150,end:500}],events:[{event:'left_punch',t:150}]});
  expect(recorder.stop(1600)).toBeNull();
});
