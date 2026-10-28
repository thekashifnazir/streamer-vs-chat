import type { Move, TallySnapshot } from '@svc/shared';
import { weightedTally, type GameState } from '../../shared/src/engine';
import { BossSprite, moveClip } from './assets';
import { GameSound } from './sound';

const commands:[Move,string][]=[['JAB','!jab'],['HOOK_L','!hookl'],['HOOK_R','!hookr'],['COMBO','!combo'],['SUPER','!super']];
export const defenceCue=(move:Move)=>move==='HOOK_L'?'LEAN →':move==='HOOK_R'?'← LEAN':move==='SUPER'?'LEAN ANY WAY':'GUARD';
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
export const FIXED_STAMP_MS=1800;
/** Authoritative scouting state projected into presentation; no thresholds live in the HUD. */
export function scoutingPresentation(state:GameState) {
  if(state.round.number<2)return {kind:'hidden'} as const;
  const {card,last_fix:fix,cooldown}=state.scouting;
  if(card) {
    const observed=state.scouting.dodges.slice(state.scouting.since_fix);
    const count=observed.filter(side=>side===card).length;
    const n=state.scouting.n;
    const command=card==='L'?'!hookl':'!hookr';
    const move:Move=card==='L'?'HOOK_L':'HOOK_R';
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
export function createRailsHud(host:HTMLElement,options:{simulated?:boolean;plain?:boolean}={}) {
  host.classList.add('rails-host');
  host.innerHTML=`<main class="rails-hud" aria-label="Streamer vs Chat">
  <aside class="rail streamer"><header><p class="eyebrow">STREAMER</p><h1>KASH</h1></header>
  <div class="hp"><strong data-id="streamer-hp">100</strong><span>%</span></div><div class="health-bar" data-id="streamer-bar"><i></i><span></span></div>
  <p class="rounds">ROUNDS <strong data-id="streamer-wins">0</strong> – <span data-id="boss-wins">0</span></p>
  <section class="scouting" data-id="scouting" hidden aria-live="polite"><p class="eyebrow" data-id="scouting-label">SCOUTED</p><div data-id="habit-details"><h2 data-id="habit">DODGES LEFT</h2><strong class="habit-share" data-id="habit-share"></strong><p class="scouting-evidence"><span data-id="habit-n"></span><span data-id="exploit-cooldown"></span></p><p>CHAT: VOTE <b data-id="exploit-command"></b></p></div><div data-id="fixed-details" hidden><strong class="fixed-stamp">FIXED!</strong><p data-id="fixed-reward"></p></div></section>
  <section class="status-card"><p class="eyebrow" data-id="phase">READY TO FIGHT</p><p data-id="status">GUARD STRAIGHTS.<br>LEAN FROM SWINGS.</p><small data-id="result"></small></section>
  <footer><p class="simulated" data-id="simulated" hidden>● SIMULATED CHAT</p><p class="connection" data-id="connection" role="status">CONNECTING…</p><div class="hud-options"><button data-id="sound" type="button">SOUND OFF · M</button><label><input data-id="plain" type="checkbox"> PLAIN</label></div></footer></aside>
  <div class="clock"><strong data-id="clock">75</strong><span>ROUND<br><b data-id="round">1 / 3</b></span></div>
  <div class="telegraph" data-id="telegraph" hidden><strong data-id="banner">HANDS UP!</strong><div class="move-pill"><span data-id="move"></span><b data-id="cue"></b></div><small data-id="exploit-note"></small></div>
  <div class="lean-arrow left" data-id="left-arrow" hidden>❮<span>LEAN</span></div><div class="lean-arrow right" data-id="right-arrow" hidden>❯<span>LEAN</span></div>
  <aside class="rail boss"><header><p class="eyebrow">BOSS · CHAT-CONTROLLED</p><h2>CHAT GOLEM</h2></header><div class="hp"><strong data-id="boss-hp">100</strong><span>%</span></div>
  <div class="health-bar" data-id="boss-bar"><i></i><span></span></div><p class="hype">HYPE <b data-id="hype">0%</b> <span>→ !SUPER</span></p><div class="hype-bar"><span data-id="hype-fill"></span></div><section data-id="raid-phase" class="raid-phase" hidden><strong data-id="raid-label"></strong><span>RAIDERS 2× · MAX 50% TOGETHER</span></section>
  <div class="vote-header"><strong data-id="voters">0</strong> VOTING <span data-id="beat">· NEXT IN 2.4s</span></div><div class="votes" data-id="votes" aria-label="Chat vote tally"></div>
  <canvas data-id="boss-sprite" class="boss-sprite" width="470" height="440" role="img" aria-label="Chat Golem boss"></canvas></aside></main>`;
  const el=<T extends HTMLElement=HTMLElement>(id:string)=>host.querySelector<T>(`[data-id="${id}"]`)!;
  const stage=host.querySelector<HTMLElement>('.rails-hud')!;
  const setText=(id:string,value:string)=>{const element=el(id);if(element.textContent!==value)element.textContent=value;};
  stage.classList.toggle('plain',!!options.plain);
  el<HTMLInputElement>('plain').checked=!!options.plain;
  el('simulated').hidden=!options.simulated;
  const rows=commands.map(([move,command])=>{
    const row=document.createElement('div');row.className='vote-row';row.dataset.move=move;
    row.innerHTML=`<div class="vote-command">${command}<small>${move.replaceAll('_',' ')} <span class="vote-count">0</span></small></div><div class="vote-track"><div class="vote-fill"></div></div><div class="vote-percent">0%</div>`;
    el('votes').append(row);
    return {move,row,count:row.querySelector<HTMLElement>('.vote-count')!,fill:row.querySelector<HTMLElement>('.vote-fill')!,percent:row.querySelector<HTMLElement>('.vote-percent')!};
  });
  function fit(){const scale=Math.min(host.clientWidth/1920,host.clientHeight/1080);stage.style.transform=`scale(${scale})`;stage.style.left=`${(host.clientWidth-1920*scale)/2}px`;stage.style.top=`${(host.clientHeight-1080*scale)/2}px`;}
  const observer=new ResizeObserver(fit);observer.observe(host);fit();
  const sprite=new BossSprite(el<HTMLCanvasElement>('boss-sprite'));
  const sound=new GameSound();
  let soundBusy=false,disposed=false;
  const toggle=async()=>{
    if(soundBusy||disposed)return;soundBusy=true;el<HTMLButtonElement>('sound').disabled=true;
    el('sound').textContent=sound.enabled?'MUTING…':'LOADING SOUND…';
    try{await sound.toggle();if(!disposed)el('sound').textContent=sound.enabled?'SOUND ON · M':'SOUND OFF · M';}catch{if(!disposed)el('sound').textContent='SOUND UNAVAILABLE';}
    finally{soundBusy=false;if(!disposed)el<HTMLButtonElement>('sound').disabled=false;}
  };
  el('sound').addEventListener('click',toggle);
  el('plain').addEventListener('change',()=>stage.classList.toggle('plain',el<HTMLInputElement>('plain').checked));
  const muteKey=(event:KeyboardEvent)=>{if(event.code==='KeyM'&&!event.repeat&&!['INPUT','TEXTAREA','SELECT'].includes((event.target as HTMLElement)?.tagName)){void toggle();}};
  window.addEventListener('keydown',muteKey);
  let current:GameState|undefined;
  let previous:GameState|undefined;
  let clip='idle',clipAt=0;
  const heard=new Set<string>();
  let lastVoteSoundAt=-Infinity;
  function once(key:string,play:()=>void){if(heard.has(key))return;heard.add(key);play();}
  function renderTally(message:TallySnapshot,superReady=false,exploit?:Move) {
    if(!isTallySnapshot(message))return;
    const {weights,percent:shares,highest}=voteShares(message);
    el('voters').textContent=String(message.voters);el('simulated').hidden=!message.simulated;
    for(const {move,row,count,fill,percent}of rows){const value=message.tally[move];const share=shares[move];const locked=move==='SUPER'&&!superReady;
      count.textContent=String(value);fill.style.width=`${share}%`;percent.textContent=locked?'LOCKED':`${share}%`;
      row.classList.toggle('locked',locked);row.classList.toggle('leader',highest>0&&weights[move]===highest&&!locked);row.classList.toggle('exploit-vote',move===exploit);
      row.setAttribute('aria-label',`${names[move]} ${value} voters${locked?', locked':`, ${share} percent influence`}`);
      row.title=`${value} viewer vote${value===1?'':'s'} · ${share}% of attack draw influence`;
    }
  }
  function render(state:GameState,simulated=!!options.simulated) {
    if(previous&&(state.round.number<previous.round.number||state.log.rounds.length<previous.log.rounds.length)){heard.clear();previous=undefined;}
    current=state;
    const hp=(id:string,value:number,max:number)=>{el(id+'-hp').textContent=String(Math.max(0,Math.round(value/max*100)));el(id+'-bar').setAttribute('aria-label',`${id} HP ${Math.max(0,Math.round(value))} / ${max}`);el(id+'-bar').querySelector<HTMLElement>('span')!.style.width=`${Math.max(0,value/max*100)}%`;el(id+'-bar').querySelector<HTMLElement>('i')!.style.width=`${Math.max(0,value/max*100)}%`;};
    hp('streamer',state.streamer.hp,state.streamer.max_hp);hp('boss',state.boss.hp,state.boss.max_hp);
    el('clock').textContent=String(Math.max(0,Math.ceil(state.round.remaining_ms/1000)));el('round').textContent=`${state.round.number} / 3`;
    el('streamer-wins').textContent=String(state.match.round_wins.streamer);el('boss-wins').textContent=String(state.match.round_wins.boss);
    el('hype').textContent=`${Math.round(state.hype)}%`;el('hype-fill').style.width=`${state.hype}%`;
    const superReady=state.hype>=100&&state.supers_used<3;
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
      setText('exploit-cooldown',scouting.cooldown>0?`${scouting.cooldown} BEAT${scouting.cooldown===1?'':'S'} COOLDOWN`:'EXPLOIT READY');
    } else if(scouting.kind==='fixed') {
      setText('scouting-label','HABIT BROKEN');
      setText('fixed-reward',scouting.healed>0?`+${scouting.healed} HP · KEEP MIXING IT UP`:'HP FULL · KEEP MIXING IT UP');
    }
    renderTally({kind:'tally',tally:state.tally,weights:weightedTally(state),voters:state.voters,simulated},superReady,scouting.kind==='habit'?scouting.highlightedMove:undefined);
    const raid=raidPresentation(state);
    el('raid-phase').hidden=!raid.active;
    host.querySelector('.boss')!.classList.toggle('raid-active',raid.active);
    if(raid.active){setText('raid-label',`PHASE 2 · RAID · ${raid.seconds}s`);el('raid-phase').title='Raider votes have 2× influence, capped at half the combined influence. Regular votes are needed; raiders alone have zero influence.';}
    el('beat').textContent=state.paused?'· PAUSED':`· NEXT IN ${((2400-state.round.elapsed_ms%2400)/1000).toFixed(1)}s`;
    const attack=state.activeAttack;
    const telegraph=!!attack&&!attack.vetoed&&(state.clock.paused_at??state.now)<attack.lands_at&&!state.round.over;
    const counter=state.counter.open&&!state.round.over;
    el('telegraph').hidden=!(telegraph||counter);el('telegraph').classList.toggle('counter',counter&&!telegraph);
    el('banner').textContent=telegraph?'HANDS UP!':'COUNTER!';
    el('move').textContent=telegraph?names[attack!.move]:'BONUS PUNCH';el('cue').textContent=telegraph?defenceCue(attack!.move):'J';
    el('exploit-note').textContent=telegraph?exploitHabitNote(state):'';
    el('left-arrow').hidden=!(telegraph&&(attack!.move==='HOOK_R'||attack!.move==='SUPER'));
    el('right-arrow').hidden=!(telegraph&&(attack!.move==='HOOK_L'||attack!.move==='SUPER'));
    el('phase').textContent=state.paused?'PAUSED':state.round.over?'ROUND OVER':superReady?'SUPER READY':'DEFENCE FIRST';
    el('status').textContent=state.round.over?`${state.round.winner==='streamer'?'STREAMER':'CHAT'} WINS`:state.paused?'RESUME WHEN READY.':'GUARD STRAIGHTS.\nLEAN FROM SWINGS.';
    el('result').textContent=state.round.over?(state.match.winner?'MATCH COMPLETE':'NEXT ROUND WHEN READY'):'';
    if(!previous){
      for(const entry of state.log.telegraphs)heard.add(`tell:${entry.round}:${entry.beat}`);
      for(const entry of state.log.resolved)heard.add(`hit:${entry.round}:${entry.beat}`);
      for(const entry of state.log.rounds)heard.add(`round-end:${entry.number}`);
    }
    if(telegraph){const key=`tell:${state.round.number}:${attack!.beat}`;once(key,()=>{sound.play('telegraph');sound.play('handsVoice',true);});clip=`${moveClip[attack!.move]}_windup`;clipAt=attack!.at;}
    const scoutChanged=!!previous&&(state.scouting.fixes>previous.scouting.fixes||!!state.scouting.card&&!previous.scouting.card);
    const last=state.log.resolved.filter(entry=>entry.round===state.round.number).at(-1);
    if(last){once(`hit:${last.round}:${last.beat}`,()=>{
      if(last.outcome==='BLOCK'){sound.play('block');sound.play('blockedVoice',true);}
      else if(last.outcome==='PERFECT'){sound.play('perfect');sound.play('perfectVoice',true);}
      else if(last.outcome==='DODGE')sound.play('dodge');else sound.play('hit');
      if(last.counter_dmg>0){sound.play('counter');sound.play('counterAccent');if(!scoutChanged)sound.play('counterVoice',true);}

    });}
    if(!previous&&state.round.elapsed_ms<1000&&!state.round.over)sound.play('round1',true);
    if(previous&&state.round.number!==previous.round.number){sound.play(state.round.number===2?'round2':'round3',true);sound.play('fight');}
    if(previous&&state.now-lastVoteSoundAt>=125&&commands.some(([move])=>state.tally[move]!==previous!.tally[move])&&state.voters>0){sound.play('vote');lastVoteSoundAt=state.now;}
    if(previous&&state.hype>=100&&previous.hype<100)sound.play('super');
    if(previous&&state.scouting.card&&!previous.scouting.card)sound.play('weakness',true,true);
    if(previous&&state.scouting.fixes>previous.scouting.fixes){sound.play('fixed',true,true);sound.play('cheer');}
    if(previous&&state.boss.hp<previous.boss.hp&&state.log.resolved.length===previous.log.resolved.length)sound.play('bonus');
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
  const animate=()=>{if(disposed)return;if(current){const age=Math.max(0,(current.clock.paused_at??current.now)-clipAt);const transient=!['idle','victory','ko'].includes(clip)&&!clip.endsWith('_windup');sprite.draw(transient&&age>520?'idle':clip,transient&&age>520?current.round.elapsed_ms:age);}else sprite.draw('idle',performance.now());frameId=requestAnimationFrame(animate);};
  frameId=requestAnimationFrame(animate);
  return {render,renderTally,setConnection(text:string){el('connection').textContent=text;},dispose(){disposed=true;cancelAnimationFrame(frameId);observer.disconnect();sprite.dispose();sound.dispose();window.removeEventListener('keydown',muteKey);host.innerHTML='';}};
}
