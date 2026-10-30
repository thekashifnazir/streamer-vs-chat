import {DEFAULT_SCOUTING_CONFIG,type ScoutingConfig} from './scouting-config.js';
import {TEMPO,tempoFor,scaleTelegraph,isDifficulty,type Difficulty} from './tempo.js';
import {hitDamage,counterDamage} from './combat.js';
import { DEFAULT_BOSS,isDefaultBoss,validateBoss, type BossDef, type BossMoveDef } from './boss-def.js';
import { MOVES, type ChatVote, type Control, type Move, type PoseState, type PunchEvent } from './index.js';

export const RULES={beat:TEMPO.hard.beat,telegraph:TEMPO.hard.telegraph,round:75000,streamerHp:100,bossHp:DEFAULT_BOSS.hp,counter:700,punchThrottle:450} as const;
export const FOCUS_RULES={clean:12,perfect:24,superStep:10,hitLoss:10,hold:1000,finisherDamage:4,window:3000,maxFinishers:2} as const;
export type Side='L'|'R';
export type Winner='streamer'|'boss';
export type Outcome='HIT'|'BLOCK'|'PERFECT'|'DODGE'|'CHIP';
export type SuperStep='guard'|'lean_left'|'lean_right';
export type SuperStepResult={round:number;beat:number;index:number;at:number;defence:SuperStep;outcome:Outcome;damage:number;guard:boolean;lean:Side|null;reaction:Reaction|null};
export type Counts=Record<Move,number>;
/** Receive-clock elapsed excludes pauses; pre-held defence is explicit, never a fake0ms reaction. */
export type Reaction={defence:'guard'|'lean';lean:Side|null;at:number;capture_at:number|null;source:PoseState['source'];reaction_ms:number|null;reaction_kind:'held'|'reacted'};
export type DefenceInput={round:number;at:number;capture_at:number;source:PoseState['source'];guard:boolean;lean:Side|null};
export type ScoutingFix={round:number;at:number;side:Side;hp_gained:number};
export type Attack={round:number;beat:number;move:Move;at:number;lands_at:number;exploit:boolean;exploit_side?:Side;vetoed:boolean;guard_response?:Reaction;lean_response?:Reaction;last_attempt?:Reaction;combo_hit?:number;chain_outcome?:Outcome;first_guard?:boolean;first_perfect?:boolean;combo_broken?:boolean;damage?:number;actual_damage?:number;supporters?:readonly string[];brace?:boolean;super_steps?:SuperStep[];super_results?:Outcome[]};
export type Resolution={round:number;beat:number;move:Move;at:number;outcome:Outcome;dmg:number;counter_dmg:number;guard:boolean;lean:Side|null;defence:'guard'|'lean'|'none';reaction_ms:number|null;reaction_kind:'held'|'reacted'|'none';capture_at:number|null;received_at:number|null;actual_dmg?:number;actual_counter_dmg?:number;supporters?:readonly string[];braced?:boolean;super_steps?:SuperStep[];super_results?:Outcome[]};
export type BossDamage={round:number;beat:number;at:number;kind:'counter'|'punch'|'finisher';damage:number};
export type Finisher={round:number;beat:number;at:number;damage:number;actual_damage:number;window_ends_at:number};
export type DamageCredit={round:number;beat:number;at:number;damage:number;supporters:readonly string[]};
export type RoundResult={number:number;winner:Winner;at:number;reason:'ko'|'timeout';streamer_hp:number;boss_hp:number;min_streamer_hp?:number;duration_ms?:number;boss_max_hp?:number};
export type GameState={
  now:number;difficulty:Difficulty;streamer:{hp:number;max_hp:number};boss:{hp:number;max_hp:number};
  focus:number;finisher:{used:number;ends_at:number|null;ready_at:number|null};
  hype:number;supers_used:number;viewers:number;history:Move[];tally:Counts;voters:number;votes:Record<string,Move>;raiders:Record<string,boolean>;raid:{ends_at:number|null};
  paused:boolean;stopped:boolean;
  round:{number:number;over:boolean;winner:Winner|null;ended_at:number|null;end_reason:'ko'|'timeout'|null;elapsed_ms:number;remaining_ms:number;min_streamer_hp?:number};
  match:{seed:number;round_wins:Record<Winner,number>;winner:Winner|null};
  scouting:{dodges:Side[];n:number;card:Side|null;fixes:number;since_fix:number;cooldown:number;last_fix:Omit<ScoutingFix,'round'>|null};
  chatScouting:{history:Move[];card:Move|null;n:number;share:number;lowerBound:number;openingPending:boolean;openings:{round:number;beat:number;at:number;move:Move;voted:boolean}[]};
  counter:{open:boolean;closes_at:number};
  input:{guard:boolean;lean:Side|null;guard_at:number;lean_at:number;last_punch_at:number;guard_capture_at:number|null;lean_capture_at:number|null;guard_source:PoseState['source'];lean_source:PoseState['source'];guard_received_at:number|null;lean_received_at:number|null};
  clock:{started_at:number;ends_at:number;next_beat:number;beat:number;paused_at:number|null};
  activeAttack:Attack|null;
  log:{telegraphs:Attack[];resolved:Resolution[];rounds:RoundResult[];inputs:DefenceInput[];fixes:ScoutingFix[];damage:DamageCredit[];superSteps:SuperStepResult[];finishers:Finisher[];bossDamage:BossDamage[]};
  rng:number;moves?:Move[];bossDef?:BossDef;scoutingConfig?:Readonly<ScoutingConfig>;
};
export type EngineVote=ChatVote&{raider?:boolean};
export type EngineEvent=EngineVote|(PoseState&{capture_at?:number})|PunchEvent|(Control&{authorized?:boolean})|
  {kind:'advance'}|{kind:'next-round';bossDef?:BossDef|null}|{kind:'restart';seed?:number;bossDef?:BossDef|null;difficulty?:Difficulty}|{kind:'viewers';count:number}|
  {kind:'vote-batch';votes:EngineVote[]}|{kind:'crowd-votes';counts:Counts}|{kind:'cheer';bits:number}|{kind:'subscribe'}|{kind:'raid';viewers:number};
