import './style.css';
import type { PoseState, StreamerInput } from '@svc/shared';
import { PoseClassifier, measurePose, type Landmark } from './classifier';
import { createCalibration } from './calibration';
import { createKeyboard } from './keyboard';
import { PoseCamera } from './camera';
import { FixtureRecorder, saveJson } from './recorder';
import { LocalReplay } from './replay';
import { NO_POSE_MESSAGE, trackingMessage } from './tracking-status';

const element = <T extends HTMLElement>(id:string) => document.getElementById(id) as T;
const source=element<HTMLSelectElement>('input-source');
const posture=element<HTMLSelectElement>('posture');
const clearSpace=element<HTMLInputElement>('clear-space');
const noPunch=element<HTMLInputElement>('no-punch');
const video=element<HTMLVideoElement>('camera');
const cameraStatus=element('camera-status');
const connectionStatus=element('connection-status');
const recordStatus=element('record-status');
const recorder=new FixtureRecorder();
const replay=new LocalReplay();
const replayPending=new Map<string,Promise<boolean>>();
const replayEnabled=element<HTMLInputElement>('enable-replay');
function options(){return {kind:'capture-options',seated:posture.value==='seated',noPunch:noPunch.checked};}
function sendOptions(){classifier.setPunchesEnabled(!noPunch.checked);element('punch-key-guide').hidden=noPunch.checked;element('input-hint').textContent=noPunch.checked?'Guard and lean are the defence. Clean defences counter automatically; punches are off.':'Keyboard and webcam are equal inputs. Guard and lean are the defence; punches add bonus damage.';if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(options()));}
function replayLinks(){
  const list=element('replay-downloads');list.textContent='';
  for(const item of replay.entries()){const row=document.createElement('li'),link=document.createElement('a');link.href=item.url;link.download=`${item.id.replace(/[^a-zA-Z0-9_-]/g,'-')}.webm`;link.textContent='Download local highlight replay';row.append(link);list.append(row);}
}
function updateReplay(){
  if(replayEnabled.checked&&clearSpace.checked&&cameraRunning&&video.srcObject){
    element('replay-status').textContent=replay.start(video.srcObject as MediaStream)?'Local camera replay enabled. Highlight snapshots stay here.':'MediaRecorder is unavailable. Highlights will use stats.';
  }else{replay.stop();element('replay-status').textContent='Replay off. Saved replays remain available until this page closes.';}
}
let socket:WebSocket;
let disposed=false;
let stopped=false;
let cameraRunning=false;
const stopCameraButton=element<HTMLButtonElement>('stop-camera');
const startRecordButton=element<HTMLButtonElement>('record-start');
const stopRecordButton=element<HTMLButtonElement>('record-stop');
let lastFrameAt=-Infinity;
let lastPose:PoseState={kind:'pose',guard:false,lean:null,source:'pose',at:0};
let landmarks:Landmark[]=[];
const classifier=new PoseClassifier({guardThreshold:0});

