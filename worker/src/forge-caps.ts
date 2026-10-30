export class ForgeLimitError extends Error {constructor(readonly reason:'daily-cap'|'invalid-repair'|'generation-busy'){super(reason);}}
export interface CapStorage {transaction<T>(work:(storage:{get<T>(key:string):Promise<T|undefined>;put<T>(key:string,value:T):Promise<unknown>})=>Promise<T>):Promise<T>}
interface CapState {day:string;channel:string;generations:number;moderations:number;activeUntil:number;activeLease:string;leaseCounter:number;receipts:{digest:string;used:boolean}[]}
export class ForgeCaps {
 constructor(private storage:CapStorage,private now:()=>number){}
 private async edit<T>(channel:string,work:(state:CapState)=>T):Promise<T>{return this.storage.transaction(async storage=>{
  if(channel!=='forge-global'&&!/^[0-9]{1,30}$/.test(channel))throw new Error('invalid-channel');
  const day=new Date(this.now()).toISOString().slice(0,10);let state=await storage.get<CapState>('forge-caps');
  if(state&&state.channel!==channel)throw new Error('channel-mismatch');
  if(!state||state.day!==day)state={day,channel,generations:0,moderations:0,activeUntil:0,activeLease:'',leaseCounter:0,receipts:[]};
  const result=work(state);await storage.put('forge-caps',state);return result;
 });}
 reserveModeration(channel:string){return this.edit(channel,state=>{if(state.moderations>=200)throw new ForgeLimitError('daily-cap');state.moderations++;});}
 reserveGlobal(){return this.edit('forge-global',state=>{if(state.generations>=100)throw new ForgeLimitError('daily-cap');state.generations++;});}
 reserveInitial(channel:string){return this.edit(channel,state=>{
  if(state.activeUntil>this.now())throw new ForgeLimitError('generation-busy');
  if(state.generations>=5)throw new ForgeLimitError('daily-cap');state.generations++;state.activeUntil=this.now()+60000;
  state.activeLease=`${state.day}:initial:${state.generations}:${++state.leaseCounter}`;return {day:state.day,lease:state.activeLease};
 });}
 reserveRepair(channel:string,digest:string){return this.edit(channel,state=>{
  if(state.activeUntil>this.now())throw new ForgeLimitError('generation-busy');
  const receipt=state.receipts.find(item=>item.digest===digest&&!item.used);if(!receipt)throw new ForgeLimitError('invalid-repair');receipt.used=true;state.activeUntil=this.now()+60000;state.activeLease=`${state.day}:repair:${digest}:${++state.leaseCounter}`;return {day:state.day,lease:state.activeLease};
 });}
 finish(channel:string,reservation:{day:string;lease:string},digest?:string){return this.edit(channel,state=>{if(state.day!==reservation.day||state.activeLease!==reservation.lease)return;state.activeUntil=0;state.activeLease='';if(digest)state.receipts.push({digest,used:false});state.receipts=state.receipts.slice(-5);});}
}
export async function repairDigest(idea:string,previous:string):Promise<string>{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([idea,previous])));return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('');}
