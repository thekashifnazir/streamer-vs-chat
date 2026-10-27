import type { Labels, replayFixture } from './replay';

/** Cue times are prompts, not onset ground truth. Score observed direction runs. */
export function scoreCueDirections(replay:ReturnType<typeof replayFixture>,labels:Labels) {
  const intervals=(labels.intervals??[]).filter(interval=>interval.event==='lean_L'||interval.event==='lean_R');
  const segments=intervals.map(interval=>{
    const side=interval.event==='lean_L'?'L':'R';
    const opposite=side==='L'?'R':'L';
    let runMs=0,longestRunMs=0,detectedMs=0,oppositeStateMs=0;
    for(let i=0;i<replay.states.length;i++) {
      const state=replay.states[i]!;
      const next=replay.states[i+1];
      // Do not infer held input across a missing-frame gap or after the last frame.
      if(!next||next.t-state.t>250||!state.valid){runMs=0;continue;}
      const duration=Math.max(0,Math.min(next.t,interval.end)-Math.max(state.t,interval.start));
      if(duration===0)continue;
      if(state.lean===side) {runMs+=duration;detectedMs+=duration;longestRunMs=Math.max(longestRunMs,runMs);}
      else {runMs=0;if(state.lean===opposite)oppositeStateMs+=duration;}
    }
    const detections=replay.events.filter(event=>event.t>=interval.start&&event.t<interval.end&&event.event.endsWith('_on'));
    const oppositeDetections=detections.filter(event=>event.event===`lean_${opposite}_on`);
    const correctDetections=detections.filter(event=>event.event===`lean_${side}_on`);
    const carryIn=replay.states.filter(state=>state.t<interval.start).at(-1)?.lean??null;
    return {side,start:interval.start,end:interval.end,detectedMs,longestRunMs,
      correctDetections,oppositeDetections,carryIn,oppositeStateMs,
      pass:longestRunMs>=1000&&oppositeDetections.length===0};
  });
  return {minimumRunMs:1000,oppositePolicy:'Reject new opposite-direction detections; report carry-in from a preceding cue separately.',
    segments,pass:segments.length>0&&segments.every(segment=>segment.pass)};
}
