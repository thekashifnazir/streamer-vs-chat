import {showCameraError} from './camera-feedback';
import {mountShareTools} from './share-tools';
import {mountFightSetup} from './setup-ui';
import {createCalibrationProfiles} from '../../capture/src/calibration-profile';
import {scoutPreviewConfig,SCOUT_PREVIEW_BADGE} from './scout-preview';
import {createSuperNotices} from '../../shared/src/super-notices';
import {createBossImpactLedger} from '../../shared/src/boss-impact';
import {chatCommandLegend} from '../../shared/src/chat-commands';
import {tempoFor,type Difficulty} from '../../shared/src/tempo';
import type {ForgeSnapshot} from '../../shared/src/forge-view';
import type {BossDef} from '../../shared/src/boss-def';
import '../../overlay/src/style.css';
import './style.css';
import { createRailsHud } from '../../overlay/src/hud';
import { createGame, step as engineStep, type GameState } from '../../shared/src/engine';
import {parseChatVote} from '@svc/shared';
import type { PoseState, StreamerInput } from '@svc/shared';
import { createKeyboard } from '../../capture/src/keyboard';
import { PoseCamera } from '../../capture/src/camera';
import { PoseClassifier } from '../../capture/src/classifier';
import { createCalibration } from '../../capture/src/calibration';
import { createSimulationSource } from './source';
import { InputTutorial } from './tutorial';
import {startColdOpen,coldOpenStage} from './cold-open';
import {mountStreamLayout} from './stream-layout';
import {LocalPlaytestStats} from './playtest';
import { summarizeGame } from '../../shared/src/highlights';
import {createDemoViewerMemory} from './viewer-memory';

const impactLedger=createBossImpactLedger('browser');
const superNotices=createSuperNotices();
const step:typeof engineStep=(before,event,now)=>{const after=engineStep(before,event,now);impactLedger.observe(before,after);const hypeFull=superNotices.observe(before,after,Date.now(),event.kind==='restart');hosted?.observeGame(after,hypeFull,event.kind==='restart');if(event.kind==='vote')superNotices.denied(after,event.move,Date.now());return after;};
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const stage=el('stage');
const host=el('game-hud');
const video=el<HTMLVideoElement>('camera');
const source=el<HTMLSelectElement>('input-source');
const crowdSize=el<HTMLSelectElement>('crowd-size');
const posture=el<HTMLSelectElement>('posture');
const difficulty=el<HTMLSelectElement>('start-difficulty');
const clearSpace=el<HTMLInputElement>('clear-space');
const noPunch=el<HTMLInputElement>('no-punch');
const avatar=el('keyboard-avatar');
const liveMode=location.pathname==='/play'||location.pathname.startsWith('/play/');
const previewConfig=scoutPreviewConfig(location,{liveMode,liveTokenLoaded:false});
if(previewConfig)document.querySelector('.demo-tag')!.textContent=SCOUT_PREVIEW_BADGE;
const hud=createRailsHud(host,{simulated:!liveMode,soundDefault:liveMode,deferSoundUntilStart:liveMode});
const streamSound=document.getElementById('stream-sound') as HTMLInputElement|null;
if(streamSound){
  const syncSound=()=>{streamSound.checked=hud.soundRequested();};
  host.addEventListener('rails-sound-change',syncSound);
  streamSound.addEventListener('change',()=>{void hud.setSoundRequested(streamSound.checked);});
  syncSound();
}
const tutorial=new InputTutorial();
const classifier=new PoseClassifier({guardThreshold:0});
let pendingBoss:BossDef|null=null;
let forgeSnapshot:ForgeSnapshot|null=null;
let forgePanel:ReturnType<typeof import('./forge').mountDemoForge>|null=null;
let game:GameState|null=null;
let crowd:ReturnType<typeof createSimulationSource>|null=null;
let crowdBeat='';
let cameraRunning=false;
let lastFrameAt=-Infinity;
let poseFramed=false;
let lastPose:PoseState={kind:'pose',guard:false,lean:null,source:'pose',at:0};
let seed=20261027;
let hosted:ReturnType<typeof import('./play').mountHostedPlay>|null=null;
let metricsRound:string|null=null;
let liveViewers=0;
let showSessionSummary=false;
let coldOpenAt:number|null=null;
const streamLayout=mountStreamLayout({live:liveMode,onEnd:()=>{if(liveMode){el<HTMLButtonElement>('show-results').click();return;}showSessionSummary=true;if(game){game=step(game,{kind:'control',action:'stop',by:'capture'},performance.now());paint();}}});
if(previewConfig)streamLayout.status(SCOUT_PREVIEW_BADGE);
const playtest=new LocalPlaytestStats();
if(!liveMode)mountShareTools(document);
let playtestRound:string|null=null;
let tutorialStarted=false;
const viewerMemory=liveMode?null:createDemoViewerMemory({offline:true,factory:globalThis.indexedDB,onChange:()=>paint()});
function trackLocalRound(){
 if(!game||liveMode||coldOpenAt!==null)return;
 const key=`${game.match.seed}:${game.round.number}`;
 if(playtestRound!==key){if(game.round.over)return;playtest.endRound();playtest.startRound();playtestRound=key;}
 if(game.round.over)playtest.endRound();
}
function trackFight(){
  if(!hosted||!game)return;
  const key=`${game.match.seed}:${game.round.number}`;
  if(metricsRound!==key){hosted.endFight();hosted.startFight();metricsRound=key;}
  if(game.round.over)hosted.endFight();
}

