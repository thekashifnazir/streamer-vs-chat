import {tempoFor,scaleTelegraph,type Difficulty} from './tempo.js';
import {defenceReadProbability} from './sim-model.js';
import {DEFAULT_BOSS,isDefaultBoss,validateBoss,type BossDef} from './boss-def.js';
import {MOVES,type Move} from './index.js';
import {createGame,drawMove,mulberry32,FOCUS_RULES,type Outcome} from './engine.js';
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
const STRIDE=8;
const SUPER_DEFENCES=['guard','lean_left','lean_right'] as const;
const plans=new Map<string,Uint8Array[]>();
function planBeats(def:BossDef,difficulty:Difficulty){const timing=tempoFor(difficulty),lastDuration=isDefaultBoss(def)?2*timing.telegraph+2*Math.round(600*timing.tempo):Math.max(...def.moves.map(move=>scaleTelegraph(move.telegraph_ms,difficulty)+(move.hits-1)*timing.comboGap));return Math.floor((75000-1-lastDuration)/timing.beat);}
/** Compile damage-independent R1 inputs once. No scouting card can exist in R1.
 * Same §5 personas/read/perfect/chip/punch probabilities, seeded per cell. The
 * compact evaluator uses the reducer's damage/counter arithmetic, including
 * per-hit mercy, lethal hits and percentage timeout decisions. */
