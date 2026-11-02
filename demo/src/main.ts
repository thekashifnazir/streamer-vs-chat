import {createGuardResume} from './hosted-pause';
import {createSelectedGame,difficultyLabel} from './difficulty-choice';
import {defaultLandingInput,mountDemoLanding} from './demo-landing';
import {mountLandingHistory} from './landing-history';
import {mountFightUi} from './fight-ui';
import {showCameraError} from './camera-feedback';
import {mountShareTools} from './share-tools';
import {createLeaveGuard} from './leave-guard';
import {mountFightSetup} from './setup-ui';
import {createPrefs} from './prefs';
import {bindSetupPrefs} from './setup-prefs';
import {createCalibrationProfiles} from '../../capture/src/calibration-profile';
import {scoutPreviewConfig,SCOUT_PREVIEW_BADGE} from './scout-preview';
import {createSuperNotices} from '../../shared/src/super-notices';
import {createBossImpactLedger} from '../../shared/src/boss-impact';
import {chatCommandLegend} from '../../shared/src/chat-commands';
import {tempoFor} from '../../shared/src/tempo';
import type {ForgeSnapshot} from '../../shared/src/forge-view';
import type {BossDef} from '../../shared/src/boss-def';
import '../../overlay/src/style.css';
import './style.css';
import { createRailsHud } from '../../overlay/src/hud';
import { step as engineStep, type GameState } from '../../shared/src/engine';
import {parseChatVote} from '@svc/shared';
import type { PoseState, StreamerInput } from '@svc/shared';
import type {Difficulty} from '../../shared/src/tempo';
import { createKeyboard } from '../../capture/src/keyboard';
import { createKeyboardAvatar } from './keyboard-avatar';
import { PoseCamera } from '../../capture/src/camera';
import { PoseClassifier } from '../../capture/src/classifier';
import {TrainerMoveDetector} from '../../capture/src/trainer-moves';
import {mountPoseDebug} from './pose-debug';
import { createCalibration } from '../../capture/src/calibration';
import { createSimulationSource } from './source';
import { InputTutorial } from './tutorial';
import { fightHelp, finisherHelp, poseGuide } from './defence-copy';
import {startColdOpen,coldOpenStage} from './cold-open';
import {mountStreamLayout} from './stream-layout';
import {mountStartingSoon,startingSoonCopy,type HoldingState} from './starting-soon';
import {STAGE_PREVIEW} from './hosted-flow';
import {LocalPlaytestStats} from './playtest';
import { summarizeGame } from '../../shared/src/highlights';
import {mountTrainer,defaultCueSound} from './trainer-ui';
import {mountPosePreview} from './pose-preview';
import {mountCameraHit} from '../../overlay/src/camera-hit';
import {createHandsWatch} from './hands-warning';
import {HANDS_PROMPT} from '../../overlay/src/stage-lanes';
import {createSimChatFeed,mountSimChat,simHandle,simVoteText,type SimChatMode} from './sim-chat';
import {demoCoachEnabled,mountDemoCornerCoach} from './coach-button';
import {formatHypeFull,formatRoundResult,roundResultBody} from '../../shared/src/result-text';
import {formatWorkoutSummary,trainerSummary} from '../../shared/src/trainer';
import {COACH_CUES,createBossTaunts,createVoiceBank,mountVoicePicker,playCoach,PREVIEW_CUE,setActiveVoiceBank,type CoachCue} from './voice-bank';

