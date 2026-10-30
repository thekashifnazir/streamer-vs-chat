import {MOVES,type Move} from './index';
import type {ViewerMemoryView} from './viewer-memory';
export type MemoryEvent=
 |{kind:'chat-seen';sessionId:string;userId:string;displayName:string}
 |{kind:'vote';sessionId:string;beatId:string;userId:string;displayName:string;move:Move}
 |{kind:'round';sessionId:string;roundId:string;winner:'streamer'|'boss';reason:'ko'|'timeout';koMove?:Move;koSupporters?:string[]}
 |{kind:'finalize';sessionId:string;mvpId?:string|null}
 |{kind:'forget';sessionId:string;userId:string};
export type MemorySnapshot={view:ViewerMemoryView;optOut:string[];forgotten:string[]};
export const memoryOpaqueId=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9:_-]{1,100}$/.test(value);
export const memoryUserId=(value:unknown):value is string=>typeof value==='string'&&/^[0-9]{1,30}$/.test(value);
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const name=(value:unknown):value is string=>typeof value==='string'&&/^[^\p{C}]{1,100}$/u.test(value)&&!!value.trim();
const move=(value:unknown):value is Move=>typeof value==='string'&&MOVES.includes(value as Move);
const keys=(value:Record<string,unknown>,allowed:string[])=>Object.keys(value).every(key=>allowed.includes(key));
/** Structured observer data only: raw text, channel, credentials, game state and source tags fail closed. */
export function validateMemoryEvent(value:unknown):MemoryEvent|null {
 if(!record(value)||!memoryOpaqueId(value.sessionId))return null;
 const {sessionId}=value;
 if(value.kind==='chat-seen'&&keys(value,['kind','sessionId','userId','displayName'])&&memoryUserId(value.userId)&&name(value.displayName))return {kind:value.kind,sessionId,userId:value.userId,displayName:value.displayName};
 if(value.kind==='vote'&&keys(value,['kind','sessionId','beatId','userId','displayName','move'])&&memoryOpaqueId(value.beatId)&&memoryUserId(value.userId)&&name(value.displayName)&&move(value.move))return {kind:value.kind,sessionId,beatId:value.beatId,userId:value.userId,displayName:value.displayName,move:value.move};
 if(value.kind==='round'&&keys(value,['kind','sessionId','roundId','winner','reason','koMove','koSupporters'])&&memoryOpaqueId(value.roundId)&&(value.winner==='streamer'||value.winner==='boss')&&(value.reason==='ko'||value.reason==='timeout')&&(value.koMove===undefined||move(value.koMove))&&(value.koSupporters===undefined||Array.isArray(value.koSupporters)&&value.koSupporters.length<=5000&&value.koSupporters.every(memoryUserId))){
  if((value.koMove!==undefined||value.koSupporters!==undefined)&&(value.winner!=='boss'||value.reason!=='ko'))return null;
  if((value.koSupporters?.length??0)>0&&value.koMove===undefined)return null;
  return {kind:value.kind,sessionId,roundId:value.roundId,winner:value.winner,reason:value.reason,...(value.koMove!==undefined?{koMove:value.koMove}:{}),...(value.koSupporters!==undefined?{koSupporters:[...new Set(value.koSupporters)]}:{})};
 }
 if(value.kind==='finalize'&&keys(value,['kind','sessionId','mvpId'])&&(value.mvpId===undefined||value.mvpId===null||memoryUserId(value.mvpId)))return {kind:value.kind,sessionId,...(value.mvpId!==undefined?{mvpId:value.mvpId}:{})};
 if(value.kind==='forget'&&keys(value,['kind','sessionId','userId'])&&memoryUserId(value.userId))return {kind:value.kind,sessionId,userId:value.userId};
 return null;
}
export function validateMemoryBatch(value:unknown):MemoryEvent[]|null {
 if(!record(value)||!keys(value,['events'])||!Array.isArray(value.events)||value.events.length<1||value.events.length>100)return null;
 const events=value.events.map(validateMemoryEvent);return events.every((event):event is MemoryEvent=>event!==null)?events:null;
}
