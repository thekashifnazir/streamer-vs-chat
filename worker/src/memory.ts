import {loadViewerMemoryState} from '../../shared/src/viewer-memory-store';
import type {ViewerMemoryData} from '../../shared/src/viewer-memory';
import type {MemoryStorage} from './memory-storage';
import {memoryOpaqueId,memoryUserId,validateMemoryBatch,type MemoryEvent,type MemorySnapshot} from '../../shared/src/memory-events';
/** A transaction contains the domain plus its runtime checkpoint, so retries/recreation preserve dedup. */
export class HostedMemory {
 constructor(private storage:MemoryStorage,private now:()=>number,private enabled:()=>boolean,private acknowledge:(channel:string)=>Promise<void>){}
 private async access(channel:string,events:MemoryEvent[],sessionId?:string,mvpId?:string|null):Promise<MemorySnapshot>{
  if(!this.enabled())throw new Error('hosted-memory-off');if(!memoryUserId(channel))throw new Error('invalid-channel');
  if(sessionId!==undefined&&!memoryOpaqueId(sessionId)||mvpId!==undefined&&mvpId!==null&&!memoryUserId(mvpId))throw new Error('invalid-query');
  const at=this.now();
  const result=this.storage.transaction(storage=>{
   storage.prune(at-90*86400000);
   const stored=storage.load();
   if(stored!==undefined&&(!stored||typeof stored!=='object'||Array.isArray(stored)||Object.keys(stored).some(key=>!['channel','data','runtime'].includes(key))||!Object.hasOwn(stored,'data')||!Object.hasOwn(stored,'runtime')||!('channel'in stored)||stored.channel!==channel))throw new Error('invalid-memory-storage');
   const raw=stored as {channel:string;data:ViewerMemoryData;runtime:unknown}|undefined;
   const memory=loadViewerMemoryState(raw?{data:raw.data,runtime:raw.runtime}:null,at);
   const data=memory.data;
   if(Object.entries(data.channels).some(([id,c])=>id!==channel||Object.keys(c.viewers).some(user=>!memoryUserId(user))||c.optOut.some(user=>!memoryUserId(user))))throw new Error('invalid-memory-storage');
   const forgotten:string[]=[],acknowledge:string[]=[];
   for(const event of events){
    const identity='userId'in event?{channelId:channel,userId:event.userId}:null;
    if(event.kind==='chat-seen')memory.observeChat({...identity!,displayName:event.displayName},at);
    else if(event.kind==='vote'){if(memory.isOptedOut(channel,event.userId))continue;const vote={...identity!,displayName:event.displayName,serverSessionId:event.sessionId,beatId:event.beatId,move:event.move};if(storage.vote(event.sessionId,event.beatId,event.userId,at))memory.countedVote(vote,at);else memory.refreshVote(vote,at);}
    else if(event.kind==='round')memory.completedRound({channelId:channel,serverSessionId:event.sessionId,roundId:event.roundId,winner:event.winner,reason:event.reason,...(event.koMove?{koMove:event.koMove}:{}),...(event.koSupporters?{koSupporters:event.koSupporters.map(id=>({id}))}:{})},at);
    else if(event.kind==='finalize')memory.finalizeSession({channelId:channel,serverSessionId:event.sessionId,mvpId:event.mvpId},at);
    else {if(!memory.isOptedOut(channel,event.userId))acknowledge.push(event.userId);memory.forget({channelId:channel,userId:event.userId});storage.forgetVotes(event.userId);forgotten.push(event.userId);}
   }
   const view=memory.snapshot(channel,at,{...(sessionId?{serverSessionId:sessionId}:{}),...(mvpId!==undefined?{prospectiveMvpId:mvpId}:{})});
   const optOut=[...(data.channels[channel]?.optOut??[])];
   if(!this.enabled())throw new Error('hosted-memory-off');
   storage.save({channel,data,runtime:memory.checkpoint()});
   return {snapshot:{view,optOut,forgotten:[...new Set(forgotten)]},acknowledge};
  });
  await this.storage.flush();
  // No acknowledgement is possible before the deletion and tombstone are committed.
  for(const _id of result.acknowledge)try{await this.acknowledge(channel);}catch{/* Durable deletion remains authoritative if bot delivery fails. */}
  return result.snapshot;
 }
 events(channel:string,events:MemoryEvent[]):Promise<MemorySnapshot>{const valid=validateMemoryBatch({events});if(!valid)return Promise.reject(new Error('invalid-memory-events'));return this.access(channel,valid,valid.at(-1)?.sessionId);}
 snapshot(channel:string,sessionId?:string,mvpId?:string|null):Promise<MemorySnapshot>{return this.access(channel,[],sessionId,mvpId);}
}
