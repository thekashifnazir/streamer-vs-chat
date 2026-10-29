import {createBossImpactLedger} from '../../shared/src/boss-impact';
import {chatCommandLegend} from '../../shared/src/chat-commands';
import {tempoFor,type Difficulty} from '../../shared/src/tempo';
import type {ForgeSnapshot} from '../../shared/src/forge-view';
import type {BossDef} from '../../shared/src/boss-def';
import '../../overlay/src/style.css';
import './style.css';
import { createRailsHud } from '../../overlay/src/hud';
import { createGame, step as engineStep, type GameState } from '../../shared/src/engine';
import type { PoseState, StreamerInput } from '@svc/shared';
import { createKeyboard } from '../../capture/src/keyboard';
import { PoseCamera } from '../../capture/src/camera';
import { PoseClassifier } from '../../capture/src/classifier';
import { createCalibration } from '../../capture/src/calibration';
import { createSimulationSource } from './source';
import { InputTutorial } from './tutorial';
import {startColdOpen,coldOpenStage} from './cold-open';
import {LocalPlaytestStats} from './playtest';
import { summarizeGame } from '../../shared/src/highlights';
import {createDemoViewerMemory} from './viewer-memory';

const impactLedger=createBossImpactLedger('browser');
const step:typeof engineStep=(before,event,now)=>{const after=engineStep(before,event,now);impactLedger.observe(before,after);return after;};
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
const hud=createRailsHud(host,{simulated:!liveMode});
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
let lastPose:PoseState={kind:'pose',guard:false,lean:null,source:'pose',at:0};
let seed=20261027;
let hosted:ReturnType<typeof import('./play').mountHostedPlay>|null=null;
let metricsRound:string|null=null;
let liveViewers=0;
let showSessionSummary=false;
let coldOpenAt:number|null=null;
const playtest=new LocalPlaytestStats();
let playtestRound:string|null=null;
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
  el('tutorial-status').textContent=`Step ${Math.min(3,tutorial.step+1)} of 3 · Press ${tutorial.keys[Math.min(2,tutorial.step)]}`;
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
  el<HTMLInputElement>('start-no-punch').checked=noPunch.checked;
  for(const choice of Array.from(document.querySelectorAll<HTMLInputElement>('[name="judge-posture"]')))choice.checked=choice.value===posture.value;
  updateTutorial();
}


