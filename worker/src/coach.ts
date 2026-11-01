import type {CapStorage} from './forge-caps';
export type CoachFailure='daily-cap'|'feature-off'|'unavailable';
export type CoachReply={ok:true}|{ok:false;reason:CoachFailure};
export type CoachLimits={channel:number;ip:number;global:number};
const limit=(value:string|undefined,fallback:number)=>{const parsed=Number(value);return value!==undefined&&value.trim()!==''&&Number.isInteger(parsed)&&parsed>=0&&parsed<=100000?parsed:fallback;};
/** Worker vars override the defaults; a missing or malformed var keeps the default. */
export function coachLimits(env:{COACH_DAILY_CHANNEL?:string;COACH_DAILY_IP?:string;COACH_DAILY_GLOBAL?:string}):CoachLimits{return {channel:limit(env.COACH_DAILY_CHANNEL,20),ip:limit(env.COACH_DAILY_IP,10),global:limit(env.COACH_DAILY_GLOBAL,200)};}
/** Daily-rotating salted hash; the raw address is never stored. The secret key is the salt. */
export async function coachIpHash(ip:string|null,salt:string,day:string):Promise<string>{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`coach:${day}:${ip?.split(',')[0]?.trim()||'unknown'}:${salt}`));return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('');}
interface ChannelCount {day:string;count:number}
interface GlobalCount {day:string;count:number;ips:Record<string,number>}
/** UTC-day counters. Reserve before paid I/O; failed upstream calls are not refunded. */
export class CoachCaps {
 constructor(private storage:CapStorage,private now:()=>number){}
 private day(){return new Date(this.now()).toISOString().slice(0,10);}
 reserveChannel(channel:string,max:number):Promise<CoachReply>{return this.storage.transaction(async storage=>{
  if(!/^[0-9]{1,30}$/.test(channel))return {ok:false,reason:'unavailable'};
  const day=this.day();let state=await storage.get<ChannelCount>('coach-caps');if(!state||state.day!==day)state={day,count:0};
  if(state.count>=max)return {ok:false,reason:'daily-cap'};state.count++;await storage.put('coach-caps',state);return {ok:true};
 });}
 /** Gives back a channel slot when the shared global/IP cap refused, so a busy IP cannot drain a streamer's own quota. */
 releaseChannel(channel:string):Promise<void>{return this.storage.transaction(async storage=>{const state=await storage.get<ChannelCount>('coach-caps');if(state&&state.day===this.day()&&state.count>0){state.count--;await storage.put('coach-caps',state);}});}
 /** The global counter bounds the IP map: at most `global` entries exist per day. */
 reserveGlobal(ipHash:string,global:number,ip:number):Promise<CoachReply>{return this.storage.transaction(async storage=>{
  if(!/^[0-9a-f]{64}$/.test(ipHash))return {ok:false,reason:'unavailable'};
  const day=this.day();let state=await storage.get<GlobalCount>('coach-global-caps');if(!state||state.day!==day)state={day,count:0,ips:{}};
  if(state.count>=global||(state.ips[ipHash]??0)>=ip)return {ok:false,reason:'daily-cap'};
  state.count++;state.ips[ipHash]=(state.ips[ipHash]??0)+1;await storage.put('coach-global-caps',state);return {ok:true};
 });}
}
/** Mints a short-lived conversation token. Only the token string leaves; never the key or upstream body. */
export async function fetchCoachToken(request:typeof fetch,key:string,agentId:string):Promise<string|null>{
 let response:Response;try{response=await request(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,{headers:{'xi-api-key':key},redirect:'manual',signal:AbortSignal.timeout(8000)});}catch{return null;}
 if(!response.ok||response.type==='opaqueredirect')return null;
 let data:unknown;try{data=await response.json();}catch{return null;}
 const token=(data as {token?:unknown}|null)?.token;
 return typeof token==='string'&&/^[\w.~+/=-]{1,8192}$/.test(token)?token:null;
}
