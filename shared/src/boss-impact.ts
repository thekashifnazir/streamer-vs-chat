import type {GameState} from './engine';
/** Bounded presentation receipts, outside combat state; no identities or chat text. */
export type BossImpactReceipt={id:number;kind:'counter'|'punch';amount:number;brace:boolean;round:number;at:number};
export type BossImpactBatch={source:string;entries:BossImpactReceipt[]};
export function createBossImpactLedger(source:string){
 let sequence=0;const entries:BossImpactReceipt[]=[];
 const add=(entry:Omit<BossImpactReceipt,'id'>)=>{entries.push({id:++sequence,...entry});while(entries.length>48)entries.shift();};
 return {
  observe(before:GameState,after:GameState){
   if(before.match.seed!==after.match.seed||before.round.number!==after.round.number||after.round.elapsed_ms<before.round.elapsed_ms)return;
   let remaining=Math.max(0,before.boss.hp-after.boss.hp);
   for(const result of after.log.resolved.slice(before.log.resolved.length)){
    const amount=Math.min(remaining,result.actual_counter_dmg??result.counter_dmg);
    if(amount>0){add({kind:'counter',amount,brace:!!result.braced,round:after.round.number,at:result.at});remaining-=amount;}
   }
   if(remaining>0&&after.input.last_punch_at>before.input.last_punch_at)add({kind:'punch',amount:remaining,brace:false,round:after.round.number,at:after.input.last_punch_at});
  },
  snapshot():BossImpactBatch{return {source,entries:entries.map(entry=>({...entry}))};},
 };
}
