import { readFileSync, readdirSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { heldIntervalReport, legacyPunchScore, medianGuard, replayFixture, scoreRecordedFixture, type Fixture, type Labels, type PunchGate } from './replay.js';
import { scoreSteadySegments, type SteadyProfile } from './steady-state';
const fixtureRoot=fileURLToPath(new URL('../fixtures/',import.meta.url));
function steadyProfiles(root:string):Record<string,SteadyProfile> {
  try {return JSON.parse(readFileSync(resolve(root,'pose-regressions.json'),'utf8'));}
  catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;return {};}
}
function scoreWithProfile(fixture:Fixture,labels:Labels,gate:PunchGate|undefined,profile:SteadyProfile|undefined) {
  const strict=scoreRecordedFixture(fixture,labels,gate);
  const steady=profile?scoreSteadySegments(fixture,labels,profile):null;
  return {...strict,strictTimingAcceptancePass:strict.strictTimingAcceptancePass,steady,
    acceptancePass:labels.label_source==='cue'&&steady?steady.pass&&(strict.punchGate?.pass??true):strict.acceptancePass};
}
export function discoverRecordedFixtures(root=fixtureRoot) {
  let gates:Record<string,PunchGate>={};
  try {gates=JSON.parse(readFileSync(resolve(root,'gates.json'),'utf8'));}
  catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  const profiles=steadyProfiles(root);
  const files:string[]=[];
  function visit(directory:string) {
    for(const entry of readdirSync(directory,{withFileTypes:true})) {
      const path=resolve(directory,entry.name);
      if(entry.isDirectory())visit(path);
      else if(entry.isFile()&&entry.name.endsWith('.landmarks.json'))files.push(path);
    }
  }
  visit(root);
  return files.sort().flatMap(path=>{
    const fixture=JSON.parse(readFileSync(path,'utf8')) as Fixture;
    if(fixture.version!==1)return [];
    const id=basename(path,'.landmarks.json');
    const profile=profiles[id];
    const labelPath=profile?resolve(root,profile.labels):path.replace(/\.landmarks\.json$/,'.labels.json');
    const labels=JSON.parse(readFileSync(labelPath,'utf8')) as Labels;
    return [{id,path:relative(root,path),...scoreWithProfile(fixture,labels,gates[id],profile)}];
  });
}
export function recordedFixtureReport() {
  const gates=JSON.parse(readFileSync(resolve(fixtureRoot,'gates.json'),'utf8')) as Record<string,{minRecall:number;minPrecision:number}>;
  const pexels=readdirSync(resolve(fixtureRoot,'pexels')).filter(f=>f.endsWith('.landmarks.json')).flatMap(file=>{
    const id=file.replace('.landmarks.json','');
    const fixture=JSON.parse(readFileSync(resolve(fixtureRoot,'pexels',file),'utf8')) as Fixture;
    if(fixture.version===1)return []; // Scored once by the strict recorder harness below.
    const replay=replayFixture(fixture);
    let labels:Labels|undefined;
    try { labels=JSON.parse(readFileSync(resolve(fixtureRoot,'pexels',`${id}.labels.json`),'utf8')) as Labels; }
    catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    if(!labels)return {id,frames:fixture.frames.length,status:'unlabelled',detectedPunches:replay.events.filter(e=>e.event.endsWith('_punch')).length};
    const punches=legacyPunchScore(replay.events,labels);
    const gate=gates[id];
    return {id,frames:fixture.frames.length,status:'labelled',punches,gate:gate?{...gate,pass:punches.recall>=gate.minRecall&&punches.precision>=gate.minPrecision}:null,
      guardIntervals:heldIntervalReport(replay.states,labels)};
  });
  const kash=JSON.parse(readFileSync(resolve(fixtureRoot,'kash-webcam.landmarks.json'),'utf8')) as Fixture;
  const labels=JSON.parse(readFileSync(resolve(fixtureRoot,'kash-webcam.labels.json'),'utf8')) as Labels;
  const threshold=(medianGuard(kash,4000,7000)+medianGuard(kash,14000,17000))/2;
  const replay=replayFixture(kash,threshold);
  const cues=(labels.events??[]).filter(e=>['guard','lean_left','lean_right'].includes(e.type??'')).map(e=>{
    const at=e.t_ms!;
    const following=replay.states.filter(s=>s.t>=at&&s.t<=at+3000);
    const hit=following.some(s=>e.type==='guard'?s.guard:s.lean===(e.type==='lean_left'?'L':'R'));
    return {type:e.type,at,observedWithin3000ms:hit};
  });
  return {toleranceMs:150,recordings:discoverRecordedFixtures(),punchSideScoring:'Legacy detection only: source labels use image sides; new recorder labels score anatomical sides.',pexels,
    kash:{guardThreshold:threshold,frames:kash.frames.length,cues,
      limitation:'Spoken cue timestamps are not movement onsets. The3000ms cue diagnostic is not the150ms onset acceptance gate.'},
    incompatibleGates:Object.entries(gates).filter(([id])=>id.endsWith(':world')).map(([id,gate])=>({id,...gate,status:'INCOMPATIBLE',reason:'World-landmark baseline; production classifier uses normalized image landmarks, not world coordinates.'}))};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv[2]&&process.argv[3]) {
    const gates=JSON.parse(readFileSync(resolve(fixtureRoot,'gates.json'),'utf8')) as Record<string,PunchGate>;
    const id=basename(process.argv[2],'.landmarks.json');
    const report=scoreWithProfile(JSON.parse(readFileSync(resolve(process.argv[2]),'utf8')),JSON.parse(readFileSync(resolve(process.argv[3]),'utf8')),gates[id],steadyProfiles(fixtureRoot)[id]);
    console.log(JSON.stringify(report,null,2));
    if(!report.acceptancePass)process.exitCode=1;
  } else if(process.argv[2]) {
    throw new Error('Pass both landmarks.json and labels.json, or no arguments for bundled fixture report');
  } else {
    const report=recordedFixtureReport();
    console.log(JSON.stringify(report,null,2));
    if(report.recordings.some(r=>!r.acceptancePass)||report.pexels.some(c=>'gate' in c&&c.gate&&!c.gate.pass))process.exitCode=1;
  }
}
