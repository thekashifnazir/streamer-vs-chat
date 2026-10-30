import type {DurableObjectState} from '@cloudflare/workers-types';
import {DurableObject} from 'cloudflare:workers';
import type {Env} from './env.js';
import {TwitchBotSender} from './app-token.js';
import {HostedResultsQueue} from './queue.js';
/** One instance per validated Twitch user ID, selected by the authenticated API router. */
export class ChannelHub extends DurableObject<Env> {
  private readonly results:HostedResultsQueue;
  constructor(ctx:DurableObjectState,env:Env) {
    super(ctx,env);
    const sender=new TwitchBotSender({clientId:env.TWITCH_CLIENT_ID,clientSecret:env.TWITCH_CLIENT_SECRET??'',botUserId:env.BOT_USER_ID},fetch,Date.now);
    this.results=new HostedResultsQueue(ctx.storage,Date.now,()=>this.env.HOSTED_BOT==='on',(channel,message)=>sender.send(channel,message));
  }
  enqueue(channel:string,message:string):Promise<void> {return this.results.enqueue(channel,message);}
  status(channel:string) {return this.results.status(channel);}
  alarm():Promise<void> {return this.results.alarm();}
}
