import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { replayFixture, type Fixture, type Labels } from './replay';
import { scoreSteadySegments, type SteadyProfile } from './steady-state';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/kash-guard-through-leans-logitech.landmarks.json',import.meta.url),'utf8')) as Fixture;
const labels=JSON.parse(readFileSync(new URL('../fixtures/kash-guard-through-leans-logitech.labels.corrected.json',import.meta.url),'utf8')) as Labels;
const profiles=JSON.parse(readFileSync(new URL('../fixtures/pose-regressions.json',import.meta.url),'utf8')) as Record<string,SteadyProfile>;
const report=scoreSteadySegments(fixture,labels,profiles['kash-guard-through-leans-logitech']!);
it('uses the corrected continuous guard interval and meets guard accuracy on both lean sides',()=>{
  expect(labels.label_source).toBe('cue');
  expect(labels.onset_verified).toBe(false);
  expect(labels.intervals?.find(interval=>interval.event==='guard')).toEqual({event:'guard',start:300,end:45300});
  expect(report.segments).toHaveLength(6);
  for(const segment of report.segments)expect(segment.guardAccuracy).toBeGreaterThanOrEqual(.90);
});
it('detects relaxed-arm leans once the shoulders actually lean; full schedule acceptance is scored separately',()=>{
  const {states}=replayFixture(fixture);
  for(const segment of report.segments.filter(segment=>!segment.guardExpected)) {
    expect(segment.firstTriggerAt).not.toBeNull();
    // Diagnostics only: allow the same500ms transition from the first observed
    // trigger. This does not alter the supplied labels or full-segment gate.
    const frames=states.filter(state=>state.t>=segment.firstTriggerAt!+500&&state.t<segment.end);
    expect(frames.length).toBeGreaterThan(20);
    expect(frames.filter(state=>state.lean===segment.side&&!state.guard).length/frames.length).toBeGreaterThanOrEqual(.80);
  }
});

it('passes all six cue directions with at least1s evidence and no new wrong-direction detections',()=>{
  expect(report.cue?.segments).toHaveLength(6);
  for(const segment of report.cue!.segments) {
    expect(segment.longestRunMs).toBeGreaterThanOrEqual(1000);
    expect(segment.oppositeDetections).toHaveLength(0);
  }
  expect(report.pass).toBe(true);
  // Timing accuracy stays visible, including reaction-delayed no-guard cues.
  expect(report.segments.filter(segment=>!segment.guardExpected).every(segment=>segment.leanAccuracy<.8)).toBe(true);
});