const calibration=createCalibration({onChange(snapshot){
  element('calibration-status').textContent=snapshot.message;
  element<HTMLProgressElement>('calibration-progress').value=snapshot.progress;
}});
const keyboard=createKeyboard({emit:input=>emit(input),label:label=>recorder.key(label,label.at)});
function sessionWarning(message='') {
  const warning=element('session-warning');
  warning.textContent=message;warning.hidden=!message;
}
function allowed() { return clearSpace.checked && !stopped; }
function updateKeyboard() { keyboard.setEnabled(source.value==='keyboard' && allowed()); }
function neutral(at=performance.now()):PoseState {
  return {kind:'pose',guard:false,lean:null,at,source:source.value==='keyboard'?'keyboard':'pose'};
}
function transmit(input:StreamerInput) {
  if(socket?.readyState!==WebSocket.OPEN) return;
  // Adapters use one monotonic clock. Wire timestamps are capture epoch milliseconds.
  socket.send(JSON.stringify(input.kind==='control'?input:{...input,at:performance.timeOrigin+input.at}));
}
function emit(input:StreamerInput) {
  if(input.kind==='control') {
    if(input.action==='stop') { stopped=true; keyboard.release(); updateKeyboard(); }
    transmit({...input,by:'capture'});
    return;
  }
  if(!allowed()) { if(input.kind==='pose')transmit(neutral(input.at));return; }
  if(input.kind==='punch' && noPunch.checked) return;
  transmit(input);
}
function connect() {
  socket=new WebSocket(`ws://${location.hostname}:3000/ws`);
  socket.addEventListener('open',()=>{
    connectionStatus.textContent='Server connected';sendOptions();
    transmit(neutral());
    if(stopped) transmit({kind:'control',action:'stop',by:'capture'});
  });
  socket.addEventListener('message',event=>{
    try {
      const message=JSON.parse(String(event.data));
      if(message.kind==='replay-capture') {
        if(typeof message.highlightId!=='string')return;
        const saving=replayEnabled.checked?replay.save(message.highlightId):Promise.resolve(false);
        replayPending.set(message.highlightId,saving);
        while(replayPending.size>32)replayPending.delete(replayPending.keys().next().value!);
        void saving.then(()=>replayLinks());
      } else if(message.kind==='replay-request') {
        if(typeof message.highlightId!=='string')return;
        void (replayPending.get(message.highlightId)??Promise.resolve(replay.has(message.highlightId))).then(()=>{
          if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({kind:'replay-result',highlightId:message.highlightId,available:replay.has(message.highlightId)}));
        });
      } else if(message.kind==='input-status') {
        element('input-state').textContent=`SERVER · ${message.stopped?'STOPPED':'READY'}\n${message.state.source.toUpperCase()} · GUARD ${message.state.guard?'ON':'OFF'} · LEAN ${message.state.lean??'—'}\n${noPunch.checked?'PUNCHES OFF':message.lastPunch?`LAST BONUS PUNCH ${message.lastPunch.side}`:'NO BONUS PUNCH YET'}`;
      } else if(message.kind==='tick') {
        const game=message.state;
        element('game-status').textContent=!message.started?'Press START MATCH when ready.':game.match.winner?`MATCH OVER: ${game.match.winner.toUpperCase()} wins. Press START MATCH to play again.`:game.paused?'GAME PAUSED: Resume inputs or !resume.':game.round.over?`ROUND ${game.round.number} OVER: ${game.round.winner.toUpperCase()} wins.`:`ROUND ${game.round.number} · ${Math.ceil(game.round.remaining_ms/1000)} s`;
      } else if(message.kind==='input-error') connectionStatus.textContent=message.message;
    } catch { /* Ignore unrelated/malformed messages. */ }
  });
  socket.addEventListener('close',()=>{connectionStatus.textContent='Server disconnected · inputs are not queued';if(!disposed)window.setTimeout(connect,1000);});
  socket.addEventListener('error',()=>socket.close());
}
function inFrame() {
  return [0,11,12,15,16].every(i=>{
    const p=landmarks[i];return p&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&(p.visibility??1)>=.5;
  });
}
const camera=new PoseCamera(video,sample=>{
  cameraRunning=true;landmarks=sample.landmarks;lastFrameAt=performance.now();
  const before=calibration.snapshot;
  const calibrated=calibration.update(landmarks,sample.at);
  if(calibrated.ready && !before.ready && calibrated.guardThreshold!==null) classifier.setCalibration({guardThreshold:calibrated.guardThreshold,leanThresholds:calibrated.leanThresholds??undefined,guardReleaseBand:calibrated.guardReleaseBand??undefined,guardMedians:calibrated.guardMedians??undefined,neutralSwayP95:calibrated.neutralSwayP95??undefined});
  const result=classifier.update(landmarks,sample.at);
  const metrics=result.metrics;
  const framed=inFrame();
  const seatedTooClose=posture.value==='seated'&&metrics&&metrics.shoulderWidth>.20;
  cameraStatus.textContent=trackingMessage(metrics!==null,framed,!!seatedTooClose);
  // Clear space and calibration gate webcam input; keyboard remains independent.
  lastPose=calibrated.ready&&framed&&!seatedTooClose?result.state:neutral(sample.at);
  lastPose.source='pose';
  if(source.value==='pose') {
    emit(lastPose);
    if(calibrated.ready&&framed&&!seatedTooClose)for(const punch of result.punches)emit(punch);
  }
  recorder.frame(landmarks,sample.at);
  element('fps-debug').textContent=metrics?`${sample.fps.toFixed(1)} FPS · ${sample.inferenceMs.toFixed(1)} ms`:NO_POSE_MESSAGE;
  element('diagnostics').textContent=`${sample.fps.toFixed(1)} FPS · ${sample.inferenceMs.toFixed(1)} ms inference\n${metrics?`g ${metrics.g.toFixed(2)} · tilt ${metrics.tilt.toFixed(2)} · S ${metrics.shoulderWidth.toFixed(3)}`:NO_POSE_MESSAGE}\n${calibrated.guardThreshold===null?'CALIBRATION REQUIRED':`guard ON ${calibrated.guardThreshold.toFixed(2)} · OFF ${(calibrated.guardThreshold-(calibrated.guardReleaseBand??.25)).toFixed(2)}`}\n${calibrated.leanThresholds?`lean ON L ${calibrated.leanThresholds.L.toFixed(2)} / R ${calibrated.leanThresholds.R.toFixed(2)}`:'LEAN CALIBRATION REQUIRED'}\n${calibrated.neutralSwayP95===null?'':`neutral sway p95 ${calibrated.neutralSwayP95.toFixed(2)} · lean floor ${calibrated.leanFloor?.toFixed(2)}`}\n${metrics?`guard anatomy ${metrics.guardAnatomy?'READY':'RAISE WRISTS ABOVE ELBOWS / MID-TORSO'}`:''}\n${(performance.now()-sample.at).toFixed(1)} ms frame → input`;
  if(recorder.recording)recordStatus.textContent=`Recording ${recorder.frameCount} frames · K/A/D/J supply labels in either input mode.`;
},message=>{replay.stop();stopCameraButton.disabled=true;cameraRunning=false;landmarks=[];lastPose=neutral();cameraStatus.textContent=message;emit(neutral());});