function updateTutorial() {
  tutorial.setNoPunch(noPunch.checked);
  el('tutorial-last-key').textContent=tutorial.keys[2];
  el('tutorial-last-label').textContent=noPunch.checked?`Try the other ${posture.value==='seated'?'tilt':'lean'}`:'Try a bonus punch';
  el('tutorial-status').textContent=tutorial.status(tutorialStarted);
  for(const [index,item]of Array.from(document.querySelectorAll('[data-step]')).entries()) {
    item.classList.toggle('done',index<tutorial.step);item.classList.toggle('active',index===tutorial.step);
  }
}
function updateModes() {
  const seated=posture.value==='seated';
  hud.setModes({seated,noPunch:noPunch.checked});
  classifier.setPunchesEnabled(!noPunch.checked);
  el('punch-guide').hidden=noPunch.checked;
  el('guide-lean').textContent=seated?'tilt':'lean';
  el('tutorial-defence').textContent=seated?'Tilt':'Lean';
  el('tutorial-lean-label').textContent=seated?'Tilt left':'Lean left';
  setup.sync();setup.commands(game?game.bossDef:pendingBoss);
  updateTutorial();
}


function resize(){host.style.transform=`scale(${stage.clientWidth/1920})`;}
new ResizeObserver(resize).observe(stage);resize();
function paint() {
  hosted?.observePhase();
  forgePanel?.update();
  hud.setForge(forgeSnapshot,!game||game.round.over);
  setup.commands(game?game.bossDef:pendingBoss);
  if(game&&coldOpenAt===null)viewerMemory?.observe(game);
  hud.setMemory(hosted?.memoryView()??viewerMemory?.view()??null);
  document.querySelector<HTMLElement>('.chat-command-help')!.textContent=chatCommandLegend(game?.bossDef)+' · FINISHER READY: hold K (guard) for 1 s; no punches required.';
  hud.setBossReceipts(impactLedger.snapshot());hud.setSuperNotices(superNotices.snapshot());
  hud.render(game??createGame({seed,viewers:liveMode?0:Number(crowdSize.value),now:0,difficulty:difficulty.value as Difficulty,...(previewConfig?{scoutingConfig:previewConfig}:{})}),!liveMode);
  hud.setConnection(previewConfig?SCOUT_PREVIEW_BADGE:liveMode?(hosted?.ready?'LIVE · YOUR TWITCH CHAT':'LIVE MODE · CONNECT TWITCH'):'OFFLINE DEMO · SIMULATED CHAT');
  trackFight();trackLocalRound();
  const summary=game&&(game.round.over||showSessionSummary)?summarizeGame(game,game.match.winner||showSessionSummary?undefined:game.round.number):null;
  hud.setEndcard(summary&&viewerMemory?{...summary,chatMvp:viewerMemory.summaryMvp()}:summary&&hosted?hosted.publicSummary(summary):summary,hosted?.clipsSnapshot()??[]);
  if(game) {
    el('next-round').hidden=!game.round.over||Boolean(game.match.winner)||showSessionSummary;
    el('restart').hidden=false;
    el('resume-input').hidden=!game.paused||showSessionSummary||(liveMode&&!hosted?.ready);
    crowdSize.disabled=!game.round.over;
    el('demo-status').textContent=game.paused?'Paused. Resume when your space is clear.':game.match.winner?'Match complete. Try another crowd size or play again.':game.round.over?noPunch.checked?'Round complete. Clean defences do the damage.':'Round complete. Defence does the damage; punches are a bonus.':game.bossDef?`${game.bossDef.name} · Follow each move’s defence cue. K guard · A/D ${posture.value==='seated'?'tilt':'lean'}${noPunch.checked?'':' · J bonus'}`:`Straight attacks → K guard · HOOK LEFT → D ${posture.value==='seated'?'tilt':'lean'} · HOOK RIGHT → A ${posture.value==='seated'?'tilt':'lean'} · SUPER → follow all three GUARD / LEAN steps${noPunch.checked?' · NO PUNCHES':''}`;
  }
}
function drawCrowd(at:number) {
  if(liveMode||coldOpenAt!==null||!game||!crowd||game.round.over||game.paused)return;
  const key=`${game.round.number}:${Math.floor(game.round.elapsed_ms/tempoFor(game.difficulty).beat)}`;
  if(key===crowdBeat)return;
  crowdBeat=key;
  const votes=crowd.votes(game,at);
  game=step(game,{kind:'vote-batch',votes},at);
  viewerMemory?.votes(votes,game);
  for(const vote of votes)playtest.vote(vote.user,game.votes[vote.user]===vote.move);
}
function startFight() {
  if(hosted?.forgeBusy){el('tutorial-status').textContent='Boss Forge is generating between rounds. Wait or type !veto.';return;}
  if(liveMode&&!hosted?.ready){el('tutorial-status').textContent='Connect Twitch and wait for LIVE before starting.';return;}
  if(!clearSpace.checked){el('tutorial-status').textContent='Tick “my space is clear” above before starting.';return;}
  if(source.value==='pose'&&(!cameraRunning||!calibration.snapshot.ready||performance.now()-lastFrameAt>=500||!poseFramed)){el('camera-status').textContent='Keep your calibrated head, shoulders and wrists in frame before starting.';setup.open();return;}
  hosted?.endFight();showSessionSummary=false;coldOpenAt=null;stage.classList.remove('cold-open-tally');
  const at=performance.now();
  game=createGame({seed:seed++,viewers:liveMode?liveViewers:Number(crowdSize.value),now:at,difficulty:difficulty.value as Difficulty,...(previewConfig?{scoutingConfig:previewConfig}:{}),...(pendingBoss?{bossDef:pendingBoss}:{})});
  hosted?.observePhase(true);
  hosted?.observeGame(game,false,true);
  // Live chat and the offline crowd both feed the shared reducer; no server import.
  crowd=liveMode?null:createSimulationSource({viewers:Number(crowdSize.value),seed:seed+100,liveTokenLoaded:hosted?.hasToken??false});
  trackLocalRound();crowdBeat='';drawCrowd(at);
  el('tutorial').hidden=true;
  document.querySelector<HTMLElement>('.demo-controls')!.hidden=false;
  streamLayout.collapse();
  stage.scrollIntoView?.({block:'start',behavior:'smooth'});
  keyboard.setEnabled(source.value==='keyboard');
  game=step(game,source.value==='keyboard'?{kind:'pose',...keyboard.physical,source:'keyboard',at}:lastPose,at);
  paint();
}
function input(event:StreamerInput) {
  if(event.kind==='control'&&event.action==='resume'&&source.value==='pose'&&(!cameraRunning||!calibration.snapshot.ready||performance.now()-lastFrameAt>=500||!poseFramed)){el('camera-status').textContent='Keep your calibrated head, shoulders and wrists in frame before resuming.';return;}
  if(event.kind==='control'&&event.action==='resume'&&(showSessionSummary||coldOpenAt!==null||(liveMode&&!hosted?.ready)))return;
  const at=performance.now();
  if(event.kind!=='control'&&!clearSpace.checked) {
    if(!game)updateTutorial();
    return;
  }
  if(!game) {
    if(source.value==='pose')return;
    if(tutorial.input(event))startFight();
    updateTutorial();
    return;
  }
  if(event.kind==='punch'&&noPunch.checked)return;
  game=step(game,event,at);
  if(event.kind==='control'&&event.action==='resume'&&!game.paused) {
    const pose:PoseState=source.value==='keyboard'?{kind:'pose',...keyboard.physical,source:'keyboard',at}:
      cameraRunning&&at-lastFrameAt<500?{...lastPose,at}:{kind:'pose',guard:false,lean:null,source:'pose',at};
    game=step(game,pose,at);
  }
  drawCrowd(at);paint();
}
const keyboard=createKeyboard({emit:input,label:label=>{
  avatar.classList.toggle('guard',label.guard);avatar.classList.toggle('lean-L',label.lean==='L');avatar.classList.toggle('lean-R',label.lean==='R');
}});
keyboard.setEnabled(true);
const profiles=createCalibrationProfiles(()=>window.localStorage);
const setup=mountFightSetup(document,{onStart:()=>{void hud.activateSound();if(game){startFight();return;}tutorialStarted=true;el('tutorial').hidden=false;document.querySelector<HTMLElement>('.demo-controls')!.hidden=false;streamLayout.collapse();updateTutorial();stage.scrollIntoView?.({block:'start',behavior:'smooth'});},onWebcamStart:()=>{void hud.activateSound();source.value='pose';keyboard.setEnabled(false);startFight();}});
const calibration=createCalibration({onChange(snapshot){
  el('calibration-status').textContent=snapshot.message;
  el<HTMLProgressElement>('calibration-progress').value=snapshot.progress;
  setup.calibration(snapshot);
}});
function restoreCalibration(){const mode=posture.value==='seated'?'seated':'standing',saved=profiles.load(mode);if(saved&&calibration.restore(saved,mode)){classifier.setCalibration(saved);setup.restored(true);}}
setup.calibration(calibration.snapshot);
restoreCalibration();
const camera=new PoseCamera(video,sample=>{
  lastFrameAt=performance.now();
  const before=calibration.snapshot;
  const calibrated=calibration.update(sample.landmarks,sample.at);
  if(calibrated.ready&&!before.ready&&calibrated.guardThreshold!==null)classifier.setCalibration({guardThreshold:calibrated.guardThreshold,leanThresholds:calibrated.leanThresholds??undefined,guardReleaseBand:calibrated.guardReleaseBand??undefined,guardMedians:calibrated.guardMedians??undefined,neutralSwayP95:calibrated.neutralSwayP95??undefined});
  const result=classifier.update(sample.landmarks,sample.at);
  const framed=[0,11,12,15,16].every(index=>{const p=sample.landmarks[index];return p&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&(p.visibility??1)>=.5;});
  const seatedTooClose=posture.value==='seated'&&result.metrics&&result.metrics.shoulderWidth>.20;
  poseFramed=framed&&!seatedTooClose;setup.frame(sample.landmarks,poseFramed);
  const ready=calibrated.ready&&poseFramed&&clearSpace.checked;
  lastPose=ready?result.state:{kind:'pose',guard:false,lean:null,source:'pose',at:sample.at};
  el('camera-status').textContent=!framed?'Keep head, shoulders and both wrists in frame.':seatedTooClose?'Move further back; seated shoulders must span ≤20% of the frame.':`Camera local · ${sample.fps.toFixed(0)} FPS · ${sample.inferenceMs.toFixed(0)} ms inference`;
  if(source.value==='pose') {
    input(lastPose);
    if(ready)for(const punch of result.punches)input(punch);
  }
},message=>{
  cameraRunning=false;poseFramed=false;setup.camera(false);lastPose={kind:'pose',guard:false,lean:null,source:'pose',at:performance.now()};
  if(source.value==='pose')input(lastPose);
  showCameraError(document,message);
},{wasmLoaderPath:'/assets/pose/vision_wasm_internal.js',wasmBinaryPath:'/assets/pose/vision_wasm_internal.wasm',modelAssetPath:'/assets/pose/pose_landmarker_lite.task'});

