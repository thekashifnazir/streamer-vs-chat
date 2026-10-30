import {validateBoss,type BossDef} from '../../shared/src/boss-def';
import {gateBoss,tuneBoss} from '../../shared/src/boss-forge';
const scope=globalThis as unknown as {onmessage:(event:MessageEvent)=>void;postMessage:(message:unknown)=>void};
scope.onmessage=(event:MessageEvent<{id:number;json:string;operation?:'gate'|'tune'}>)=>{
 const started=performance.now();
 try{const raw:unknown=JSON.parse(event.data.json);const errors=validateBoss(raw,[],{allowDefault:true});
  if(errors.length){scope.postMessage({id:event.data.id,errors,elapsedMs:performance.now()-started});return;}
  const result=event.data.operation==='gate'?gateBoss(raw as BossDef):tuneBoss(raw as BossDef);
  scope.postMessage({id:event.data.id,result,errors:[],elapsedMs:performance.now()-started});
 }catch(error){scope.postMessage({id:event.data.id,errors:[error instanceof Error?error.message:'Validation failed.'],elapsedMs:performance.now()-started});}
};
