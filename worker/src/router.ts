import {validateMemoryBatch,memoryOpaqueId,memoryUserId,type MemoryEvent,type MemorySnapshot} from '../../shared/src/memory-events';
import type {ForgeResponse} from '../../shared/src/forge-client';
import {validateModeration,validateForgeRespond,type ForgeRespondBody} from './forge-validation';
import type {ForgeReply} from './forge-service';
import {formatHypeFull,formatRoundResult} from '../../shared/src/result-text';
import {ApiAuthError,createUserValidator} from './auth';
import {readJson,validateResult,type JsonRequest} from './validation';
export interface ApiRequest extends JsonRequest {url:string;method:string;headers:{get(name:string):string|null}}
export type Hub={memoryEvents:(channel:string,events:MemoryEvent[])=>Promise<MemorySnapshot>;memorySnapshot:(channel:string,sessionId?:string,mvpId?:string|null)=>Promise<MemorySnapshot>;forgeModerate:(channel:string,input:string[])=>Promise<ForgeReply<{results:{flagged:boolean}[]}>>;forgeRespond:(channel:string,body:ForgeRespondBody)=>Promise<ForgeReply<ForgeResponse>>;enqueueClip:(channel:string,clipId:string)=>Promise<boolean>;enqueue:(channel:string,message:string)=>Promise<void>;status:(channel:string)=>Promise<{dropReason:string|null;pending:number}>};
/** Narrow injected binding surface; no platform runtime required by Node tests. */
export type RoutingEnv<Id,RequestType extends ApiRequest=Request,AssetResponse=Response>={TWITCH_CLIENT_ID:string;HOSTED_BOT:string;HOSTED_CLIPS:string;HOSTED_FORGE:string;HOSTED_MEMORY:string;ASSETS:{fetch:(request:RequestType)=>Promise<AssetResponse>};CHANNEL:{idFromName:(name:string)=>Id;get:(id:Id)=>Hub}};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function createWorkerRouter(options:{fetch:typeof fetch;now:()=>number}){
 // Per-client validation cache contains SHA-256 keys and identity/scopes only, never tokens.
 const validators=new Map<string,ReturnType<typeof createUserValidator>>();
 return async<Id,RequestType extends ApiRequest,AssetResponse>(request:RequestType,env:RoutingEnv<Id,RequestType,AssetResponse>):Promise<Response|AssetResponse>=>{
  const url=new URL(request.url);if(!url.pathname.startsWith('/api/')&&url.pathname!=='/api')return env.ASSETS.fetch(request);
  if(url.pathname==='/api/health'&&request.method==='GET')return json({bot:env.HOSTED_BOT==='on',clips:env.HOSTED_CLIPS==='on',forge:env.HOSTED_FORGE==='on',memory:env.HOSTED_MEMORY==='on'});
  try{
   let validate=validators.get(env.TWITCH_CLIENT_ID);if(!validate){if(validators.size>=4)validators.clear();validate=createUserValidator({clientId:env.TWITCH_CLIENT_ID,...options});validators.set(env.TWITCH_CLIENT_ID,validate);}
   const user=await validate(request.headers.get('Authorization'));
   if(url.pathname==='/api/memory/events'||url.pathname==='/api/memory/snapshot'){
    if(env.HOSTED_MEMORY!=='on')return json({reason:'feature-off'},503);
    const hub=env.CHANNEL.get(env.CHANNEL.idFromName(user.userId));
    if(url.pathname.endsWith('/snapshot')){
     if(request.method!=='GET')return json({reason:'method-not-allowed'},405);
     if([...url.searchParams.keys()].some(key=>!['sessionId','mvpId'].includes(key))||url.searchParams.getAll('sessionId').length>1||url.searchParams.getAll('mvpId').length>1)return json({reason:'invalid-query'},400);
     const sessionId=url.searchParams.get('sessionId'),mvpId=url.searchParams.get('mvpId');
     if(sessionId!==null&&!memoryOpaqueId(sessionId)||mvpId!==null&&!memoryUserId(mvpId))return json({reason:'invalid-query'},400);
     return json(await hub.memorySnapshot(user.userId,sessionId??undefined,mvpId??undefined));
    }
    if(request.method!=='POST')return json({reason:'method-not-allowed'},405);
    if(url.search)return json({reason:'invalid-query'},400);
    if(request.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')return json({reason:'invalid-body'},400);
    let payload:unknown;try{payload=await readJson(request,1048576);}catch{return json({reason:'invalid-body'},400);}
    const events=validateMemoryBatch(payload);if(!events)return json({reason:'invalid-body'},400);
    return json(await hub.memoryEvents(user.userId,events));
   }
   if(url.pathname==='/api/forge/moderate'||url.pathname==='/api/forge/respond'){
    if(env.HOSTED_FORGE!=='on')return json({reason:'feature-off'},503);
    if(request.method!=='POST')return json({reason:'method-not-allowed'},405);
    if(request.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')return json({reason:'invalid-body'},400);
    let payload:unknown;try{payload=await readJson(request,url.pathname.endsWith('/respond')?262144:65536);}catch{return json({reason:'invalid-body'},400);}
    const hub=env.CHANNEL.get(env.CHANNEL.idFromName(user.userId));
    const input=validateModeration(payload),body=validateForgeRespond(payload);
    if(url.pathname.endsWith('/moderate')?!input:!body)return json({reason:'invalid-body'},400);
    const result=url.pathname.endsWith('/moderate')?await hub.forgeModerate(user.userId,input!.input):await hub.forgeRespond(user.userId,body!);
    if(!result.ok)return json({reason:result.reason},result.reason==='daily-cap'?429:result.reason==='invalid-repair'?400:result.reason==='generation-busy'?409:503);
    return json(result.value);
   }
   if(url.pathname!=='/api/results'&&url.pathname!=='/api/status')return json({reason:'not-found'},404);
   if(env.HOSTED_BOT!=='on')return json({reason:'feature-off'},503);
   if(url.pathname==='/api/status'){
    if(request.method!=='GET')return json({reason:'method-not-allowed'},405);
    const hub=env.CHANNEL.get(env.CHANNEL.idFromName(user.userId));return json(await hub.status(user.userId));
   }
   if(request.method!=='POST')return json({reason:'method-not-allowed'},405);
   if(request.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')return json({reason:'invalid-body'},400);
   let payload:unknown;try{payload=await readJson(request);}catch{return json({reason:'invalid-body'},400);}
   const result=validateResult(payload);if(!result)return json({reason:'invalid-body'},400);
   if(result.kind==='clip'&&env.HOSTED_CLIPS!=='on')return json({reason:'feature-off'},503);
   const hub=env.CHANNEL.get(env.CHANNEL.idFromName(user.userId));
   if(result.kind==='clip'){if(!await hub.enqueueClip(user.userId,result.clipId))return json({reason:'clip-not-found'},403);}
   else await hub.enqueue(user.userId,result.kind==='round'?formatRoundResult(result):formatHypeFull());
   return json({queued:true},202);
  }catch(error){return error instanceof ApiAuthError?json({reason:error.message},error.status):json({reason:'unavailable'},503);}
 };
}