const impactLedger=createBossImpactLedger('browser');
const superNotices=createSuperNotices();
const step:typeof engineStep=(before,event,now)=>{const after=engineStep(before,event,now);impactLedger.observe(before,after);const hypeFull=superNotices.observe(before,after,Date.now(),event.kind==='restart');hosted?.observeGame(after,hypeFull,event.kind==='restart');simObserve(before,after,hypeFull);demoCoach?.observe();if(event.kind==='vote')superNotices.denied(after,event.move,Date.now());return after;};
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
const safetyCleared=()=>source.value==='keyboard'||clearSpace.checked;
// Offline demo only: a SIMULATED chat panel showing a sample of what the simulated crowd "types", plus the lines the bot would post on /play.
const simChat=liveMode?null:createSimChatFeed(),simChatView=liveMode?null:mountSimChat(document,stage);
function simObserve(before:GameState,after:GameState,hypeFull:boolean){
 if(!simChat||coldOpenAt!==null||before.match.seed!==after.match.seed)return;
 for(const round of after.log.rounds)if(!before.log.rounds.some(prior=>prior.number===round.number)){simChat.drop();simChat.bot(formatRoundResult(roundResultBody(after,round)));}
 if(hypeFull)simChat.bot(formatHypeFull());
}
function simChatMode():SimChatMode|null{if(!simChat)return null;if(trainer.active)return trainer.state?.phase==='done'?'trainer-done':'trainer';return game&&coldOpenAt===null?'boss':null;}
function syncSimChat(){if(!simChat||!simChatView)return;simChat.tick(performance.now());simChatView.render(simChat,simChatMode());}
if(!liveMode)mountDemoLanding(document);
const previewConfig=scoutPreviewConfig(location,{liveMode,liveTokenLoaded:false});
if(previewConfig)document.querySelector('.demo-tag')!.textContent=SCOUT_PREVIEW_BADGE;
const hud=createRailsHud(host,{simulated:!liveMode,soundDefault:true,deferSoundUntilStart:true,offlineDemo:!liveMode});
// Hit feedback on the camera circle (overlay/src/camera-hit.ts): punches yellow with the hand, clean defences cyan, hits taken red.
const cameraHit=mountCameraHit(stage,{calm:()=>hud.calm()});
const streamSound=(document.getElementById('stream-sound')??document.getElementById('demo-sound')) as HTMLInputElement|null;
// Recorded boss taunts (and the Crowd Trainer's coach) share the HUD's sound, mute and announcer priority.
const voiceBank=createVoiceBank(hud.voiceHost),bossTaunts=createBossTaunts(voiceBank,hud.voiceHost);setActiveVoiceBank(voiceBank);
if(streamSound){
  const syncSound=()=>{streamSound.checked=hud.soundRequested();updateLandingLabel();};
  host.addEventListener('rails-sound-change',syncSound);
  // Blur like the other switches: the HUD's M shortcut ignores keys while an input has focus.
  streamSound.addEventListener('change',()=>{void hud.setSoundRequested(streamSound.checked);streamSound.blur();});
  syncSound();
}
const tutorial=new InputTutorial();
const classifier=new PoseClassifier({guardThreshold:0});
const trainerMoves=new TrainerMoveDetector();
// ?debug=pose: a tiny corner readout of pose fps and detected moves for live tuning (off by default, outside the stage).
const poseDebug=mountPoseDebug(document,location.search);let debugPose={guard:false,lean:null as 'L'|'R'|null};
let pendingBoss:BossDef|null=null;
let forgeSnapshot:ForgeSnapshot|null=null;
let forgePanel:ReturnType<typeof import('./forge').mountDemoForge>|null=null;
let game:GameState|null=null;
let fightUi:ReturnType<typeof mountFightUi>|null=null;
/** The round results card waits 1.5 s after the round ends, so the KO blow and stamp are seen on stream and in clips. */
const RESULT_REVEAL_MS=1500;
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
// The rehearsal runs in the compact stream view, which hides its result line and the Rehearse button.
let coldOpenSettled=false;
// When the pause dialog opened during a rehearsal; the 5-second take is frozen while paused.
let coldOpenPausedAt:number|null=null;
function clearColdOpen(){coldOpenAt=null;coldOpenPausedAt=null;stage.classList.remove('cold-open-tally');}
// Closing the tab ends a browser broadcast and loses the match; warn only while either is at stake.
const leaveGuard=createLeaveGuard(window,()=>({live:hosted?.broadcasting===true,game,ended:showSessionSummary,workout:trainer.running}));
const streamLayout=mountStreamLayout({live:liveMode,onEnd:()=>{if(trainer.running){trainer.stop();return;}if(liveMode){el<HTMLButtonElement>('show-results').click();return;}showSessionSummary=true;if(game){game=step(game,{kind:'control',action:'stop',by:'capture'},performance.now());paint();}}});
if(previewConfig)streamLayout.status(SCOUT_PREVIEW_BADGE);
const playtest=new LocalPlaytestStats();
if(!liveMode)mountShareTools(document);
let playtestRound:string|null=null;
let tutorialStarted=false;
function trackLocalRound(){
 if(!game||liveMode||coldOpenAt!==null)return;
 const key=`${game.match.seed}:${game.round.number}`;
 if(playtestRound!==key){if(game.round.over)return;playtest.endRound();playtest.startRound();playtestRound=key;}
 if(game.round.over)playtest.endRound(game);
}
function trackFight(){
  if(!hosted||!game)return;
  const key=`${game.match.seed}:${game.round.number}`;
  if(metricsRound!==key){hosted.endFight();hosted.startFight();metricsRound=key;}
  if(game.round.over)hosted.endFight();
}

function updateLandingLabel() {
  const label=document.getElementById('landing-mode-label');
  if(label)label.textContent=`Sound ${hud.soundRequested()?'on':'off'} · ${difficultyLabel(difficulty.value,source.value==='pose')}`;
}
function updateTutorial() {
  tutorial.setNoPunch(noPunch.checked);
  el('tutorial-last-key').textContent=tutorial.keys[2];
  el('tutorial-last-label').textContent=noPunch.checked?`Try the other ${posture.value==='seated'?'tilt':'lean'}`:'Try a bonus punch';
  el('tutorial-status').textContent=tutorial.status(tutorialStarted);
  hud.setPractice(tutorialStarted&&!game);
  fightUi?.modes(source.value==='keyboard',noPunch.checked);
  for(const [index,item]of Array.from(document.querySelectorAll('[data-step]')).entries()) {
    item.classList.toggle('done',index<tutorial.step);item.classList.toggle('active',index===tutorial.step);
  }
}
/** Webcam players get body-move wording; the keycap guide is for keyboard play only. */
function updateControlGuide() {
  const pose=source.value==='pose',keys=document.getElementById('key-guide'),moves=document.getElementById('pose-guide');
  if(!keys||!moves)return;
  keys.hidden=pose;moves.hidden=!pose;
  const text=poseGuide({seated:posture.value==='seated',noPunch:noPunch.checked});if(moves.textContent!==text)moves.textContent=text;
}
function updateModes() {
  paintStartingSoon();
  const seated=posture.value==='seated';
  hud.setModes({seated,noPunch:noPunch.checked,keyboard:source.value==='keyboard'});
  classifier.setPunchesEnabled(!noPunch.checked);
  el('punch-guide').hidden=noPunch.checked;
  el('guide-lean').textContent=seated?'tilt':'lean';
  el('tutorial-defence').textContent=seated?'Tilt':'Lean';
  el('tutorial-lean-label').textContent=`${seated?'Tilt':'Lean'} left${noPunch.checked?'':' and right'}`;el('tutorial-lean-key2').hidden=noPunch.checked;
  setup.sync();setup.commands(game?game.bossDef:pendingBoss);
  el('back-to-setup').textContent=trainer.selected?'End workout':'End fight';
  updateTutorial();updateControlGuide();
}


