import type {GameState,Outcome} from '../../shared/src/engine';
import type {Move} from '../../shared/src/index';
import {FEEL} from '../../shared/src/feel';
export type FxRail='streamer'|'boss';
export type FxCue={id:string;kind:'hit'|'block'|'perfect'|'dodge'|'counter'|'ko'|'chip';rail:FxRail;move?:Move;at:number;observedAt:number;hitstopMs:number;trauma:number;flash:{areaPx:number;color:string}|null};
export type RailFx={x:number;y:number;rotation:number;trauma:number;animationTime:number;trail:boolean;flash:{areaPx:number;color:string;opacity:number}|null};
export type FxFrame={streamer:RailFx;boss:RailFx;hitstop:boolean;slowMo:boolean;calm:boolean;slam:{kind:'scale'|'fade';durationMs:number}};
/** Seeded one-dimensional gradient Perlin noise, bounded[-1,1], continuous at grid edges. */
export function perlin(t:number,seed=1):number{
 const floor=Math.floor(t),fraction=t-floor;
 const gradient=(index:number)=>{let value=Math.imul(index^seed,0x45d9f3b);value^=value>>>16;return value&1?1:-1;};
 const a=gradient(floor)*fraction,b=gradient(floor+1)*(fraction-1),fade=fraction**3*(fraction*(fraction*6-15)+10);
 return 2*(a+(b-a)*fade);
}
/** Pure presentation scheduler: realNow is supplied, never a game-time mutation.
 * The first snapshot establishes a baseline; reconnects do not replay old impacts.
 */
