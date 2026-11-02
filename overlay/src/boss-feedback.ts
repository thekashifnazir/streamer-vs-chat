import {counterDefence,type BossImpactBatch} from '../../shared/src/boss-impact';
import type {GameState} from '../../shared/src/engine';
import {FEEL} from '../../shared/src/feel';
export type BossImpact={id:string;kind:'counter'|'punch'|'finisher';amount:number;brace:boolean;defence?:'guard'|'lean'};
export function impactStamp(kind:BossImpact['kind'],brace=false):string|null{return kind==='finisher'?'FINISHER!':kind==='counter'?brace?'READ IT!':'COUNTER HIT!':null;}
export function playBossImpactSounds(impacts:readonly BossImpact[],play:()=>void){for(const impact of impacts)if(impact.kind==='punch')play();}
/** Snapshot observer only: exact visible HP loss, never invented nominal overkill. */
export function createBossFeedback(){
 let previous:GameState|undefined,serial=0,lane=0;
 let batch:BossImpactBatch|undefined,receiptSource:string|undefined,lastReceipt=0;
 let active:(BossImpact&{at:number;lane:number})[]=[];
 const present=(impact:BossImpact,now:number)=>{if(!(impact.amount>0))return;active.push({...impact,at:now,lane:lane++%FEEL.bossHit.numberLanes});active=active.slice(-FEEL.bossHit.maxNumbers);};
 return {
  // Future presentation-only finishers can use this without adding combat rules.
  present,
  setReceipts(next:BossImpactBatch,prime=false){batch=next;if(prime||receiptSource!==next.source){receiptSource=next.source;lastReceipt=next.entries.at(-1)?.id??0;active=[];}},
  observe(state:GameState,now:number):BossImpact[]{
   const before=previous;previous=state;
   if(!before||before.match.seed!==state.match.seed||before.round.number!==state.round.number||state.round.elapsed_ms<before.round.elapsed_ms){active=[];lastReceipt=batch?.entries.at(-1)?.id??lastReceipt;return [];}
   if(batch){const impacts=batch.entries.filter(entry=>entry.id>lastReceipt).map(entry=>({id:`${batch!.source}:${entry.id}`,kind:entry.kind,amount:entry.amount,brace:entry.brace,...(entry.defence?{defence:entry.defence}:{})}));lastReceipt=batch.entries.at(-1)?.id??lastReceipt;for(const impact of impacts)present(impact,now);return impacts;}
   let remaining=Math.max(0,before.boss.hp-state.boss.hp);const impacts:BossImpact[]=[];
   for(const result of state.log.resolved.slice(before.log.resolved.length)){
    const amount=Math.min(remaining,result.actual_counter_dmg??result.counter_dmg);
    if(amount>0){const defence=counterDefence(result);impacts.push({id:`counter:${result.round}:${result.beat}:${serial++}`,kind:'counter',amount,brace:!!result.braced,...(defence?{defence}:{})});remaining-=amount;}
   }
   if(remaining>0)impacts.push({id:`punch:${serial++}`,kind:'punch',amount:remaining,brace:false});
   for(const impact of impacts)present(impact,now);return impacts;
  },
  frame(now:number,calm=false){
   active=active.filter(item=>now-item.at<FEEL.bossHit.floatMs);
   const latest=active.at(-1),age=latest?Math.max(0,now-latest.at):Infinity;
   return {numbers:active.map(item=>{const age=Math.max(0,now-item.at);return {...item,text:`−${Number(item.amount.toFixed(8))}`,y:calm?0:-FEEL.bossHit.floatRisePx*age/FEEL.bossHit.floatMs,opacity:Math.min(1,(FEEL.bossHit.floatMs-age)/(calm?FEEL.slam.calmFadeMs:FEEL.bossHit.floatMs))};}),
    knockback:calm?0:age<FEEL.bossHit.knockbackMs?FEEL.bossHit.knockbackPx*(1-age/FEEL.bossHit.knockbackMs):0,
    flash:age<FEEL.bossHit.flashMs?{opacity:1-age/FEEL.bossHit.flashMs,areaPx:FEEL.bossHit.flashWidth*FEEL.bossHit.flashHeight,color:FEEL.bossHit.flashColor}:null};
  },
 };
}