function resize(){const scale=stage.clientWidth/1920;host.style.transform=`scale(${scale})`;if(scale>0)host.style.setProperty('--demo-hud-scale',String(scale));}
new ResizeObserver(resize).observe(stage);resize();
// /play: viewers see a STARTING SOON card whenever nothing runs on the stage (CSS keys it to .fight-started).
const startingSoon=liveMode?mountStartingSoon(stage):null;
// Holding card state: whether a fight ran, the last finished match, and the last boss fought (so a forged boss is announced once).
let fought=false,lastMatch:HoldingState['lastMatch']=null,lastFoughtBoss='';
function paintStartingSoon(){if(!startingSoon)return;if(game){fought=true;lastFoughtBoss=game.bossDef?.name??'';if(game.match.winner)lastMatch={winner:game.match.winner,streamer:game.match.round_wins.streamer,boss:game.match.round_wins.boss};}
 startingSoon.update(startingSoonCopy({login:hosted?.login,boss:(game?.bossDef??pendingBoss)?.name,trainer:trainer.selected,fought,lastMatch,forging:!!hosted?.forgeBusy,forged:!!pendingBoss&&pendingBoss.name!==lastFoughtBoss}));}
function paint() {
  hosted?.observePhase();
  paintStartingSoon();
  forgePanel?.update();
  hud.setForge(forgeSnapshot,!game||game.round.over);
  setup.commands(game?game.bossDef:pendingBoss);
  hud.setMemory(hosted?.memoryView()??null);
  document.querySelector<HTMLElement>('.chat-command-help')!.textContent=chatCommandLegend(game?.bossDef)+' · '+finisherHelp(source.value==='pose');
  updateControlGuide();
  hud.setBossReceipts(impactLedger.snapshot());hud.setSuperNotices(superNotices.snapshot());
  bossTaunts.observe(game);
  cameraHit.observe(game);
  hud.render(game??createSelectedGame(difficulty,{seed,viewers:liveMode?0:Number(crowdSize.value),now:0,...(previewConfig?{scoutingConfig:previewConfig}:{})}),!liveMode);
  hud.setConnection(previewConfig?SCOUT_PREVIEW_BADGE:liveMode?(hosted?.ready?'LIVE · YOUR TWITCH CHAT':'LIVE MODE · CONNECT TWITCH'):'OFFLINE DEMO · SIMULATED CHAT');
  // /play is any streamer's broadcast: name the connected Twitch login, never the default HUD name.
  if(liveMode)hud.setPlayerName(hosted?.login?hosted.login.toUpperCase():'YOU');
  trackFight();trackLocalRound();
  hud.setPractice(tutorialStarted&&!game);
  if(previewConfig){const badge=host.querySelector('[data-id=simulated]');if(badge)badge.textContent=SCOUT_PREVIEW_BADGE;}
  if(!liveMode)updateLandingLabel();
  const summary=game&&(game.round.over||showSessionSummary)?summarizeGame(game,game.match.winner||showSessionSummary?undefined:game.round.number):null;
  const publicSummary=summary&&hosted?hosted.publicSummary(summary):summary;
  fightUi?.render(game,showSessionSummary,liveMode?{mvp:publicSummary?.chatMvp?.displayName??publicSummary?.chatMvp?.user,clips:hosted?.clipsSnapshot()}:{sim:{mvp:summary?.chatMvp&&coldOpenAt===null?simHandle(summary.chatMvp.user):undefined}});
  syncSimChat();
  hud.setEndcard(null);
  if(game) {
    el('next-round').hidden=!game.round.over||Boolean(game.match.winner)||showSessionSummary;
    el('restart').hidden=false;
    el('resume-input').hidden=!game.paused||showSessionSummary||(liveMode&&!hosted?.ready);
    crowdSize.disabled=!game.round.over;
    // Offline demo: the simulated crowd size is offered between rounds only (live play hides it for good).
    if(!liveMode){crowdSize.closest('label')!.hidden=!game.round.over;document.querySelector('.demo-controls')!.classList.toggle('between-rounds',game.round.over);}
    el('demo-status').textContent=game.paused?'Paused. Resume when your space is clear.':game.match.winner?'Match complete. Try another crowd size or play again.':game.round.over?noPunch.checked?'Round complete. Clean defences do the damage.':'Round complete. Defence does the damage; punches are a bonus.':fightHelp({pose:source.value==='pose',seated:posture.value==='seated',noPunch:noPunch.checked},game.bossDef?.name);
  }
  // No crowd choice in practice or Crowd Trainer: the trainer's simulated crowd is fixed when the workout starts.
  if(!liveMode&&!game)crowdSize.closest('label')!.hidden=tutorialStarted||trainer.active;
  // The compact fight layout hides the setup card. If the flow leaves step 3 mid-fight (Twitch
  // authorization revoked or expired), expand it so the Reconnect card is not hidden behind a blank page.
  if(liveMode&&document.body.dataset.playStep!=='fight'&&document.body.classList.contains('stream-compact'))streamLayout.expand();
  // /play: a running fight or workout (between rounds too) shows only the stage, its controls and the top bar until End fight or Show full page.
  else if(liveMode&&document.body.dataset.playStep==='fight'&&(game||trainer.active||tutorialStarted)&&!document.body.classList.contains('webcam-open'))streamLayout.fightView();
  leaveGuard.sync();
}
function drawCrowd(at:number) {
  if(liveMode||coldOpenAt!==null||!game||!crowd||game.round.over||game.paused)return;
  const key=`${game.round.number}:${Math.floor(game.round.elapsed_ms/tempoFor(game.difficulty).beat)}`;
  if(key===crowdBeat)return;
  crowdBeat=key;
  const votes=crowd.votes(game,at);
  game=step(game,{kind:'vote-batch',votes},at);
  for(const vote of votes)playtest.vote(vote.user,game.votes[vote.user]===vote.move);
  const boss=game.bossDef;simChat?.offer(votes.map(vote=>({user:vote.user,text:simVoteText(vote.move,boss,simChat.random())})));
}
function startFight() {
  if(hosted?.forgeBusy){el('tutorial-status').textContent='Boss Forge is generating between rounds. Wait or type !veto.';return;}
  if(liveMode&&!hosted?.ready){el('tutorial-status').textContent='Waiting for your Twitch chat to connect…';return;}
  if(!safetyCleared()){el('tutorial-status').textContent='Tick “my space is clear” above before starting.';return;}
  if(source.value==='pose'&&(!cameraRunning||!calibration.snapshot.ready||performance.now()-lastFrameAt>=500||!poseFramed)){el('camera-status').textContent='Keep your calibrated head, shoulders and wrists in frame before starting.';setup.open();return;}
  if(trainer.selected){startTrainer();return;}
  fightUi?.setPaused(false);tutorialStarted=false;hud.setPractice(false);fightUi?.showStage();
  hosted?.endFight();showSessionSummary=false;clearColdOpen();simChat?.clear();
  const at=performance.now();
  game=createSelectedGame(difficulty,{seed:seed++,viewers:liveMode?liveViewers:Number(crowdSize.value),now:at,...(previewConfig?{scoutingConfig:previewConfig}:{}),...(pendingBoss?{bossDef:pendingBoss}:{})});
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
/** Crowd Trainer: same setup, safety and pause path; its own pure reducer instead of the boss engine. */
function startTrainer() {
  fightUi?.setPaused(false);tutorialStarted=false;hud.setPractice(false);fightUi?.showStage();clearColdOpen();game=null;crowd=null;showSessionSummary=false;
  el('tutorial').hidden=true;document.querySelector<HTMLElement>('.demo-controls')!.hidden=false;streamLayout.collapse();stage.scrollIntoView?.({block:'start',behavior:'smooth'});
  keyboard.setEnabled(source.value==='keyboard');classifier.setPunchesEnabled(true);
  hosted?.observeCoach();demoCoach?.observe();simChat?.clear();trainerMoves.reset();const at=performance.now();trainer.start(at);trainer.input(source.value==='keyboard'?{kind:'pose',...keyboard.physical,source:'keyboard',at}:lastPose,at);paint();
}
let pauseReason='Esc';
const guardResume=createGuardResume(()=>input({kind:'control',action:'resume',by:'capture'}));
/** Pause with a reason shown on the stage. Both / and /play use it; only /play has Twitch reasons. */
function pauseWith(reason:string){pauseReason=reason;guardResume.reset();input({kind:'control',action:'stop',by:'capture'});pauseReason='Esc';}
window.addEventListener('keydown',event=>{if(liveMode&&event.code==='Escape'&&!event.repeat&&fightUi?.paused){event.stopImmediatePropagation();event.preventDefault();input({kind:'control',action:'resume',by:'capture'});}},true);
function input(event:StreamerInput) {
  if(event.kind==='control'&&['stop','pause','veto'].includes(event.action)&&(tutorialStarted||game||trainer.running)&&!showSessionSummary){guardResume.reset();fightUi?.setPaused(true,pauseReason,source.value==='pose');pauseReason='Esc';if(coldOpenAt!==null)coldOpenPausedAt??=performance.now();}
  if(event.kind!=='control'&&fightUi?.paused)return;
  // Resume after a finished rehearsal take returns to the landing page; mid-take it resumes the take.
  if(event.kind==='control'&&event.action==='resume'&&coldOpenAt!==null&&(!game||game.log.resolved.length>0||(coldOpenPausedAt??performance.now())-coldOpenAt>=5000)){leaveColdOpen();return;}
  if(event.kind==='control'&&event.action==='resume'&&!safetyCleared()){if(game?.paused||fightUi?.paused)fightUi?.setPaused(true,'confirm your clear space',source.value==='pose');return;}
  if(event.kind==='control'&&event.action==='resume'&&source.value==='pose'&&(!cameraRunning||!calibration.snapshot.ready||performance.now()-lastFrameAt>=500||!poseFramed)){el('camera-status').textContent='Keep your calibrated head, shoulders and wrists in frame before resuming.';if(game?.paused||fightUi?.paused)fightUi?.setPaused(true,"camera can't see you — show your calibrated head, shoulders and both hands",true);return;}
  if(event.kind==='control'&&event.action==='resume'&&(showSessionSummary||(liveMode&&!hosted?.ready)))return;
  const at=performance.now();
  if(event.kind!=='control'&&!safetyCleared()) {
    if(!game)updateTutorial();
    return;
  }
  if(trainer.running){trainer.input(event,at);if(event.kind==='control'&&event.action==='resume'&&!trainer.paused)fightUi?.setPaused(false);return;}
  if(!game) {
    if(event.kind==='control'){if(event.action==='resume')fightUi?.setPaused(false);return;}
    if(!tutorialStarted||source.value==='pose')return;
    if(tutorial.input(event)){startFight();return;}
    updateTutorial();
    return;
  }
  if(event.kind==='punch'&&noPunch.checked)return;
  if(event.kind==='punch')cameraHit.notePunch(event.side);
  game=step(game,event,at);
  if(event.kind==='control'&&event.action==='resume'&&!game.paused) {
    const pose:PoseState=source.value==='keyboard'?{kind:'pose',...keyboard.physical,source:'keyboard',at}:
      cameraRunning&&at-lastFrameAt<500?{...lastPose,at}:{kind:'pose',guard:false,lean:null,source:'pose',at};
    game=step(game,pose,at);
  }
  if(event.kind==='control'&&event.action==='resume'&&!game.paused){fightUi?.setPaused(false);if(coldOpenAt!==null&&coldOpenPausedAt!==null){coldOpenAt+=at-coldOpenPausedAt;coldOpenPausedAt=null;}}
  drawCrowd(at);paint();
}
const trainer=mountTrainer(document,{live:liveMode,stage,difficulty:()=>difficulty.value as Difficulty,keyboard:()=>source.value==='keyboard',viewers:()=>Number(crowdSize.value),liveTokenLoaded:()=>hosted?.hasToken??false,onCue:cue=>{const bell=cue==='round-start'||cue==='rest'||cue==='time'||cue==='workout-done';if(bell)hud.playSound(defaultCueSound(cue));void ((COACH_CUES as readonly string[]).includes(cue)?playCoach(cue as CoachCue):Promise.resolve(false)).then(spoke=>{if(!spoke&&!bell)hud.playSound(defaultCueSound(cue));});},onAgain:()=>{trainer.exit();el('start-fight').click();},onExit:()=>document.querySelector<HTMLButtonElement>('#pause-screen [data-pause=quit]')?.click(),onDone:state=>{fightUi?.setPaused(false);updateModes();simChat?.drop();simChat?.you(formatWorkoutSummary(trainerSummary(state)),'YOUR LINE · paste it with Copy chat line');syncSimChat();},onSimChat:messages=>simChat?.offer(messages),onModeChange:()=>updateModes()});
const avatarPose=createKeyboardAvatar(avatar,{punchEnabled:()=>!noPunch.checked});
const keyboard=createKeyboard({emit:input,label:avatarPose.label});
keyboard.setEnabled(true);
const profiles=createCalibrationProfiles(()=>window.localStorage);
const setup=mountFightSetup(document,{onSkipPunches:()=>applyCalibration(calibration.skipPunches()),keyboardRequiresClearSpace:false,simplifiedCalibration:liveMode,workout:()=>trainer.selected,onStart:()=>{void hud.activateSound();if(game||trainer.selected){startFight();return;}tutorialStarted=true;fightUi?.reset();fightUi?.showStage();el('tutorial').hidden=false;document.querySelector<HTMLElement>('.demo-controls')!.hidden=false;streamLayout.collapse();paint();updateTutorial();stage.scrollIntoView?.({block:'start',behavior:'smooth'});},onWebcamCountdown:()=>{fightUi?.showStage();void hud.activateSound();keyboard.setEnabled(false);if(game)input({kind:'control',action:'stop',by:'capture'});fightUi?.setPaused(false);el('tutorial').hidden=true;document.querySelector<HTMLElement>('.demo-controls')!.hidden=false;streamLayout.collapse();},webcamFramed:()=>cameraRunning&&performance.now()-lastFrameAt<500&&poseFramed,onWebcamStart:()=>{source.value='pose';keyboard.setEnabled(false);startFight();}});
fightUi=mountFightUi(document,{offline:!liveMode,revealMs:RESULT_REVEAL_MS,resume:()=>{keyboard.release();input({kind:'control',action:'resume',by:'capture'});},restart:()=>{clearColdOpen();game=null;crowd=null;tutorial.reset();tutorialStarted=false;showSessionSummary=false;fightUi?.reset();el('start-fight').click();},quit:()=>{trainer.exit();updateModes();if(game)game=step(game,{kind:'control',action:'stop',by:'capture'},performance.now());clearColdOpen();game=null;crowd=null;tutorial.reset();tutorialStarted=false;showSessionSummary=false;fightUi?.reset();fightUi?.hideStage();streamLayout.expand();document.querySelector<HTMLElement>('.demo-controls')!.hidden=true;paint();el('onboarding-row').scrollIntoView?.({block:'start'});},end:()=>{setup.cancel();if(trainer.active){trainer.exit();updateModes();}if(!game){fightUi?.reset();fightUi?.hideStage();tutorialStarted=false;streamLayout.expand();document.querySelector<HTMLElement>('.demo-controls')!.hidden=true;return;}input({kind:'control',action:'stop',by:'capture'});fightUi?.setPaused(false);showSessionSummary=true;paint();},next:()=>el('next-round').click()});
// Offline demo voice coach: switched off for the submission (demoCoachEnabled); see coach-button.ts and docs/COACH.md.
const demoCoach=liveMode||!demoCoachEnabled(document)?null:mountDemoCornerCoach(document,{getState:()=>trainer.selected||trainer.active||coldOpenAt!==null?null:game,onActive:active=>fightUi?.hold(active)});
// Offline demo: browser Back returns to the homepage hero instead of leaving the site; mid-round it pauses first.
if(!liveMode)mountLandingHistory(window,{away:()=>document.body.classList.contains('fight-started')||document.body.classList.contains('webcam-open'),midFight:()=>!showSessionSummary&&(trainer.running||(tutorialStarted&&!game)||(!!game&&!game.round.over&&!game.match.winner)),paused:()=>!!fightUi?.paused,pause:()=>{setup.cancel();keyboard.release();pauseWith('you pressed Back · Back again goes to the homepage');},home:()=>{setup.cancel();if(document.body.classList.contains('webcam-open'))setup.close(false);if(document.body.classList.contains('fight-started'))document.querySelector<HTMLButtonElement>('#pause-screen [data-pause=quit]')?.click();el('onboarding-row').scrollIntoView?.({block:'start'});}});
/** Leave a rehearsal take for the landing page, keeping its result line on screen. */
function leaveColdOpen(){clearColdOpen();game=null;crowd=null;showSessionSummary=false;fightUi?.reset();fightUi?.hideStage();streamLayout.expand();document.querySelector<HTMLElement>('.demo-controls')!.hidden=true;paint();el('cold-open-status').scrollIntoView?.({block:'center'});}
// Setup ends with the optional punch step. Like the rest of setup it needs no tick; only START waits for it (Kash, 1 Nov: on /play the step sat waiting).
const calibration=createCalibration({punches:true,onChange(snapshot){
  el('calibration-status').textContent=snapshot.message;
  el<HTMLProgressElement>('calibration-progress').value=snapshot.progress;
  setup.calibration(snapshot);
}});
function restoreCalibration(){const mode=posture.value==='seated'?'seated':'standing',saved=profiles.load(mode);if(saved&&calibration.restore(saved,mode)){classifier.setCalibration(saved);trainerMoves.setPunchThresholds(saved.punchThresholds);setup.restored(true);}}
/** A finished calibration (all steps, or punches skipped) drives both detectors; punch thresholds are per player when measured. */
function applyCalibration(calibrated:ReturnType<typeof calibration.update>){if(!calibrated.ready||calibrated.guardThreshold===null)return;classifier.setCalibration({guardThreshold:calibrated.guardThreshold,leanThresholds:calibrated.leanThresholds??undefined,guardReleaseBand:calibrated.guardReleaseBand??undefined,guardMedians:calibrated.guardMedians??undefined,neutralSwayP95:calibrated.neutralSwayP95??undefined,punchThresholds:calibrated.punchThresholds});trainerMoves.setPunchThresholds(calibrated.punchThresholds);}
setup.calibration(calibration.snapshot);
restoreCalibration();
// One camera presentation (Kash, 1 Nov): the camera circle in the stage's camera lane during webcam practice, fights and workouts, never the
// full-size camera behind the fight. The demo draws it (pose-preview.ts); /play has its stream bubble and adds only the opt-in skeleton on top.
const showSkeleton=()=>document.querySelector<HTMLInputElement>('#show-skeleton')?.checked===true;
const posePreview=mountPosePreview(stage,video,{skeleton:showSkeleton,mode:liveMode?'skeleton-only':'video'});
const previewShown=()=>source.value==='pose'&&cameraRunning&&!fightUi?.paused&&!showSessionSummary&&coldOpenAt===null&&(!liveMode||!!stage.querySelector('.stream-camera-bubble:not([hidden])'))&&(trainer.running||(tutorialStarted&&!game)||(!!game&&!game.round.over&&!game.paused));
const camera=new PoseCamera(video,sample=>{
  lastFrameAt=performance.now();
  const before=calibration.snapshot;
  const calibrated=calibration.update(sample.landmarks,sample.at);
  if(calibrated.ready&&!before.ready)applyCalibration(calibrated);
  const result=classifier.update(sample.landmarks,sample.at);
  const framed=[0,11,12,15,16].every(index=>{const p=sample.landmarks[index];return p&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&(p.visibility??1)>=.5;});
  const seatedTooClose=posture.value==='seated'&&result.metrics&&result.metrics.shoulderWidth>.20;
  handsWatch.frame(sample.landmarks,lastFrameAt);
  poseFramed=framed&&!seatedTooClose;setup.frame(sample.landmarks,poseFramed);posePreview?.draw(sample.landmarks,previewShown());
  const ready=calibrated.ready&&poseFramed&&safetyCleared();
  lastPose=ready?result.state:{kind:'pose',guard:false,lean:null,source:'pose',at:sample.at};
  el('camera-status').textContent=!framed?'Keep head, shoulders and both wrists in frame.':seatedTooClose?'Move further back; seated shoulders must span ≤20% of the frame.':`Camera local · ${sample.fps.toFixed(0)} FPS · ${sample.inferenceMs.toFixed(0)} ms inference`;
  // Hands-free resume: a 1 s guard hold, only while calibrated, framed, fresh and clear-space confirmed.
  if(source.value==='pose')guardResume.sample(!!fightUi?.paused&&ready&&cameraRunning&&!showSessionSummary&&(!liveMode||!!hosted?.ready),lastPose.guard,performance.now());
  if(source.value==='pose') {
    input(lastPose);
    if(ready)for(const punch of result.punches)input(punch);
    // Crowd Trainer reads punch side and slips with its own detector; Boss Fight thresholds stay as they are.
    if(trainer.running){const moves=trainerMoves.update(sample.landmarks,sample.at);if(ready){for(const punch of moves.punches){trainer.move({kind:'punch',side:punch.side});cameraHit.trainerPunch(punch.side);}for(const slip of moves.slips)trainer.move({kind:'slip',side:slip.side});}
     if(poseDebug&&ready){for(const punch of moves.punches)poseDebug.move({kind:'PUNCH',side:punch.side});for(const slip of moves.slips)poseDebug.move({kind:'SLIP',side:slip.side});}}
    else if(poseDebug&&ready)for(const punch of result.punches)poseDebug.move({kind:'PUNCH',side:punch.side});
  }
  if(poseDebug){
    poseDebug.frame(performance.now());
    if(lastPose.lean&&lastPose.lean!==debugPose.lean)poseDebug.move({kind:'LEAN',side:lastPose.lean});if(lastPose.guard&&!debugPose.guard)poseDebug.move({kind:'GUARD'});debugPose={guard:lastPose.guard,lean:lastPose.lean};
    const s=trainer.running?trainer.state:null,token=s?.combo?.tokens[s.combo.index];
    poseDebug.expect(!s||!token?null:token==='S'?'SLIP':token==='G'?'GUARD':`${token} (${s.options.anyHand?'any hand':(token==='1')!==s.options.southpaw?'L':'R'})`);
  }
},message=>{
  cameraRunning=false;poseFramed=false;setup.camera(false);lastPose={kind:'pose',guard:false,lean:null,source:'pose',at:performance.now()};
  if(source.value==='pose')input(lastPose);
  showCameraError(document,message);
},{wasmLoaderPath:'/assets/pose/vision_wasm_internal.js',wasmBinaryPath:'/assets/pose/vision_wasm_internal.wasm',modelAssetPath:'/assets/pose/pose_landmarker_lite.task'});

el('start-camera').addEventListener('click',async()=>{
  // The camera and the whole setup, punch step included, need no tick; only the fight start does (setup-ui).
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
  source.value='keyboard';keyboard.setEnabled(true);setup.sync();setup.commands(game?game.bossDef:pendingBoss);updateControlGuide();el('camera-status').textContent='Camera off. Keyboard selected.';
});
el('start-calibration').addEventListener('click',()=>{
  if(!cameraRunning)return;
  setup.restored(false);classifier.reset();calibration.start(posture.value==='seated'?'seated':'standing',performance.now());
});
posture.addEventListener('change',()=>{setup.restored(false);poseFramed=false;calibration.reset();classifier.reset();lastPose={kind:'pose',guard:false,lean:null,source:'pose',at:performance.now()};if(game&&source.value==='pose')input(lastPose);restoreCalibration();updateModes();posture.blur();});
source.addEventListener('change',()=>{
  if(source.value==='keyboard'){camera.stop();cameraRunning=false;poseFramed=false;video.hidden=true;avatar.hidden=false;setup.camera(false);}
  if(game)input({kind:'pose',guard:false,lean:null,source:'keyboard',at:performance.now()});
  keyboard.setEnabled(!game||source.value==='keyboard');
  if(source.value==='pose')restoreCalibration();setup.sync();fightUi?.modes(source.value==='keyboard',noPunch.checked);setup.commands(game?game.bossDef:pendingBoss);updateControlGuide();updateLandingLabel();
  hud.setModes({keyboard:source.value==='keyboard'});// FINISHER banner names K/J only for keyboard play.
  source.blur();
});
clearSpace.addEventListener('change',()=>{
  keyboard.release();
  if(!safetyCleared()) {
    if(game){const at=performance.now();game=step(game,{kind:'pose',guard:false,lean:null,source:source.value==='pose'?'pose':'keyboard',at},at);}
    pauseWith('confirm your clear space');
  } else if(!game)updateTutorial();
  clearSpace.blur();
});
el('stop-input').addEventListener('click',()=>{setup.cancel();keyboard.release();input({kind:'control',action:'stop',by:'capture'});});
el('resume-input').addEventListener('click',()=>{
  if(!safetyCleared()){el('demo-status').textContent='Confirm your clear space before resuming inputs.';return;}
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
difficulty.addEventListener('change',()=>{paint();updateTutorial();});
crowdSize.addEventListener('change',()=>{paint();crowdSize.blur();});
noPunch.addEventListener('change',()=>{updateModes();noPunch.blur();});
const timer=window.setInterval(()=>{
  const tickAt=performance.now();
  if(cameraRunning&&tickAt-lastFrameAt>=500){poseFramed=false;guardResume.reset();setup.frame([],false);}
  if(posePreview&&(!previewShown()||tickAt-lastFrameAt>=500))posePreview.hide();
  setup.tick(tickAt);fightUi?.tick();
  if(trainer.running)trainer.tick(performance.now());
  syncHands(tickAt);
  if(!game)syncSimChat();
  // A workout can finish or end between paints; the guard follows it within a tick.
  leaveGuard.sync();
  if(!game)return;
  // Either tick can start the fight (end of the webcam countdown) or the next round at a later
  // performance.now(); stepping that game with tickAt would run the reducer's clock backwards.
  const at=performance.now();
  game=step(game,{kind:'advance'},at);
  if(source.value==='keyboard')game=step(game,{kind:'pose',...keyboard.physical,source:'keyboard',at},at);
  else if(!cameraRunning||at-lastFrameAt>=500){poseFramed=false;setup.frame([],false);game=step(game,{kind:'pose',guard:false,lean:null,source:'pose',at},at);}
  if(coldOpenAt!==null){
    const age=(coldOpenPausedAt??at)-coldOpenAt,phase=coldOpenStage(game,age);
    // A one-attack rehearsal deliberately pauses after the actual outcome.
    if(game.log.resolved.length&&!game.paused)game=step(game,{kind:'control',action:'stop',by:'capture'},at);
    stage.classList.toggle('cold-open-tally',phase==='tally'||phase==='done');
    if((phase==='missed'||phase==='done')&&!coldOpenSettled){coldOpenSettled=true;streamLayout.expand();el('cold-open-status').scrollIntoView?.({block:'center',behavior:'smooth'});}
    el('cold-open-status').textContent=phase==='missed'?'No clean block. Retry and hold your guard.':phase==='done'?'5-second take complete: actual guard confirmed. Chat is SIMULATED.':phase==='tally'?'Show the chat tally · SIMULATED CHAT':phase==='blocked'?'BLOCKED! Actual defence confirmed.':'GUARD! Hold your actual guard.';
  }
  drawCrowd(at);paint();
},100);
// Webcam fight or workout: "STEP BACK · KEEP BOTH HANDS IN VIEW" once a wrist has been out of view for 0.5 s (leans and punches need
// both). Fights show it in the HUD prompt lane below every other prompt; workouts hide the HUD, so the trainer stage carries its own line.
const handsWatch=createHandsWatch();
const trainerHands=document.createElement('p');trainerHands.className='trainer-hands';trainerHands.setAttribute('role','status');trainerHands.textContent=HANDS_PROMPT;trainerHands.hidden=true;(stage.querySelector('.trainer-stage')??stage).append(trainerHands);
function syncHands(at:number){
  const out=source.value==='pose'&&cameraRunning&&!fightUi?.paused&&!showSessionSummary&&coldOpenAt===null&&handsWatch.out(at);
  hud.setHandsOut(out&&!!game&&!game.paused&&!game.round.over);trainerHands.hidden=!(out&&trainer.running);
}
// pagehide, not beforeunload: a cancelled leave warning must not tear down the live stream or fight.
window.addEventListener('pagehide',()=>{leaveGuard.dispose();window.clearInterval(timer);camera.stop();keyboard.dispose();hud.dispose();forgePanel?.dispose();hosted?.dispose();demoCoach?.dispose();playtest.dispose();});
el('export-playtest').addEventListener('click',async()=>{const snapshot=await playtest.exportSnapshot();if(!snapshot)return;const json=JSON.stringify(snapshot,null,2);el('playtest-output').textContent=json;el('playtest-output').hidden=false;try{await navigator.clipboard.writeText(json);}catch{/* Selectable JSON remains available. */}});
el('back-to-setup').addEventListener('click',()=>fightUi?.end());
el('cold-open').addEventListener('click',()=>{
 if(liveMode)return;
 if(!safetyCleared()){el('cold-open-status').textContent='Confirm clear space first.';return;}
 if(source.value==='pose'&&(!calibration.snapshot.ready||!cameraRunning)){el('cold-open-status').textContent='Start and calibrate the camera first, or choose Keyboard.';return;}
 fightUi?.showStage();playtest.endRound();const at=performance.now();coldOpenAt=at;coldOpenPausedAt=null;coldOpenSettled=false;crowd=null;showSessionSummary=false;
 void hud.activateSound();
 game=startColdOpen(at,seed++,source.value==='keyboard'?{kind:'pose',...keyboard.physical,source:'keyboard',at}:lastPose);
 el('tutorial').hidden=true;document.querySelector<HTMLElement>('.demo-controls')!.hidden=false;streamLayout.collapse();stage.scrollIntoView?.({block:'start',behavior:'smooth'});stage.classList.remove('cold-open-tally');paint();
});
if(!liveMode){const {mountDemoForge}=await import('./forge');const panel=el('demo-forge-host');forgePanel=mountDemoForge(panel,{betweenRounds:()=>!game||game.round.over,onAccepted:boss=>{pendingBoss=boss;},onFightNow:()=>{void hud.activateSound();game=null;crowd=null;startFight();},onSnapshot:snapshot=>{forgeSnapshot=snapshot;hud.setForge(snapshot,!game||game.round.over);}});}
if(liveMode){
  el('friend-tools').hidden=true;
  const {mountHostedPlay}=await import('./play');
  const freeze=(reason='Twitch chat disconnected — reconnect, then resume')=>{if(game||trainer.running)pauseWith(reason);};
  hosted=mountHostedPlay({getState:()=>game,coachOff:()=>trainer.selected||trainer.active,onMemoryChange:()=>paint(),betweenRounds:()=>!game||game.round.over,onForgeAccepted:boss=>{pendingBoss=boss;paintStartingSoon();},onForgeSnapshot:view=>{forgeSnapshot=view;hud.setForge(view,!game||game.round.over);paintStartingSoon();},onBroadcast:()=>leaveGuard.sync(),parseVote:(text,user,at)=>trainer.selected?null:parseChatVote(text,user,at,false,game?.bossDef),onChatMessage:message=>trainer.chat(message),onCoach:active=>fightUi?.hold(active),onHighlightsChange:()=>paint(),onConnected:()=>paint(),onStatus:(message,detail)=>streamLayout.status(message,detail),onGreen:checked=>streamLayout.green(checked),onVote:vote=>{
    if(!game||game.round.over||game.paused)return false;
    game=step(game,vote,performance.now());paint();
    return game.votes[vote.user]===vote.move;
  },onRaid:event=>{if(game){game=step(game,event,performance.now());paint();}},onControl:event=>{if(event.kind==='control'&&event.action==='resume'&&!safetyCleared())return;if(event.kind==='control'&&['stop','pause','veto'].includes(event.action))pauseReason=event.by==='capture'?'stream ended':'chat requested a pause';input(event);},onViewers:count=>{liveViewers=count;if(game)game=step(game,{kind:'viewers',count},performance.now());},onDisconnect:freeze,onSummary:()=>{if(trainer.running){trainer.stop();return;}showSessionSummary=true;freeze();}});
  // The small stage preview on steps 2-3: on step 3 a click opens the fight-only view (Show full page comes back). In the preview
  // nothing inside the stage takes the pointer, so only clicks on the stage itself count (a card button's click must not reopen it).
  const openPreview=(event:Event)=>{if((event.currentTarget!==stage||event.target===stage)&&document.body.matches(STAGE_PREVIEW)&&document.body.dataset.playStep==='fight'&&!document.body.classList.contains('webcam-open'))streamLayout.collapse();};
  stage.addEventListener('click',openPreview);document.getElementById('stage-preview-open')?.addEventListener('click',openPreview);
  crowdSize.closest('label')!.hidden=true;
  document.title='Streamer vs Chat · Twitch play';

  el('demo-status').textContent='Connect your own Twitch channel. Keyboard and webcam use the same rules.';
  // Keep entry.ts's dark loading shell up while a remembered login validates (capped), so a
  // connected streamer never sees step 1's Connect Twitch flash before step 2.
  await Promise.race([hosted.settled,new Promise(resolve=>setTimeout(resolve,2500))]);
}
// Setup choices survive a reload (localStorage, guarded); URL values win for the visit. The demo starts on webcam on a computer unless a choice is saved.
// Opt-in tracking skeleton on the camera circle, remembered with the other setup prefs (Kash, 1 Nov: "looks better on stream without it").
{const row=document.createElement('label');row.className='defence-only skeleton-option';row.innerHTML='<input id="show-skeleton" type="checkbox" role="switch" /><span><strong>Show tracking skeleton on my camera</strong><br />Webcam only. Draws the lines the camera tracks on your camera circle. Setup always shows it.</span>';(document.getElementById('demo-more-options')??document.getElementById('play-more-options'))?.append(row);}
bindSetupPrefs(document,{store:createPrefs(()=>window.localStorage),visit:()=>window.sessionStorage,search:location.search,...(liveMode?{}:{defaults:{input:defaultLandingInput(window)}}),setup,sound:{get:()=>hud.soundRequested(),set:on=>{void hud.setSoundRequested(on);},target:host},plain:host.querySelector<HTMLInputElement>('[data-id=plain]')});
// After hosted flow has moved the Sound switch into its options, so the picker sits beside it.
// Before game sound starts, ▶ plays through a plain audio element (still only with Sound on).
const soundLabel=streamSound?.closest('label');
if(soundLabel)mountVoicePicker(soundLabel,voiceBank,{preview:bank=>{if(!hud.soundRequested())return;if(hud.voiceHost.enabled){void voiceBank.playLine(bank,PREVIEW_CUE[bank],{interrupt:true,yieldToVoice:false});return;}const url=voiceBank.previewUrl(bank);if(url)void new Audio(url).play().catch(()=>{});}});
updateModes();paint();input({kind:'pose',guard:false,lean:null,source:'keyboard',at:performance.now()});
