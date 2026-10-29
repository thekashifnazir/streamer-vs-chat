import {superSequencePresentation,renderSuperSteps,superNoticePresentation,type SuperNoticesView} from './super-ui';
import type {BossImpactBatch} from '../../shared/src/boss-impact';
import {bossDamageLayout} from './damage-layout';
import {finisherPresentation,renderFocus} from './focus-ui';
import {FEEL} from '../../shared/src/feel';
import {createBossFeedback,playBossImpactSounds,renderBossDamageNumbers,type BossImpact} from './boss-feedback';
import {chatCommand,chatCommandLegend,voteCountLabel} from '../../shared/src/chat-commands';
import {difficultyName,tempoFor} from '../../shared/src/tempo';
import type {ForgeSnapshot} from '../../shared/src/forge-view';
import {createForgeView} from './forge';
import type { Move, TallySnapshot } from '@svc/shared';
import { bossMove, availableMoves, exploitMove, weightedTally, type GameState } from '../../shared/src/engine';
import { BossSprite, moveClip } from './assets';
import { GameSound } from './sound';
import { createFxScheduler } from './fx';
import type {ViewerMemoryView} from '../../shared/src/viewer-memory';
import {memoryPresentation} from './memory';
import {chatHabitPresentation,readItResolution} from './chat-habit';
import type { GameSummary } from '../../shared/src/highlights';
import { createSummaryView, type EndcardClip } from './summary';
export type HudModes={seated:boolean;noPunch:boolean};

const commands:[Move,string][]=[['JAB','!jab'],['HOOK_L','!left'],['HOOK_R','!right'],['COMBO','!combo'],['SUPER','!super']];
export const defenceCue=(move:Move,seated=false)=>{const verb=seated?'TILT':'LEAN';return move==='HOOK_L'?`${verb} →`:move==='HOOK_R'?`← ${verb}`:move==='SUPER'?`${verb} ANY WAY`:'GUARD';};
export const bossDefenceCue=(defence:import('../../shared/src/boss-def').BossDefence,seated=false)=>{const verb=seated?'TILT':'LEAN';return defence==='guard'?'GUARD':defence==='lean_left'?`← ${verb}`:defence==='lean_right'?`${verb} →`:`${verb} ANY WAY`;};
const names:Record<Move,string>={JAB:'JAB',HOOK_L:'HOOK LEFT',HOOK_R:'HOOK RIGHT',COMBO:'COMBO',SUPER:'SUPER'};
export function isTallySnapshot(value:unknown):value is TallySnapshot {
  if(!value||typeof value!=='object')return false;
  const message=value as Partial<TallySnapshot>;
  if(message.kind!=='tally'||typeof message.simulated!=='boolean'||!Number.isSafeInteger(message.voters)||message.voters! < 0||!message.tally)return false;
  if(!commands.every(([move])=>Number.isSafeInteger(message.tally?.[move])&&message.tally![move]>=0))return false;
  if(message.weights!==undefined) {
    if(!message.weights||typeof message.weights!=='object'||!commands.every(([move])=>Number.isFinite(message.weights?.[move])&&message.weights![move]>=0))return false;
    if(!Number.isFinite(commands.reduce((sum,[move])=>sum+message.weights![move],0)))return false;
  }
  return true;
}
export function voteShares(message:TallySnapshot) {
  const weights=message.weights??message.tally;
  const total=commands.reduce((sum,[move])=>sum+weights[move],0);
  return {weights,total,highest:Math.max(...commands.map(([move])=>weights[move])),
    percent:Object.fromEntries(commands.map(([move])=>[move,total?Math.round(weights[move]/total*100):0])) as Record<Move,number>};
}
export function raidPresentation(state:GameState) {
  const remaining=Math.max(0,(state.raid.ends_at??-Infinity)-(state.clock.paused_at??state.now));
  return {active:remaining>0,seconds:Math.ceil(remaining/1000)};
}
export function nextBeatSeconds(state:GameState):string {const beat=tempoFor(state.difficulty).beat;return ((beat-state.round.elapsed_ms%beat)/1000).toFixed(1);}
export const FIXED_STAMP_MS=1800;
/** Authoritative scouting state projected into presentation; no thresholds live in the HUD. */
export function scoutingPresentation(state:GameState) {
  if(state.round.number<2)return {kind:'hidden'} as const;
  const {card,last_fix:fix,cooldown}=state.scouting;
  if(card) {
    const observed=state.scouting.dodges.slice(state.scouting.since_fix);
    const count=observed.filter(side=>side===card).length;
    const n=state.scouting.n;
    const move=exploitMove(state);
    const command=move?chatCommand(move,state.bossDef,true):'—';
    return {kind:'habit',side:card,n,count,percent:Math.round(count/Math.max(1,n)*100),command,
      highlightedMove:cooldown===0?move:undefined,cooldown} as const;
  }
  const age=(state.clock.paused_at??state.now)-(fix?.at??-Infinity);
  if(fix&&age>=0&&age<FIXED_STAMP_MS)return {kind:'fixed',side:fix.side,healed:fix.hp_gained} as const;
  return {kind:'hidden'} as const;
}
export function exploitHabitNote(state:GameState):string {
  const attack=state.activeAttack;
  if(!attack?.exploit)return '';
  const side=attack.exploit_side??(attack.move==='HOOK_L'?'L':attack.move==='HOOK_R'?'R':null);
  return side?`EXPLOIT · YOU DODGE ${side==='L'?'LEFT':'RIGHT'}`:'';
}