function compile(def:BossDef,difficulty:Difficulty='hard'):Uint8Array[]{
 const beats=planBeats(def,difficulty);
 const canonical=isDefaultBoss(def);
 const key=JSON.stringify([difficulty,canonical,def.moves.map(m=>[m.defence,m.telegraph_ms,m.hits])]);
 const cached=plans.get(key);if(cached)return cached;
 const result:Uint8Array[]=[];
 for(let player=0;player<2;player++)for(let column=0;column<4;column++){
  const viewers=[0,3,50,500][column]!,data=new Uint8Array(FORGE_ROUNDS*beats*STRIDE);
  for(let sample=0;sample<FORGE_ROUNDS;sample++){
   const seed=FORGE_SEED+player*1_000_000+column*100_000+sample,random=mulberry32(seed^0xA53140F9),draw=mulberry32(seed+1),finishRandom=mulberry32(seed^0x5A849D31),crowd=createCrowd(viewers,seed^0x7A917D21);
   const personas=crowd.personas.reduce((a,p)=>{a[p]++;return a;},{spammer:0,tactician:0,chaos:0,hype:0,lurker:0});let hype=0,supers=0,history:Move[]=[],occupiedUntil=0;const available=canonical?MOVES:MOVES.slice(0,def.moves.length);const base=canonical?MOVES.slice(0,4):available;
   for(let beat=0;beat<beats;beat++){
    const counts={JAB:personas.spammer,HOOK_L:0,HOOK_R:0,COMBO:0,SUPER:0};let randomVoters=personas.tactician;
    for(let i=0;i<personas.chaos;i++)if(crowd.random()<.7)randomVoters++;
    for(let i=0;i<personas.lurker;i++)if(crowd.random()<.15)randomVoters++;
    if(canonical&&hype===100&&supers<3)counts.SUPER+=personas.hype;else randomVoters+=personas.hype;
    let remaining=randomVoters;
    if(base.length===4)while(remaining>=16){const bits=(crowd.random()*4294967296)>>>0,low=bits&0x55555555,high=(bits>>>1)&0x55555555;counts[base[0]!]+=popcount(~(low|high)&0x55555555);counts[base[1]!]+=popcount(low&~high);counts[base[2]!]+=popcount(~low&high);counts[base[3]!]+=popcount(low&high);remaining-=16;}
    for(let i=0;i<remaining;i++)counts[base[Math.floor(crowd.random()*base.length)]!]++;
    const voters=personas.spammer+randomVoters+(canonical?counts.SUPER:0);
    const offset=(sample*beats+beat)*STRIDE,drawAt=(beat+1)*tempoFor(difficulty).beat;
    if(drawAt<occupiedUntil){data[offset]=255;continue;}
    const move=drawMove(counts,history,draw,available,!canonical),index=MOVES.indexOf(move),spec=def.moves[index]!;
    history.push(move);
    hype=Math.min(100,hype+12*Math.log2(1+voters)/Math.max(1,Math.log2(1+viewers)/3)+(viewers===0?6:0));
    if(canonical&&move==='SUPER'){hype=0;supers++;}
    let outcome:Outcome;
    if(canonical&&move==='SUPER'){
     let last=-1;const order:Record<Outcome,number>={HIT:4,CHIP:3,BLOCK:2,PERFECT:2,DODGE:1};outcome='DODGE';
     for(let step=0;step<3;step++){
      const choices=[0,1,2].filter(i=>i!==last);last=choices[Math.floor(draw()*choices.length)]!;
      const read=random()<defenceReadProbability(.55,2*scaleTelegraph(spec.telegraph_ms,difficulty));
      const result:Outcome=read?(last===0?'BLOCK':'DODGE'):(last!==0&&random()<.3?'CHIP':'HIT');
      data[offset+5+step]=last*5+OUTCOMES.indexOf(result);
      if(order[result]>order[outcome])outcome=result;
     }
     occupiedUntil=drawAt+2*scaleTelegraph(spec.telegraph_ms,difficulty)+2*Math.round(600*tempoFor(difficulty).tempo);
    }else{
     const read=random()<defenceReadProbability(.55,scaleTelegraph(spec.telegraph_ms,difficulty));
     outcome=read?(spec.defence==='guard'?(random()<.15?'PERFECT':'BLOCK'):'DODGE'):(spec.defence!=='guard'&&random()<.3?'CHIP':'HIT');
     data.fill(255,offset+5,offset+8);
    }
    let punches=0;
    if(player===0&&counterDamage(outcome)>0)punches=Math.min(2,Math.max(0,Math.round(.6+random()-.5)));
    const stray=player===0&&random()<.25;
    data[offset]=index;data[offset+1]=OUTCOMES.indexOf(outcome);data[offset+2]=punches;data[offset+3]=Number(stray);data[offset+4]=Number(finishRandom()<.55);
   }
  }
  result.push(data);
 }
 // Bounded by boss shape; a paste cannot grow this cache without limit.
 if(plans.size>=3)plans.delete(plans.keys().next().value!);
 plans.set(key,result);return result;
}
export type ForgePlanBeat={move:Move;outcome:Outcome;punches:number;stray:boolean;skip?:boolean;finisher?:boolean;superSteps?:{defence:typeof SUPER_DEFENCES[number];outcome:Outcome}[]};
function decode(data:Uint8Array,offset:number):ForgePlanBeat{
 if(data[offset]===255)return {move:'JAB',outcome:'HIT',punches:0,stray:false,skip:true};
 const superSteps=data[offset+5]===255?undefined:Array.from({length:3},(_,i)=>{const value=data[offset+5+i]!;return {defence:SUPER_DEFENCES[Math.floor(value/5)]!,outcome:OUTCOMES[value%5]!};});
 return {move:MOVES[data[offset]!]!,outcome:OUTCOMES[data[offset+1]!]!,punches:data[offset+2]!,stray:!!data[offset+3],finisher:!!data[offset+4],...(superSteps?{superSteps}:{})};
}
/** Exposed for reducer-equivalence regressions; never a source of live inputs. */
export function forgePlan(def:BossDef,player:0|1,column:number,sample:number,difficulty:Difficulty='hard'):ForgePlanBeat[]{
 const beats=planBeats(def,difficulty);
 if(!Number.isInteger(column)||column<0||column>3||!Number.isInteger(sample)||sample<0||sample>=FORGE_ROUNDS)throw new Error('Invalid sample');
 const data=compile(def,difficulty)[player*4+column]!;
 return Array.from({length:beats},(_,beat)=>decode(data,(sample*beats+beat)*STRIDE));
}
type Scheduled={at:number;order:number;code:number};
type Projection={times:Uint32Array;codes:Uint16Array;offsets:Uint32Array};
const projections=new WeakMap<Uint8Array,Projection>();
/** Codes keep the damage-independent chronology reusable during all eight tuning
 * steps. Only stored damage/chip and HP are read from the candidate definition. */
