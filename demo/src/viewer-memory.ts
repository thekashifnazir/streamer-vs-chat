import {ViewerMemory,emptyViewerMemory,validateViewerMemory,type ViewerMemoryData,type ViewerMemoryView} from '../../shared/src/viewer-memory';
import type {GameState} from '../../shared/src/engine';
import type {ChatVote} from '../../shared/src/index';
import {hasLiveCredentials} from './credentials';
export const DEMO_MEMORY_DB='streamer-vs-chat-simulated-viewer-memory-v1';
const CHANNEL='simulated-offline-channel',KEY='simulated-streams';
const names=['PixelMoth','LunarToast','GuardGoblin','VelvetCrab'];
const simulatedId=(id:string)=>/^sim-[1-9]\d{0,5}$/.test(id);
const displayName=(id:string)=>names[Number(id.slice(4))-1]??`Demo Viewer ${id.slice(4)}`;
export function seedDemoMemory(at:number):ViewerMemoryData{
 const book=new ViewerMemory(emptyViewerMemory());
 for(let stream=1;stream<=3;stream++){
  const time=at-(4-stream)*86400000,session=`simulated-history-${stream}`;
  for(let i=1;i<=4;i++)book.countedVote({channelId:CHANNEL,userId:`sim-${i}`,displayName:displayName(`sim-${i}`),serverSessionId:session,beatId:'1:0',move:i===1?'HOOK_L':'JAB'},time);
  book.completedRound({channelId:CHANNEL,serverSessionId:session,roundId:'1',winner:stream===3?'streamer':'boss',reason:'ko',koMove:'HOOK_L',koSupporters:[{id:'sim-1'}]},time);
  book.finalizeSession({channelId:CHANNEL,serverSessionId:session,mvpId:'sim-1'});
 }
 return book.data;
}
export type DemoMemoryStore={loadOrSeed:(seed:ViewerMemoryData)=>Promise<ViewerMemoryData>;save:(value:ViewerMemoryData)=>Promise<void>;close:()=>void};
/** The sole persistent browser store is dedicated to made-up, simulated identities. */
export function indexedDemoMemoryStore(factory:IDBFactory):DemoMemoryStore{
 let db:IDBDatabase|undefined,closed=false;
 const opened=new Promise<IDBDatabase>((resolve,reject)=>{
  const request=factory.open(DEMO_MEMORY_DB,1);let settled=false;
  const timer=setTimeout(()=>{settled=true;reject(new Error('Demo memory unavailable'));},1000);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('streams'))request.result.createObjectStore('streams');};
  request.onsuccess=()=>{clearTimeout(timer);if(settled||closed){request.result.close();if(!settled)reject(new Error('Demo memory closed'));return;}settled=true;db=request.result;db.onversionchange=()=>db?.close();resolve(db);};
  request.onerror=()=>{clearTimeout(timer);settled=true;reject(new Error('Demo memory unavailable'));};
 });
 async function transaction(seed:ViewerMemoryData|undefined,value?:ViewerMemoryData){
  const database=await opened;if(closed)throw new Error('Demo memory closed');
  return await new Promise<ViewerMemoryData>((resolve,reject)=>{
   const tx=database.transaction('streams','readwrite'),store=tx.objectStore('streams');let result=value;
   const timer=setTimeout(()=>{try{tx.abort();}catch{}reject(new Error('Demo memory transaction timed out'));},1000);
   tx.oncomplete=()=>{clearTimeout(timer);resolve(result!);};tx.onerror=tx.onabort=()=>{clearTimeout(timer);reject(new Error('Demo memory transaction failed'));};
   if(value)store.put(value,KEY);
   else{const request=store.get(KEY);request.onsuccess=()=>{result=request.result??seed!;if(request.result===undefined)store.put(seed!,KEY);};}
  });
 }
 return{loadOrSeed:seed=>transaction(seed),save:async value=>{await transaction(undefined,value);},close:()=>{closed=true;db?.close();}};
}
export class DemoViewerMemory{
 private book:ViewerMemory;private loading=true;private pending:((book:ViewerMemory)=>void)[]=[];private closed=false;private closing=false;private closeTask:Promise<void>|undefined;private saveTimer:ReturnType<typeof setTimeout>|undefined;
 private matchSeed:number|null=null;private roundCursor=0;private damageCursor=0;private observedCombat=false;private credit=new Map<string,number>();
 readonly ready:Promise<void>;
 constructor(private options:{now:()=>number;sessionId:string;store?:DemoMemoryStore;onChange?:()=>void}){
  const seed=seedDemoMemory(options.now());this.book=new ViewerMemory(seed);
  this.ready=(options.store?options.store.loadOrSeed(structuredClone(seed)):Promise.resolve(seed)).then(data=>{
   if(this.closed||hasLiveCredentials())return;const validated=validateViewerMemory(data,options.now());if(Object.entries(validated.channels).some(([channel,value])=>channel!==CHANNEL||Object.keys(value.viewers).some(id=>!simulatedId(id))||value.optOut.some(id=>!simulatedId(id))))throw new Error('Non-simulated demo memory');const restored=new ViewerMemory(validated);for(const operation of this.pending)operation(restored);this.book=restored;
  }).catch(()=>{options.store?.close();options.store=undefined;/* Leave unavailable/corrupt storage untouched; keep the seeded in-memory experience. */}).finally(()=>{this.loading=false;this.pending=[];if(!this.closed&&!this.closing){this.persist();options.onChange?.();}});
 }
 private allowed(){return !this.closed&&!this.closing&&!hasLiveCredentials();}
 private change(operation:(book:ViewerMemory)=>void){if(!this.allowed())return;operation(this.book);if(this.loading)this.pending.push(operation);else this.persist();}
 private persist(){if(!this.allowed()||this.loading||!this.options.store)return;clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>{if(this.allowed())void this.options.store!.save(structuredClone(this.book.data)).catch(()=>{});},100);}
 votes(votes:readonly ChatVote[],state:GameState){const at=this.options.now(),beatId=`${state.match.seed}:${state.round.number}:${state.clock.beat}`;for(const vote of votes){if(!vote.simulated||!simulatedId(vote.user)||state.votes[vote.user]!==vote.move)continue;this.change(book=>book.countedVote({channelId:CHANNEL,userId:vote.user,displayName:displayName(vote.user),serverSessionId:this.options.sessionId,beatId,move:vote.move},at));}}
 observe(state:GameState){if(!this.allowed())return;const at=this.options.now();
  if(this.matchSeed!==state.match.seed){this.matchSeed=state.match.seed;this.roundCursor=0;this.damageCursor=0;}
  this.observedCombat ||=state.log.resolved.length>0;
  for(const hit of state.log.damage.slice(this.damageCursor)){const supporters=[...new Set(hit.supporters.filter(simulatedId))];if(supporters.length)for(const user of supporters)this.credit.set(user,(this.credit.get(user)??0)+hit.damage/supporters.length);}this.damageCursor=state.log.damage.length;
  for(const round of state.log.rounds.slice(this.roundCursor)){const roundId=`${state.match.seed}:${round.number}`;
   const hit=round.winner==='boss'&&round.reason==='ko'?[...state.log.damage].reverse().find(item=>item.round===round.number&&item.at===round.at&&item.damage>0):undefined;
   const attack=hit?state.log.telegraphs.find(item=>item.round===hit.round&&item.beat===hit.beat):undefined;
   this.change(book=>book.completedRound({channelId:CHANNEL,serverSessionId:this.options.sessionId,roundId,winner:round.winner,reason:round.reason,...(hit&&attack?{koMove:attack.move,koSupporters:hit.supporters.filter(simulatedId).map(id=>({id}))}:{})},at));
  }this.roundCursor=state.log.rounds.length;
 }

 private winner(){let best:{user:string;damage:number}|null=null;for(const[user,damage]of this.credit)if(!best||damage>best.damage+1e-9||Math.abs(damage-best.damage)<=1e-9&&user<best.user)best={user,damage};return best;}
 private mvp(){return this.winner()?.user??null;}
 summaryMvp(){const best=this.allowed()?this.winner():null;return best?{...best,displayName:displayName(best.user)}:null;}
 view():ViewerMemoryView|null{return this.allowed()?this.book.snapshot(CHANNEL,this.options.now(),{simulated:true,serverSessionId:this.options.sessionId,...(this.credit.size?{prospectiveMvpId:this.mvp()}: {})}):null;}
 close(){return this.closeTask??=(async()=>{this.closing=true;clearTimeout(this.saveTimer);await this.ready;if(!hasLiveCredentials()&&this.observedCombat)this.book.finalizeSession({channelId:CHANNEL,serverSessionId:this.options.sessionId,mvpId:this.mvp()});this.closed=true;try{if(!hasLiveCredentials())await this.options.store?.save(structuredClone(this.book.data));}catch{}finally{this.options.store?.close();}})();}
}
export function createDemoViewerMemory(options:{offline:boolean;factory?:IDBFactory;now?:()=>number;sessionId?:string;onChange?:()=>void;store?:DemoMemoryStore}):DemoViewerMemory|null{
 if(!options.offline||hasLiveCredentials())return null;
 let store=options.store;try{store??=options.factory?indexedDemoMemoryStore(options.factory):undefined;}catch{/* Security/privacy mode can deny IndexedDB synchronously. */}
 return new DemoViewerMemory({now:options.now??Date.now,sessionId:options.sessionId??`simulated-page-${crypto.randomUUID()}`,store,onChange:options.onChange});
}
