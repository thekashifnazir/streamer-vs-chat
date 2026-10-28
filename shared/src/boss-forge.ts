import {DEFAULT_BOSS,isDefaultBoss,validateBoss,type BossDef} from './boss-def.js';
import {MOVES,type Move} from './index.js';
import {createGame,drawMove,mulberry32,type Outcome} from './engine.js';
import {createCrowd} from './crowd.js';
import {hitDamage,counterDamage} from './combat.js';
export {DEFAULT_BOSS,isDefaultBoss,validateBoss,type BossDef} from './boss-def.js';
export type ForgeGate={pass:boolean;viewers:number[];table:{casual:number[];nopunch:number[]};rounds:number;seed:number};
export type ForgeTuning={factor:number;def:BossDef;before:ForgeGate;after:ForgeGate};
export const FORGE_ROUNDS=4000,FORGE_SEED=2026;
// Count independent 2-bit uniform choices in one 32-bit RNG word (16 viewers).
// This preserves exact 1/4 move probabilities while avoiding one call per voter.
function popcount(n:number){n=n-((n>>>1)&0x55555555);n=(n&0x33333333)+((n>>>2)&0x33333333);return (((n+(n>>>4))&0x0f0f0f0f)*0x01010101)>>>24;}
const OUTCOMES:Outcome[]=['HIT','BLOCK','PERFECT','DODGE','CHIP'];
const plans=new Map<string,Uint8Array[]>();
/** Compile damage-independent R1 inputs once. No scouting card can exist in R1.
 * Same §5 personas/read/perfect/chip/punch probabilities, seeded per cell. The
 * compact evaluator uses the reducer's damage/counter arithmetic, including
 * per-hit mercy, lethal hits and percentage timeout decisions. */
