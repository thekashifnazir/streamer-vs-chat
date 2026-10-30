import type {BossDef} from '../../shared/src/boss-def';
import type {ForgeSnapshot} from '../../shared/src/forge-view';
import neon from '../../fixtures/bosses/neon-kraken.json';
import tin from '../../fixtures/bosses/tin-tactician.json';
import velvet from '../../fixtures/bosses/velvet-sentinel.json';
import nakMuay from '../../fixtures/bosses/nak-muay.json';
import type {tuneBoss} from '../../shared/src/boss-forge';
export const PREBAKED_BOSSES=[neon,tin,velvet,nakMuay] as BossDef[];
export function offlineForgeSnapshot(result:ReturnType<typeof tuneBoss>,idea:string):ForgeSnapshot{
 return {betweenRounds:true,status:result.after.pass?'accepted':'rejected',ideas:[],idea,boss:result.def,errors:result.after.pass?[]:['No damage factor passed every balance gate. Chat Golem remains available.'],before:result.before,after:result.after,factor:result.factor,ai:null};
}
export function mountDemoForge(host:HTMLElement,options:{betweenRounds:()=>boolean;onAccepted:(boss:BossDef|null)=>void;onSnapshot:(snapshot:ForgeSnapshot|null)=>void}){
 host.classList.add('demo-forge','more-card');host.innerHTML='<p class="setup-eyebrow">BOSS FORGE · RUNS IN YOUR BROWSER</p><h3>Fight a different boss</h3><p>Pick a ready-made boss. We test that it’s fair before you can use it, so no one gets an impossible fight.</p><label class="source-label">Boss <select aria-label="Prebaked boss"></select></label><div class="forge-actions"><button type="button" data-action="test" class="primary">Test this boss</button><button type="button" data-action="use" disabled>Use it next round</button><button type="button" data-action="default" class="text-button">Back to Chat Golem</button></div><p role="status"></p><p class="forge-reason" hidden></p><details><summary>Advanced: edit the boss file (JSON)</summary><textarea aria-label="Boss JSON" spellcheck="false"></textarea></details>';
 const select=host.querySelector('select')!,textarea=host.querySelector('textarea')!,status=host.querySelector<HTMLElement>('[role="status"]')!;
 const reason=host.querySelector<HTMLElement>('.forge-reason')!;
 const candidateName=()=>{try{const value=JSON.parse(textarea.value);return typeof value.name==='string'&&value.name.trim()?value.name.slice(0,24):'This boss';}catch{return select.selectedOptions[0]?.textContent??'This boss';}};
 const test=host.querySelector<HTMLButtonElement>('[data-action="test"]')!,use=host.querySelector<HTMLButtonElement>('[data-action="use"]')!,reset=host.querySelector<HTMLButtonElement>('[data-action="default"]')!;
 PREBAKED_BOSSES.forEach((boss,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=boss.name;select.append(option);});
 let worker:Worker|null=null,id=0,accepted:BossDef|null=null,dead=false,busy=false;
 const load=()=>{textarea.value=JSON.stringify(PREBAKED_BOSSES[Number(select.value)],null,2);accepted=null;use.disabled=true;};load();select.addEventListener('change',load);textarea.addEventListener('input',()=>{accepted=null;use.disabled=true;});
 const stop=()=>{worker?.terminate();worker=null;busy=false;select.disabled=false;textarea.readOnly=false;};
 const unavailable=()=>{stop();test.disabled=!options.betweenRounds();status.textContent='Local simulation unavailable. Chat Golem remains playable.';options.onSnapshot({betweenRounds:true,status:'unavailable',ideas:[],idea:'Local JSON',boss:null,errors:['Local simulation unavailable.'],before:null,after:null,factor:null,ai:null});};
 test.addEventListener('click',()=>{
  if(!options.betweenRounds())return;stop();accepted=null;use.disabled=true;busy=true;test.disabled=true;select.disabled=true;textarea.readOnly=true;const request=++id;
  reason.hidden=true;reason.textContent='';status.textContent='Testing… about 6 seconds.';options.onSnapshot({betweenRounds:true,status:'validating',ideas:[],idea:'Prebaked / local JSON',boss:null,errors:[],before:null,after:null,factor:null,ai:null});
  try{worker=new Worker(new URL('./forge-worker.ts',import.meta.url),{type:'module'});
   worker.onmessage=(event:MessageEvent<{id:number;errors:string[];result?:ReturnType<typeof tuneBoss>;elapsedMs:number}>)=>{
    if(dead||event.data.id!==id)return;stop();test.disabled=!options.betweenRounds();const data=event.data;
    if(data.result){const snapshot=offlineForgeSnapshot(data.result,'Prebaked / local JSON');accepted=snapshot.status==='accepted'?data.result.def:null;options.onSnapshot(snapshot);status.textContent=accepted?`✓ Fair fight. ${accepted.name} passed the balance test. Press “Use it next round”.`:`✗ ${candidateName()} didn't pass the balance test. Your current boss stays. Try another boss.`;reason.textContent=snapshot.errors.join(' ');reason.hidden=!reason.textContent;use.disabled=!accepted||!options.betweenRounds();}
    else{options.onSnapshot({betweenRounds:true,status:'rejected',ideas:[],idea:'Local JSON',boss:null,errors:data.errors,before:null,after:null,factor:null,ai:null});status.textContent=`✗ ${candidateName()} didn't pass the balance test. Your current boss stays. Try another boss.`;reason.textContent=data.errors.join(' ');reason.hidden=!reason.textContent;}
   };
   worker.onerror=()=>{if(dead)return;unavailable();};
   worker.postMessage({id:request,json:textarea.value});
  }catch{unavailable();}
 });
 use.addEventListener('click',()=>{if(accepted&&options.betweenRounds()){options.onAccepted(structuredClone(accepted));status.textContent=`${accepted.name} selected for the next round.`;}});
 reset.addEventListener('click',()=>{if(options.betweenRounds()){options.onAccepted(null);options.onSnapshot(null);status.textContent='Chat Golem selected.';}});
 return {update(){const allowed=options.betweenRounds();host.hidden=!allowed;if(!allowed&&busy){++id;stop();options.onSnapshot(null);}test.disabled=busy||!allowed;use.disabled=!accepted||!allowed;reset.disabled=!allowed;},dispose(){dead=true;++id;stop();host.replaceChildren();}};
}