function schedule(def:BossDef,plan:readonly ForgePlanBeat[],difficulty:Difficulty):Scheduled[]{
 const timing=tempoFor(difficulty),events:Scheduled[]=[],canonical=isDefaultBoss(def);
 const add=(at:number,order:number,code:number)=>events.push({at,order,code});
 const resolve=(at:number,index:number,damageKind:number,outcome:Outcome|undefined,focusStep=false)=>add(at,0,4|((outcome===undefined?7:OUTCOMES.indexOf(outcome))<<4)|(damageKind<<7)|(index<<10)|(Number(focusStep)<<13));
 for(let beat=0;beat<plan.length;beat++){
  const item=plan[beat]!;if(item.skip)continue;
  const slot=MOVES.indexOf(item.move),spec=def.moves[slot]!,draw=(beat+1)*timing.beat,isSuper=canonical&&item.move==='SUPER';
  const landing=draw+scaleTelegraph(spec.telegraph_ms,difficulty)*(isSuper?2:1),gap=isSuper?Math.round(600*timing.tempo):timing.comboGap,end=landing+(isSuper?2:spec.hits-1)*gap;
  if(end>=75000)continue;
  add(draw,1,1);add(draw+1,2,2);
  if(isSuper&&item.superSteps){
   item.superSteps.forEach((part,index)=>{
    const at=landing+index*gap;
    add(Math.max(index?landing+(index-1)*gap+1:draw+2,at-500),2,part.outcome==='BLOCK'||part.outcome==='CHIP'?3:2);
    resolve(at,index,part.outcome==='HIT'?3:part.outcome==='CHIP'?4:0,part.outcome,true);
   });
  }else{
   add(landing-(item.outcome==='PERFECT'?300:500),2,item.outcome==='BLOCK'||item.outcome==='PERFECT'||item.outcome==='CHIP'?3:2);
   for(let hit=0;hit<spec.hits;hit++)resolve(landing+hit*gap,slot,item.outcome==='HIT'?1:item.outcome==='CHIP'?2:0,hit===spec.hits-1?item.outcome:undefined);
  }
  add(end,1,5|(OUTCOMES.indexOf(item.outcome)<<4)|(Number(!!item.finisher)<<7));
  for(let punch=0;punch<item.punches;punch++)add(end+100+punch*450,2,6);
  if(item.stray)add(end+1100,2,6);
 }
 return events.sort((a,b)=>a.at-b.at||a.order-b.order);
}
function packed(events:Scheduled[]):Projection{return {times:Uint32Array.from(events,event=>event.at),codes:Uint16Array.from(events,event=>event.code),offsets:Uint32Array.of(0,events.length)};}
function projectCell(def:BossDef,data:Uint8Array,difficulty:Difficulty,beats:number):Projection{
 const cached=projections.get(data);if(cached)return cached;
 // Bounded scratch capacity; packed output retains only populated cells.
 const capacity=FORGE_ROUNDS*beats*12,times=new Uint32Array(capacity),codes=new Uint16Array(capacity),offsets=new Uint32Array(FORGE_ROUNDS+1);let cursor=0;
 for(let sample=0;sample<FORGE_ROUNDS;sample++){
  const plan=Array.from({length:beats},(_,beat)=>decode(data,(sample*beats+beat)*STRIDE));
  for(const event of schedule(def,plan,difficulty)){times[cursor]=event.at;codes[cursor++]=event.code;}
  offsets[sample+1]=cursor;
 }
 const result={times:times.slice(0,cursor),codes:codes.slice(0,cursor),offsets};projections.set(data,result);return result;
}
/** Pure fast projection of the same scheduled reads, damage, focus and guarded
 * gaps. All timestamps are ordered, including occupied SUPER beats and expiry. */