function compile(def:BossDef):Uint8Array[]{
 const canonical=isDefaultBoss(def);
 const key=JSON.stringify([canonical,def.moves.map(m=>[m.defence,m.telegraph_ms,m.hits])]);
 const cached=plans.get(key);if(cached)return cached;
 const result:Uint8Array[]=[];
 for(let player=0;player<2;player++)for(let column=0;column<4;column++){
  const viewers=[0,3,50,500][column]!,data=new Uint8Array(FORGE_ROUNDS*30*4);
  for(let sample=0;sample<FORGE_ROUNDS;sample++){
   const seed=FORGE_SEED+player*1_000_000+column*100_000+sample,random=mulberry32(seed^0xA53140F9),draw=mulberry32(seed+1),crowd=createCrowd(viewers,seed^0x7A917D21);
   const personas=crowd.personas.reduce((a,p)=>{a[p]++;return a;},{spammer:0,tactician:0,chaos:0,hype:0,lurker:0});let hype=0,supers=0,history:Move[]=[];const available=canonical?MOVES:MOVES.slice(0,def.moves.length);const base=canonical?MOVES.slice(0,4):available;
   for(let beat=0;beat<30;beat++){
    const counts={JAB:personas.spammer,HOOK_L:0,HOOK_R:0,COMBO:0,SUPER:0};let randomVoters=personas.tactician;
    for(let i=0;i<personas.chaos;i++)if(crowd.random()<.7)randomVoters++;
    for(let i=0;i<personas.lurker;i++)if(crowd.random()<.15)randomVoters++;
    if(canonical&&hype===100&&supers<3)counts.SUPER+=personas.hype;else randomVoters+=personas.hype;
    let remaining=randomVoters;
    if(base.length===4)while(remaining>=16){const bits=(crowd.random()*4294967296)>>>0,low=bits&0x55555555,high=(bits>>>1)&0x55555555;counts[base[0]!]+=popcount(~(low|high)&0x55555555);counts[base[1]!]+=popcount(low&~high);counts[base[2]!]+=popcount(~low&high);counts[base[3]!]+=popcount(low&high);remaining-=16;}
    for(let i=0;i<remaining;i++)counts[base[Math.floor(crowd.random()*base.length)]!]++;
    const voters=personas.spammer+randomVoters+(canonical?counts.SUPER:0);
    const move=drawMove(counts,history,draw,available,!canonical),index=MOVES.indexOf(move),spec=def.moves[index]!;
    history.push(move);
    hype=Math.min(100,hype+12*Math.log2(1+voters)/Math.max(1,Math.log2(1+viewers)/3)+(viewers===0?6:0));
    if(canonical&&move==='SUPER'){hype=0;supers++;}
    const read=random()<.55;
    let outcome:Outcome=read?(spec.defence==='guard'?(random()<.15?'PERFECT':'BLOCK'):'DODGE'):(spec.defence!=='guard'&&random()<.3?'CHIP':'HIT');
    let punches=0;
    if(player===0&&counterDamage(outcome)>0)punches=Math.min(2,Math.max(0,Math.round(.6+random()-.5)));
    const stray=player===0&&random()<.25;
    const offset=(sample*30+beat)*4;data[offset]=index;data[offset+1]=OUTCOMES.indexOf(outcome);data[offset+2]=punches;data[offset+3]=Number(stray);
   }
  }
  result.push(data);
 }
 // Bounded by boss shape; a paste cannot grow this cache without limit.
 if(plans.size>=3)plans.delete(plans.keys().next().value!);
 plans.set(key,result);return result;
}
export type ForgePlanBeat={move:Move;outcome:Outcome;punches:number;stray:boolean};
/** Exposed for reducer-equivalence regressions; never a source of live inputs. */
export function forgePlan(def:BossDef,player:0|1,column:number,sample:number):ForgePlanBeat[]{
 if(!Number.isInteger(column)||column<0||column>3||!Number.isInteger(sample)||sample<0||sample>=FORGE_ROUNDS)throw new Error('Invalid sample');
 const data=compile(def)[player*4+column]!;
 return Array.from({length:30},(_,beat)=>{const offset=(sample*30+beat)*4;return {move:MOVES[data[offset]!]!,outcome:OUTCOMES[data[offset+1]!]!,punches:data[offset+2]!,stray:!!data[offset+3]};});
}
export function evaluateForgePlan(def:BossDef,plan:readonly ForgePlanBeat[]){
 let hp=100,boss=def.hp;
 for(let beat=0;beat<plan.length&&hp>0&&boss>0;beat++){
  const event=plan[beat]!,spec=def.moves[MOVES.indexOf(event.move)]!,outcome=event.outcome;
  if((beat+1)*2400+spec.telegraph_ms+(spec.hits-1)*300>=75000)break;
  if(outcome==='HIT'||outcome==='CHIP')for(let hit=0;hit<spec.hits&&hp>0;hit++)hp=Math.max(0,hp-hitDamage(hp,outcome==='CHIP'?spec.chip:spec.damage));
  if(hp<=0)break;
  boss=Math.max(0,boss-counterDamage(outcome));
  if(boss>0)boss=Math.max(0,boss-event.punches*1.5);
  if(boss>0)boss=Math.max(0,boss-Number(event.stray));
 }
 return {hp,bossHp:boss,winner:hp>0&&(boss<=0||hp/100>=boss/def.hp)?'streamer':'boss'} as const;
}
export function gateBoss(def:BossDef):ForgeGate{
 const errors=validateBoss(def,[],{allowDefault:true});
 if(errors.length)throw new Error(`Invalid BossDef: ${errors.join('; ')}`);
 const compiled=compile(def),table:ForgeGate['table']={casual:[],nopunch:[]};
 for(let player=0;player<2;player++)for(let column=0;column<4;column++){
  const data=compiled[player*4+column]!;let wins=0;
  for(let sample=0;sample<FORGE_ROUNDS;sample++){
   let hp=100,boss=def.hp;
   for(let beat=0;beat<30&&hp>0&&boss>0;beat++){
    const offset=(sample*30+beat)*4,spec=def.moves[data[offset]!]!,outcome=OUTCOMES[data[offset+1]!]!;
    if((beat+1)*2400+spec.telegraph_ms+(spec.hits-1)*300>=75000)break;
    if(outcome==='HIT'||outcome==='CHIP')for(let hit=0;hit<spec.hits&&hp>0;hit++)hp=Math.max(0,hp-hitDamage(hp,outcome==='CHIP'?spec.chip:spec.damage));
    if(hp<=0)break;
    boss=Math.max(0,boss-counterDamage(outcome));
    if(boss>0)boss=Math.max(0,boss-data[offset+2]!*1.5);
    if(boss>0)boss=Math.max(0,boss-data[offset+3]!);
   }
   if(hp>0&&(boss<=0||hp/100>=boss/def.hp))wins++;
  }
  table[player===0?'casual':'nopunch'].push(wins/FORGE_ROUNDS*100);
 }
 return {pass:table.casual.every(p=>p>=30&&p<=70)&&table.nopunch.every(p=>p>=30),viewers:[0,3,50,500],table,rounds:FORGE_ROUNDS,seed:FORGE_SEED};
}
export function scaleBoss(def:BossDef,factor:number):BossDef{return {...def,moves:def.moves.map(m=>({...m,damage:m.damage*factor,chip:m.chip*factor}))};}
export function tuneBoss(def:BossDef):ForgeTuning{
 const before=gateBoss(def);if(before.pass)return {factor:1,def:structuredClone(def),before,after:before};
 let low=Math.max(.2,...def.moves.map(m=>4/m.damage)),high=Math.min(2,...def.moves.map(m=>Math.min(30/m.damage,36/(m.hits*m.damage)))),best:ForgeTuning={factor:1,def,before,after:before},distance=Infinity;
 for(let iteration=0;iteration<8;iteration++){
  const factor=(low+high)/2,candidate=scaleBoss(def,factor),after=gateBoss(candidate),mean=after.table.casual.reduce((a,b)=>a+b,0)/4;
  const score=Math.abs(mean-50)+(after.pass?0:1000);
  if(score<distance){distance=score;best={factor,def:candidate,before,after};}
  if(mean>50)low=factor;else high=factor;
 }
 return best;
}