function resize(){host.style.transform=`scale(${stage.clientWidth/1920})`;}
new ResizeObserver(resize).observe(stage);resize();
function paint() {
  forgePanel?.update();
  hud.setForge(forgeSnapshot,!game||game.round.over);
  if(game&&coldOpenAt===null)viewerMemory?.observe(game);
  hud.setMemory(viewerMemory?.view()??null);
  document.querySelector<HTMLElement>('.chat-command-help')!.textContent=chatCommandLegend(game?.bossDef);
  hud.setBossReceipts(impactLedger.snapshot());
  hud.render(game??createGame({seed,viewers:liveMode?0:Number(crowdSize.value),now:0,difficulty:difficulty.value as Difficulty}),!liveMode);
  hud.setConnection(liveMode?(hosted?.ready?'LIVE · YOUR TWITCH CHAT':'LIVE MODE · CONNECT TWITCH'):'OFFLINE DEMO · SIMULATED CHAT');
  trackFight();trackLocalRound();
  const summary=game&&(game.round.over||showSessionSummary)?summarizeGame(game,game.match.winner||showSessionSummary?undefined:game.round.number):null;
  hud.setEndcard(summary&&viewerMemory?{...summary,chatMvp:viewerMemory.summaryMvp()}:summary);
  if(game) {
    el('next-round').hidden=!game.round.over||Boolean(game.match.winner)||showSessionSummary;
    el('restart').hidden=false;
    el('resume-input').hidden=!game.paused||showSessionSummary||(liveMode&&!hosted?.ready);
    crowdSize.disabled=!game.round.over;
    el('demo-status').textContent=game.paused?'Paused. Resume when your space is clear.':game.match.winner?'Match complete. Try another crowd size or play again.':game.round.over?noPunch.checked?'Round complete. Clean defences do the damage.':'Round complete. Defence does the damage; punches are a bonus.':game.bossDef?`${game.bossDef.name} · Follow each move’s defence cue. K guard · A/D ${posture.value==='seated'?'tilt':'lean'}${noPunch.checked?'':' · J bonus'}`:`Straight attacks → K guard · HOOK LEFT → D ${posture.value==='seated'?'tilt':'lean'} · HOOK RIGHT → A ${posture.value==='seated'?'tilt':'lean'} · SUPER → either side${noPunch.checked?' · NO PUNCHES':''}`;
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
  if(liveMode&&!hosted?.ready){el('tutorial-status').textContent='Connect Twitch and wait for LIVE before starting.';return;}
  if(!clearSpace.checked){el('tutorial-status').textContent='Confirm your clear space below before starting.';return;}
  hosted?.endFight();showSessionSummary=false;coldOpenAt=null;stage.classList.remove('cold-open-tally');
  const at=performance.now();
  game=createGame({seed:seed++,viewers:liveMode?liveViewers:Number(crowdSize.value),now:at,difficulty:difficulty.value as Difficulty,...(!liveMode&&pendingBoss?{bossDef:pendingBoss}:{})});
  // Live chat and the offline crowd both feed the shared reducer; no server import.
  crowd=liveMode?null:createSimulationSource({viewers:Number(crowdSize.value),seed:seed+100,liveTokenLoaded:hosted?.hasToken??false});
  trackLocalRound();crowdBeat='';drawCrowd(at);
  el('tutorial').hidden=true;
  keyboard.setEnabled(source.value==='keyboard');
  game=step(game,source.value==='keyboard'?{kind:'pose',...keyboard.physical,source:'keyboard',at}:lastPose,at);
  paint();
}
function input(event:StreamerInput) {
  if(event.kind==='control'&&event.action==='resume'&&(showSessionSummary||coldOpenAt!==null||(liveMode&&!hosted?.ready)))return;
  const at=performance.now();
  if(event.kind!=='control'&&!clearSpace.checked) {
    if(!game)el('tutorial-status').textContent='Check “My space is clear” below, then press K.';
    return;
  }
  if(!game) {
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
const calibration=createCalibration({onChange(snapshot){
  el('calibration-status').textContent=snapshot.message;
  el<HTMLProgressElement>('calibration-progress').value=snapshot.progress;
  el<HTMLButtonElement>('play-webcam').disabled=!snapshot.ready;
}});
const camera=new PoseCamera(video,sample=>{
  lastFrameAt=performance.now();
  const before=calibration.snapshot;
  const calibrated=calibration.update(sample.landmarks,sample.at);
  if(calibrated.ready&&!before.ready&&calibrated.guardThreshold!==null)classifier.setCalibration({guardThreshold:calibrated.guardThreshold,leanThresholds:calibrated.leanThresholds??undefined,guardReleaseBand:calibrated.guardReleaseBand??undefined,guardMedians:calibrated.guardMedians??undefined,neutralSwayP95:calibrated.neutralSwayP95??undefined});
  const result=classifier.update(sample.landmarks,sample.at);
  const framed=[0,11,12,15,16].every(index=>{const p=sample.landmarks[index];return p&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&(p.visibility??1)>=.5;});
  const seatedTooClose=posture.value==='seated'&&result.metrics&&result.metrics.shoulderWidth>.20;
  const ready=calibrated.ready&&framed&&!seatedTooClose&&clearSpace.checked;
  lastPose=ready?result.state:{kind:'pose',guard:false,lean:null,source:'pose',at:sample.at};
  el('camera-status').textContent=!framed?'Keep head, shoulders and both wrists in frame.':seatedTooClose?'Move further back; seated shoulders must span ≤20% of the frame.':`Camera local · ${sample.fps.toFixed(0)} FPS · ${sample.inferenceMs.toFixed(0)} ms inference`;
  if(source.value==='pose') {
    input(lastPose);
    if(ready)for(const punch of result.punches)input(punch);
  }
},message=>{
  cameraRunning=false;lastPose={kind:'pose',guard:false,lean:null,source:'pose',at:performance.now()};
  if(source.value==='pose')input(lastPose);
  el('camera-status').textContent=message;
},{wasmLoaderPath:'/assets/pose/vision_wasm_internal.js',wasmBinaryPath:'/assets/pose/vision_wasm_internal.wasm',modelAssetPath:'/assets/pose/pose_landmarker_lite.task'});

el('start-camera').addEventListener('click',async()=>{
  if(!clearSpace.checked){el('camera-status').textContent='Check your clear space first.';return;}
  el<HTMLButtonElement>('start-camera').disabled=true;
  el('camera-status').textContent='Opening camera and loading the local lite model…';
  try {
    cameraRunning=await camera.start();
    video.hidden=!cameraRunning;avatar.hidden=cameraRunning;
    el<HTMLButtonElement>('stop-camera').disabled=!cameraRunning;
    el<HTMLButtonElement>('start-calibration').disabled=!cameraRunning;
  } catch(error){el('camera-status').textContent=`Camera unavailable: ${error instanceof Error?error.message:'permission denied'}. Keyboard still works.`;}
  finally{el<HTMLButtonElement>('start-camera').disabled=false;}
});
el('stop-camera').addEventListener('click',()=>{
  camera.stop();cameraRunning=false;video.hidden=true;avatar.hidden=false;calibration.reset();classifier.reset();
  el<HTMLButtonElement>('stop-camera').disabled=true;el<HTMLButtonElement>('start-calibration').disabled=true;
  source.value='keyboard';keyboard.setEnabled(true);el('camera-status').textContent='Camera off. Keyboard selected.';
});
el('start-calibration').addEventListener('click',()=>{
  if(!cameraRunning||!clearSpace.checked)return;
  classifier.reset();calibration.start(posture.value==='seated'?'seated':'standing',performance.now());
});
el('play-webcam').addEventListener('click',()=>{
  if(!calibration.snapshot.ready||!clearSpace.checked)return;
  source.value='pose';startFight();el<HTMLDetailsElement>('webcam-settings').open=false;
});
posture.addEventListener('change',()=>{calibration.reset();classifier.reset();lastPose={kind:'pose',guard:false,lean:null,source:'pose',at:performance.now()};if(game&&source.value==='pose')input(lastPose);updateModes();posture.blur();});
for(const choice of Array.from(document.querySelectorAll<HTMLInputElement>('[name="judge-posture"]')))choice.addEventListener('change',()=>{if(choice.checked){posture.value=choice.value;posture.dispatchEvent(new Event('change'));choice.blur();}});
source.addEventListener('change',()=>{
  if(game)input({kind:'pose',guard:false,lean:null,source:'keyboard',at:performance.now()});
  keyboard.setEnabled(!game||source.value==='keyboard');
  if(source.value==='pose')el<HTMLDetailsElement>('webcam-settings').open=true;
  source.blur();
});
clearSpace.addEventListener('change',()=>{
  keyboard.release();
  el<HTMLInputElement>('start-clear-space').checked=clearSpace.checked;
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
  if(!game||showSessionSummary||(liveMode&&!hosted?.ready))return;
  const at=performance.now();
  game=step(game,{kind:'next-round',...(!liveMode?{bossDef:pendingBoss}:{})},at);
  game=step(game,{kind:'viewers',count:liveMode?liveViewers:Number(crowdSize.value)},at);
  crowd=liveMode?null:createSimulationSource({viewers:Number(crowdSize.value),seed:seed+game.round.number,liveTokenLoaded:hosted?.hasToken??false});
  trackLocalRound();crowdBeat='';drawCrowd(at);paint();
});
crowdSize.addEventListener('change',()=>{paint();crowdSize.blur();});
noPunch.addEventListener('change',()=>{updateModes();noPunch.blur();});
el('start-no-punch').addEventListener('change',()=>{noPunch.checked=el<HTMLInputElement>('start-no-punch').checked;noPunch.dispatchEvent(new Event('change'));el('start-no-punch').blur();});
el('start-clear-space').addEventListener('change',()=>{clearSpace.checked=el<HTMLInputElement>('start-clear-space').checked;clearSpace.dispatchEvent(new Event('change'));el('start-clear-space').blur();});
const timer=window.setInterval(()=>{
  if(!game)return;
  const at=performance.now();
  game=step(game,{kind:'advance'},at);
  if(source.value==='keyboard')game=step(game,{kind:'pose',...keyboard.physical,source:'keyboard',at},at);
  else if(!cameraRunning||at-lastFrameAt>=500)game=step(game,{kind:'pose',guard:false,lean:null,source:'pose',at},at);
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
el('cold-open').addEventListener('click',()=>{
 if(liveMode)return;
 if(!clearSpace.checked){el('cold-open-status').textContent='Confirm clear space first.';return;}
 if(source.value==='pose'&&(!calibration.snapshot.ready||!cameraRunning)){el('cold-open-status').textContent='Start and calibrate the camera first, or choose Keyboard.';return;}
 playtest.endRound();const at=performance.now();coldOpenAt=at;crowd=null;showSessionSummary=false;
 game=startColdOpen(at,seed++,source.value==='keyboard'?{kind:'pose',...keyboard.physical,source:'keyboard',at}:lastPose);
 el('tutorial').hidden=true;stage.classList.remove('cold-open-tally');paint();
});
if(!liveMode){const {mountDemoForge}=await import('./forge');const panel=document.createElement('section');el('friend-tools').after(panel);forgePanel=mountDemoForge(panel,{betweenRounds:()=>!game||game.round.over,onAccepted:boss=>{pendingBoss=boss;},onSnapshot:snapshot=>{forgeSnapshot=snapshot;hud.setForge(snapshot,!game||game.round.over);}});}
if(liveMode){
  el('friend-tools').hidden=true;
  const {mountHostedPlay}=await import('./play');
  const freeze=()=>{if(game){game=step(game,{kind:'control',action:'stop',by:'capture'},performance.now());paint();}};
  hosted=mountHostedPlay({onVote:vote=>{
    if(!game||game.round.over||game.paused)return false;
    game=step(game,vote,performance.now());paint();
    return game.votes[vote.user]===vote.move;
  },onControl:event=>{if(event.kind==='control'&&event.action==='resume'&&!clearSpace.checked)return;input(event);},onViewers:count=>{liveViewers=count;if(game)game=step(game,{kind:'viewers',count},performance.now());},onDisconnect:freeze,onSummary:()=>{showSessionSummary=true;freeze();}});
  crowdSize.closest('label')!.hidden=true;
  document.querySelector('.demo-tag')!.textContent='LIVE · YOUR TWITCH CHAT';
  document.title='Streamer vs Chat · Try it on your channel';
  el('tutorial').insertAdjacentHTML('beforeend','<button id="start-live">Start live fight</button>');
  el('start-live').addEventListener('click',startFight);
  el('demo-status').textContent='Connect your own Twitch channel. Keyboard and webcam use the same rules.';
}
updateModes();paint();input({kind:'pose',guard:false,lean:null,source:'keyboard',at:performance.now()});
