import {formatHypeFull,formatRoundResult} from '../../shared/src/result-text';
import {ApiAuthError,createUserValidator} from './auth';
import {readJson,validateResult,type JsonRequest} from './validation';
export interface ApiRequest extends JsonRequest {url:string;method:string;headers:{get(name:string):string|null}}
export type Hub={enqueueClip:(channel:string,clipId:string)=>Promise<boolean>;enqueue:(channel:string,message:string)=>Promise<void>;status:(channel:string)=>Promise<{dropReason:string|null;pending:number}>};
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
