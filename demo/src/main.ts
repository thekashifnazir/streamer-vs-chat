import '../../overlay/src/style.css';
import './style.css';
import { createRailsHud } from '../../overlay/src/hud';
import { createGame, step, type GameState } from '../../shared/src/engine';
import type { PoseState, StreamerInput } from '@svc/shared';
import { createKeyboard } from '../../capture/src/keyboard';
import { PoseCamera } from '../../capture/src/camera';
import { PoseClassifier } from '../../capture/src/classifier';
import { createCalibration } from '../../capture/src/calibration';
import { createSimulationSource } from './source';
import { InputTutorial } from './tutorial';

const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const stage=el('stage');
const host=el('game-hud');
const video=el<HTMLVideoElement>('camera');
const source=el<HTMLSelectElement>('input-source');
const crowdSize=el<HTMLSelectElement>('crowd-size');
const posture=el<HTMLSelectElement>('posture');
const clearSpace=el<HTMLInputElement>('clear-space');
const noPunch=el<HTMLInputElement>('no-punch');
const avatar=el('keyboard-avatar');
const hud=createRailsHud(host,{simulated:true});
const tutorial=new InputTutorial();
const classifier=new PoseClassifier({guardThreshold:0});
let game:GameState|null=null;
let crowd:ReturnType<typeof createSimulationSource>|null=null;
let crowdBeat='';
let cameraRunning=false;
let lastFrameAt=-Infinity;
let lastPose:PoseState={kind:'pose',guard:false,lean:null,source:'pose',at:0};
let seed=20261027;

function resize(){host.style.transform=`scale(${stage.clientWidth/1920})`;}
new ResizeObserver(resize).observe(stage);resize();
function paint() {
  hud.render(game??createGame({seed,viewers:Number(crowdSize.value),now:0}),true);
  hud.setConnection('OFFLINE DEMO · SIMULATED CHAT');
  if(game) {
    el('next-round').hidden=!game.round.over||Boolean(game.match.winner);
    el('restart').hidden=false;
    el('resume-input').hidden=!game.paused;
    crowdSize.disabled=!game.round.over;
    el('demo-status').textContent=game.paused?'Paused. Resume when your space is clear.':game.match.winner?'Match complete. Try another crowd size or play again.':game.round.over?'Round complete. Defence does the damage; punches are a bonus.':'Straight attacks → K guard · HOOK LEFT → D lean · HOOK RIGHT → A lean · SUPER → either lean';
  }
}
function drawCrowd(at:number) {
  if(!game||!crowd||game.round.over||game.paused)return;
  const key=`${game.round.number}:${Math.floor(game.round.elapsed_ms/2400)}`;
  if(key===crowdBeat)return;
  crowdBeat=key;
  game=step(game,{kind:'vote-batch',votes:crowd.votes(game,at)},at);
}
function startFight() {
  if(!clearSpace.checked){el('tutorial-status').textContent='Confirm your clear space below before starting.';return;}
  const at=performance.now();
  game=createGame({seed:seed++,viewers:Number(crowdSize.value),now:at});
  // This static page has no credential transport and never imports the server.
  crowd=createSimulationSource({viewers:Number(crowdSize.value),seed:seed+100,liveTokenLoaded:false});
  crowdBeat='';drawCrowd(at);
  el('tutorial').hidden=true;
  keyboard.setEnabled(source.value==='keyboard');
  game=step(game,source.value==='keyboard'?{kind:'pose',...keyboard.physical,source:'keyboard',at}:lastPose,at);
  paint();
}
function input(event:StreamerInput) {
  const at=performance.now();
  if(event.kind!=='control'&&!clearSpace.checked) {
    if(!game)el('tutorial-status').textContent='Check “My space is clear” below, then press K.';
    return;
  }
  if(!game) {
    if(tutorial.input(event))startFight();
    for(const [index,item]of Array.from(document.querySelectorAll('[data-step]')).entries()) {
      item.classList.toggle('done',index<tutorial.step);item.classList.toggle('active',index===tutorial.step);
    }
    el('tutorial-status').textContent=`Step ${Math.min(3,tutorial.step+1)} of 3 · Press ${['K','A','J'][Math.min(2,tutorial.step)]}`;
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
posture.addEventListener('change',()=>{calibration.reset();classifier.reset();posture.blur();});
source.addEventListener('change',()=>{
  if(game)input({kind:'pose',guard:false,lean:null,source:'keyboard',at:performance.now()});
  keyboard.setEnabled(!game||source.value==='keyboard');
  if(source.value==='pose')el<HTMLDetailsElement>('webcam-settings').open=true;
  source.blur();
});
clearSpace.addEventListener('change',()=>{
  keyboard.release();
  if(!clearSpace.checked) {
    if(game){const at=performance.now();game=step(game,{kind:'pose',guard:false,lean:null,source:source.value==='pose'?'pose':'keyboard',at},at);}
    input({kind:'control',action:'stop',by:'capture'});
  } else if(!game)el('tutorial-status').textContent=`Step ${Math.min(3,tutorial.step+1)} of 3 · Press ${['K','A','J'][Math.min(2,tutorial.step)]}`;
  clearSpace.blur();
});
el('stop-input').addEventListener('click',()=>{keyboard.release();input({kind:'control',action:'stop',by:'capture'});});
el('resume-input').addEventListener('click',()=>{
  if(!clearSpace.checked){el('demo-status').textContent='Confirm your clear space before resuming inputs.';return;}
  input({kind:'control',action:'resume',by:'capture'});
});
el('restart').addEventListener('click',startFight);
el('next-round').addEventListener('click',()=>{
  if(!game)return;
  const at=performance.now();
  game=step(game,{kind:'next-round'},at);
  game=step(game,{kind:'viewers',count:Number(crowdSize.value)},at);
  crowd=createSimulationSource({viewers:Number(crowdSize.value),seed:seed+game.round.number,liveTokenLoaded:false});
  crowdBeat='';drawCrowd(at);paint();
});
crowdSize.addEventListener('change',()=>{paint();crowdSize.blur();});
noPunch.addEventListener('change',()=>noPunch.blur());
const timer=window.setInterval(()=>{
  if(!game)return;
  const at=performance.now();
  game=step(game,{kind:'advance'},at);
  if(source.value==='keyboard')game=step(game,{kind:'pose',...keyboard.physical,source:'keyboard',at},at);
  else if(!cameraRunning||at-lastFrameAt>=500)game=step(game,{kind:'pose',guard:false,lean:null,source:'pose',at},at);
  drawCrowd(at);paint();
},100);
window.addEventListener('beforeunload',()=>{window.clearInterval(timer);camera.stop();keyboard.dispose();hud.dispose();});
paint();input({kind:'pose',guard:false,lean:null,source:'keyboard',at:performance.now()});
