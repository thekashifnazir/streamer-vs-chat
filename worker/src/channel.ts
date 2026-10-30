import {createOpenAIForgeClient} from '../../server/src/forge-client';
import {ForgeCaps,ForgeLimitError} from './forge-caps';
import {HostedForgeService,type ForgeReply} from './forge-service';
import {validateModeration,validateForgeRespond,type ForgeRespondBody} from './forge-validation';
import type {DurableObjectState} from '@cloudflare/workers-types';
import {DurableObject} from 'cloudflare:workers';
import type {Env} from './env.js';
import {TwitchBotSender} from './app-token.js';
import {enqueueClipResult} from './clip-results.js';
import {HostedResultsQueue} from './queue.js';
/** One instance per validated Twitch user ID, selected by the authenticated API router. */
export class ChannelHub extends DurableObject<Env> {
  private readonly results:HostedResultsQueue;
  private readonly sender:TwitchBotSender;
  private readonly forge:HostedForgeService;
  private readonly caps:ForgeCaps;
  constructor(ctx:DurableObjectState,env:Env) {
    super(ctx,env);
    const sender=this.sender=new TwitchBotSender({clientId:env.TWITCH_CLIENT_ID,clientSecret:env.TWITCH_CLIENT_SECRET??'',botUserId:env.BOT_USER_ID},fetch,Date.now);
    this.caps=new ForgeCaps(ctx.storage,Date.now);
    this.forge=new HostedForgeService({caps:this.caps,enabled:()=>this.env.HOSTED_FORGE==='on',configured:()=>!!this.env.OPENAI_API_KEY?.trim(),client:()=>createOpenAIForgeClient({apiKey:this.env.OPENAI_API_KEY??'',mode:'live',fetcher:fetch,redirect:'manual'}),reserveGlobal:()=>this.env.CHANNEL.get(this.env.CHANNEL.idFromName('forge-global')).reserveGlobalGeneration()});
    this.results=new HostedResultsQueue(ctx.storage,Date.now,()=>this.env.HOSTED_BOT==='on',(channel,message)=>sender.send(channel,message));
  }
  enqueue(channel:string,message:string):Promise<void> {return this.results.enqueue(channel,message);}
  enqueueClip(channel:string,clipId:string):Promise<boolean> {return enqueueClipResult(channel,clipId,this.sender,this.results,()=>this.env.HOSTED_BOT==='on'&&this.env.HOSTED_CLIPS==='on');}
  forgeModerate(channel:string,input:string[]){if(!validateModeration({input}))return Promise.resolve({ok:false as const,reason:'unavailable' as const});return this.forge.moderate(channel,input);}
  forgeRespond(channel:string,body:ForgeRespondBody){const valid=validateForgeRespond(body);if(!valid)return Promise.resolve({ok:false as const,reason:'unavailable' as const});return this.forge.respond(channel,valid);}
  async reserveGlobalGeneration():Promise<ForgeReply<null>>{if(this.env.HOSTED_FORGE!=='on')return {ok:false,reason:'feature-off'};try{await this.caps.reserveGlobal();return {ok:true,value:null};}catch(error){return {ok:false,reason:error instanceof ForgeLimitError?error.reason:'unavailable'};}}
  status(channel:string) {return this.results.status(channel);}
  alarm():Promise<void> {return this.results.alarm();}
}
