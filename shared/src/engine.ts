import { MOVES, type ChatVote, type Control, type Move, type PoseState, type PunchEvent } from './index.js';

export const RULES={beat:2400,telegraph:800,round:75000,streamerHp:100,bossHp:135,counter:700,punchThrottle:450} as const;
export type Side='L'|'R';
export type Winner='streamer'|'boss';
export type Outcome='HIT'|'BLOCK'|'PERFECT'|'DODGE'|'CHIP';
export type Counts=Record<Move,number>;
/** Receive-clock elapsed excludes pauses; pre-held defence is explicit, never a fake0ms reaction. */
export type Reaction={defence:'guard'|'lean';lean:Side|null;at:number;capture_at:number|null;source:PoseState['source'];reaction_ms:number|null;reaction_kind:'held'|'reacted'};
export type DefenceInput={round:number;at:number;capture_at:number;source:PoseState['source'];guard:boolean;lean:Side|null};
export type ScoutingFix={round:number;at:number;side:Side;hp_gained:number};
export type Attack={round:number;beat:number;move:Move;at:number;lands_at:number;exploit:boolean;exploit_side?:Side;vetoed:boolean;guard_response?:Reaction;lean_response?:Reaction;last_attempt?:Reaction;combo_hit?:number;first_guard?:boolean;first_perfect?:boolean;combo_broken?:boolean;damage?:number};
export type Resolution={round:number;beat:number;move:Move;at:number;outcome:Outcome;dmg:number;counter_dmg:number;guard:boolean;lean:Side|null;defence:'guard'|'lean'|'none';reaction_ms:number|null;reaction_kind:'held'|'reacted'|'none';capture_at:number|null;received_at:number|null};
export type RoundResult={number:number;winner:Winner;at:number;reason:'ko'|'timeout';streamer_hp:number;boss_hp:number};
export type GameState={
  now:number;streamer:{hp:number;max_hp:number};boss:{hp:number;max_hp:number};
  hype:number;supers_used:number;viewers:number;history:Move[];tally:Counts;voters:number;votes:Record<string,Move>;raiders:Record<string,boolean>;raid:{ends_at:number|null};
  paused:boolean;stopped:boolean;
  round:{number:number;over:boolean;winner:Winner|null;ended_at:number|null;end_reason:'ko'|'timeout'|null;elapsed_ms:number;remaining_ms:number};
  match:{seed:number;round_wins:Record<Winner,number>;winner:Winner|null};
  scouting:{dodges:Side[];n:number;card:Side|null;fixes:number;since_fix:number;cooldown:number;last_fix:Omit<ScoutingFix,'round'>|null};
  counter:{open:boolean;closes_at:number};
  input:{guard:boolean;lean:Side|null;guard_at:number;lean_at:number;last_punch_at:number;guard_capture_at:number|null;lean_capture_at:number|null;guard_source:PoseState['source'];lean_source:PoseState['source'];guard_received_at:number|null;lean_received_at:number|null};
  clock:{started_at:number;ends_at:number;next_beat:number;beat:number;paused_at:number|null};
  activeAttack:Attack|null;
  log:{telegraphs:Attack[];resolved:Resolution[];rounds:RoundResult[];inputs:DefenceInput[];fixes:ScoutingFix[]};
  rng:number;moves?:Move[];
};
export type EngineVote=ChatVote&{raider?:boolean};
export type EngineEvent=EngineVote|(PoseState&{capture_at?:number})|PunchEvent|(Control&{authorized?:boolean})|
  {kind:'advance'}|{kind:'next-round'}|{kind:'restart';seed?:number}|{kind:'viewers';count:number}|
  {kind:'vote-batch';votes:EngineVote[]}|{kind:'crowd-votes';counts:Counts}|{kind:'cheer';bits:number}|{kind:'subscribe'}|{kind:'raid';viewers:number};
