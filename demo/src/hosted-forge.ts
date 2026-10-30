import type {BrowserAuth} from './twitch/auth';
import {BossForge,forgeCommand} from '../../shared/src/forge';
import {ForgeDailyCapError,type ForgeClient,type ForgeResponse} from '../../shared/src/forge-client';
import type {BossDef} from '../../shared/src/boss-def';
import type {ForgeSnapshot,ForgeGateView} from '../../shared/src/forge-view';
import type {HostedChatMessage} from './twitch/eventsub';
type Auth=Pick<BrowserAuth,'account'|'authenticated'|'backendRequest'>;
/** Sends structured idea/repair data only. The Worker owns prompts, models and schemas. */
export function createHostedForgeClient(auth:Auth,onDailyCap:()=>void):ForgeClient {
 const owner=auth.account?.id;const current=()=>!!owner&&auth.authenticated&&auth.account?.id===owner;
 const post=async<T>(path:string,body:unknown,signal:AbortSignal):Promise<T>=>{
  if(!current())throw new Error('forge-session-ended');
  const response=await auth.backendRequest(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
  if(!current())throw new Error('forge-session-ended');
  if(response.status===429){const value=await response.json().catch(()=>null);if(!current())throw new Error('forge-session-ended');if(value?.reason==='daily-cap'){onDailyCap();throw new ForgeDailyCapError();}throw new Error('hosted-forge-unavailable');}if(!response.ok)throw new Error('hosted-forge-unavailable');const data=await response.json() as T;if(!current())throw new Error('forge-session-ended');return data;
 };
 return {moderations:{create:(body,{signal})=>post('/api/forge/moderate',{input:body.input},signal)},responses:{create:(body,{signal})=>{
  const first=body.input.find(item=>item.role==='user');const idea=first?JSON.parse(first.content).idea:undefined;
  const assistant=[...body.input].reverse().find(item=>item.role==='assistant');
  const repair=assistant?{previous:assistant.content,errors:JSON.parse(body.input.at(-1)!.content).errors}:undefined;
  return post<ForgeResponse>('/api/forge/respond',{idea,...(repair?{repair}:{})},signal);
 }}};
}
type Tune={factor:number;def:BossDef;before:ForgeGateView;after:ForgeGateView};
export type ForgeWorker={onmessage:((event:MessageEvent)=>void)|null;onerror:((event:Event)=>void)|null;postMessage:(message:unknown)=>void;terminate:()=>void};
/** Synchronous balance arithmetic stays in the existing local worker, never on the UI thread. */
export function createHostedForgeBalance(makeWorker:()=>ForgeWorker=()=>new Worker(new URL('./forge-worker.ts',import.meta.url),{type:'module'}) as unknown as ForgeWorker){
 let worker:ForgeWorker|null=null,id=0,rejectPending:((error:Error)=>void)|null=null;
 const cancel=()=>{id++;worker?.terminate();worker=null;rejectPending?.(new Error('forge-cancelled'));rejectPending=null;};
 function run<T>(operation:'gate'|'tune',boss:BossDef):Promise<T>{cancel();const request=++id;return new Promise((resolve,reject)=>{rejectPending=reject;try{worker=makeWorker();worker.onmessage=event=>{if(request!==id||event.data.id!==request)return;worker?.terminate();worker=null;rejectPending=null;if(event.data.errors?.length)reject(new Error('forge-balance-rejected'));else resolve(event.data.result as T);};worker.onerror=()=>{if(request===id)cancel();};worker.postMessage({id:request,json:JSON.stringify(boss),operation});}catch{cancel();}});}
 return {gate:(boss:BossDef)=>run<ForgeGateView>('gate',boss),tune:(boss:BossDef)=>run<Tune>('tune',boss),cancel};
}
/** The hosted Forge holds names/ideas only in this page session, never metrics or storage. */
export function createHostedForge(options:{auth:Auth;fetch?:typeof fetch;betweenRounds:()=>boolean;onAccepted:(boss:BossDef|null)=>void;onSnapshot:(view:ForgeSnapshot|null)=>void;onStatus:(message:string)=>void;balance?:ReturnType<typeof createHostedForgeBalance>}){
 const request=options.fetch??globalThis.fetch.bind(globalThis),balance=options.balance??createHostedForgeBalance();
 let disposed=false,available=false,service:BossForge|null=null,owner:string|null=null;
 const names=new Map<string,string>();
 const report=(message:string)=>{if(!disposed)options.onStatus(message);};
 const close=()=>{service?.veto();balance.cancel();service=null;owner=null;options.onAccepted(null);};
 function ready(){return !disposed&&available&&options.auth.authenticated&&owner===options.auth.account?.id;}
 return {
  get busy(){return !!service&&['generating','validating','tuning'].includes(service.snapshot().status);},
  async initialize(){try{const response=await request('/api/health',{cache:'no-store'});available=response.ok&&(await response.json()).forge===true;}catch{available=false;}if(disposed)return;if(!available||!options.auth.authenticated){close();report('Hosted Boss Forge is disabled or unavailable.');return;}const account=options.auth.account!;if(service&&owner===account.id)return;close();owner=account.id;names.clear();names.set(account.id,account.login.slice(0,40));
   service=new BossForge({client:createHostedForgeClient(options.auth,()=>{report('Boss Forge daily cap reached. Try again tomorrow.');}),protectedNames:()=>[...names.values()],isBetweenRounds:()=>ready()&&options.betweenRounds(),gate:balance.gate,tune:balance.tune,onAccepted:boss=>{if(ready()&&options.betweenRounds())options.onAccepted(boss);},onChange:view=>{if(!disposed){options.onSnapshot(view);}}});report('Boss Forge enabled · chat: !forge <idea>, !forge +1; mods: !forge between rounds.');},
  observePhase(reset=false){if(reset){balance.cancel();options.onAccepted(null);service?.resetBout();}service?.observePhase();if(service&&!options.betweenRounds())balance.cancel();},
  onChat(message:HostedChatMessage){if(!ready()||!service||message.userId.length>64)return;names.delete(message.userId);names.set(message.userId,message.displayName.slice(0,40));while(names.size>101){const key=names.keys().next().value!;if(key===owner){const value=names.get(key)!;names.delete(key);names.set(key,value);}else names.delete(key);}
   const text=message.text.trim();if(/^!veto(?:\s|$)/i.test(text)&&(message.isBroadcaster||message.isMod)){balance.cancel();service.veto();options.onAccepted(null);return;}
   if(/^!forge$/i.test(text)){if((message.isBroadcaster||message.isMod)&&options.betweenRounds())void service.generate();return;}
   void Promise.resolve(forgeCommand(service,{viewerId:message.userId,text})).catch(()=>{});
  },
  dispose(){disposed=true;close();names.clear();},
 };
}
