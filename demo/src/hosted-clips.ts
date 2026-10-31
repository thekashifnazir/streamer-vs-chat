import {createHostedHealth,type HealthReader} from './hosted-health';
import type {BrowserAuth} from './twitch/auth';
import {ServerHighlightCoordinator,type ClipTransport,type HighlightEntry} from '../../shared/src/clips';
import {highlightCandidates} from '../../shared/src/highlights';
import type {GameState} from '../../shared/src/engine';
import type {EndcardClip} from '../../overlay/src/summary';
type ClipAuth=Pick<BrowserAuth,'authenticated'|'account'|'request'>;
const clipSlug=/^[a-zA-Z0-9_-]{1,200}$/;
/** Every transport is pinned to one validated account; late replies cannot rebind it. */
export function browserClipTransport(auth:ClipAuth,userId:string):ClipTransport {
 const current=()=>auth.authenticated&&auth.account?.id===userId&&auth.account.scopes.includes('clips:edit');
 const call=async(path:string,init?:RequestInit)=>{if(!current())throw new Error('clip-session-ended');const response=await auth.request(path,init);if(!current())throw new Error('clip-session-ended');if(!response.ok)throw new Error('clips-unavailable');const data=await response.json();if(!current())throw new Error('clip-session-ended');return data;};
 return {
  async getStream(){const value=await call(`/streams?user_id=${encodeURIComponent(userId)}`);const stream=Array.isArray(value.data)?value.data.find((item:{user_id?:unknown})=>item.user_id===userId):null;const startedAt=stream&&typeof stream.started_at==='string'?Date.parse(stream.started_at):NaN;return Number.isFinite(startedAt)?{startedAt}:null;},
  async createClip(){const value=await call(`/clips?broadcaster_id=${encodeURIComponent(userId)}`,{method:'POST'});const id=value.data?.[0]?.id;return typeof id==='string'&&clipSlug.test(id)?id:null;},
  async getClip(id){if(!clipSlug.test(id))return null;const value=await call(`/clips?id=${encodeURIComponent(id)}`);const clip=Array.isArray(value.data)?value.data.find((item:{id?:unknown;broadcaster_id?:unknown})=>item.id===id&&item.broadcaster_id===userId):null;return clip?{id,url:`https://clips.twitch.tv/${encodeURIComponent(id)}`}:null;},
 };
}
/** Hosted-only observer; no token storage, local replay, or gameplay control. */
export function createHostedClips(options:{auth:ClipAuth;fetch?:typeof fetch;getHealth?:HealthReader;onStatus:(message:string)=>void;onChange?:()=>void;onConfirmed?:(clipId:string)=>void;now?:()=>number}){
 const request=options.fetch??globalThis.fetch.bind(globalThis);
 let desired=true,disposed=false,available=false,coordinator:ServerHighlightCoordinator|null=null,accountId:string|null=null,observed:GameState|null=null,epoch=0;
 const announced=new Set<string>();
 let confirmed:HighlightEntry[]=[],historyOwner:string|null=null;
 const capable=()=>available&&options.auth.authenticated&&!!options.auth.account?.scopes.includes('clips:edit');
 const report=(message:string)=>{if(!disposed)options.onStatus(message);};
 const entries=():HighlightEntry[]=>{const current=coordinator?.snapshot()??[];return [...confirmed.filter(old=>!current.some(entry=>entry.clipId===old.clipId)),...current];};
 function changed(){if(disposed)return;const snapshot=entries();const retained=new Set(snapshot.flatMap(entry=>entry.clipId?[entry.clipId]:[]));for(const id of announced)if(!retained.has(id))announced.delete(id);for(const entry of snapshot)if(entry.status==='confirmed'&&entry.clipId&&!announced.has(entry.clipId)){announced.add(entry.clipId);options.onConfirmed?.(entry.clipId);report('Clip confirmed · available on the session card.');}options.onChange?.();}
 function close(){confirmed=entries().filter(entry=>entry.status==='confirmed'&&entry.clipId).sort((a,b)=>b.highlight.priority-a.highlight.priority||a.highlight.at-b.highlight.at).slice(0,3);coordinator?.close();coordinator=null;accountId=null;}
 function open(id:string){if(historyOwner!==id){confirmed=[];announced.clear();historyOwner=id;}accountId=id;coordinator=new ServerHighlightCoordinator({transport:browserClipTransport(options.auth,id),now:options.now,onChange:changed});}
 return {
  get enabled(){return desired&&capable()&&coordinator!==null;},get available(){return available;},get capable(){return capable();},
  setEnabled(value:boolean){desired=value;if(value&&!disposed&&capable()&&!coordinator)open(options.auth.account!.id);return desired&&capable()&&coordinator!==null;},
  async initialize(){try{available=(await (options.getHealth??createHostedHealth(request).get)()).clips;}catch{available=false;}if(disposed)return;if(!capable()){close();report(!desired?'Hosted clips off.':available?'Reconnect to enable clips (clips:edit).':'Hosted clips are disabled on this host.');return;}if(!desired){report('Hosted clips off.');return;}const id=options.auth.account!.id;if(accountId===id&&coordinator)return;close();open(id);report('Hosted clips enabled · confirmed clips only.');},
  observeGame(state:GameState,reset=false){const before=observed;observed=state;if(reset||before&&before.match.seed!==state.match.seed)epoch++;if(!before||reset||before.match.seed!==state.match.seed||!desired||!capable()||accountId!==options.auth.account?.id)return;for(const moment of highlightCandidates(before,state))coordinator?.enqueue({...moment,id:`m${epoch}:${moment.id}`});},
  snapshot():EndcardClip[]{if(!options.auth.authenticated||historyOwner!==options.auth.account?.id)return [];return entries().filter(entry=>entry.status==='confirmed'&&entry.clipId&&entry.url).sort((a,b)=>b.highlight.priority-a.highlight.priority||a.highlight.at-b.highlight.at).slice(0,3).map(entry=>({id:entry.clipId!,url:entry.url!,label:entry.highlight.kind.toUpperCase(),status:'confirmed'}));},
  entries,
  async idle(){await coordinator?.idle();},
  dispose(){disposed=true;close();},
 };
}
