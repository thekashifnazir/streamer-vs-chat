import {MOVES,type Move} from './index.js';
export type ViewerMemoryView={simulated:boolean;record:{streams:number;bossesKo:number;timesKo:number};hallOfFame:{name:string;koVotes:number;favMove:Move|null}[];nemesis:{name:string;koVotes:number;favMove:Move|null;active:boolean}|null;mvpStreak:number};
export type ViewerRecord={id:string;name:string;firstSeen:number;lastSeen:number;streams:number;votes:number;koVotes:number;mvpCount:number;favMove:Move|null;koVotesByMove:Record<Move,number>};
export type ChannelMemory={viewers:Record<string,ViewerRecord>;optOut:string[];record:ViewerMemoryView['record'];lastMvpId:string|null;mvpStreak:number};
export type ViewerMemoryRuntime={version:1;sessions:{key:string;at:number;voters:string[];beatId:string|null;votedThisBeat:string[];rounds:string[];stream:boolean;finalized:boolean}[];lastVotes:{key:string;at:number}[]};
export type ViewerMemoryData={version:1;channels:Record<string,ChannelMemory>};
export type ViewerIdentity={channelId:string;userId:string;displayName:string};
export type CountedMemoryVote=ViewerIdentity&{serverSessionId:string;beatId:string;move:Move};
export type MemoryRound={channelId:string;serverSessionId:string;roundId:string;winner:'streamer'|'boss';reason:'ko'|'timeout';koMove?:Move;koSupporters?:{id:string;name?:string}[]};
const dictionary=<T>():Record<string,T>=>Object.create(null) as Record<string,T>;
const counts=():Record<Move,number>=>({JAB:0,HOOK_L:0,HOOK_R:0,COMBO:0,SUPER:0});
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const count=(v:unknown):v is number=>Number.isSafeInteger(v)&&(v as number)>=0;
const time=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=256;
const name=(v:string)=>v.trim().slice(0,100)||'Viewer';
const move=(v:unknown):v is Move=>MOVES.includes(v as Move);
const favorite=(v:Record<Move,number>):Move|null=>MOVES.reduce<Move|null>((best,m)=>v[m]>0&&(!best||v[m]>v[best])?m:best,null);
export const emptyViewerMemory=():ViewerMemoryData=>({version:1,channels:dictionary()});
/** Strict allowlist and fail-closed tombstones: malformed storage must not undo an opt-out. */
export function validateViewerMemory(value:unknown,at:number):ViewerMemoryData{
 const invalid=()=>{throw new Error('Invalid viewer-memory database; existing file was not overwritten');};
 if(!object(value)||value.version!==1||!object(value.channels))return invalid();
 const result=emptyViewerMemory();
 for(const [channelId,raw]of Object.entries(value.channels)){
  if(!id(channelId)||!object(raw)||!object(raw.viewers)||!Array.isArray(raw.optOut)||!raw.optOut.every(id)||!object(raw.record)||!['streams','bossesKo','timesKo'].every(k=>count((raw.record as Record<string,unknown>)[k]))||!count(raw.mvpStreak)||(raw.lastMvpId!==null&&!id(raw.lastMvpId))||(raw.lastMvpId===null&&raw.mvpStreak!==0))return invalid();
  const channel:ChannelMemory={viewers:dictionary(),optOut:[...new Set(raw.optOut as string[])],record:{streams:raw.record.streams as number,bossesKo:raw.record.bossesKo as number,timesKo:raw.record.timesKo as number},lastMvpId:raw.lastMvpId as string|null,mvpStreak:raw.mvpStreak};
  for(const [userId,v]of Object.entries(raw.viewers)){
   if(!id(userId)||!object(v)||v.id!==userId||typeof v.name!=='string'||v.name.length>100||!time(v.firstSeen)||!time(v.lastSeen)||v.firstSeen>v.lastSeen||!['streams','votes','koVotes','mvpCount'].every(k=>count(v[k]))||!object(v.koVotesByMove)||!MOVES.every(m=>count((v.koVotesByMove as Record<string,unknown>)[m])))return invalid();
   const by=counts();for(const m of MOVES)by[m]=v.koVotesByMove[m] as number;
   if(MOVES.reduce((n,m)=>n+by[m],0)!==v.koVotes)return invalid();
   if(channel.optOut.includes(userId)||v.lastSeen<at-90*86400000)continue;
   channel.viewers[userId]={id:userId,name:name(v.name),firstSeen:v.firstSeen,lastSeen:v.lastSeen,streams:v.streams as number,votes:v.votes as number,koVotes:v.koVotes as number,mvpCount:v.mvpCount as number,koVotesByMove:by,favMove:favorite(by)};
  }
  if(channel.lastMvpId&&!Object.hasOwn(channel.viewers,channel.lastMvpId)){channel.lastMvpId=null;channel.mvpStreak=0;}
  result.channels[channelId]=channel;
 }
 return result;
}
/** Browser-safe domain model. All time is supplied; no filesystem, network or chat text. */
export class ViewerMemory {
 private sessions=new Map<string,{at:number;voters:Set<string>;beatId:string|null;votedThisBeat:Set<string>;rounds:Set<string>;stream:boolean;finalized:boolean}>();
 private lastVotes=new Map<string,number>();
 constructor(readonly data:ViewerMemoryData=emptyViewerMemory()){}
 /** Separate from the version-1 file payload: durable hosts retain in-session dedup across eviction. */
 checkpoint():ViewerMemoryRuntime {
  return {version:1,sessions:[...this.sessions].map(([key,s])=>({key,at:s.at,voters:[...s.voters],beatId:s.beatId,votedThisBeat:[...s.votedThisBeat],rounds:[...s.rounds],stream:s.stream,finalized:s.finalized})),lastVotes:[...this.lastVotes].map(([key,at])=>({key,at}))};
 }
 restoreRuntime(value:unknown,at?:number):void {
  const invalid=():never=>{throw new Error('Invalid viewer-memory runtime checkpoint');};
  const key=(value:unknown):value is string=>{
   if(typeof value!=='string')return false;
   try{const pair:unknown=JSON.parse(value);return Array.isArray(pair)&&pair.length===2&&pair.every(id)&&JSON.stringify(pair)===value&&Object.hasOwn(this.data.channels,pair[0]);}catch{return false;}
  };
  const ids=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(id)&&new Set(value).size===value.length;
  if(!object(value)||value.version!==1||!Array.isArray(value.sessions)||!Array.isArray(value.lastVotes))return invalid();
  const sessions:typeof this.sessions=new Map(),lastVotes:typeof this.lastVotes=new Map();
  for(const raw of value.sessions){
   if(!object(raw)||!key(raw.key)||sessions.has(raw.key)||!time(raw.at)||!ids(raw.voters)||(raw.beatId!==null&&!id(raw.beatId))||!ids(raw.votedThisBeat)||!ids(raw.rounds)||typeof raw.stream!=='boolean'||typeof raw.finalized!=='boolean')return invalid();
   if(at!==undefined&&raw.at<at-90*86400000)continue;
   const channel=this.data.channels[(JSON.parse(raw.key) as [string,string])[0]]!;
   const retained=(ids:string[])=>ids.filter(userId=>Object.hasOwn(channel.viewers,userId)&&!channel.optOut.includes(userId));
   sessions.set(raw.key,{at:raw.at,voters:new Set(retained(raw.voters)),beatId:raw.beatId as string|null,votedThisBeat:new Set(retained(raw.votedThisBeat)),rounds:new Set(raw.rounds),stream:raw.stream,finalized:raw.finalized});
  }
  for(const raw of value.lastVotes){if(!object(raw)||!key(raw.key)||lastVotes.has(raw.key)||!time(raw.at))return invalid();const [channelId,userId]=JSON.parse(raw.key) as [string,string];const channel=this.data.channels[channelId]!;if(!Object.hasOwn(channel.viewers,userId)||channel.optOut.includes(userId)||(at!==undefined&&(raw.at>at||at-raw.at>=30000)))continue;lastVotes.set(raw.key,raw.at);}
  this.sessions=sessions;this.lastVotes=lastVotes;
 }
 private channel(channelId:string){if(!id(channelId))throw new Error('Invalid channel ID');return Object.hasOwn(this.data.channels,channelId)?this.data.channels[channelId]!:(this.data.channels[channelId]={viewers:dictionary(),optOut:[],record:{streams:0,bossesKo:0,timesKo:0},lastMvpId:null,mvpStreak:0});}
 private session(channelId:string,sessionId:string,at?:number){const key=JSON.stringify([channelId,sessionId]);let s=this.sessions.get(key);if(!s){s={at:at??0,voters:new Set(),beatId:null,votedThisBeat:new Set(),rounds:new Set(),stream:false,finalized:false};this.sessions.set(key,s);}if(at!==undefined)s.at=Math.max(s.at,at);return s;}
 observeChat(event:ViewerIdentity,at:number){
  const c=this.channel(event.channelId);if(!id(event.userId)||c.optOut.includes(event.userId))return;
  let viewer=c.viewers[event.userId];if(!viewer)viewer=c.viewers[event.userId]={id:event.userId,name:name(event.displayName),firstSeen:at,lastSeen:at,streams:0,votes:0,koVotes:0,mvpCount:0,favMove:null,koVotesByMove:counts()};
  viewer.name=name(event.displayName);viewer.lastSeen=at;
 }
 /** An already-counted arrival can refresh activity without reopening an old beat. */
 refreshVote(event:CountedMemoryVote,at:number){
  if(!move(event.move))return;this.observeChat(event,at);
  if(Object.hasOwn(this.channel(event.channelId).viewers,event.userId))this.lastVotes.set(JSON.stringify([event.channelId,event.userId]),at);
 }
 /** Accepted arrivals are delivered in current-beat receive order by the authoritative host. */
 countedVote(event:CountedMemoryVote,at:number){
  if(!move(event.move))return;this.observeChat(event,at);const c=this.channel(event.channelId),v=c.viewers[event.userId];if(!v)return;
  const s=this.session(event.channelId,event.serverSessionId,at);if(s.beatId!==event.beatId){s.beatId=event.beatId;s.votedThisBeat.clear();}if(!s.votedThisBeat.has(event.userId)){s.votedThisBeat.add(event.userId);v.votes++;}if(!s.voters.has(event.userId)){s.voters.add(event.userId);v.streams++;}this.lastVotes.set(JSON.stringify([event.channelId,event.userId]),at);
 }
 completedRound(event:MemoryRound,at:number){
  const c=this.channel(event.channelId),s=this.session(event.channelId,event.serverSessionId,at);if(s.rounds.has(event.roundId))return;s.rounds.add(event.roundId);
  if(!s.stream){c.record.streams++;s.stream=true;}if(event.reason!=='ko')return;
  if(event.winner==='streamer'){c.record.bossesKo++;return;}c.record.timesKo++;
  if(!event.koMove)return;
  for(const supporter of new Map((event.koSupporters??[]).map(v=>[v.id,v])).values()){
   const v=c.viewers[supporter.id];if(!v||c.optOut.includes(supporter.id))continue;
   v.koVotes++;v.koVotesByMove[event.koMove]++;v.favMove=favorite(v.koVotesByMove);
  }
 }
 finalizeSession(event:{channelId:string;serverSessionId:string;mvpId?:string|null},at?:number){
  const c=this.channel(event.channelId),s=this.session(event.channelId,event.serverSessionId,at);if(s.finalized)return;s.finalized=true;
  const v=event.mvpId&&s.voters.has(event.mvpId)?c.viewers[event.mvpId]:null;
  if(v){v.mvpCount++;c.mvpStreak=c.lastMvpId===v.id?c.mvpStreak+1:1;c.lastMvpId=v.id;}else{c.lastMvpId=null;c.mvpStreak=0;}
 }
 forget(event:{channelId:string;userId:string}){const c=this.channel(event.channelId);if(!id(event.userId))return;delete c.viewers[event.userId];if(!c.optOut.includes(event.userId))c.optOut.push(event.userId);if(c.lastMvpId===event.userId){c.lastMvpId=null;c.mvpStreak=0;}this.lastVotes.delete(JSON.stringify([event.channelId,event.userId]));for(const [key,s]of this.sessions){if((JSON.parse(key) as [string,string])[0]===event.channelId){s.voters.delete(event.userId);s.votedThisBeat.delete(event.userId);}}}
 isOptedOut(channelId:string,userId:string){return this.channel(channelId).optOut.includes(userId);}
 snapshot(channelId:string,at:number,options:{prospectiveMvpId?:string|null;simulated?:boolean;serverSessionId?:string}={}):ViewerMemoryView{
  const c=this.channel(channelId),ranked=Object.values(c.viewers).sort((a,b)=>b.koVotes-a.koVotes||b.lastSeen-a.lastSeen||(a.id<b.id?-1:a.id>b.id?1:0));
  const display=(v:ViewerRecord)=>({name:v.name,koVotes:v.koVotes,favMove:v.favMove}),nemesis=ranked[0]?.koVotes>=2?ranked[0]:null;
  const voted=nemesis?this.lastVotes.get(JSON.stringify([channelId,nemesis.id])):undefined;
  let streak=c.mvpStreak;if(options.prospectiveMvpId!==undefined){
   if(options.serverSessionId&&this.session(channelId,options.serverSessionId,at).finalized)streak=options.prospectiveMvpId===c.lastMvpId?c.mvpStreak:0;
   else{const mvp=options.prospectiveMvpId&&c.viewers[options.prospectiveMvpId];streak=mvp?(c.lastMvpId===mvp.id?c.mvpStreak+1:1):0;}
  }
  return {simulated:!!options.simulated,record:{...c.record},hallOfFame:ranked.slice(0,4).map(display),nemesis:nemesis?{...display(nemesis),active:voted!==undefined&&at>=voted&&at-voted<30000}:null,mvpStreak:streak};
 }
}