export function createFxScheduler(options:{calm?:boolean;seed?:number}={}){
 let calm=!!options.calm,paused=false,wall:number|undefined,clock=0,koFreeze=0,koSlow=0,previous:GameState|undefined;
 const rails={streamer:{trauma:0,stop:0,animation:0,trail:0,flash:0},boss:{trauma:0,stop:0,animation:0,trail:0,flash:0}};
 const seen=new Set<string>(),comboFirst=new Map<string,number>();
 function advance(realNow:number){
  if(!Number.isFinite(realNow))throw new Error('FX time must be finite');
  if(wall!==undefined&&realNow<wall)throw new Error('FX time must be monotonic');
  const elapsed=wall===undefined||paused?0:realNow-wall;wall=realNow;
  const end=clock+elapsed;
  for(const rail of Object.values(rails)){
   const boundaries=[clock,end,rail.stop,koFreeze,koSlow].filter(at=>at>=clock&&at<=end).sort((a,b)=>a-b);
   for(let i=1;i<boundaries.length;i++){
    const from=boundaries[i-1]!,to=boundaries[i]!,mid=(from+to)/2;
    rail.animation+=(to-from)*(mid<Math.max(rail.stop,koFreeze)?0:mid<koSlow?FEEL.ko.slowSpeed:1);
   }
   rail.trauma=calm?0:Math.max(0,rail.trauma-elapsed/1000*FEEL.shake.decayPerSecond);
  }
  clock=end;
 }
 function apply(cue:FxCue){
  // Hit-stop freezes presentation clocks together so the attacking boss visibly
  // holds on impact. Only the damaged rail receives trauma, trail and glow.
  const rail=rails[cue.rail];for(const target of Object.values(rails))target.stop=Math.max(target.stop,clock+cue.hitstopMs);
  rail.trauma=calm?0:Math.min(1,rail.trauma+cue.trauma);
  if(cue.flash)rail.flash=clock+FEEL.flash.durationMs;
  if(cue.kind==='ko'){koFreeze=clock+FEEL.hitstop.KO;koSlow=koFreeze+FEEL.ko.slowDurationMs;}
 }
 function resetHistory(state:GameState){seen.clear();comboFirst.clear();for(const rail of Object.values(rails)){rail.trauma=0;rail.stop=clock;rail.trail=0;rail.flash=0;}koFreeze=koSlow=clock;}
 return {
  setCalm(value:boolean){calm=value;if(calm)for(const rail of Object.values(rails))rail.trauma=0;},
  observe(state:GameState,realNow:number):FxCue[]{
   advance(realNow);
   if(!previous||state.match.seed!==previous.match.seed||state.round.number<previous.round.number||state.log.rounds.length<previous.log.rounds.length||(state.round.number===previous.round.number&&state.round.elapsed_ms<previous.round.elapsed_ms)){resetHistory(state);previous=state;paused=state.paused;return [];}
   const cues:FxCue[]=[];
   const emit=(id:string,kind:FxCue['kind'],rail:FxRail,at:number,hitstopMs:number,trauma:number,move?:Move)=>{
    if(seen.has(id))return;seen.add(id);
    const cue:FxCue={id,kind,rail,at,observedAt:realNow,hitstopMs,trauma:calm?0:trauma,...(move?{move}:{}),flash:kind==='hit'||kind==='counter'||kind==='ko'?{areaPx:FEEL.flash.areaPx,color:FEEL.flash.color}:null};
    cues.push(cue);apply(cue);
   };
   const impact=(key:string,move:Move,at:number)=>emit(key,'hit','streamer',at,FEEL.hitstop[move],FEEL.trauma[move],move);
   const active=state.activeAttack;
   if(active?.move==='COMBO'&&active.combo_hit){
    const key=`${active.round}:${active.beat}`,damage=active.damage??0;comboFirst.set(key,damage);if(damage>0)impact(`${key}:first`,'COMBO',active.lands_at);
   }
   for(const step of state.log.superSteps.slice(previous.log.superSteps.length)){
    const key=`${step.round}:${step.beat}:super:${step.index}`;
    if(step.outcome==='HIT')impact(key,'SUPER',step.at);
    else emit(key,step.outcome==='CHIP'?'chip':step.outcome==='BLOCK'?'block':'dodge','streamer',step.at,step.outcome==='CHIP'?0:FEEL.hitstop[step.outcome==='BLOCK'?'BLOCK':'DODGE'],0,'SUPER');
   }
   const oldCount=previous.log.resolved.length;
   for(const result of state.log.resolved.slice(oldCount)){
    const key=`${result.round}:${result.beat}`;
    if(result.super_steps){if(result.counter_dmg>0)emit(`${key}:counter`,'counter','boss',result.at,FEEL.hitstop.counter,FEEL.trauma.counter,result.move);continue;}
    if(result.outcome==='HIT'){
     if(result.move==='COMBO'){
      const attack=state.log.telegraphs.find(item=>item.round===result.round&&item.beat===result.beat);
      const firstAt=attack?.lands_at??result.at;
      const first=comboFirst.get(key);
      if(first!==undefined){if(result.dmg-first>0)impact(`${key}:second`,'COMBO',result.at);}
      else if(result.at===firstAt)impact(`${key}:first`,'COMBO',firstAt);
      else if(result.dmg>7){impact(`${key}:first`,'COMBO',firstAt);impact(`${key}:second`,'COMBO',result.at);}
      // Without a partial snapshot, a7-damage COMBO cannot reveal which hit
      // landed (a dropped/re-raised guard is ambiguous). Never invent its timestamp.
      else impact(`${key}:impact`,'COMBO',result.at);
     }else impact(`${key}:hit`,result.move,result.at);
    }else{
     const kinds:Record<Exclude<Outcome,'HIT'>,FxCue['kind']>={BLOCK:'block',PERFECT:'perfect',DODGE:'dodge',CHIP:'chip'};
     emit(`${key}:defence`,kinds[result.outcome],'streamer',result.at,result.outcome==='CHIP'?0:FEEL.hitstop[result.outcome],0,result.move);
    }
    if(result.counter_dmg>0)emit(`${key}:counter`,'counter','boss',result.at,FEEL.hitstop.counter,FEEL.trauma.counter,result.move);
   }
   for(const result of state.log.rounds.slice(previous.log.rounds.length))if(result.reason==='ko')emit(`${result.number}:ko`,'ko',result.winner==='streamer'?'boss':'streamer',result.at,FEEL.hitstop.KO,FEEL.trauma.KO);
   for(const name of ['streamer','boss'] as const)if(state[name].hp<previous[name].hp)rails[name].trail=clock+(name==='boss'?FEEL.bossHit.trailDelayMs:FEEL.trail.delayMs);
   previous=state;paused=state.paused;return cues;
  },
  update(realNow:number):FxFrame{
   advance(realNow);
   const frame=(name:FxRail,seed:number):RailFx=>{
    const rail=rails[name],shake=rail.trauma**2,t=clock/1000*FEEL.shake.frequencyHz;
    return {x:calm||shake===0?0:FEEL.shake.offsetPx*shake*perlin(t,seed),y:calm||shake===0?0:FEEL.shake.offsetPx*shake*perlin(t,seed+1),rotation:calm||shake===0?0:FEEL.shake.rotationDeg*shake*perlin(t,seed+2),trauma:rail.trauma,animationTime:rail.animation,trail:clock<rail.trail,
     flash:clock<rail.flash?{areaPx:FEEL.flash.areaPx,color:FEEL.flash.color,opacity:(rail.flash-clock)/FEEL.flash.durationMs}:null};
   };
   return {streamer:frame('streamer',options.seed??1),boss:frame('boss',(options.seed??1)+99),hitstop:clock<Math.max(rails.streamer.stop,rails.boss.stop,koFreeze),slowMo:clock>=koFreeze&&clock<koSlow,calm,slam:{kind:calm?'fade':'scale',durationMs:calm?FEEL.slam.calmFadeMs:FEEL.slam.durationMs}};
  },
 };
}