element('start-camera').addEventListener('click',async()=>{
  const button=element<HTMLButtonElement>('start-camera');button.disabled=true;
  stopCameraButton.disabled=false;
  cameraStatus.textContent='Opening camera and loading the local lite CPU model…';
  try {cameraRunning=await camera.start();}catch(error){cameraStatus.textContent=`Camera unavailable: ${error instanceof Error?error.message:'permission denied'}. Keyboard still works.`;}
  finally{button.disabled=false;stopCameraButton.disabled=!cameraRunning;updateReplay();}
});
element('stop-camera').addEventListener('click',()=>{
  replay.stop();camera.stop();stopCameraButton.disabled=true;cameraRunning=false;landmarks=[];lastPose=neutral();classifier.reset();
  if(source.value==='pose')emit(neutral());cameraStatus.textContent='Camera off. Keyboard remains available.';
});
element('start-calibration').addEventListener('click',()=>{
  if(!clearSpace.checked){element('calibration-status').textContent='Confirm your clear space first.';return;}
  if(!cameraRunning){element('calibration-status').textContent='Start the webcam before calibration.';return;}
  classifier.reset();lastPose=neutral();emit(neutral());
  calibration.start(posture.value==='seated'?'seated':'standing',performance.now());
});
posture.addEventListener('change',()=>{
  posture.blur();sendOptions();
  calibration.reset();classifier.reset();lastPose=neutral();
  if(source.value==='pose')emit(neutral());
});
source.addEventListener('change',()=>{source.blur();sessionWarning();classifier.reset();lastPose=neutral();transmit(neutral());updateKeyboard();});
clearSpace.addEventListener('change',()=>{sessionWarning();updateReplay();if(!clearSpace.checked)transmit(neutral());updateKeyboard();});
element('stop-input').addEventListener('click',()=>emit({kind:'control',action:'stop',by:'capture'}));
element('resume-input').addEventListener('click',()=>{
  if(!clearSpace.checked){connectionStatus.textContent='Confirm your clear space before resuming.';return;}
  if(socket?.readyState===WebSocket.OPEN)sessionWarning();
  stopped=false;transmit({kind:'control',action:'resume',by:'capture'});updateKeyboard();
});
element('record-start').addEventListener('click',()=>{
  if(recorder.recording)return;
  if(!cameraRunning){recordStatus.textContent='Start the camera to record landmarks. Label with K / A / D / J.';return;}
  if(!calibration.snapshot.ready){recordStatus.textContent='Complete webcam calibration before recording so replay uses your guard threshold.';return;}
  startRecordButton.disabled=true;stopRecordButton.disabled=false;
  posture.disabled=true;element<HTMLButtonElement>('start-calibration').disabled=true;
  recorder.start(performance.now(),posture.value==='seated'?'seated':'standing',calibration.snapshot.guardThreshold,keyboard.physical,{leanThresholds:calibration.snapshot.leanThresholds??undefined,leanPeaks:calibration.snapshot.leanPeaks??undefined,guardMedians:calibration.snapshot.guardMedians??undefined,guardReleaseBand:calibration.snapshot.guardReleaseBand??undefined,neutralSwayP95:calibration.snapshot.neutralSwayP95??undefined,leanFloor:calibration.snapshot.leanFloor??undefined});
  recordStatus.textContent='Recording · K guard · A/D lean · J punch. Raw landmarks only; no video.';
});
element('record-stop').addEventListener('click',()=>{
  const result=recorder.stop(performance.now());if(!result)return;
  startRecordButton.disabled=false;stopRecordButton.disabled=true;
  posture.disabled=false;element<HTMLButtonElement>('start-calibration').disabled=false;
  const name=element<HTMLInputElement>('record-name').value.trim().replace(/[^a-zA-Z0-9_-]/g,'-')||`capture-${posture.value}`;
  saveJson(`${name}.landmarks.json`,result.landmarks);saveJson(`${name}.labels.json`,result.labels);
  recordStatus.textContent=`Saved ${result.landmarks.frames.length} frames as ${name}.landmarks.json and ${name}.labels.json. Move both files into test/fixtures/.`;
});
const heartbeat=window.setInterval(()=>{
  const at=performance.now();
  if(source.value==='keyboard')emit({kind:'pose',...keyboard.physical,source:'keyboard',at});
  else if(cameraRunning&&at-lastFrameAt<500)emit({...lastPose,at});
  else transmit(neutral(at));
  if(cameraRunning&&at-lastFrameAt>=500) {
    cameraStatus.textContent=NO_POSE_MESSAGE;
    element('fps-debug').textContent=NO_POSE_MESSAGE;
    element('diagnostics').textContent=NO_POSE_MESSAGE;
  }
},100);
window.addEventListener('beforeunload',()=>{
  disposed=true;window.clearInterval(heartbeat);transmit(neutral());keyboard.dispose();camera.stop();replay.dispose();socket?.close();
});
replayEnabled.addEventListener('change',updateReplay);
noPunch.addEventListener('change',()=>{sendOptions();noPunch.blur();});
updateKeyboard();connect();

function sessionCommand(action:'start'|'next-round'|'summary') {
  if(action!=='summary'&&!allowed()){sessionWarning('Confirm your clear space and Resume inputs before starting.');return;}
  if(action!=='summary'&&source.value==='pose'&&!calibration.snapshot.ready){sessionWarning('Finish webcam calibration, or select Keyboard.');return;}
  if(socket?.readyState!==WebSocket.OPEN){sessionWarning('Connect to the local server first.');return;}
  sessionWarning();sendOptions();
  socket.send(JSON.stringify({kind:'session',action}));
}
element('start-match').addEventListener('click',()=>sessionCommand('start'));
element('next-round').addEventListener('click',()=>sessionCommand('next-round'));

element('session-summary').addEventListener('click',()=>sessionCommand('summary'));