export function emptyCounts():Counts{return {JAB:0,HOOK_L:0,HOOK_R:0,COMBO:0,SUPER:0};}
/** Raw tally counts people; this derived draw/UI view alone applies the live raid cap. */
export function weightedTally(state:GameState):Counts{
  const end=state.raid.ends_at,effectiveNow=state.clock.paused_at??state.now;
  if(end===null||effectiveNow>=end)return {...state.tally};
  const normal={...state.tally},raiders=emptyCounts();
  for(const [user,move]of Object.entries(state.votes)){
    if(Object.hasOwn(state.raiders,user)&&state.raiders[user]){normal[move]--;raiders[move]++;}
  }
  const normalWeight=MOVES.reduce((sum,move)=>sum+normal[move],0);
  const raiderPeople=MOVES.reduce((sum,move)=>sum+raiders[move],0);
  // Scale all raiders uniformly so together they cannot exceed half the draw.
  const each=raiderPeople?Math.min(2,normalWeight/raiderPeople):0;
  return Object.fromEntries(MOVES.map(move=>[move,normal[move]+raiders[move]*each])) as Counts;
}
/** Exact unsigned mulberry32; the reducer keeps its state explicitly, not in a closure. */
function randomStep(seed:number):{seed:number;value:number}{
  const next=(seed+0x6D2B79F5)>>>0;
  let t=Math.imul(next^(next>>>15),1|next);
  t=(t+Math.imul(t^(t>>>7),61|t))^t;
  return {seed:next,value:((t^(t>>>14))>>>0)/4294967296};
}
export function mulberry32(seed:number):()=>number{return ()=>{const next=randomStep(seed);seed=next.seed;return next.value;};}
export function drawMove(counts:Partial<Counts>,history:Move[],rng:()=>number):Move{
  const base=MOVES.slice(0,4);
  const total=MOVES.reduce((sum,m)=>sum+(counts[m]??0),0);
  let move:Move;
  if(total===0)move=base[Math.floor(rng()*4)]!;
  else{
    let x=rng()*total;move='SUPER';
    for(const candidate of MOVES){const count=counts[candidate]??0;if(x<count){move=candidate;break;}x-=count;}
  }
  if(history.length>=2&&history.at(-1)===move&&history.at(-2)===move){
    const others=base.filter(m=>m!==move);move=others[Math.floor(rng()*others.length)]!;
  }
  return move;
}
export function wilsonLower(k:number,n:number):number{
  if(!n)return 0;const p=k/n,z=1.645,z2=z*z;
  return (p+z2/(2*n)-z*Math.sqrt(p*(1-p)/n+z2/(4*n*n)))/(1+z2/n);
}
export function createGame(options:{seed?:number;roundSeed?:number;viewers?:number;now?:number;roundNumber?:number;moves?:Move[]}={}):GameState{
  const now=options.now??0,number=options.roundNumber??1,seed=options.seed??0;
  return {now,streamer:{hp:100,max_hp:100},boss:{hp:135,max_hp:135},hype:0,supers_used:0,
    viewers:Math.max(0,Math.floor(options.viewers??0)),history:[],tally:emptyCounts(),voters:0,votes:{},raiders:{},raid:{ends_at:null},paused:false,stopped:false,
    round:{number,over:false,winner:null,ended_at:null,end_reason:null,elapsed_ms:0,remaining_ms:75000},
    match:{seed,round_wins:{streamer:0,boss:0},winner:null},
    scouting:{dodges:[],n:0,card:null,fixes:0,since_fix:0,cooldown:0,last_fix:null},counter:{open:false,closes_at:0},
    input:{guard:false,lean:null,guard_at:-Infinity,lean_at:-Infinity,last_punch_at:-Infinity,guard_capture_at:null,lean_capture_at:null,guard_source:'keyboard',lean_source:'keyboard',guard_received_at:null,lean_received_at:null},
    clock:{started_at:now,ends_at:now+75000,next_beat:now+2400,beat:0,paused_at:null},activeAttack:null,
    log:{telegraphs:[],resolved:[],rounds:[],inputs:[],fixes:[]},rng:(options.roundSeed??(seed+number))>>>0,
    ...(options.moves===undefined?{}:{moves:[...options.moves]}),
  };
}
function copy(state:GameState):GameState{
  // Fixed-size structural copy. Histories and vote maps are copied only on writes.
  return {...state,streamer:{...state.streamer},boss:{...state.boss},round:{...state.round},match:{...state.match,round_wins:{...state.match.round_wins}},
    scouting:{...state.scouting},raid:{...state.raid},counter:{...state.counter},input:{...state.input},clock:{...state.clock},log:{...state.log},
    activeAttack:state.activeAttack?{...state.activeAttack}:null};
}
function scout(s:GameState,newDodge=false,at=s.now){
  const observed=s.scouting.dodges.slice(s.scouting.since_fix);
  s.scouting.n=observed.length;
  if(s.scouting.card){
    if(!newDodge||observed.length<8)return;
    const count=observed.slice(-8).filter(side=>side===s.scouting.card).length;
    if(count/8<=.625){
      const side=s.scouting.card,before=s.streamer.hp;
      s.scouting.card=null;s.scouting.fixes++;s.scouting.since_fix=s.scouting.dodges.length;s.scouting.n=0;
      s.streamer.hp=Math.min(s.streamer.max_hp,s.streamer.hp+10);
      const fix:ScoutingFix={round:s.round.number,at,side,hp_gained:s.streamer.hp-before};
      s.scouting.last_fix=fix;s.log.fixes=[...s.log.fixes,fix];
    }
    return;
  }
  if(s.round.number<2||observed.length<12)return;
  const left=observed.filter(side=>side==='L').length;
  const side=left>=observed.length-left?'L':'R',k=side==='L'?left:observed.length-left;
  if(k/observed.length>=.65&&wilsonLower(k,observed.length)>=.60)s.scouting.card=side;
}
function finish(s:GameState,winner:Winner,at:number,reason:'ko'|'timeout'){
  if(s.round.over)return;
  s.round.over=true;s.round.winner=winner;s.round.ended_at=at;s.round.end_reason=reason;
  s.round.elapsed_ms=Math.min(75000,at-s.clock.started_at);s.round.remaining_ms=Math.max(0,75000-s.round.elapsed_ms);
  s.match.round_wins[winner]++;
  if(s.match.round_wins[winner]>=2)s.match.winner=winner;
  s.activeAttack=null;s.counter.open=false;
  s.tally=emptyCounts();s.votes={};s.raiders={};s.voters=0;
  s.log.rounds=[...s.log.rounds,{number:s.round.number,winner,at,reason,streamer_hp:s.streamer.hp,boss_hp:s.boss.hp}];
}
function ko(s:GameState,at:number){
  if(s.streamer.hp<=0){s.streamer.hp=0;finish(s,'boss',at,'ko');}
  else if(s.boss.hp<=0){s.boss.hp=0;finish(s,'streamer',at,'ko');}
}
function damage(s:GameState,amount:number):number{
  const dealt=amount*(s.streamer.hp<30?.6:1);s.streamer.hp=Math.max(0,s.streamer.hp-dealt);return dealt;
}
function resolved(s:GameState,attack:Attack,at:number,outcome:Outcome,dmg:number){
  const counter=outcome==='PERFECT'?11:outcome==='BLOCK'?8:outcome==='DODGE'?9:0;
  if(counter){s.boss.hp=Math.max(0,s.boss.hp-counter);s.counter={open:true,closes_at:at+700};}
  const straight=attack.move==='JAB'||attack.move==='COMBO';
  const reaction=straight&&s.input.guard?attack.guard_response:
    outcome==='DODGE'?attack.lean_response:outcome==='CHIP'?attack.guard_response:
    s.input.lean?attack.lean_response:attack.last_attempt??attack.guard_response??attack.lean_response;
  s.log.resolved=[...s.log.resolved,{round:s.round.number,beat:attack.beat,move:attack.move,at,outcome,dmg,counter_dmg:counter,
    guard:s.input.guard,lean:s.input.lean,defence:reaction?.defence??'none',reaction_ms:reaction?.reaction_ms??null,
    reaction_kind:reaction?.reaction_kind??'none',capture_at:reaction?.capture_at??null,received_at:reaction?.at??null}];
  if(outcome==='DODGE'&&s.input.lean){s.scouting.dodges=[...s.scouting.dodges,s.input.lean];scout(s,true,at);}
  else scout(s);
  s.activeAttack=null;ko(s,at);
}
function hit(s:GameState,at:number){
  const attack=s.activeAttack!;
  if(attack.move==='COMBO'){
    if(!attack.combo_hit){
      attack.combo_hit=1;attack.first_guard=s.input.guard;attack.first_perfect=s.input.guard&&at-s.input.guard_at<=400;
      attack.damage=s.input.guard?0:damage(s,7);
      // A lethal first hit is resolved immediately; no post-KO second hit exists.
      if(s.streamer.hp<=0)resolved(s,attack,at,'HIT',attack.damage);
    }else{
      const secondGuard=s.input.guard&&!attack.combo_broken;
      const dmg=(attack.damage??0)+(secondGuard?0:damage(s,7));
      const blocked=attack.first_guard&&secondGuard;
      resolved(s,attack,at,blocked?(attack.first_perfect?'PERFECT':'BLOCK'):'HIT',dmg);
    }
    return;
  }
  if(attack.move==='JAB'){
    const outcome=s.input.guard?(at-s.input.guard_at<=400?'PERFECT':'BLOCK'):'HIT';
    resolved(s,attack,at,outcome,outcome==='HIT'?damage(s,8):0);return;
  }
  const dodge=attack.move==='SUPER'?s.input.lean!==null:attack.move==='HOOK_L'?s.input.lean==='R':s.input.lean==='L';
  const outcome=dodge?'DODGE':s.input.guard?'CHIP':'HIT';
  const raw=outcome==='DODGE'?0:outcome==='CHIP'?(attack.move==='SUPER'?10:3):(attack.move==='SUPER'?25:12);
  resolved(s,attack,at,outcome,raw?damage(s,raw):0);
}
function draw(s:GameState,at:number){
  const beat=s.clock.beat++;
  s.clock.next_beat=at+2400;
  if(s.clock.next_beat+800>=s.clock.ends_at)s.clock.next_beat=Infinity;
  let move:Move|undefined;
  if(s.moves!==undefined)move=s.moves[beat];
  else{
    move=drawMove(weightedTally(s),s.history,()=>{const r=randomStep(s.rng);s.rng=r.seed;return r.value;});
  }
  if(move){
    s.history=[...s.history,move];
    s.hype=Math.min(100,s.hype+12*Math.log2(1+s.voters)/Math.max(1,Math.log2(1+s.viewers)/3)+(s.viewers===0?6:0));
    if(move==='SUPER'&&s.moves===undefined){s.hype=0;s.supers_used++;}
    const exploit=!!s.scouting.card&&move===(s.scouting.card==='L'?'HOOK_L':'HOOK_R')&&s.scouting.cooldown===0;
    if(exploit)s.scouting.cooldown=3;else if(s.scouting.cooldown>0)s.scouting.cooldown--;
    const held=(defence:'guard'|'lean'):Reaction=>({defence,lean:defence==='lean'?s.input.lean:null,
      at:(defence==='guard'?s.input.guard_received_at:s.input.lean_received_at)??(defence==='guard'?s.input.guard_at:s.input.lean_at),
      capture_at:defence==='guard'?s.input.guard_capture_at:s.input.lean_capture_at,
      source:defence==='guard'?s.input.guard_source:s.input.lean_source,reaction_ms:null,reaction_kind:'held'});
    const attack:Attack={round:s.round.number,beat,move,at,lands_at:at+800,exploit,vetoed:false,
      ...(exploit?{exploit_side:s.scouting.card!}:{}),
      ...(s.input.guard?{guard_response:held('guard')}:{}),...(s.input.lean?{lean_response:held('lean')}:{}),
    };
    s.activeAttack=attack;s.log.telegraphs=[...s.log.telegraphs,{...attack}];
  }
  s.tally=emptyCounts();s.votes={};s.raiders={};s.voters=0;
}
function advance(s:GameState,now:number){
  scout(s);
  if(s.paused||s.round.over){
    if(!s.paused&&s.raid.ends_at!==null&&now>=s.raid.ends_at){s.raid.ends_at=null;s.raiders={};}
    s.now=now;return;
  }
  while(!s.round.over){
    const landing=s.activeAttack?s.activeAttack.lands_at+(s.activeAttack.combo_hit?300:0):Infinity;
    const closing=s.counter.open?s.counter.closes_at:Infinity;
    const expiry=s.raid.ends_at??Infinity;
    const due=Math.min(expiry,closing,landing,s.clock.next_beat,s.clock.ends_at);
    if(due>now)break;
    // The order at a shared millisecond is an explicit rule, not queue insertion order.
    if(expiry===due){s.raid.ends_at=null;s.raiders={};}
    if(closing===due)s.counter.open=false;
    if(landing===due)hit(s,due);
    if(s.round.over)break;
    if(s.clock.next_beat===due)draw(s,due);
    if(s.clock.ends_at===due)finish(s,s.streamer.hp/s.streamer.max_hp>=s.boss.hp/s.boss.max_hp?'streamer':'boss',due,'timeout');
  }
  s.now=now;
  if(!s.round.over){s.round.elapsed_ms=now-s.clock.started_at;s.round.remaining_ms=Math.max(0,s.clock.ends_at-now);}
}
function acceptVote(s:GameState,event:EngineVote){
  if(event.move==='SUPER'&&(s.hype!==100||s.supers_used>=3))return;
  const old=Object.hasOwn(s.votes,event.user)?s.votes[event.user]:undefined;
  Object.defineProperty(s.raiders,event.user,{value:event.raider===true,writable:true,enumerable:true,configurable:true});
  if(old===event.move)return;
  if(old)s.tally[old]--;else s.voters++;
  Object.defineProperty(s.votes,event.user,{value:event.move,writable:true,enumerable:true,configurable:true});s.tally[event.move]++;
}
/** Pure server/demo/simulation reducer. Inputs at now run after all due engine events. */
export function step(state:GameState,event:EngineEvent,now:number):GameState{
  if(!Number.isFinite(now)||now<state.now)throw new Error('Engine time must be finite and monotonic');
  if(event.kind==='restart')return createGame({seed:event.seed??state.match.seed,viewers:state.viewers,now});
  if(event.kind==='next-round'){
    if(!state.round.over||state.match.winner||state.paused)return state;
    const next=createGame({seed:state.match.seed,viewers:state.viewers,now,roundNumber:state.round.number+1});
    next.match={...state.match,round_wins:{...state.match.round_wins}};
    next.scouting={...state.scouting,dodges:[...state.scouting.dodges],cooldown:0};next.log={...state.log};
    next.raid={ends_at:state.raid.ends_at!==null&&state.raid.ends_at>now?state.raid.ends_at:null};
    scout(next);return next;
  }
  const s=copy(state);advance(s,now);
  if(event.kind==='control'){
    if(event.authorized===false)return s;
    if(event.action==='resume'){
      if(s.paused){
        const delta=now-s.clock.paused_at!;
        s.clock.started_at+=delta;s.clock.ends_at+=delta;s.clock.next_beat+=delta;
        if(s.raid.ends_at!==null)s.raid.ends_at+=delta;
        if(s.counter.open)s.counter.closes_at+=delta;
        if(s.activeAttack){
          s.activeAttack.at+=delta;s.activeAttack.lands_at+=delta;
          s.log.telegraphs=s.log.telegraphs.map(t=>t.round===s.activeAttack!.round&&t.beat===s.activeAttack!.beat?{...t,lands_at:s.activeAttack!.lands_at}:t);
        }
        if(s.scouting.last_fix)s.scouting.last_fix={...s.scouting.last_fix,at:s.scouting.last_fix.at+delta};
        if(Number.isFinite(s.input.guard_at))s.input.guard_at+=delta;
        if(Number.isFinite(s.input.lean_at))s.input.lean_at+=delta;
        if(Number.isFinite(s.input.last_punch_at))s.input.last_punch_at+=delta;
        s.paused=false;s.stopped=false;s.clock.paused_at=null;
      }
    }else{
      if(!s.paused){s.paused=true;s.clock.paused_at=now;}
      if(event.action==='stop')s.stopped=true;
      if(event.action==='veto'){
        if(s.activeAttack){const beat=s.activeAttack.beat;s.log.telegraphs=s.log.telegraphs.map(t=>t.round===s.round.number&&t.beat===beat?{...t,vetoed:true}:t);s.activeAttack=null;}
        s.counter.open=false;
      }
    }
    return s;
  }
  if(event.kind==='viewers'){s.viewers=Math.max(0,Math.floor(event.count));return s;}
  if(s.paused||s.round.over)return s;
  if(event.kind==='cheer'){
    if(Number.isInteger(event.bits)&&event.bits>0)s.hype=Math.min(100,s.hype+Math.min(event.bits,25));
  }else if(event.kind==='subscribe'){
    s.streamer.hp=Math.min(100,s.streamer.hp+8);
  }else if(event.kind==='raid'){
    if(Number.isSafeInteger(event.viewers)&&event.viewers>=0){s.raid.ends_at=now+15000;s.raiders={};}
  }else if(event.kind==='pose'){
    const guardChanged=event.guard!==s.input.guard,leanChanged=event.lean!==s.input.lean;
    const capture_at=event.capture_at??event.at;
    if(guardChanged||leanChanged){
      s.log.inputs=[...s.log.inputs,{round:s.round.number,at:now,capture_at,source:event.source,guard:event.guard,lean:event.lean}];
    }
    const reaction=(defence:'guard'|'lean'):Reaction=>({defence,lean:defence==='lean'?event.lean:null,at:now,capture_at,
      source:event.source,reaction_ms:now-s.activeAttack!.at,reaction_kind:'reacted'});
    if(event.guard&&guardChanged){
      s.input.guard_at=now;s.input.guard_received_at=now;s.input.guard_capture_at=capture_at;s.input.guard_source=event.source;
      if(s.activeAttack){const response=reaction('guard');s.activeAttack.guard_response=response;s.activeAttack.last_attempt=response;}
    }
    if(leanChanged){
      s.input.lean_at=now;s.input.lean_received_at=now;s.input.lean_capture_at=capture_at;s.input.lean_source=event.source;
      if(s.activeAttack&&event.lean){const response=reaction('lean');s.activeAttack.lean_response=response;s.activeAttack.last_attempt=response;}
    }
    if(!event.guard&&s.input.guard&&s.activeAttack?.combo_hit)s.activeAttack.combo_broken=true;
    s.input.guard=event.guard;s.input.lean=event.lean;
  }else if(event.kind==='punch'){
    if(now-s.input.last_punch_at>=450){s.input.last_punch_at=now;s.boss.hp=Math.max(0,s.boss.hp-(s.counter.open?1.5:1));ko(s,now);}
  }else if(event.kind==='vote'||event.kind==='vote-batch'){
    s.votes={...s.votes};s.raiders={...s.raiders};s.tally={...s.tally};
    for(const vote of event.kind==='vote'?[event]:event.votes)acceptVote(s,vote);
  }else if(event.kind==='crowd-votes'){
    s.tally={...event.counts};
    if(s.hype!==100||s.supers_used>=3)s.tally.SUPER=0;
    s.voters=MOVES.reduce((total,m)=>total+s.tally[m],0);s.votes={};s.raiders={};
  }
  return s;
}