export function bossMove(state:Pick<GameState,'bossDef'>,move:Move):BossMoveDef {return (state.bossDef??DEFAULT_BOSS).moves[MOVES.indexOf(move)]??DEFAULT_BOSS.moves[0]!;}
/** Default SUPER is a three-step sequence; custom slot five remains its own move. */
export function moveTelegraph(state:Pick<GameState,'bossDef'|'difficulty'>,move:Move):number{return scaleTelegraph(bossMove(state,move).telegraph_ms,state.difficulty)*(!state.bossDef&&move==='SUPER'?2:1);}
export function attackStepGap(state:Pick<GameState,'difficulty'>,attack:Pick<Attack,'super_steps'>):number{return attack.super_steps?Math.round(600*tempoFor(state.difficulty).tempo):tempoFor(state.difficulty).comboGap;}
export function attackDuration(state:Pick<GameState,'bossDef'|'difficulty'>,move:Move):number{return moveTelegraph(state,move)+(!state.bossDef&&move==='SUPER'?2*Math.round(600*tempoFor(state.difficulty).tempo):(bossMove(state,move).hits-1)*tempoFor(state.difficulty).comboGap);}
export function exploitMove(state:Pick<GameState,'bossDef'|'scouting'>):Move|undefined {const side=state.scouting.card;if(!side)return undefined;return state.bossDef?availableMoves(state).find(move=>bossMove(state,move).defence===(side==='L'?'lean_right':'lean_left')):side==='L'?'HOOK_L':'HOOK_R';}
export function availableMoves(state:Pick<GameState,'bossDef'>):Move[]{return state.bossDef?MOVES.slice(0,state.bossDef.moves.length):[...MOVES];}
export function defenceMatches(defence:BossMoveDef['defence'],guard:boolean,lean:Side|null):boolean{return defence==='guard'?guard:defence==='lean_any'?lean!==null:defence==='lean_left'?lean==='L':lean==='R';}
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
export function drawMove(counts:Partial<Counts>,history:Move[],rng:()=>number,available:readonly Move[]=MOVES,custom=false):Move{
  const base=custom?[...available]:MOVES.slice(0,4);
  const total=available.reduce((sum,m)=>sum+(counts[m]??0),0);
  let move:Move;
  if(total===0)move=base[Math.floor(rng()*base.length)]!;
  else{
    let x=rng()*total;move=available.at(-1)!;
    for(const candidate of available){const count=counts[candidate]??0;if(x<count){move=candidate;break;}x-=count;}
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
export function createGame(options:{seed?:number;roundSeed?:number;viewers?:number;now?:number;roundNumber?:number;moves?:Move[];bossDef?:BossDef;difficulty?:Difficulty;scoutingConfig?:Readonly<ScoutingConfig>}={}):GameState{
  const now=options.now??0,number=options.roundNumber??1,seed=options.seed??0;
  const difficulty=options.difficulty??'hard';if(!isDifficulty(difficulty))throw new Error('Invalid difficulty');
  const timing=tempoFor(difficulty);
  const bossDef=options.bossDef&&!isDefaultBoss(options.bossDef)?options.bossDef:undefined;
  if(bossDef&&validateBoss(bossDef).length)throw new Error('Invalid BossDef');
  return {now,difficulty,streamer:{hp:100,max_hp:100},boss:{hp:bossDef?.hp??DEFAULT_BOSS.hp,max_hp:bossDef?.hp??DEFAULT_BOSS.hp},focus:0,finisher:{used:0,ends_at:null,ready_at:null},hype:0,supers_used:0,
    viewers:Math.max(0,Math.floor(options.viewers??0)),history:[],tally:emptyCounts(),voters:0,votes:{},raiders:{},raid:{ends_at:null},paused:false,stopped:false,
    round:{number,over:false,winner:null,ended_at:null,end_reason:null,elapsed_ms:0,remaining_ms:75000,min_streamer_hp:100},
    match:{seed,round_wins:{streamer:0,boss:0},winner:null},
    scouting:{dodges:[],n:0,card:null,fixes:0,since_fix:0,cooldown:0,last_fix:null},
    chatScouting:{history:[],card:null,n:0,share:0,lowerBound:0,openingPending:true,openings:[]},counter:{open:false,closes_at:0},
    input:{guard:false,lean:null,guard_at:-Infinity,lean_at:-Infinity,last_punch_at:-Infinity,guard_capture_at:null,lean_capture_at:null,guard_source:'keyboard',lean_source:'keyboard',guard_received_at:null,lean_received_at:null},
    clock:{started_at:now,ends_at:now+75000,next_beat:now+timing.beat,beat:0,paused_at:null},activeAttack:null,
    log:{telegraphs:[],resolved:[],rounds:[],inputs:[],fixes:[],damage:[],superSteps:[],finishers:[],bossDamage:[]},rng:(options.roundSeed??(seed+number))>>>0,
    ...(options.scoutingConfig?{scoutingConfig:{...options.scoutingConfig}}:{}),
    ...(options.moves===undefined?{}:{moves:[...options.moves]}),...(bossDef?{bossDef:structuredClone(bossDef)}:{}),
  };
}
function copy(state:GameState):GameState{
  // Fixed-size structural copy. Histories and vote maps are copied only on writes.
  return {...state,streamer:{...state.streamer},boss:{...state.boss},round:{...state.round},match:{...state.match,round_wins:{...state.match.round_wins}},
    finisher:{...state.finisher},scouting:{...state.scouting},chatScouting:{...state.chatScouting},raid:{...state.raid},counter:{...state.counter},input:{...state.input},clock:{...state.clock},log:{...state.log},
    activeAttack:state.activeAttack?{...state.activeAttack,...(state.activeAttack.super_results?{super_results:[...state.activeAttack.super_results]}:{})}:null};
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
  const config=s.scoutingConfig??DEFAULT_SCOUTING_CONFIG;
  if(s.round.number<config.minRound||observed.length<config.minSamples)return;
  const left=observed.filter(side=>side==='L').length;
  const side=left>=observed.length-left?'L':'R',k=side==='L'?left:observed.length-left;
  if(k/observed.length>=config.minShare&&wilsonLower(k,observed.length)>=config.minWilsonLower)s.scouting.card=side;
}
function scoutChat(s:GameState){
  const evidence=s.chatScouting,n=evidence.history.length; evidence.n=n;
  const count=(move:Move)=>evidence.history.filter(value=>value===move).length;
  if(s.round.number<2||n<12){evidence.card=null;evidence.share=0;evidence.lowerBound=0;return;}
  if(evidence.card&&count(evidence.card)/n<.50)evidence.card=null;
  const candidate=evidence.card??MOVES.reduce((best,move)=>count(move)>count(best)?move:best,MOVES[0]);
  const k=count(candidate);evidence.share=k/n;evidence.lowerBound=wilsonLower(k,n);
  if(!evidence.card&&evidence.share>=.55&&evidence.lowerBound>=.40)evidence.card=candidate;
}
function finish(s:GameState,winner:Winner,at:number,reason:'ko'|'timeout'){
  if(s.round.over)return;
  s.round.over=true;s.round.winner=winner;s.round.ended_at=at;s.round.end_reason=reason;
  s.round.elapsed_ms=Math.min(75000,at-s.clock.started_at);s.round.remaining_ms=Math.max(0,75000-s.round.elapsed_ms);
  s.match.round_wins[winner]++;
  if(s.match.round_wins[winner]>=2)s.match.winner=winner;
  s.activeAttack=null;s.counter.open=false;
  s.tally=emptyCounts();s.votes={};s.raiders={};s.voters=0;
  s.log.rounds=[...s.log.rounds,{number:s.round.number,winner,at,reason,streamer_hp:s.streamer.hp,boss_hp:s.boss.hp,min_streamer_hp:Math.min(s.round.min_streamer_hp??100,s.streamer.hp),duration_ms:s.round.elapsed_ms,boss_max_hp:s.boss.max_hp}];
}
function ko(s:GameState,at:number){
  if(s.streamer.hp<=0){s.streamer.hp=0;finish(s,'boss',at,'ko');}
  else if(s.boss.hp<=0){s.boss.hp=0;finish(s,'streamer',at,'ko');}
}
function damage(s:GameState,amount:number,at:number):number{
  const before=s.streamer.hp,dealt=hitDamage(before,amount);s.streamer.hp=Math.max(0,before-dealt);
  s.round.min_streamer_hp=Math.min(s.round.min_streamer_hp??100,s.streamer.hp);
  if(s.activeAttack){
    const actual=before-s.streamer.hp;
    s.activeAttack.actual_damage=(s.activeAttack.actual_damage??0)+actual;
    if(actual>0)s.log.damage=[...s.log.damage,{round:s.round.number,beat:s.activeAttack.beat,at,damage:actual,supporters:s.activeAttack.supporters??[]}];
  }
  return dealt;
}
function gainFocus(s:GameState,outcome:Outcome,at:number,superStep=false){
  const amount=outcome==='HIT'?-FOCUS_RULES.hitLoss:outcome==='PERFECT'?FOCUS_RULES.perfect:outcome==='BLOCK'||outcome==='DODGE'?(superStep?FOCUS_RULES.superStep:FOCUS_RULES.clean):0;
  const before=s.focus;s.focus=Math.max(0,Math.min(100,s.focus+amount));
  if(s.focus<100)s.finisher.ready_at=null;
  else if(before<100)s.finisher.ready_at=at;
}
function recordBossDamage(s:GameState,kind:BossDamage['kind'],amount:number,at:number,beat=s.clock.beat-1):number{
  const before=s.boss.hp;s.boss.hp=Math.max(0,before-amount);const actual=before-s.boss.hp;
  if(actual>0)s.log.bossDamage=[...s.log.bossDamage,{round:s.round.number,beat,at,kind,damage:actual}];
  return actual;
}
function finisherDue(s:GameState):number{
  if(s.focus!==100||s.finisher.used>=FOCUS_RULES.maxFinishers||!s.input.guard||s.activeAttack)return Infinity;
  const due=Math.max(s.input.guard_at+FOCUS_RULES.hold,s.finisher.ready_at??s.now,s.now);
  return due<s.clock.ends_at?due:Infinity;
}
function fireFinisher(s:GameState,at:number){
  s.focus=0;s.finisher.ready_at=null;s.finisher.used++;s.finisher.ends_at=at+FOCUS_RULES.window;
  const actual=recordBossDamage(s,'finisher',FOCUS_RULES.finisherDamage,at);
  s.log.finishers=[...s.log.finishers,{round:s.round.number,beat:s.clock.beat-1,at,damage:FOCUS_RULES.finisherDamage,actual_damage:actual,window_ends_at:at+FOCUS_RULES.window}];
  ko(s,at);
}
function resolved(s:GameState,attack:Attack,at:number,outcome:Outcome,dmg:number){
  const bossBefore=s.boss.hp,baseCounter=counterDamage(outcome);
  const braced=!!attack.brace&&baseCounter>0,counter=baseCounter*(braced?1.25:1);
  if(counter){recordBossDamage(s,'counter',counter,at,attack.beat);s.counter={open:true,closes_at:at+700};}
  if(!attack.super_steps)gainFocus(s,outcome,at);
  const straight=bossMove(s,attack.move).defence==='guard';
  const reaction=straight&&s.input.guard?attack.guard_response:
    outcome==='DODGE'?attack.lean_response:outcome==='CHIP'?attack.guard_response:
    s.input.lean?attack.lean_response:attack.last_attempt??attack.guard_response??attack.lean_response;
  s.log.resolved=[...s.log.resolved,{round:s.round.number,beat:attack.beat,move:attack.move,at,outcome,dmg,counter_dmg:counter,
    guard:s.input.guard,lean:s.input.lean,defence:reaction?.defence??'none',reaction_ms:reaction?.reaction_ms??null,
    reaction_kind:reaction?.reaction_kind??'none',capture_at:reaction?.capture_at??null,received_at:reaction?.at??null,
    actual_dmg:attack.actual_damage??0,actual_counter_dmg:bossBefore-s.boss.hp,supporters:attack.supporters??[],braced,...(attack.super_steps?{super_steps:[...attack.super_steps],super_results:[...attack.super_results!]}:{})}];
  if(!attack.super_steps&&outcome==='DODGE'&&s.input.lean){s.scouting.dodges=[...s.scouting.dodges,s.input.lean];scout(s,true,at);}
  else scout(s);
  s.activeAttack=null;ko(s,at);
}
function hit(s:GameState,at:number){
  const attack=s.activeAttack!,def=bossMove(s,attack.move),straight=def.defence==='guard';
  const hitIndex=attack.combo_hit??0;
  if(attack.super_steps){
    const defence=attack.super_steps[hitIndex]!,guardStep=defence==='guard';
    const clean=defenceMatches(defence,s.input.guard,s.input.lean);
    const outcome:Outcome=clean?(guardStep?'BLOCK':'DODGE'):!guardStep&&s.input.guard?'CHIP':'HIT';
    const current=clean?0:damage(s,outcome==='CHIP'?[3,3,4][hitIndex]!:[8,8,9][hitIndex]!,at);
    attack.damage=(attack.damage??0)+current;
    gainFocus(s,outcome,at,true);
    attack.super_results=[...(attack.super_results??[]),outcome];
    const order:Record<Outcome,number>={DODGE:0,BLOCK:1,PERFECT:1,CHIP:2,HIT:3};
    attack.chain_outcome=!attack.chain_outcome||order[outcome]>order[attack.chain_outcome]?outcome:attack.chain_outcome;
    const reaction=guardStep||outcome==='CHIP'?attack.guard_response:attack.lean_response;
    s.log.superSteps=[...s.log.superSteps,{round:s.round.number,beat:attack.beat,index:hitIndex,at,defence,outcome,damage:current,guard:s.input.guard,lean:s.input.lean,reaction:reaction??null}];
    if(outcome==='DODGE'&&s.input.lean){s.scouting.dodges=[...s.scouting.dodges,s.input.lean];scout(s,true,at);}
    if(hitIndex<2&&s.streamer.hp>0){attack.combo_hit=hitIndex+1;return;}
    resolved(s,attack,at,attack.chain_outcome,attack.damage);return;
  }
  if(straight){
    const guarded=s.input.guard&&!attack.combo_broken;
    if(hitIndex===0){attack.first_guard=guarded;attack.first_perfect=guarded&&at-s.input.guard_at<=400;}
    const current=guarded?0:damage(s,def.damage,at);
    attack.damage=(attack.damage??0)+current;
    attack.first_guard=!!attack.first_guard&&guarded;
    if(hitIndex+1<def.hits&&s.streamer.hp>0){attack.combo_hit=hitIndex+1;return;}
    resolved(s,attack,at,attack.first_guard?(attack.first_perfect?'PERFECT':'BLOCK'):'HIT',attack.damage);return;
  }
  const dodge=defenceMatches(def.defence,s.input.guard,s.input.lean);
  const outcome=dodge?'DODGE':s.input.guard?'CHIP':'HIT';
  const current=outcome==='DODGE'?0:damage(s,outcome==='CHIP'?def.chip:def.damage,at);
  attack.damage=(attack.damage??0)+current;
  attack.chain_outcome=attack.chain_outcome==='HIT'||outcome==='HIT'?'HIT':attack.chain_outcome==='CHIP'||outcome==='CHIP'?'CHIP':'DODGE';
  if(hitIndex+1<def.hits&&s.streamer.hp>0){attack.combo_hit=hitIndex+1;return;}
  resolved(s,attack,at,attack.chain_outcome,attack.damage);
}
function draw(s:GameState,at:number){
  const priorChatCard=s.chatScouting.card;
  const beat=s.clock.beat++;
  const timing=tempoFor(s.difficulty);
  s.clock.next_beat=at+timing.beat;
  if(s.clock.next_beat+(s.bossDef?Math.max(...availableMoves(s).map(move=>attackDuration(s,move))):timing.telegraph)>=s.clock.ends_at)s.clock.next_beat=Infinity;
  let move:Move|undefined;
  if(s.moves!==undefined)move=s.moves[beat];
  else{
    move=drawMove(weightedTally(s),s.history,()=>{const r=randomStep(s.rng);s.rng=r.seed;return r.value;},availableMoves(s),!!s.bossDef);
  }
  if(move&&at+attackDuration(s,move)>=s.clock.ends_at)move=undefined;
  if(move){
    const weights=weightedTally(s),voted=weights[move]>0;
    const super_steps:SuperStep[]=[];
    if(!s.bossDef&&move==='SUPER')for(let index=0;index<3;index++){
      const choices:SuperStep[]=(['guard','lean_left','lean_right'] as SuperStep[]).filter(value=>value!==super_steps.at(-1));
      const r=randomStep(s.rng);s.rng=r.seed;super_steps.push(choices[Math.floor(r.value*choices.length)]!);
    }
    const def=bossMove(s,move),firstDefence=super_steps[0]??def.defence,straight=firstDefence==='guard';
    const correctHeld=defenceMatches(firstDefence,s.input.guard,s.input.lean)&&(straight?s.input.guard_at<at:s.input.lean_at<at);
    const brace=s.round.number>=2&&priorChatCard===move&&correctHeld;
    if(s.chatScouting.openingPending){s.chatScouting.openings=[...s.chatScouting.openings,{round:s.round.number,beat,at,move,voted}];s.chatScouting.openingPending=false;}
    if(voted){s.chatScouting.history=[...s.chatScouting.history,move].slice(-12);scoutChat(s);}
    s.history=[...s.history,move];
    s.hype=Math.min(100,s.hype+12*Math.log2(1+s.voters)/Math.max(1,Math.log2(1+s.viewers)/3)+(s.viewers===0?6:0));
    if(move==='SUPER'&&!s.bossDef&&s.moves===undefined){s.hype=0;s.supers_used++;}
    const exploit=!!s.scouting.card&&move===exploitMove(s)&&s.scouting.cooldown===0;
    if(exploit)s.scouting.cooldown=3;else if(s.scouting.cooldown>0)s.scouting.cooldown--;
    const held=(defence:'guard'|'lean'):Reaction=>({defence,lean:defence==='lean'?s.input.lean:null,
      at:(defence==='guard'?s.input.guard_received_at:s.input.lean_received_at)??(defence==='guard'?s.input.guard_at:s.input.lean_at),
      capture_at:defence==='guard'?s.input.guard_capture_at:s.input.lean_capture_at,
      source:defence==='guard'?s.input.guard_source:s.input.lean_source,reaction_ms:null,reaction_kind:'held'});
    // Snapshot only real counted identities whose final move has positive draw influence.
    // Synthetic aggregate/autopilot attacks have no individual credit.
    const supporters=weights[move]>0?Object.entries(s.votes).filter(([,vote])=>vote===move).map(([user])=>user).sort():[];
    const attack:Attack={round:s.round.number,beat,move,at,lands_at:at+moveTelegraph(s,move),exploit,vetoed:false,supporters:Object.freeze(supporters),...(brace?{brace:true}:{}),...(super_steps.length?{super_steps,super_results:[]}:{}),
      ...(exploit?{exploit_side:s.scouting.card!}:{}),
      ...(s.input.guard?{guard_response:held('guard')}:{}),...(s.input.lean?{lean_response:held('lean')}:{}),
    };
    s.activeAttack=attack;s.log.telegraphs=[...s.log.telegraphs,{...attack}];
  }
  s.tally=emptyCounts();s.votes={};s.raiders={};s.voters=0;
}
function advance(s:GameState,now:number){
  scout(s);scoutChat(s);
  if(s.paused||s.round.over){
    if(!s.paused&&s.raid.ends_at!==null&&now>=s.raid.ends_at){s.raid.ends_at=null;s.raiders={};}
    s.now=now;return;
  }
  while(!s.round.over){
    const landing=s.activeAttack?s.activeAttack.lands_at+((s.activeAttack.combo_hit??0)*attackStepGap(s,s.activeAttack)):Infinity;
    const closing=s.counter.open?s.counter.closes_at:Infinity;
    const expiry=s.raid.ends_at??Infinity;
    const finisher=finisherDue(s),finisherExpiry=s.finisher.ends_at??Infinity;
    const due=Math.min(expiry,closing,landing,finisher,finisherExpiry,s.clock.next_beat,s.clock.ends_at);
    if(due>now)break;
    s.now=due;
    // The order at a shared millisecond is an explicit rule, not queue insertion order.
    if(expiry===due){s.raid.ends_at=null;s.raiders={};}
    if(closing===due)s.counter.open=false;
    if(finisherExpiry===due)s.finisher.ends_at=null;
    if(landing===due)hit(s,due);
    if(s.round.over)break;
    if(finisher===due&&!s.activeAttack)fireFinisher(s,due);
    if(s.round.over)break;
    if(s.clock.next_beat===due){
      // A long SUPER owns the attack lane. Keep the tempo grid and its pending votes;
      // the next free boundary draws them instead of overwriting the active sequence.
      if(s.activeAttack?.super_steps){s.clock.next_beat+=tempoFor(s.difficulty).beat;s.clock.beat++;}
      else draw(s,due);
    }
    if(s.clock.ends_at===due)finish(s,s.streamer.hp/s.streamer.max_hp>=s.boss.hp/s.boss.max_hp?'streamer':'boss',due,'timeout');
  }
  s.now=now;
  if(!s.round.over){s.round.elapsed_ms=now-s.clock.started_at;s.round.remaining_ms=Math.max(0,s.clock.ends_at-now);}
}
function acceptVote(s:GameState,event:EngineVote){
  if(!availableMoves(s).includes(event.move))return;
  if(!s.bossDef&&event.move==='SUPER'&&(s.hype!==100||s.supers_used>=3))return;
  const old=Object.hasOwn(s.votes,event.user)?s.votes[event.user]:undefined;
  Object.defineProperty(s.raiders,event.user,{value:event.raider===true,writable:true,enumerable:true,configurable:true});
  if(old===event.move)return;
  if(old)s.tally[old]--;else s.voters++;
  Object.defineProperty(s.votes,event.user,{value:event.move,writable:true,enumerable:true,configurable:true});s.tally[event.move]++;
}
/** Pure server/demo/simulation reducer. Inputs at now run after all due engine events. */
export function step(state:GameState,event:EngineEvent,now:number):GameState{
  if(!Number.isFinite(now)||now<state.now)throw new Error('Engine time must be finite and monotonic');
  if(event.kind==='restart')return createGame({seed:event.seed??state.match.seed,viewers:state.viewers,now,difficulty:event.difficulty??state.difficulty,scoutingConfig:state.scoutingConfig,bossDef:event.bossDef===null?undefined:event.bossDef??state.bossDef});
  if(event.kind==='next-round'){
    if(!state.round.over||state.match.winner||state.paused)return state;
    const next=createGame({seed:state.match.seed,viewers:state.viewers,now,roundNumber:state.round.number+1,difficulty:state.difficulty,scoutingConfig:state.scoutingConfig,bossDef:event.bossDef===null?undefined:event.bossDef??state.bossDef});
    next.match={...state.match,round_wins:{...state.match.round_wins}};
    if(JSON.stringify(next.bossDef)!==JSON.stringify(state.bossDef)){next.chatScouting={...next.chatScouting};}
    else next.chatScouting={...state.chatScouting,history:[...state.chatScouting.history],openingPending:true};scoutChat(next);
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
        if(s.finisher.ends_at!==null)s.finisher.ends_at+=delta;
        if(s.finisher.ready_at!==null)s.finisher.ready_at+=delta;
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
        if(s.activeAttack){s.chatScouting.openingPending=true;const beat=s.activeAttack.beat;s.log.telegraphs=s.log.telegraphs.map(t=>t.round===s.round.number&&t.beat===beat?{...t,vetoed:true}:t);s.activeAttack=null;}
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
    if(now-s.input.last_punch_at>=450){s.input.last_punch_at=now;recordBossDamage(s,'punch',(s.counter.open?1.5:1)*(s.finisher.ends_at!==null&&now<s.finisher.ends_at?2:1),now);ko(s,now);}
  }else if(event.kind==='vote'||event.kind==='vote-batch'){
    s.votes={...s.votes};s.raiders={...s.raiders};s.tally={...s.tally};
    for(const vote of event.kind==='vote'?[event]:event.votes)acceptVote(s,vote);
  }else if(event.kind==='crowd-votes'){
    s.tally={...event.counts};
    for(const move of MOVES)if(!availableMoves(s).includes(move))s.tally[move]=0;
    if(!s.bossDef&&(s.hype!==100||s.supers_used>=3))s.tally.SUPER=0;
    s.voters=MOVES.reduce((total,m)=>total+s.tally[m],0);s.votes={};s.raiders={};
  }
  return s;
}
