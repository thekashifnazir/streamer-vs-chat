import { expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverRecordedFixtures } from './report';
import { scoreCueDirections } from './cue';
import { scoreRecordedFixture, type Labels } from './replay';
type Replay=Parameters<typeof scoreCueDirections>[0];
const labels:Labels={version:1,label_source:'cue',onset_verified:false,intervals:[{event:'lean_L',start:0,end:3000}]};
function run(duration:number):Replay {
  return {events:[{event:'lean_L_on',t:1000}],states:[
    {t:0,guard:false,lean:null,valid:true},
    ...Array.from({length:Math.floor(duration/100)+1},(_,i)=>({t:1000+i*100,guard:false,lean:'L' as const,valid:true})),
    {t:1000+duration,guard:false,lean:null,valid:true},
  ]};
}
it('requires at least one continuous second in the correct cue direction',()=>{
  expect(scoreCueDirections(run(999),labels).pass).toBe(false);
  expect(scoreCueDirections(run(1000),labels).pass).toBe(true);
});
it('rejects a new opposite direction inside the cue even with enough correct evidence',()=>{
  const replay=run(1500);replay.events.unshift({event:'lean_R_on',t:500});
  expect(scoreCueDirections(replay,labels).pass).toBe(false);
});
it('reports carry-in from the previous cue without inventing an opposite detection',()=>{
  const replay=run(1500);replay.states.unshift({t:-100,guard:false,lean:'R',valid:true});
  const report=scoreCueDirections(replay,labels);
  expect(report.segments[0]?.carryIn).toBe('R');
  expect(report.segments[0]?.oppositeDetections).toHaveLength(0);
  expect(report.pass).toBe(true);
});
it('does not credit continuous evidence across camera gaps',()=>{
  const replay=run(1000);replay.states=replay.states.filter(state=>state.t!==1500&&state.t!==1600);
  expect(scoreCueDirections(replay,labels).pass).toBe(false);
});
it('keeps cue onset percentages diagnostic while key labels retain the strict150ms gate',()=>{
  const frames=Array.from({length:31},(_,i)=>{
    const lm=Array.from({length:33},()=>[.5,.5,0,1]);
    const tilt=i>=10?.7:0;
    lm[11]=[.6,.5+tilt*.1,0,1];lm[12]=[.4,.5-tilt*.1,0,1];lm[15]=[.6,.5+tilt*.1,0,1];lm[16]=[.4,.5-tilt*.1,0,1];
    return {t:i*100,lm};
  });
  const fixture={version:1,calibration:{guardThreshold:1},frames};
  const cue=scoreRecordedFixture(fixture,labels);
  expect(cue.strictTimingAcceptancePass).toBe(false);
  expect(cue.cue?.pass).toBe(true);
  expect(cue.acceptancePass).toBe(true);
  expect(scoreRecordedFixture(fixture,{...labels,label_source:'key'}).acceptancePass).toBe(false);
});

it('counts a correct lean already held at the cue boundary without requiring a new timed onset',()=>{
  const replay=run(1000);replay.events[0]!.t=-100;
  expect(scoreCueDirections(replay,labels).pass).toBe(true);
});

it('does not allow a steady profile to waive strict timing for a key-labelled recording',()=>{
  const root=mkdtempSync(join(tmpdir(),'svc-key-profile-'));
  try {
    const lm=Array.from({length:33},()=>[.5,.5,0,1]);
    lm[11]=[.6,.57,0,1];lm[12]=[.4,.43,0,1];lm[15]=[.6,.57,0,1];lm[16]=[.4,.43,0,1];
    writeFileSync(join(root,'session.landmarks.json'),JSON.stringify({version:1,calibration:{guardThreshold:1},frames:Array.from({length:31},(_,i)=>({t:i*100,lm}))}));
    writeFileSync(join(root,'session.labels.json'),JSON.stringify({...labels,label_source:'key'}));
    writeFileSync(join(root,'pose-regressions.json'),JSON.stringify({session:{labels:'session.labels.json',transitionMs:500,minGuardAccuracy:.9,minLeanAccuracy:.8,note:'Must not override key timing'}}));
    const report=discoverRecordedFixtures(root)[0]!;
    expect(report.steady?.pass).toBe(true);
    expect(report.strictTimingAcceptancePass).toBe(false);
    expect(report.acceptancePass).toBe(false);
  } finally {rmSync(root,{recursive:true,force:true});}
});
