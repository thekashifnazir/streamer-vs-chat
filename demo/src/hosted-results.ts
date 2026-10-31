import {createHostedHealth,type HealthReader} from './hosted-health';
import type {BrowserAuth} from './twitch/auth';
import type {GameState} from '../../shared/src/engine';
import type {ResultRoundData} from '../../shared/src/result-text';
import {chatCommand} from '../../shared/src/chat-commands';
export const BOT_POST_HINT="Bot can't post: reconnect to grant channel:bot, or make streamervschatbot a mod";
/** Hosted-only observer. Delivery is best effort and never controls the game or chat transport. */
export function createHostedResults(options:{auth:Pick<BrowserAuth,'account'|'authenticated'|'backendRequest'>;fetch?:typeof fetch;getHealth?:HealthReader;onStatus:(message:string)=>void;setInterval?:typeof globalThis.setInterval;clearInterval?:typeof globalThis.clearInterval}){
 const request=options.fetch??globalThis.fetch.bind(globalThis),schedule=options.setInterval??globalThis.setInterval,cancel=options.clearInterval??globalThis.clearInterval;
 let available=false,enabled=false,disposed=false,polling=false,timer:ReturnType<typeof setInterval>|undefined;
 let observed:GameState|null=null;
 const capable=()=>available&&!!options.auth.account?.scopes.includes('channel:bot');
 const report=(message:string)=>{if(!disposed)options.onStatus(message);};
 async function status(){
  if(disposed||!enabled||polling||!options.auth.authenticated)return;
  polling=true;
  try{const response=await options.auth.backendRequest('/api/status');if(!response.ok){report(response.status===503?'Bot results unavailable.':'Bot results status unavailable; gameplay continues.');return;}const data=await response.json();if(typeof data.dropReason==='string'&&data.dropReason)report(`${BOT_POST_HINT} (${data.dropReason})`);}
  catch{report('Bot results unavailable; gameplay continues.');}finally{polling=false;}
 }
 function setEnabled(value:boolean){enabled=!disposed&&value&&capable();if(timer!==undefined){cancel(timer);timer=undefined;}if(enabled){timer=schedule(()=>{void status();},15000);void status();}return enabled;}
 async function send(body:unknown){
  try{const response=await options.auth.backendRequest('/api/results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok){report(response.status===503?'Bot results unavailable.':'Bot result could not be queued; gameplay continues.');return;}const data=await response.json();if(typeof data.dropReason==='string'&&data.dropReason)report(`${BOT_POST_HINT} (${data.dropReason})`);else report('Bot results enabled · streamervschatbot');}
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
   for(const round of state.log.rounds){if(prior.has(round.number))continue;const body:ResultRoundData&{kind:'round'}={kind:'round',number:round.number,winner:round.winner,streamerHp:round.streamer_hp,bossHp:round.boss_hp,bossMaxHp:round.boss_max_hp??state.boss.max_hp,bossName:state.bossDef?.name??'CHAT GOLEM',score:{streamer:state.match.round_wins.streamer,boss:state.match.round_wins.boss},matchOver:state.match.winner!==null,difficulty:state.difficulty,hookL:chatCommand('HOOK_L',state.bossDef).split(/[ /]/)[0]!,hookR:chatCommand('HOOK_R',state.bossDef).split(/[ /]/)[0]!};void send(body);}
   if(hypeFull)void send({kind:'hype-full'});
  },
  dispose(){disposed=true;enabled=false;if(timer!==undefined)cancel(timer);},
 };
}