/** The same view consumes server ticks and local demo reducer states; it owns no game rules. */
export function createRailsHud(host:HTMLElement,options:{simulated?:boolean;plain?:boolean;seated?:boolean;noPunch?:boolean;soundDefault?:boolean}={}) {
  host.classList.add('rails-host');
  host.innerHTML=`<main class="rails-hud" aria-label="Streamer vs Chat">
  <aside class="rail streamer"><header><p class="eyebrow" data-id="input-lock" role="status">STREAMER</p><h1>KASH</h1></header>
  <div class="hp"><strong data-id="streamer-hp">100</strong><span>%</span><span class="focus-meter" data-id="focus-meter"><b data-id="focus-value">FOCUS 0</b><span class="focus-track"><i data-id="focus-fill"></i></span></span></div><div class="health-bar" data-id="streamer-bar"><i></i><span></span></div>
  <p class="rounds">ROUNDS <strong data-id="streamer-wins">0</strong> – <span data-id="boss-wins">0</span></p>
  <section class="scouting" data-id="scouting" hidden aria-live="polite"><p class="eyebrow" data-id="scouting-label">SCOUTED</p><div data-id="habit-details"><h2 data-id="habit">DODGES LEFT</h2><strong class="habit-share" data-id="habit-share"></strong><p class="scouting-evidence"><span data-id="habit-n"></span><span data-id="exploit-cooldown"></span></p><p>CHAT: VOTE <b data-id="exploit-command"></b></p></div><div data-id="fixed-details" hidden><strong class="fixed-stamp">FIXED!</strong><p data-id="fixed-reward"></p></div></section>
  <section class="status-card"><p class="eyebrow" data-id="phase">READY TO FIGHT</p><p data-id="status">GUARD STRAIGHTS.<br>LEAN FROM SWINGS.</p><small data-id="result"></small></section><section class="viewer-record" data-id="viewer-record" hidden><h2>YOUR RECORD <span>VS THIS CHAT</span></h2><div class="record-values"><p><b data-id="record-streams"></b><span>STREAMS</span></p><p><b data-id="record-kos"></b><span title="Bosses KO">BOSS KOs</span></p><p><b data-id="record-deaths"></b><span title="Times KO">TIMES KO</span></p></div></section><section class="memory-hall" data-id="memory-hall" hidden><h2>CHAT HALL OF FAME <span>ALL TIME</span></h2><ol data-id="memory-hall-list"></ol></section>
  <div class="blocked-stamp" data-id="blocked" hidden>BLOCKED!</div><footer><p class="simulated" data-id="simulated" hidden>● SIMULATED CHAT</p><p class="calm-badge" data-id="calm" hidden>CALM FX</p><p class="connection" data-id="connection" role="status">CONNECTING…</p><div class="hud-options"><button data-id="sound" type="button">SOUND OFF · M</button><label><input data-id="plain" type="checkbox"> PLAIN</label></div></footer></aside>
  <div class="clock"><strong data-id="clock">75</strong><span>ROUND<br><b data-id="round">1 / 3</b><b class="difficulty-tag" data-id="difficulty">HARD</b></span></div>
  <div class="super-ready-banner" data-id="super-ready" role="status" hidden>SUPER READY: chat type !s</div><div class="super-denied-banner" data-id="super-denied" role="status" hidden>!s needs 100% HYPE</div>
  <div class="finisher-banner" data-id="finisher-ready" role="status" hidden></div>
  <div class="telegraph" data-id="telegraph" hidden><strong data-id="banner">HANDS UP!</strong><div class="move-pill"><span data-id="move"></span><b><span data-id="cue-icon" class="cue-icon" aria-hidden="true"></span><span data-id="cue"></span></b></div><div class="super-steps" data-id="super-steps" aria-label="SUPER defence sequence" hidden></div><small data-id="exploit-note"></small><small class="nemesis-ko-move" data-id="nemesis-ko-move" hidden></small></div>
  <div class="lean-arrow left" data-id="left-arrow" hidden>❮<span>LEAN</span></div><div class="lean-arrow right" data-id="right-arrow" hidden>❯<span>LEAN</span></div>
  <aside class="rail boss"><header><p class="eyebrow">BOSS · CHAT-CONTROLLED</p><h2>CHAT GOLEM</h2></header><div class="hp"><strong data-id="boss-hp">100</strong><span>%</span></div>
  <div class="health-bar" data-id="boss-bar"><i></i><span></span></div><p class="hype">HYPE <b data-id="hype">0%</b> <span data-id="super-command">→ !super/!s</span></p><div class="hype-bar"><span data-id="hype-fill"></span></div><section data-id="raid-phase" class="raid-phase" hidden><strong data-id="raid-label"></strong><span>RAIDERS 2× · CAP 50%</span></section>
  <section class="chat-habit scouting" data-id="chat-habit" hidden aria-label="Chat habit" aria-live="polite"><p class="eyebrow">CHAT LEANS ON</p><h2><span data-id="chat-habit-move"></span> <span data-id="chat-habit-share"></span></h2><p class="chat-habit-evidence"><span data-id="chat-habit-n"></span></p><p data-id="chat-habit-instruction"></p></section><div class="read-it-stamp" data-id="read-it" hidden>READ IT!<small>+25% COUNTER</small></div><section class="nemesis-card" data-id="nemesis" hidden><h2>YOUR NEMESIS IS VOTING</h2><p data-id="nemesis-name"></p><p data-id="nemesis-kos"></p></section><div class="vote-header"><strong data-id="voters">0</strong> VOTING <span data-id="beat">· NEXT IN 2.4s</span></div><div class="votes" data-id="votes" aria-label="Chat vote tally"></div>
  <p class="hype-vote-legend">CHAT VOTES FILL HYPE<br>MORE VOTERS = FASTER</p><div class="boss-damage-numbers" data-id="boss-damage" aria-live="polite"></div><canvas data-id="boss-sprite" class="boss-sprite" width="470" height="486" role="img" aria-label="Chat Golem boss"></canvas></aside><section data-id="forge" hidden></section><section class="endcard" data-id="endcard" hidden aria-label="Game results" aria-live="polite"></section></main>`;
  const el=<T extends HTMLElement=HTMLElement>(id:string)=>host.querySelector<T>(`[data-id="${id}"]`)!;
  const stage=host.querySelector<HTMLElement>('.rails-hud')!;
  const forgeView=createForgeView(el('forge'));let forge:ForgeSnapshot|null=null;let forgeVisible:boolean|undefined;
  const renderForge=()=>forgeView.render(forge,forgeVisible??forge?.betweenRounds??(!current||current.round.over));
  const setForge=(value:ForgeSnapshot|null,visible?:boolean)=>{forge=value;forgeVisible=visible;renderForge();};
  const setText=(id:string,value:string)=>{const element=el(id);if(element.textContent!==value)element.textContent=value;};
  stage.classList.toggle('plain',!!options.plain);
  el<HTMLInputElement>('plain').checked=!!options.plain;
  el('simulated').hidden=!options.simulated;
  const rows=commands.map(([move,command])=>{
    const row=document.createElement('div');row.className='vote-row';row.dataset.move=move;
    row.innerHTML=`<div class="vote-command"><span class="vote-name">${command}</span><small><span class="vote-count">0</span></small></div><div class="vote-track"><div class="vote-fill"></div></div><div class="vote-percent">0%</div>`;
    if(move==='SUPER'){const lock=document.createElement('div');lock.className='super-lock';lock.innerHTML='<span>LOCKED</span><span data-super-hype></span>';row.append(lock);}
    el('votes').append(row);
    return {move,row,count:row.querySelector<HTMLElement>('.vote-count')!,fill:row.querySelector<HTMLElement>('.vote-fill')!,percent:row.querySelector<HTMLElement>('.vote-percent')!};
  });
  function fit(){const scale=Math.min(host.clientWidth/1920,host.clientHeight/1080);stage.style.transform=`scale(${scale})`;stage.style.left=`${(host.clientWidth-1920*scale)/2}px`;stage.style.top=`${(host.clientHeight-1080*scale)/2}px`;}
  const observer=new ResizeObserver(fit);observer.observe(host);fit();
  const bossFeedback=createBossFeedback();
  const floatingNodes=new Map<string,HTMLElement>();
  el('boss-damage').style.setProperty('--damage-number-box',`${options.seated?FEEL.bossHit.seatedNumberBoxPx:FEEL.bossHit.numberBoxPx}px`);
  const sprite=new BossSprite(el<HTMLCanvasElement>('boss-sprite'));
  let soundBusy=false,disposed=false;
  const sound=new GameSound({defaultEnabled:options.soundDefault??options.simulated===undefined,onChange:()=>soundLabel()});
  const soundLabel=()=>{if(disposed)return;el('sound').textContent=sound.enabled?'SOUND ON · M':sound.requested?'SOUND ON · ACTIVATE · M':'SOUND OFF · M';};
  soundLabel();void sound.prepare();if(sound.requested)void sound.unlock().then(soundLabel);
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const forcedCalm=new URL(location.href).searchParams.get('fx')==='calm';
  const fx=createFxScheduler({calm:forcedCalm||options.simulated!==undefined&&motion.matches});
  const motionChange=()=>{fx.setCalm(forcedCalm||options.simulated!==undefined&&motion.matches);};
  motion.addEventListener('change',motionChange);
  let lastStampUntil=0,lastTelegraph='',readItUntil=0,snapshotRealAt=performance.now();
  let spriteAnchorKey='',spriteAnchor=0;
  const toggle=async(activate=false)=>{
    if(soundBusy||disposed)return;soundBusy=true;el<HTMLButtonElement>('sound').disabled=true;
    el('sound').textContent=sound.enabled?'MUTING…':'LOADING SOUND…';
    try{await (activate&&sound.requested&&!sound.enabled?sound.unlock():sound.toggle());if(!disposed)soundLabel();}catch{if(!disposed)el('sound').textContent='SOUND UNAVAILABLE';}
    finally{soundBusy=false;if(!disposed)el<HTMLButtonElement>('sound').disabled=false;}
  };
  el('sound').addEventListener('click',()=>{void toggle(true);});
  const unlockOnGesture=(event:Event)=>{if(event.target instanceof Element&&event.target.closest('[data-id="sound"]'))return;if(sound.requested&&!sound.enabled)void sound.unlock().then(soundLabel);};
  window.addEventListener('pointerdown',unlockOnGesture);window.addEventListener('keydown',unlockOnGesture);
  el('plain').addEventListener('change',()=>stage.classList.toggle('plain',el<HTMLInputElement>('plain').checked));
  const muteKey=(event:KeyboardEvent)=>{if(event.code==='KeyM'&&!event.repeat&&!['INPUT','TEXTAREA','SELECT'].includes((event.target as HTMLElement)?.tagName)){void toggle();}};
  window.addEventListener('keydown',muteKey);
  let current:GameState|undefined;
  let superNotices:SuperNoticesView|null=null;
  let currentSimulated=!!options.simulated;
  let modes:HudModes={seated:!!options.seated,noPunch:!!options.noPunch};
  const summaryView=createSummaryView(el('endcard'));
  let memory:ViewerMemoryView|null=null,endSummary:GameSummary|null=null,endClips:EndcardClip[]=[];
  let hallSignature='';
  function renderMemory(){
    const view=memoryPresentation(memory,current?.activeAttack?.move);stage.classList.toggle('memory-on',!!view);
    el('viewer-record').hidden=!view;el('memory-hall').hidden=!view;el('nemesis').hidden=!view?.nemesis;host.querySelector('.boss')!.classList.toggle('nemesis-active',!!view?.nemesis);
    const tag=el('nemesis-ko-move');tag.hidden=!view?.koMove;tag.textContent=view?.koMove??'';tag.title=view?.koMove??'';
    el('simulated').hidden=!(currentSimulated||view?.simulated);el('simulated').textContent=view?.simulated?'● SIMULATED':'● SIMULATED CHAT';
    const attack=current?.activeAttack;tag.hidden=!(view?.koMove&&attack&&!attack.vetoed&&!current!.round.over&&(current!.clock.paused_at??current!.now)<attack.lands_at);
    if(!view){hallSignature='';el('memory-hall-list').replaceChildren();setText('nemesis-name','');setText('nemesis-kos','');return;}
    setText('record-streams',String(view.record.streams));setText('record-kos',String(view.record.bossesKo));setText('record-deaths',String(view.record.timesKo));
    el('viewer-record').setAttribute('aria-label',`${view.simulated?'SIMULATED memory. ':''}Your record versus this chat: ${view.record.streams} streams, ${view.record.bossesKo} bosses KO, ${view.record.timesKo} times KO.`);
    const signature=JSON.stringify(view.hall);if(signature!==hallSignature){hallSignature=signature;const list=el('memory-hall-list');list.replaceChildren();
      for(const entry of view.hall){const row=document.createElement('li'),name=document.createElement('span'),count=document.createElement('b');name.textContent=entry.name;name.title=entry.name;count.textContent=String(entry.koVotes);row.setAttribute('aria-label',`${entry.name}, ${entry.koVotes} KO votes all time`);row.append(name,count);list.append(row);}
      if(!view.hall.length){const row=document.createElement('li');row.textContent='NO KO VOTES YET';list.append(row);}
    }
    if(view.nemesis){setText('nemesis-name',view.nemesis.name);el('nemesis-name').title=view.nemesis.name;setText('nemesis-kos',`${view.nemesis.koVotes} KO VOTES`);}
  }
  function setMemory(view:ViewerMemoryView|null){memory=view;renderMemory();summaryView.render(endSummary,endClips,memory);}

  function setModes(next:Partial<HudModes>) {
    const updated={...modes,...next};if(updated.seated===modes.seated&&updated.noPunch===modes.noPunch&&stage.dataset.modesReady)return;
    modes=updated;el('boss-damage').style.setProperty('--damage-number-box',`${modes.seated?FEEL.bossHit.seatedNumberBoxPx:FEEL.bossHit.numberBoxPx}px`);stage.dataset.modesReady='true';stage.classList.toggle('seated',modes.seated);stage.classList.toggle('no-punch',modes.noPunch);
    for(const side of ['left','right'])el(side+'-arrow').querySelector('span')!.textContent=modes.seated?'TILT':'LEAN';
    if(current)render(current,currentSimulated);
  }
  setModes(modes);
  let previous:GameState|undefined;
  let clip='idle',clipAt=0;
  const heard=new Set<string>();
  let lastVoteSoundAt=-Infinity;
  function once(key:string,play:()=>void){if(heard.has(key))return;heard.add(key);play();}
  function renderTally(message:TallySnapshot,superReady=false,exploit?:Move) {
    if(!isTallySnapshot(message))return;
    const {weights,percent:shares,highest}=voteShares(message);currentSimulated=message.simulated;
    el('voters').textContent=String(message.voters);el('simulated').hidden=!(message.simulated||memory?.simulated);el('simulated').textContent=memory?.simulated?'● SIMULATED':'● SIMULATED CHAT';
    for(const {move,row,count,fill,percent}of rows){const value=message.tally[move];const share=shares[move];const locked=move==='SUPER'&&!superReady;
      count.textContent=voteCountLabel(value);fill.style.width=`${share}%`;percent.textContent=locked?'LOCK':`${share}%`;
      row.classList.toggle('locked',locked);row.classList.toggle('super-locked',locked);if(move==='SUPER')row.querySelector('[data-super-hype]')!.textContent=`· HYPE ${Math.round(current?.hype??0)}%`;row.classList.toggle('leader',highest>0&&weights[move]===highest&&!locked);row.classList.toggle('exploit-vote',move===exploit);
      row.setAttribute('aria-label',`${current?bossMove(current,move).label:names[move]} ${value} voters${locked?', locked':`, ${share} percent influence`}`);
      row.title=`${value} viewer vote${value===1?'':'s'} · ${share}% of attack draw influence`;
    }
  }
  function render(state:GameState,simulated=!!options.simulated) {
    if(previous&&(state.match.seed!==previous.match.seed||state.round.number<previous.round.number||state.log.rounds.length<previous.log.rounds.length)){heard.clear();previous=undefined;spriteAnchorKey='';lastStampUntil=0;readItUntil=0;lastTelegraph='';}
    current=state;renderForge();currentSimulated=simulated;renderMemory();snapshotRealAt=performance.now();
    const bossImpacts=bossFeedback.observe(state,snapshotRealAt);
    playBossImpactSounds(bossImpacts,()=>sound.play('bonus'));
    const cues=fx.observe(state,snapshotRealAt);
    const visual=fx.update(snapshotRealAt);
    el('calm').hidden=!visual.calm;stage.classList.toggle('calm',visual.calm);
    for(const cue of cues)if(cue.kind==='hit'&&cue.move==='COMBO'||(cue.kind==='hit'||cue.kind==='chip')&&cue.move==='SUPER')once(`impact-sfx:${state.match.seed}:${cue.id}`,()=>sound.play('hit'));
    if(cues.some(cue=>cue.kind==='block'||cue.kind==='perfect')){lastStampUntil=visual.streamer.animationTime+500;el('blocked').hidden=false;el('blocked').animate(visual.calm?[{opacity:0},{opacity:1}]:[{transform:'scale(1.25)',opacity:1},{transform:'scale(1)',opacity:1}],{duration:visual.slam.durationMs,easing:'ease-out'});}
    const hp=(id:string,value:number,max:number)=>{el(id+'-hp').textContent=String(Math.max(0,Math.round(value/max*100)));el(id+'-bar').setAttribute('aria-label',`${id} HP ${Math.max(0,Math.round(value))} / ${max}`);el(id+'-bar').querySelector<HTMLElement>('span')!.style.width=`${Math.max(0,value/max*100)}%`;const trail=el(id+'-bar').querySelector<HTMLElement>('i')!;if(!previous||state.round.number!==previous.round.number||value>previous[id as 'streamer'|'boss'].hp){trail.style.transition='none';trail.style.width=`${Math.max(0,value/max*100)}%`;}};
    hp('streamer',state.streamer.hp,state.streamer.max_hp);hp('boss',state.boss.hp,state.boss.max_hp);
    el('clock').textContent=String(Math.max(0,Math.ceil(state.round.remaining_ms/1000)));el('round').textContent=`${state.round.number} / 3`;
    el('streamer-wins').textContent=String(state.match.round_wins.streamer);el('boss-wins').textContent=String(state.match.round_wins.boss);
    renderFocus(el('focus-meter'),el('focus-value'),el('focus-fill'),state);
    const finisherView=finisherPresentation(state);el('finisher-ready').hidden=!finisherView.visible;el('finisher-ready').classList.toggle('window-active',finisherView.active);setText('finisher-ready',finisherView.text);
    el('hype').textContent=`${Math.round(state.hype)}%`;el('hype-fill').style.width=`${state.hype}%`;
    const superReady=!!state.bossDef||state.hype>=100&&state.supers_used<3;setText('super-command',`→ ${chatCommand('SUPER',state.bossDef,true)}`);el('super-command').hidden=!availableMoves(state).includes('SUPER');
    const moveName=(move:Move)=>bossMove(state,move).label;
    stage.classList.toggle('custom-boss',!!state.bossDef);
    const bossTitle=host.querySelector<HTMLElement>('.boss header h2')!;bossTitle.textContent=state.bossDef?.name??'CHAT GOLEM';bossTitle.title=state.bossDef?.name??'Chat Golem';
    for(const {move,row} of rows){row.hidden=!availableMoves(state).includes(move);row.querySelector('.vote-name')!.textContent=chatCommand(move,state.bossDef,true);row.querySelector<HTMLElement>('.vote-command')!.title=chatCommandLegend(state.bossDef);row.setAttribute('aria-label',`${chatCommand(move,state.bossDef)}: ${bossMove(state,move).label}`);}
    const scouting=scoutingPresentation(state);
    el('scouting').hidden=scouting.kind==='hidden';
    el('scouting').classList.toggle('fixed',scouting.kind==='fixed');
    el('habit-details').hidden=scouting.kind!=='habit';
    el('fixed-details').hidden=scouting.kind!=='fixed';
    if(scouting.kind==='habit') {
      setText('scouting-label','SCOUTED');
      setText('habit-share',`${scouting.percent}%`);
      setText('habit',`DODGES ${scouting.side==='L'?'LEFT':'RIGHT'}`);
      setText('habit-n',`n=${scouting.n}`);
      setText('exploit-command',scouting.command);
      setText('exploit-cooldown',scouting.cooldown>0?`${scouting.cooldown} BEAT${scouting.cooldown===1?'':'S'} COOLDOWN`:scouting.command==='—'?'NO MATCHING MOVE':'EXPLOIT READY');
    } else if(scouting.kind==='fixed') {
      setText('scouting-label','HABIT BROKEN');
      setText('fixed-reward',scouting.healed>0?`+${scouting.healed} HP · KEEP MIXING IT UP`:'HP FULL · KEEP MIXING IT UP');
    }
    renderTally({kind:'tally',tally:state.tally,weights:weightedTally(state),voters:state.voters,simulated},superReady,scouting.kind==='habit'?scouting.highlightedMove:undefined);
    const habit=chatHabitPresentation(state,modes.seated);el('chat-habit').hidden=!habit.visible;host.querySelector('.boss')!.classList.toggle('chat-habit-active',habit.visible);
    if(habit.visible){setText('chat-habit-move',moveName(habit.move));setText('chat-habit-share',`${habit.percent}%`);setText('chat-habit-n',`n=${habit.n}`);setText('chat-habit-instruction',state.bossDef?`PRE-HOLD ${bossDefenceCue(bossMove(state,habit.move).defence,modes.seated)}`:habit.instruction);const evidence=state.bossDef?availableMoves(state).map(move=>`${moveName(move)} ${habit.counts[move]}`).join(', '):habit.evidence;const detail=`${evidence}. ${habit.opening}. ${habit.openingDetail}. Pre-held clean defence: +25% counter${state.activeAttack?.brace?'. This attack is braced.':''}`;el('chat-habit').title=detail;el('chat-habit').setAttribute('aria-label',`Chat habit: ${moveName(habit.move)} ${habit.percent} percent, n=${habit.n}. ${detail}`);}
    const raid=raidPresentation(state);
    el('raid-phase').hidden=!raid.active;
    host.querySelector('.boss')!.classList.toggle('raid-active',raid.active);
    if(raid.active){setText('raid-label',`PHASE 2 · RAID · ${raid.seconds}s`);el('raid-phase').title='Raider votes have 2× influence, capped at half the combined influence. Regular votes are needed; raiders alone have zero influence.';}
    setText('difficulty',difficultyName(state.difficulty).toUpperCase());
    el('beat').textContent=state.paused?'· PAUSED':`· NEXT IN ${nextBeatSeconds(state)}s`;
    const sequence=superSequencePresentation(state,modes.seated);renderSuperSteps(el('super-steps'),sequence);
    const notices=superNoticePresentation(state,superNotices,Date.now());el('super-ready').hidden=!notices.ready||notices.denied;el('super-denied').hidden=!notices.denied;
    const attack=state.activeAttack;
    const activeDefence=sequence.visible&&attack?(attack as typeof attack&{super_steps?:import('../../shared/src/boss-def').BossDefence[]}).super_steps?.[sequence.current]??bossMove(state,attack.move).defence:attack?bossMove(state,attack.move).defence:'guard';
    const telegraph=!!attack&&!attack.vetoed&&(state.clock.paused_at??state.now)<attack.lands_at&&!state.round.over;
    const counter=state.counter.open&&!state.round.over;
    el('telegraph').hidden=!(telegraph||sequence.visible||counter);el('telegraph').classList.toggle('super-sequence',sequence.visible);el('telegraph').classList.toggle('counter',counter&&!telegraph);
    el('banner').textContent=sequence.visible?'SUPER!':telegraph?'HANDS UP!':'COUNTER HIT!';
    el('move').title=telegraph?moveName(attack!.move):'';
    el('move').textContent=sequence.visible?'SUPER':telegraph?moveName(attack!.move):modes.noPunch?'BOSS DAMAGED':'BONUS PUNCH';el('cue').textContent=sequence.visible?sequence.current>=0?`STEP ${sequence.current+1} OF 3`:'SEQUENCE COMPLETE':telegraph?bossDefenceCue(activeDefence,modes.seated):modes.noPunch?'KEEP DEFENDING':'J';
    el('cue-icon').innerHTML=(telegraph||sequence.visible)&&activeDefence==='guard'?'<svg viewBox="0 0 40 46" aria-hidden="true"><path d="M20 3 36 9v13c0 9-7 16-16 21C11 38 4 31 4 22V9Z" fill="none" stroke="currentColor" stroke-width="5"/></svg>':(telegraph||sequence.visible)?activeDefence==='lean_right'?'→':activeDefence==='lean_left'?'←':'↔':'';
    const tellKey=telegraph?`${state.match.seed}:${attack!.round}:${attack!.beat}`:'';
    if(tellKey&&tellKey!==lastTelegraph){el('banner').animate(visual.calm?[{opacity:0},{opacity:1}]:[{transform:'scale(1.25)',opacity:1},{transform:'scale(1)',opacity:1}],{duration:visual.slam.durationMs,easing:'ease-out'});}lastTelegraph=tellKey;
    el('exploit-note').textContent=telegraph?exploitHabitNote(state):'';
    el('left-arrow').hidden=!((telegraph||sequence.visible)&&['lean_left','lean_any'].includes(activeDefence));
    el('right-arrow').hidden=!((telegraph||sequence.visible)&&['lean_right','lean_any'].includes(activeDefence));
    el('phase').textContent=state.paused?'PAUSED':state.round.over?'ROUND OVER':superReady?'SUPER READY':'DEFENCE FIRST';
    el('status').textContent=state.round.over?`${state.round.winner==='streamer'?'STREAMER':'CHAT'} WINS`:state.paused?'RESUME WHEN READY.':`GUARD STRAIGHTS.\n${modes.seated?'TILT':'LEAN'} FROM SWINGS.`;
    el('result').textContent=state.round.over?(state.match.winner?'MATCH COMPLETE':'NEXT ROUND WHEN READY'):'';
    if(!previous){
      for(const entry of state.log.telegraphs)heard.add(`tell:${entry.round}:${entry.beat}`);
      for(const entry of state.log.resolved){heard.add(`hit:${entry.round}:${entry.beat}`);heard.add(`read-it:${entry.round}:${entry.beat}`);}
      for(const entry of state.log.rounds)heard.add(`round-end:${entry.number}`);
    }
    if(telegraph){const key=`tell:${state.round.number}:${attack!.beat}`;once(key,()=>{sound.play('telegraph');sound.play('handsVoice',true);});clip=`${moveClip[attack!.move]}_windup`;clipAt=attack!.at;}
    const scoutChanged=!!previous&&(state.scouting.fixes>previous.scouting.fixes||!!state.scouting.card&&!previous.scouting.card);
    const last=state.log.resolved.filter(entry=>entry.round===state.round.number).at(-1);
    if(last&&readItResolution(last))once(`read-it:${last.round}:${last.beat}`,()=>{readItUntil=visual.boss.animationTime+1000;el('read-it').hidden=false;el('read-it').animate(visual.calm?[{opacity:0},{opacity:1}]:[{transform:'scale(1.25)'},{transform:'scale(1)'}],{duration:visual.slam.durationMs,easing:'ease-out'});});
    if(last){once(`hit:${last.round}:${last.beat}`,()=>{
      if(last.outcome==='BLOCK'){sound.play('block');sound.play('blockedVoice',true);}
      else if(last.outcome==='PERFECT'){sound.play('perfect');sound.play('perfectVoice',true);}
      else if(last.outcome==='DODGE')sound.play('dodge');else if(last.move!=='COMBO'&&!last.super_steps)sound.play('hit');
      if(last.counter_dmg>0){sound.play('counter');sound.play('counterAccent');if(!scoutChanged)sound.play('counterVoice',true);}

    });}
    if(!previous&&state.round.elapsed_ms<1000&&!state.round.over)sound.play('round1',true);
    if(previous&&state.round.number!==previous.round.number){sound.play(state.round.number===2?'round2':'round3',true);sound.play('fight');}
    if(previous&&state.now-lastVoteSoundAt>=125&&commands.some(([move])=>state.tally[move]!==previous!.tally[move])&&state.voters>0){sound.play('vote');lastVoteSoundAt=state.now;}
    if(previous&&state.hype>=100&&previous.hype<100)sound.play('super');
    if(previous&&state.scouting.card&&!previous.scouting.card)sound.play('weakness',true,true);
    if(previous&&state.scouting.fixes>previous.scouting.fixes){sound.play('fixed',true,true);sound.play('cheer');}
    const result=state.log.rounds.at(-1);
    if(result)once(`round-end:${result.number}`,()=>{sound.play(result.winner==='streamer'?'streamerWins':'chatWins',true);if(result.reason==='ko'){sound.play('ko');sound.play('koVoice',true);}});
    // Animation selection is a pure view of the latest snapshot; reconnecting
    // halfway through a round never depends on replaying old sound events.
    const visualNow=state.clock.paused_at??state.now;
    if(state.round.over){clip=state.round.winner==='streamer'?'ko':'victory';clipAt=state.round.ended_at??visualNow;}
    else if(telegraph){clip=`${moveClip[attack!.move]}_windup`;clipAt=attack!.at;}
    else if(last&&visualNow-last.at<340){clip=last.counter_dmg>0?'hurt':last.outcome==='BLOCK'||last.outcome==='PERFECT'||last.outcome==='DODGE'?'blocked':`${moveClip[last.move]}_hit`;clipAt=last.at;}
    else if(attack&&!attack.vetoed&&visualNow>=attack.lands_at&&visualNow-attack.lands_at<520){clip=`${moveClip[attack.move]}_hit`;clipAt=attack.lands_at;}
    else{clip='idle';clipAt=visualNow-state.round.elapsed_ms;}
    previous=state;
  }
  renderTally({kind:'tally',tally:{JAB:0,HOOK_L:0,HOOK_R:0,COMBO:0,SUPER:0},voters:0,simulated:!!options.simulated});
  let frameId:number;
  const animate=()=>{if(disposed)return;const now=performance.now(),frame=fx.update(now),bossHit=bossFeedback.frame(now,frame.calm);
    const damageZone=el('boss-damage'),bossRail=host.querySelector<HTMLElement>('.rail.boss')!,railRect=bossRail.getBoundingClientRect(),legend=host.querySelector<HTMLElement>('.hype-vote-legend')!,votesRect=legend.getBoundingClientRect(),scale=railRect.width/(modes.seated?300:470);
    if(scale>0){damageZone.style.top=`${bossDamageLayout(modes.seated?300:470,1080,(votesRect.bottom-railRect.top)/scale,modes.seated).top}px`;}
    renderBossDamageNumbers(damageZone,floatingNodes,bossHit.numbers);
    for(const name of ['streamer','boss'] as const){const rail=host.querySelector<HTMLElement>(`.rail.${name}`)!,view=frame[name];rail.style.transform=`translate(${view.x+(name==='boss'?bossHit.knockback:0)}px,${view.y}px) rotate(${view.rotation}deg)`;
      const bar=el(name+'-bar');bar.style.boxShadow=view.flash?`0 0 0 3px ${view.flash.color}`:'none';bar.style.outline=view.flash?`${3*view.flash.opacity}px solid ${view.flash.color}`:'none';
      if(!view.trail){const trail=bar.querySelector<HTMLElement>('i')!;trail.style.transition=`width ${name==='boss'?FEEL.bossHit.trailMs:300}ms linear`;trail.style.width=bar.querySelector<HTMLElement>('span')!.style.width;}
    }
    el('read-it').hidden=frame.boss.animationTime>=readItUntil;el('read-it').style.opacity=String(Math.max(0,Math.min(1,(readItUntil-frame.boss.animationTime)/150)));
    el('blocked').hidden=frame.streamer.animationTime>=lastStampUntil;el('blocked').style.opacity=String(Math.max(0,Math.min(1,(lastStampUntil-frame.streamer.animationTime)/150)));
    if(current){const notices=superNoticePresentation(current,superNotices,Date.now());el('super-ready').hidden=!notices.ready||notices.denied;el('super-denied').hidden=!notices.denied;const key=`${clip}:${clipAt}`;if(key!==spriteAnchorKey){spriteAnchorKey=key;spriteAnchor=frame.boss.animationTime-Math.max(0,(current.clock.paused_at??current.now)-clipAt);}
      const age=Math.max(0,frame.boss.animationTime-spriteAnchor),transient=!['idle','victory','ko'].includes(clip)&&!clip.endsWith('_windup');sprite.draw(transient&&age>520?'idle':clip,transient&&age>520?current.round.elapsed_ms:age,bossHit.flash?.opacity??0);
      const attack=current.activeAttack;const viewNow=(current.clock.paused_at??current.now)+(current.paused?0:now-snapshotRealAt);el('banner').style.opacity=attack&&!attack.vetoed&&lastTelegraph?String(Math.min(1,Math.max(0,(attack.lands_at-viewNow)/120))):'1';
    }else sprite.draw('idle',now);frameId=requestAnimationFrame(animate);};
  frameId=requestAnimationFrame(animate);
  return {render,renderTally,setSuperNotices(value:SuperNoticesView){superNotices=value;},presentBossImpact(impact:BossImpact){bossFeedback.present(impact,performance.now());},setBossReceipts(batch:BossImpactBatch,prime=false){bossFeedback.setReceipts(batch,prime);},setModes,setMemory,setForge,setInputLocked(locked:boolean){el('input-lock').textContent=locked?'INPUTS LOCKED':'STREAMER';el('input-lock').classList.toggle('input-lock-active',locked);},setEndcard(summary:GameSummary|null,clips:EndcardClip[]=[]){endSummary=summary;endClips=clips;summaryView.render(summary,clips,memory);},setConnection(text:string){el('connection').textContent=text;el('connection').title=text;},dispose(){disposed=true;cancelAnimationFrame(frameId);observer.disconnect();sprite.dispose();sound.dispose();motion.removeEventListener('change',motionChange);window.removeEventListener('keydown',muteKey);window.removeEventListener('pointerdown',unlockOnGesture);window.removeEventListener('keydown',unlockOnGesture);host.innerHTML='';}};
}