function evaluateProjection(def:BossDef,projection:Projection,sample:number){
 const {times,codes,offsets}=projection;
 let hp=100,boss=def.hp,focus=0,focusReadyAt=Infinity,used=0,finisherUntil=-Infinity,counterUntil=-Infinity,lastPunch=-Infinity,guard=false,guardAt=-Infinity,active=false;
 const fire=(at:number)=>{if(focus===100&&used<FOCUS_RULES.maxFinishers&&!active&&guard&&at-guardAt>=FOCUS_RULES.hold){boss=Math.max(0,boss-FOCUS_RULES.finisherDamage);focus=0;used++;finisherUntil=at+FOCUS_RULES.window;}};
 for(let cursor=offsets[sample]!;cursor<offsets[sample+1]!&&hp>0&&boss>0;cursor++){
  const at=times[cursor]!,code=codes[cursor]!,kind=code&15;
  const due=focus===100&&used<FOCUS_RULES.maxFinishers&&!active&&guard?Math.max(guardAt+FOCUS_RULES.hold,focusReadyAt):Infinity;
  if(due<=at&&due<75000)fire(due);
  if(at>=75000||hp<=0||boss<=0)break;
  if(kind===1)active=true;
  if(kind===2||kind===3){const held=kind===3;if(held&&!guard)guardAt=at;guard=held;}
  if(kind===4){
   const outcome=(code>>>4)&7,damageKind=(code>>>7)&7,index=(code>>>10)&7,focusStep=!!(code&8192),previousFocus=focus;
   const damage=damageKind===1?def.moves[index]!.damage:damageKind===2?def.moves[index]!.chip:damageKind===3?[8,8,9][index]!:damageKind===4?[3,3,4][index]!:0;
   hp=Math.max(0,hp-hitDamage(hp,damage));
   if(outcome===0)focus=Math.max(0,focus-FOCUS_RULES.hitLoss);
   else if(focusStep&&(outcome===1||outcome===3))focus=Math.min(100,focus+FOCUS_RULES.superStep);
   else if(!focusStep)focus=Math.min(100,focus+(outcome===2?FOCUS_RULES.perfect:outcome===1||outcome===3?FOCUS_RULES.clean:0));
   if(previousFocus<100&&focus===100)focusReadyAt=at;
  }
  if(kind===5){
   const counter=counterDamage(OUTCOMES[(code>>>4)&7]!);boss=Math.max(0,boss-counter);if(counter>0)counterUntil=at+700;active=false;fire(at);
   if((code&128)&&focus===100&&used<FOCUS_RULES.maxFinishers){if(!guard){guard=true;guardAt=at;}}
   else if(focus===100&&used<FOCUS_RULES.maxFinishers)guard=false;
  }
  if(kind===6&&at-lastPunch>=450){lastPunch=at;boss=Math.max(0,boss-(at<counterUntil?1.5:1)*(at<finisherUntil?2:1));}
  fire(at);
 }
 if(hp>0&&boss>0&&focus===100&&used<FOCUS_RULES.maxFinishers&&!active&&guard&&guardAt+FOCUS_RULES.hold<75000)fire(Math.max(guardAt+FOCUS_RULES.hold,focusReadyAt));
 return {hp,bossHp:boss,winner:hp>0&&(boss<=0||hp/100>=boss/def.hp)?'streamer':'boss'} as const;
}
export function evaluateForgePlan(def:BossDef,plan:readonly ForgePlanBeat[],difficulty:Difficulty='hard'){return evaluateProjection(def,packed(schedule(def,plan,difficulty)),0);}
export function gateBoss(def:BossDef,difficulty:Difficulty='hard'):ForgeGate{
 const beats=planBeats(def,difficulty),errors=validateBoss(def,[],{allowDefault:true});
 if(errors.length)throw new Error(`Invalid BossDef: ${errors.join('; ')}`);
 const compiled=compile(def,difficulty),table:ForgeGate['table']={casual:[],nopunch:[]};
 for(let player=0;player<2;player++)for(let column=0;column<4;column++){
  const data=compiled[player*4+column]!,projection=projectCell(def,data,difficulty,beats);let wins=0;
  for(let sample=0;sample<FORGE_ROUNDS;sample++){
   if(evaluateProjection(def,projection,sample).winner==='streamer')wins++;
  }
  table[player===0?'casual':'nopunch'].push(wins/FORGE_ROUNDS*100);
 }
 return {pass:table.casual.every(p=>p>=30&&p<=70)&&table.nopunch.every(p=>p>=30),viewers:[0,3,50,500],table,rounds:FORGE_ROUNDS,seed:FORGE_SEED};
}
export function scaleBoss(def:BossDef,factor:number):BossDef{return {...def,moves:def.moves.map(m=>({...m,damage:m.damage*factor,chip:m.chip*factor}))};}
export function tuneBoss(def:BossDef,difficulty:Difficulty='hard'):ForgeTuning{
 const before=gateBoss(def,difficulty);if(before.pass)return {factor:1,def:structuredClone(def),before,after:before};
 let low=Math.max(.2,...def.moves.map(m=>4/m.damage)),high=Math.min(2,...def.moves.map(m=>Math.min(30/m.damage,36/(m.hits*m.damage)))),best:ForgeTuning={factor:1,def,before,after:before},distance=Infinity;
 for(let iteration=0;iteration<8;iteration++){
  const factor=(low+high)/2,candidate=scaleBoss(def,factor),after=gateBoss(candidate,difficulty),mean=after.table.casual.reduce((a,b)=>a+b,0)/4;
  const score=Math.abs(mean-50)+(after.pass?0:1000);
  if(score<distance){distance=score;best={factor,def:candidate,before,after};}
  if(mean>50)low=factor;else high=factor;
 }
 return best;
}
