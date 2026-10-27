import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FixtureRecorder } from '../../capture/src/recorder.js';
import type { Landmark } from '../../capture/src/classifier.js';
import { discoverRecordedFixtures, recordedFixtureReport } from './report.js';
import { expectedRecordedEvents, normalizeLandmarks, scoreEvents, scoreRecordedFixture } from './replay.js';

describe('recorded landmark regression',()=>{
  const report=recordedFixtureReport();
  it('replays every supplied clip and enforces each normalized-image punch gate at150ms',()=>{
    expect(report.pexels).toHaveLength(8);
    for(const clip of report.pexels) {
      expect(clip.frames).toBeGreaterThan(0);
      if('gate' in clip && clip.gate) expect(clip.gate.pass,`${clip.id}: ${JSON.stringify(clip.punches)}`).toBe(true);
    }
    const scored=report.pexels.find(c=>c.id==='6296644');
    expect(scored && 'punches'in scored && scored.punches?.recall).toBeGreaterThanOrEqual(.45);
  });
  for(const recording of report.recordings) {
    it(`enforces150ms defence and configured punch gates for ${recording.path}`,()=>{
      expect(recording.defenceLabelsMatched,JSON.stringify(recording)).toBe(true);
      if(recording.punchGate)expect(recording.punchGate.pass,JSON.stringify(recording.punches)).toBe(true);
    });
  }
  it('reports world baselines as incompatible with normalized-image runtime',()=>{
    expect(report.incompatibleGates.map(g=>g.id)).toEqual(['6296644:world','5752495:world']);
    expect(report.incompatibleGates.every(g=>g.status==='INCOMPATIBLE')).toBe(true);
  });
  it('reads the recorded standing and seated guard/lean cues without claiming precise onset timing',()=>{
    expect(report.kash.cues).toHaveLength(14);
    expect(report.kash.cues.filter(c=>c.observedWithin3000ms)).toHaveLength(14);
    expect(report.kash.limitation).toContain('not movement onsets');
  });
});
describe('new recorder event matching',()=>{
  it('adapts tuple landmarks and recorder intervals/punches',()=>{
    expect(normalizeLandmarks([[.1,.2,.3,.9]])).toEqual([{x:.1,y:.2,z:.3,visibility:.9}]);
    expect(expectedRecordedEvents({version:1,intervals:[{event:'guard',start:100,end:500},{event:'lean_L',start:200,end:300}],events:[{event:'left_punch',t:350}]})).toEqual([
      {event:'guard_on',t:100},{event:'guard_off',t:500},{event:'lean_L_on',t:200},{event:'lean_L_off',t:300},{event:'left_punch',t:350},
    ]);
  });
  it('matches one-to-one within150ms and rejects151ms even for punches',()=>{
    const result=scoreEvents([{event:'left_punch',t:250},{event:'left_punch',t:551}], [{event:'left_punch',t:100},{event:'left_punch',t:400}]);
    expect(result.matched).toBe(1); expect(result.precision).toBe(.5);expect(result.recall).toBe(.5);
    expect(scoreEvents([{event:'left_punch',t:100}],[{event:'left_punch',t:100},{event:'left_punch',t:150}]).matched).toBe(1);
    expect(scoreEvents([{event:'left_punch',t:0},{event:'left_punch',t:130}],[{event:'left_punch',t:100},{event:'left_punch',t:200}]).matched).toBe(2);
    expect(scoreEvents([{event:'right_punch',t:100}],[{event:'left_punch',t:100}]).matched).toBe(0);
  });
});

function recordedGuardSession(includePunchLabel=false) {
  const recorder=new FixtureRecorder();
  const pose=(guard:boolean):Landmark[]=>{
    const points=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));
    points[11]={x:.6,y:.5,visibility:1};points[12]={x:.4,y:.5,visibility:1};
    points[15]={x:.6,y:guard?.3:.9,visibility:1};points[16]={x:.4,y:guard?.3:.9,visibility:1};
    return points;
  };
  recorder.start(1000,'standing',0,{guard:false,lean:null});
  recorder.frame(pose(false),1000);
  recorder.key({guard:true,lean:null},1100);
  recorder.frame(pose(true),1100);
  if(includePunchLabel)recorder.key({guard:true,lean:null,punch:true},1150);
  recorder.frame(pose(true),1200);
  return recorder.stop(1300)!;
}
describe('recorder files and observation boundaries',()=>{
  it('censors an open final guard closed by stop after the last observed frame',()=>{
    const session=recordedGuardSession();
    const result=scoreRecordedFixture(session.landmarks,session.labels);
    expect(result.defenceLabelsMatched).toBe(true);
    expect(result.acceptancePass).toBe(true);
    expect(result.notScored).toEqual([{event:'guard_off',t:300,reason:'Interval boundary outside observed frame horizon'}]);
    expect(result.defence.expected).toBe(1);
  });
  it('keeps unmatched bonus punch labels diagnostic unless an explicit gate requires recall',()=>{
    const session=recordedGuardSession(true);
    const report=scoreRecordedFixture(session.landmarks,session.labels);
    expect(report.allLabelsMatched).toBe(false);
    expect(report.defenceLabelsMatched).toBe(true);
    expect(report.acceptancePass).toBe(true);
    expect(scoreRecordedFixture(session.landmarks,session.labels,{minRecall:.5,minPrecision:0}).acceptancePass).toBe(false);
  });
  it('discovers nested v1 recordings and applies their filename gate without changing legacy fixtures',()=>{
    const directory=mkdtempSync(join(tmpdir(),'svc-pose-'));
    try {
      mkdirSync(join(directory,'new','seated'),{recursive:true});
      const session=recordedGuardSession(true);
      const prefix=join(directory,'new','seated','session');
      writeFileSync(`${prefix}.landmarks.json`,JSON.stringify(session.landmarks));
      writeFileSync(`${prefix}.labels.json`,JSON.stringify(session.labels));
      writeFileSync(join(directory,'legacy.landmarks.json'),JSON.stringify({frames:[]}));
      writeFileSync(join(directory,'gates.json'),JSON.stringify({session:{minRecall:.5,minPrecision:0}}));
      const reports=discoverRecordedFixtures(directory);
      expect(reports).toHaveLength(1);
      expect(reports[0]!.path).toBe('new/seated/session.landmarks.json');
      expect(reports[0]!.punchGate?.pass).toBe(false);
      expect(reports[0]!.acceptancePass).toBe(false);
    } finally {rmSync(directory,{recursive:true,force:true});}
  });
  it('does not hide the mandated200ms lean dwell behind a wider timing tolerance',()=>{
    const lm=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));
    lm[11]={x:.6,y:.56,visibility:1};lm[12]={x:.4,y:.44,visibility:1};
    lm[15]={x:.6,y:.56,visibility:1};lm[16]={x:.4,y:.44,visibility:1};
    const report=scoreRecordedFixture({version:1,calibration:{guardThreshold:2},frames:[0,100,200,300,400].map(t=>({t,lm}))},
      {version:1,intervals:[{event:'lean_L',start:0,end:500}]});
    expect(report.perEvent.lean_L_on!.predicted).toBe(1);
    expect(report.perEvent.lean_L_on!.matched).toBe(0);
    expect(report.defenceLabelsMatched).toBe(false);
    expect(report.toleranceMs).toBe(150);
  });
});
