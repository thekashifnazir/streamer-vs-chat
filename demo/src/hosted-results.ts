import {createHostedHealth,type HealthReader} from './hosted-health';
import type {BrowserAuth} from './twitch/auth';
import type {GameState} from '../../shared/src/engine';
import {roundResultBody} from '../../shared/src/result-text';
/** Twitch refused the message (403 or a drop code such as followers-only or verified-phone chat). The page only enables
 * results once the streamer granted channel:bot, so what is left is the channel's chat settings: a mod is exempt from them. */
export const BOT_POST_HINT="Chat bot can't post in your chat yet. In your Twitch chat, type /mod streamervschatbot and it will post the next result.";
/** Our side failed (bot service, app token, network or Twitch 5xx): nothing for the streamer to change; the next result tries again. */
export const BOT_SEND_RETRY="Chat bot couldn't post the last result. It will try again with the next one. The fight is not affected.";
const SERVICE_DROP=/^(send_failed|unauthorized|invalid_response|http_(401|408|429|5\d\d))$/;
/** Plain line for the stream bar; the raw code is returned separately for the tooltip. */
export const botDropMessage=(reason:string)=>SERVICE_DROP.test(reason)?BOT_SEND_RETRY:BOT_POST_HINT;
/** Hosted-only observer. Delivery is best effort and never controls the game or chat transport. */
export function createHostedResults(options:{auth:Pick<BrowserAuth,'account'|'authenticated'|'backendRequest'>;fetch?:typeof fetch;getHealth?:HealthReader;onStatus:(message:string,detail?:string)=>void;setInterval?:typeof globalThis.setInterval;clearInterval?:typeof globalThis.clearInterval}){
 const request=options.fetch??globalThis.fetch.bind(globalThis),schedule=options.setInterval??globalThis.setInterval,cancel=options.clearInterval??globalThis.clearInterval;
 let available=false,enabled=false,disposed=false,polling=false,timer:ReturnType<typeof setInterval>|undefined;
 let observed:GameState|null=null;
 const capable=()=>available&&!!options.auth.account?.scopes.includes('channel:bot');
 const report=(message:string,detail?:string)=>{if(!disposed){if(detail)options.onStatus(message,detail);else options.onStatus(message);}};
 const dropped=(reason:string)=>report(botDropMessage(reason),`Bot error code: ${reason}`);
 async function status(){
  if(disposed||!enabled||polling||!options.auth.authenticated)return;
  polling=true;
  try{const response=await options.auth.backendRequest('/api/status');if(!response.ok){report(response.status===503?'Bot results unavailable.':'Bot results status unavailable; gameplay continues.');return;}const data=await response.json();if(typeof data.dropReason==='string'&&data.dropReason)dropped(data.dropReason);}
  catch{report('Bot results unavailable; gameplay continues.');}finally{polling=false;}
 }
 function setEnabled(value:boolean){enabled=!disposed&&value&&capable();if(timer!==undefined){cancel(timer);timer=undefined;}if(enabled){timer=schedule(()=>{void status();},15000);void status();}return enabled;}
 async function send(body:unknown){
  try{const response=await options.auth.backendRequest('/api/results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok){report(response.status===503?'Bot results unavailable.':'Bot result could not be queued; gameplay continues.');return;}const data=await response.json();if(typeof data.dropReason==='string'&&data.dropReason)dropped(data.dropReason);else report('Bot results enabled · streamervschatbot');}
  catch{report('Bot result could not be queued; gameplay continues.');}
 }
 return {
  get enabled(){return enabled;},get available(){return available;},get capable(){return capable();},
  async initialize(){try{available=(await (options.getHealth??createHostedHealth(request).get)()).bot;}catch{available=false;}if(disposed)return;setEnabled(capable());if(available&&!capable())report('Reconnect to enable bot results (channel:bot).');else if(!available)report('Bot results are disabled on this host.');},
  setEnabled,status,
  postClip(clipId:string){if(enabled&&!disposed&&options.auth.authenticated)void send({kind:'clip',clipId});},
  observeGame(state:GameState,hypeFull=false){
   const before=observed;observed=state;
   if(!enabled||disposed||!options.auth.authenticated)return;
   const sameMatch=before?.match.seed===state.match.seed;
   // First observation (or a newly attached match) is a baseline, not a replay.
   // The page observes an empty state at START before any result can arrive.
   const prior=new Set((sameMatch?before!:state).log.rounds.map(round=>round.number));
   for(const round of state.log.rounds){if(prior.has(round.number))continue;void send(roundResultBody(state,round));}
   if(hypeFull)void send({kind:'hype-full'});
  },
  dispose(){disposed=true;enabled=false;if(timer!==undefined)cancel(timer);},
 };
}
