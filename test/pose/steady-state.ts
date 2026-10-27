import { replayFixture, normalizeLandmarks, type Fixture, type Labels } from './replay';
import { scoreCueDirections } from './cue';
import { measurePose } from '../../capture/src/classifier';
export type SteadyProfile = {
  labels:string;transitionMs:number;minGuardAccuracy:number;minLeanAccuracy:number;note:string;
};
/** Explicit steady-state acceptance for manually scheduled recordings, not an onset-timing waiver for other fixtures. */
export function scoreSteadySegments(fixture:Fixture,labels:Labels,profile:SteadyProfile) {
  const replay=replayFixture(fixture);
  const {states}=replay;
  const cue=labels.label_source==='cue'?scoreCueDirections(replay,labels):null;
  const guards=(labels.intervals??[]).filter(interval=>interval.event==='guard');
  const segments=(labels.intervals??[]).filter(interval=>interval.event==='lean_L'||interval.event==='lean_R').map((interval,index)=>{
    const start=interval.start+profile.transitionMs;
    const end=interval.end-profile.transitionMs;
    const frames=states.filter(frame=>frame.t>=start&&frame.t<end);
    const guardExpected=(t:number)=>guards.some(guard=>t>=guard.start&&t<guard.end);
    const side=interval.event==='lean_L'?'L':'R';
    const observations=fixture.frames.filter(frame=>frame.t>=interval.start&&frame.t<interval.end).map(frame=>({t:frame.t,metrics:measurePose(normalizeLandmarks(frame.lm))}));
    const reachesTrigger=(tilt:number)=>side==='L'?tilt>.5:tilt<-.5;
    const firstTriggerAt=observations.find(frame=>frame.metrics&&reachesTrigger(frame.metrics.tilt))?.t??null;
    const scoredObservations=observations.filter(frame=>frame.t>=start&&frame.t<end);
    const triggerFraction=scoredObservations.length?scoredObservations.filter(frame=>frame.metrics&&reachesTrigger(frame.metrics.tilt)).length/scoredObservations.length:0;
    const guardAccuracy=frames.length?frames.filter(frame=>frame.valid&&frame.guard===guardExpected(frame.t)).length/frames.length:0;
    const leanAccuracy=frames.length?frames.filter(frame=>frame.valid&&frame.lean===side).length/frames.length:0;
    return {side,guardExpected:guardExpected((start+end)/2),start,end,frames:frames.length,guardAccuracy,leanAccuracy,firstTriggerAt,triggerFraction,
      pass:frames.length>0&&guardAccuracy>=profile.minGuardAccuracy&&(cue?cue.segments[index]!.pass:leanAccuracy>=profile.minLeanAccuracy)};
  });
  return {profile,cue,segments,pass:segments.length>0&&segments.every(segment=>segment.pass)};
}
