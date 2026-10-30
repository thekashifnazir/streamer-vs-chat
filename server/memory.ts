import {mkdir,readFile,rename,writeFile,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {createViewerMemoryStore} from '../shared/src/viewer-memory-store.js';
export type ViewerMemoryOptions={file?:string;source:'live'|'sim'|'booth';now?:()=>number};
export async function createViewerMemory(options:ViewerMemoryOptions){
 const file=resolve(options.file??'data/viewers.json');
 return createViewerMemoryStore({...options,backend:{
  async load(){try{return {data:JSON.parse(await readFile(file,'utf8'))};}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}},
  async save(value){const contents=JSON.stringify(value.data,null,2),temporary=`${file}.${process.pid}.${randomUUID()}.tmp`;
   try{await mkdir(dirname(file),{recursive:true});await writeFile(temporary,contents,{mode:0o600});await rename(temporary,file);}catch(error){await rm(temporary,{force:true}).catch(()=>{});throw error;}
  },
 }});
}