/** The HUD renderer is shared with lightweight DOM tests; only boss-rail children mutate. */
export function renderBossDamageNumbers(container:HTMLElement,nodes:Map<string,HTMLElement>,numbers:ReturnType<ReturnType<typeof createBossFeedback>['frame']>['numbers']){
 const visible=new Set(numbers.map(item=>item.id));
 for(const [id,node]of nodes)if(!visible.has(id)){node.remove();nodes.delete(id);}
 for(const item of numbers){
  let node=nodes.get(item.id);
  if(!node){node=container.ownerDocument.createElement('strong');node.className='boss-damage-number';const value=container.ownerDocument.createElement('span');value.className='boss-damage-value';value.textContent=item.text;node.append(value);node.dataset.kind=item.kind;node.dataset.braced=String(item.brace);const stamp=impactStamp(item.kind,item.brace);if(stamp){const label=container.ownerDocument.createElement('small');label.className='boss-damage-label';label.textContent=stamp;node.append(label);}container.append(node);nodes.set(item.id,node);}
  node.style.left=`clamp(calc(var(--damage-number-box) / 2), calc(50% + ${(item.lane-1)*FEEL.bossHit.numberLanePx}px), calc(100% - var(--damage-number-box) / 2))`;node.style.transform=`translateY(${item.y}px)`;node.style.opacity=String(item.opacity);
 }
}

/** How a landed hit looks on the boss (Kash, 2 Nov: "on the boss is it really visible?"). A punch: a white-yellow flash over the whole
 * sprite, a 22 px shake for 200 ms, a bigger 700 ms PUNCH! pop and the lost HP chunk flashing white before it drains. A defence counter
 * (BLOCK HIT, DODGE HIT) is cyan so it never reads as a punch; a finisher keeps its green. Calm FX: the same flashes and pop, as fades only. */
export const BOSS_HIT_LOOK={punch:{tint:'#fff3b0',opacity:.9,tintMs:180},counter:{tint:'#2ef2ff',opacity:.6,tintMs:160},finisher:{tint:'#73f49b',opacity:.6,tintMs:180},popMs:700,shakePx:22,shakeMs:200,flinchMs:260,barFlashMs:320} as const;
export function bossHitAnimations(kind:BossImpact['kind'],calm:boolean){
 const turn='rotate(-6deg)',px=BOSS_HIT_LOOK.shakePx;
 const pop:Keyframe[]=calm?[{opacity:0},{opacity:1,offset:.1},{opacity:1,offset:.75},{opacity:0}]:[{transform:`scale(.4) ${turn}`,opacity:0},{transform:`scale(1.3) ${turn}`,opacity:1,offset:.12},{transform:`scale(1) ${turn}`,opacity:1,offset:.24},{transform:`scale(1) ${turn}`,opacity:1,offset:.78},{transform:`translateY(-24px) ${turn}`,opacity:0}];
 const shake:Keyframe[]|null=calm?null:kind==='punch'?[{translate:'0 0',rotate:'0deg'},{translate:`${px}px -4px`,rotate:'6deg',offset:.2},{translate:`-${Math.round(px/2)}px 2px`,rotate:'-3deg',offset:.45},{translate:`${Math.round(px/3)}px 0`,rotate:'2deg',offset:.7},{translate:'0 0',rotate:'0deg'}]
  :[{translate:'0 0',rotate:'0deg'},{translate:'22px 0',rotate:'7deg',offset:.3},{translate:'0 0',rotate:'0deg'}];
 const barFlash:Keyframe[]|null=kind==='punch'?[{filter:'brightness(0) invert(1)',boxShadow:'0 0 18px 4px #fff'},{filter:'brightness(0) invert(1)',boxShadow:'0 0 18px 4px #fff',offset:.6},{filter:'none',boxShadow:'none'}]:null;
 return {pop,popMs:BOSS_HIT_LOOK.popMs,shake,shakeMs:kind==='punch'?BOSS_HIT_LOOK.shakeMs:BOSS_HIT_LOOK.flinchMs,barFlash,tint:BOSS_HIT_LOOK[kind]};
}
