import {mkdir,readFile,rename,writeFile,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {ViewerMemory,emptyViewerMemory,validateViewerMemory,type ViewerIdentity,type CountedMemoryVote,type MemoryRound,type ViewerMemoryView} from '../shared/src/viewer-memory.js';
export type ViewerMemoryOptions={file?:string;source:'live'|'sim'|'booth';now?:()=>number};
export async function createViewerMemory(options:ViewerMemoryOptions){
 const now=options.now??Date.now,file=resolve(options.file??'data/viewers.json'),enabled=options.source==='live';let data=emptyViewerMemory(),loaded=false;
 if(enabled){try{data=validateViewerMemory(JSON.parse(await readFile(file,'utf8')),now());loaded=true;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}
 const memory=new ViewerMemory(data);let writes=Promise.resolve();
 const flush=()=>{if(!enabled)return Promise.resolve();const contents=JSON.stringify(memory.data,null,2);const temporary=`${file}.${process.pid}.${randomUUID()}.tmp`;
  const task=writes.catch(()=>{}).then(async()=>{try{await mkdir(dirname(file),{recursive:true});await writeFile(temporary,contents,{mode:0o600});await rename(temporary,file);}catch(error){await rm(temporary,{force:true}).catch(()=>{});throw error;}});writes=task;return task;};
 if(enabled&&loaded)await flush(); // Retention and allowlist deletions must reach disk at startup.
 return {
  observeChat:(event:ViewerIdentity)=>{if(enabled)memory.observeChat(event,now());},
  countedVote:(event:CountedMemoryVote)=>{if(enabled)memory.countedVote(event,now());},
  completedRound:async(event:MemoryRound)=>{if(enabled){memory.completedRound(event,now());await flush();}},
  finalizeSession:async(event:{channelId:string;serverSessionId:string;mvpId?:string|null})=>{if(enabled){memory.finalizeSession(event);await flush();}},
  forget:async(event:{channelId:string;userId:string})=>{if(enabled){memory.forget(event);await flush();}},
  snapshot:(channelId:string,settings:{prospectiveMvpId?:string|null;serverSessionId?:string}={}):ViewerMemoryView|null=>enabled?memory.snapshot(channelId,now(),settings):null,
  isOptedOut:(channelId:string,userId:string)=>enabled&&memory.isOptedOut(channelId,userId),
  flush,
 };
}
