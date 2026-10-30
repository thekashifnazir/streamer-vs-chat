import {ViewerMemory,emptyViewerMemory,validateViewerMemory,type ViewerMemoryData,type ViewerMemoryRuntime,type ViewerIdentity,type CountedMemoryVote,type MemoryRound,type ViewerMemoryView} from './viewer-memory';
export type ViewerMemoryStored={data:unknown;runtime?:unknown};
export type ViewerMemorySave={data:ViewerMemoryData;runtime?:ViewerMemoryRuntime};
export type ViewerMemoryBackend={load:()=>Promise<ViewerMemoryStored|null>;save:(value:ViewerMemorySave)=>Promise<void>};
/** Pure load boundary shared by file and transactional hosts; drops expired runtime identities. */
export function loadViewerMemoryState(stored:ViewerMemoryStored|null,at:number,restoreRuntime=true):ViewerMemory{
 const memory=new ViewerMemory(stored?validateViewerMemory(stored.data,at):emptyViewerMemory());
 if(restoreRuntime&&stored?.runtime!==undefined)memory.restoreRuntime(stored.runtime,at);
 return memory;
}
/** Shared lifecycle; storage adapters own atomicity, permissions and their physical format. */
export async function createViewerMemoryStore(options:{backend:ViewerMemoryBackend;source:'live'|'sim'|'booth';now?:()=>number;persistRuntime?:boolean}){
 const now=options.now??Date.now,enabled=options.source==='live';
 const stored=enabled?await options.backend.load():null;
 const memory=loadViewerMemoryState(stored,now(),!!options.persistRuntime);
 let writes=Promise.resolve();
 const flush=()=>{
  if(!enabled)return Promise.resolve();
  const value:ViewerMemorySave={data:structuredClone(memory.data),...(options.persistRuntime?{runtime:memory.checkpoint()}:{})};
  const task=writes.catch(()=>{}).then(()=>options.backend.save(value));writes=task;return task;
 };
 if(stored)await flush(); // Persist retention/allowlist cleaning before serving data.
 return {
  observeChat:(event:ViewerIdentity)=>{if(enabled)memory.observeChat(event,now());},
  countedVote:(event:CountedMemoryVote)=>{if(enabled)memory.countedVote(event,now());},
  completedRound:async(event:MemoryRound)=>{if(enabled){memory.completedRound(event,now());await flush();}},
  finalizeSession:async(event:{channelId:string;serverSessionId:string;mvpId?:string|null})=>{if(enabled){memory.finalizeSession(event,now());await flush();}},
  forget:async(event:{channelId:string;userId:string})=>{if(enabled){memory.forget(event);await flush();}},
  snapshot:(channelId:string,settings:{prospectiveMvpId?:string|null;serverSessionId?:string}={}):ViewerMemoryView|null=>enabled?memory.snapshot(channelId,now(),settings):null,
  isOptedOut:(channelId:string,userId:string)=>enabled&&memory.isOptedOut(channelId,userId),
  flush,
 };
}
export type ViewerMemoryStore=Awaited<ReturnType<typeof createViewerMemoryStore>>;