el('start-camera').addEventListener('click',async()=>{
  if(!clearSpace.checked){setup.sync();el('camera-start-reason').scrollIntoView?.({block:'nearest'});return;}
  el('camera-feedback').hidden=true;
  el<HTMLButtonElement>('start-camera').disabled=true;
  el('camera-status').textContent='Opening camera and loading the local lite model…';
  try {
    cameraRunning=await camera.start();
    setup.camera(cameraRunning);video.hidden=!cameraRunning;avatar.hidden=cameraRunning;
    if(cameraRunning&&!calibration.snapshot.ready)calibration.start(posture.value==='seated'?'seated':'standing',performance.now());
    el<HTMLButtonElement>('stop-camera').disabled=!cameraRunning;
    el<HTMLButtonElement>('start-calibration').disabled=!cameraRunning;
  } catch(error){showCameraError(document,error);}
  finally{setup.sync();}
});
el('stop-camera').addEventListener('click',()=>{
  camera.stop();cameraRunning=false;poseFramed=false;setup.camera(false);video.hidden=true;avatar.hidden=false;calibration.reset();classifier.reset();setup.restored(false);
  el<HTMLButtonElement>('stop-camera').disabled=true;el<HTMLButtonElement>('start-calibration').disabled=true;
  source.value='keyboard';keyboard.setEnabled(true);setup.sync();el('camera-status').textContent='Camera off. Keyboard selected.';
});
el('start-calibration').addEventListener('click',()=>{
  if(!cameraRunning||!clearSpace.checked)return;
  setup.restored(false);classifier.reset();calibration.start(posture.value==='seated'?'seated':'standing',performance.now());
});
posture.addEventListener('change',()=>{setup.restored(false);poseFramed=false;calibration.reset();classifier.reset();lastPose={kind:'pose',guard:false,lean:null,source:'pose',at:performance.now()};if(game&&source.value==='pose')input(lastPose);restoreCalibration();updateModes();posture.blur();});
source.addEventListener('change',()=>{
  if(game)input({kind:'pose',guard:false,lean:null,source:'keyboard',at:performance.now()});
  keyboard.setEnabled(!game||source.value==='keyboard');
  if(source.value==='pose')restoreCalibration();setup.sync();
  source.blur();
});
clearSpace.addEventListener('change',()=>{
  keyboard.release();
  if(!clearSpace.checked) {
    if(game){const at=performance.now();game=step(game,{kind:'pose',guard:false,lean:null,source:source.value==='pose'?'pose':'keyboard',at},at);}
    input({kind:'control',action:'stop',by:'capture'});
  } else if(!game)updateTutorial();
  clearSpace.blur();
});
el('stop-input').addEventListener('click',()=>{keyboard.release();input({kind:'control',action:'stop',by:'capture'});});
el('resume-input').addEventListener('click',()=>{
  if(!clearSpace.checked){el('demo-status').textContent='Confirm your clear space before resuming inputs.';return;}
  input({kind:'control',action:'resume',by:'capture'});
});
el('restart').addEventListener('click',startFight);
el('next-round').addEventListener('click',()=>{
  if(!game||showSessionSummary||hosted?.forgeBusy||(liveMode&&!hosted?.ready))return;
  const at=performance.now();
  game=step(game,{kind:'next-round',...(!liveMode||pendingBoss?{bossDef:pendingBoss}:{})},at);
  if(liveMode)pendingBoss=null;
  game=step(game,{kind:'viewers',count:liveMode?liveViewers:Number(crowdSize.value)},at);
  crowd=liveMode?null:createSimulationSource({viewers:Number(crowdSize.value),seed:seed+game.round.number,liveTokenLoaded:hosted?.hasToken??false});
  trackLocalRound();crowdBeat='';drawCrowd(at);paint();
});
crowdSize.addEventListener('change',()=>{paint();crowdSize.blur();});
noPunch.addEventListener('change',()=>{updateModes();noPunch.blur();});
const timer=window.setInterval(()=>{
  const at=performance.now();
  if(cameraRunning&&at-lastFrameAt>=500){poseFramed=false;setup.frame([],false);}
  if(!game)return;
  game=step(game,{kind:'advance'},at);
  if(source.value==='keyboard')game=step(game,{kind:'pose',...keyboard.physical,source:'keyboard',at},at);
  else if(!cameraRunning||at-lastFrameAt>=500){poseFramed=false;setup.frame([],false);game=step(game,{kind:'pose',guard:false,lean:null,source:'pose',at},at);}
  if(coldOpenAt!==null){
    const age=at-coldOpenAt,phase=coldOpenStage(game,age);
    // A one-attack rehearsal deliberately pauses after the actual outcome.
    if(game.log.resolved.length&&!game.paused)game=step(game,{kind:'control',action:'stop',by:'capture'},at);
    stage.classList.toggle('cold-open-tally',phase==='tally'||phase==='done');
    el('cold-open-status').textContent=phase==='missed'?'No clean block. Retry and hold your guard.':phase==='done'?'5-second take complete: actual guard confirmed. Chat is SIMULATED.':phase==='tally'?'Show the chat tally · SIMULATED CHAT':phase==='blocked'?'BLOCKED! Actual defence confirmed.':'HANDS UP! Hold your actual guard.';
  }
  drawCrowd(at);paint();
},100);
window.addEventListener('beforeunload',()=>{window.clearInterval(timer);camera.stop();keyboard.dispose();hud.dispose();forgePanel?.dispose();hosted?.dispose();playtest.dispose();void viewerMemory?.close();});
el('playtest-opt-in').addEventListener('change',()=>{playtest.setEnabled(el<HTMLInputElement>('playtest-opt-in').checked);el<HTMLButtonElement>('export-playtest').disabled=!el<HTMLInputElement>('playtest-opt-in').checked;if(!el<HTMLInputElement>('playtest-opt-in').checked){el('playtest-output').textContent='';el('playtest-output').hidden=true;}playtestRound=null;trackLocalRound();});
el('export-playtest').addEventListener('click',async()=>{const snapshot=await playtest.exportSnapshot();if(!snapshot)return;const json=JSON.stringify(snapshot,null,2);el('playtest-output').textContent=json;el('playtest-output').hidden=false;try{await navigator.clipboard.writeText(json);}catch{/* Selectable JSON remains available. */}});
el('back-to-setup').addEventListener('click',()=>{if(game)input({kind:'control',action:'stop',by:'capture'});streamLayout.expand();el('fight-setup').scrollIntoView?.({block:'start',behavior:'smooth'});});
el('cold-open').addEventListener('click',()=>{
 if(liveMode)return;
 if(!clearSpace.checked){el('cold-open-status').textContent='Confirm clear space first.';return;}
 if(source.value==='pose'&&(!calibration.snapshot.ready||!cameraRunning)){el('cold-open-status').textContent='Start and calibrate the camera first, or choose Keyboard.';return;}
 playtest.endRound();const at=performance.now();coldOpenAt=at;crowd=null;showSessionSummary=false;
 void hud.activateSound();
 game=startColdOpen(at,seed++,source.value==='keyboard'?{kind:'pose',...keyboard.physical,source:'keyboard',at}:lastPose);
 el('tutorial').hidden=true;document.querySelector<HTMLElement>('.demo-controls')!.hidden=false;streamLayout.collapse();stage.scrollIntoView?.({block:'start',behavior:'smooth'});stage.classList.remove('cold-open-tally');paint();
});
if(!liveMode){const {mountDemoForge}=await import('./forge');const panel=el('demo-forge-host');forgePanel=mountDemoForge(panel,{betweenRounds:()=>!game||game.round.over,onAccepted:boss=>{pendingBoss=boss;},onSnapshot:snapshot=>{forgeSnapshot=snapshot;hud.setForge(snapshot,!game||game.round.over);}});}
if(liveMode){
  el('friend-tools').hidden=true;
  const {mountHostedPlay}=await import('./play');
  const freeze=()=>{if(game){game=step(game,{kind:'control',action:'stop',by:'capture'},performance.now());paint();}};
  hosted=mountHostedPlay({getState:()=>game,onMemoryChange:()=>paint(),betweenRounds:()=>!game||game.round.over,onForgeAccepted:boss=>{pendingBoss=boss;},onForgeSnapshot:view=>{forgeSnapshot=view;hud.setForge(view,!game||game.round.over);},parseVote:(text,user,at)=>parseChatVote(text,user,at,false,game?.bossDef),onHighlightsChange:()=>paint(),onConnected:()=>paint(),onStatus:message=>streamLayout.status(message),onGreen:checked=>streamLayout.green(checked),onVote:vote=>{
    if(!game||game.round.over||game.paused)return false;
    game=step(game,vote,performance.now());paint();
    return game.votes[vote.user]===vote.move;
  },onRaid:event=>{if(game){game=step(game,event,performance.now());paint();}},onControl:event=>{if(event.kind==='control'&&event.action==='resume'&&!clearSpace.checked)return;input(event);},onViewers:count=>{liveViewers=count;if(game)game=step(game,{kind:'viewers',count},performance.now());},onDisconnect:freeze,onSummary:()=>{showSessionSummary=true;freeze();}});
  crowdSize.closest('label')!.hidden=true;
  document.title='Streamer vs Chat · Try it on your channel';

  el('demo-status').textContent='Connect your own Twitch channel. Keyboard and webcam use the same rules.';
}
updateModes();paint();input({kind:'pose',guard:false,lean:null,source:'keyboard',at:performance.now()});
