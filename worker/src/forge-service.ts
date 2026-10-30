import type {ForgeClient,ForgeResponse} from '../../shared/src/forge-client';
import {forgeModerationRequest,forgeResponseRequest} from '../../shared/src/forge-request';
import {ForgeCaps,ForgeLimitError,repairDigest} from './forge-caps';
import type {ForgeRespondBody} from './forge-validation';
export type ForgeFailure='daily-cap'|'invalid-repair'|'generation-busy'|'feature-off'|'unavailable';
export type ForgeReply<T>={ok:true;value:T}|{ok:false;reason:ForgeFailure};
const text=(value:unknown,max=32768)=>typeof value==='string'&&value.length<=max?value:undefined;
const count=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1e9?value:undefined;
/** Only fields consumed by BossForge cross the API; never upstream bodies/errors/metadata. */
export function safeForgeResponse(value:ForgeResponse):ForgeResponse {
 if(value.output_text!==undefined&&(typeof value.output_text!=='string'||value.output_text.length>32768))throw new Error('invalid-response');
 const output=value.output?.slice(0,20).map(item=>({content:item.content?.slice(0,20).map(part=>({type:text(part.type,40),text:text(part.text),refusal:text(part.refusal)}))}));
 const safe:ForgeResponse={status:text(value.status,40),output_text:text(value.output_text),output,usage:{input_tokens:count(value.usage?.input_tokens),output_tokens:count(value.usage?.output_tokens),input_tokens_details:{cached_tokens:count(value.usage?.input_tokens_details?.cached_tokens)}}};
 const combined=safe.output_text??safe.output?.flatMap(item=>item.content??[]).filter(part=>part.type==='output_text').map(part=>part.text??'').join('')??'';
 if(!combined||combined.length>32768)throw new Error('invalid-response');return safe;
}
export function responseText(value:ForgeResponse):string{return value.output_text??value.output?.flatMap(item=>item.content??[]).filter(part=>part.type==='output_text').map(part=>part.text??'').join('')??'';}
export class HostedForgeService {
 constructor(private options:{caps:ForgeCaps;client:()=>ForgeClient;enabled:()=>boolean;configured:()=>boolean;reserveGlobal:()=>Promise<ForgeReply<null>>}){}
 private ready(){if(!this.options.enabled())throw new Error('feature-off');if(!this.options.configured())throw new Error('unavailable');}
 private async reply<T>(work:()=>Promise<T>):Promise<ForgeReply<T>>{try{return {ok:true,value:await work()};}catch(error){return {ok:false,reason:error instanceof ForgeLimitError?error.reason:error instanceof Error&&error.message==='feature-off'?'feature-off':'unavailable'};}}
 moderate(channel:string,input:string[]):Promise<ForgeReply<{results:{flagged:boolean}[]}>> {return this.reply(async()=>{
  this.ready();await this.options.caps.reserveModeration(channel);this.ready();
  const value=await this.options.client().moderations.create(forgeModerationRequest(input),{signal:AbortSignal.timeout(15000)});
  this.ready();if(!Array.isArray(value.results)||value.results.length!==input.length||!value.results.every(item=>typeof item.flagged==='boolean'))throw new Error('invalid-moderation');
  return {results:value.results.map(item=>({flagged:item.flagged}))};
 });}
 respond(channel:string,body:ForgeRespondBody):Promise<ForgeReply<ForgeResponse>> {return this.reply(async()=>{
  this.ready();const reservation=body.repair?await this.options.caps.reserveRepair(channel,await repairDigest(body.idea,body.repair.previous)):await this.options.caps.reserveInitial(channel);
  let digest:string|undefined;
  try{
   if(!body.repair){const global=await this.options.reserveGlobal();if(!global.ok){if(global.reason==='daily-cap')throw new ForgeLimitError('daily-cap');throw new Error(global.reason==='feature-off'?'feature-off':'unavailable');}}
   this.ready();const response=safeForgeResponse(await this.options.client().responses.create(forgeResponseRequest(body.idea,body.repair),{signal:AbortSignal.timeout(30000)}));
   this.ready();if(!body.repair)digest=await repairDigest(body.idea,responseText(response));return response;
  }finally{await this.options.caps.finish(channel,reservation,digest);}
 });}
}
