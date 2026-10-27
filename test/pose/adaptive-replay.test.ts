import { expect, it } from 'vitest';
import { FixtureRecorder } from '../../capture/src/recorder';
import type { Landmark } from '../../capture/src/classifier';
import { scoreRecordedFixture } from './replay';
it('replays recorded per-side thresholds and keeps waist-resting hands off',()=>{
  const recorder=new FixtureRecorder();
  const evidence={leanThresholds:{L:.3,R:.528},leanPeaks:{L:.45,R:.88},guardMedians:{neutral:-2.9,resting:-1.3,guard:.5}};
  recorder.start(1000,'standing',-1.2,{guard:false,lean:null},evidence);
  evidence.leanThresholds.L=.9; // The recording owns a snapshot of its calibration.
  const points:Landmark[]=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));
  points[11]={x:.6,y:.5,visibility:1};points[12]={x:.4,y:.5,visibility:1};
  points[15]={x:.6,y:.76,visibility:1};points[16]={x:.4,y:.76,visibility:1};
  const angle=Math.atan(.45),cos=Math.cos(angle),sin=Math.sin(angle);
  const lm=points.map(p=>({...p,x:.5+(p.x-.5)*cos-(p.y-.5)*sin,y:.5+(p.x-.5)*sin+(p.y-.5)*cos}));
  for(let at=1000;at<=2500;at+=50) {
    if(at===1200)recorder.key({guard:false,lean:'L'},at);
    recorder.frame(lm,at);
  }
  const recording=recorder.stop(2600)!;
  expect(recording.landmarks.calibration.leanThresholds).toEqual({L:.3,R:.528});
  expect(recording.landmarks.calibration.guardMedians).toEqual(evidence.guardMedians);
  const report=scoreRecordedFixture(recording.landmarks,recording.labels);
  expect(report.acceptancePass).toBe(true);
  expect(report.perEvent.guard_on).toBeUndefined();
  expect(scoreRecordedFixture({...recording.landmarks,calibration:{guardThreshold:-1.2}},recording.labels).acceptancePass).toBe(false);
});
