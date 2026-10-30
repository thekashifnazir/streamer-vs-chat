import {validateBoss,type BossDef} from './boss-def';
import {gateBoss,tuneBoss} from './boss-forge';
import type {ForgeCallMetrics,ForgeGateView,ForgeSnapshot} from './forge-view';
import {ForgeDailyCapError,type ForgeClient,type ForgeResponse} from './forge-client';
import {forgeModerationRequest,forgeResponseRequest,type ForgeRepair} from './forge-request';
type Tune={factor:number;def:BossDef;before:ForgeGateView;after:ForgeGateView};
type Idea={id:string;idea:string;order:number};
type Pricing={inputUsdPerMillion:number;outputUsdPerMillion:number;cachedInputUsdPerMillion?:number};
export type ForgeOptions={client:ForgeClient|null;protectedNames:()=>string[];isBetweenRounds:()=>boolean;onChange:(view:ForgeSnapshot)=>void;onAccepted:(boss:BossDef)=>void;now?:()=>number;log?:(metrics:ForgeCallMetrics)=>void;pricing?:Pricing;validate?:(value:unknown,names:string[])=>string[];gate?:(boss:BossDef)=>ForgeGateView|Promise<ForgeGateView>;tune?:(boss:BossDef)=>Tune|Promise<Tune>};
const initial=(available:boolean):ForgeSnapshot=>({betweenRounds:false,status:available?'idle':'unavailable',ideas:[],idea:null,boss:null,errors:[],before:null,after:null,factor:null,ai:null});
const tokens=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
function output(response:ForgeResponse){
 if(response.status&&response.status!=='completed')throw new Error('Model response was incomplete');
 if(response.output?.some(item=>item.content?.some(part=>part.type==='refusal'||part.refusal)))throw new Error('Model declined this proposal');
 const text=response.output_text??response.output?.flatMap(item=>item.content??[]).filter(part=>part.type==='output_text').map(part=>part.text??'').join('')??'';
 if(!text||text.length>32768)throw new Error('Model did not return a bounded BossDef');return text;
}
function strings(value:unknown):string[]{if(typeof value==='string')return[value];if(Array.isArray(value))return value.flatMap(strings);if(value&&typeof value==='object')return Object.values(value).flatMap(strings);return[];}
/** One generation at a time. Untrusted text is never logged or forwarded to speech. */
export class BossForge {
 private view:ForgeSnapshot;private ideas=new Map<string,Idea>();private submissions=new Set<string>();private endorsements=new Map<string,string>();private sequence=0;private epoch=0;private controller:AbortController|null=null;private running=false;
 constructor(private options:ForgeOptions){this.view=initial(!!options.client);}
 private now(){return this.options.now?.()??Date.now();}
 private ranked(){const counts=new Map<string,number>();for(const id of this.endorsements.values())counts.set(id,(counts.get(id)??0)+1);return [...this.ideas.values()].sort((a,b)=>(counts.get(b.id)??0)-(counts.get(a.id)??0)||a.order-b.order).map(idea=>({id:idea.id,idea:idea.idea,votes:counts.get(idea.id)??0}));}
 snapshot():ForgeSnapshot{return structuredClone({...this.view,betweenRounds:this.options.isBetweenRounds(),ideas:this.ranked().slice(0,3)});}
 private publish(patch:Partial<ForgeSnapshot>={}){this.view={...this.view,...patch};this.options.onChange(this.snapshot());}
 private current(epoch:number){return epoch===this.epoch;}
 private async moderate(input:string[],epoch:number,signal?:AbortSignal){
  if(!this.options.client)throw new Error('Forge API unavailable');const started=this.now();
  try{const result=await this.options.client.moderations.create(forgeModerationRequest(input),{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});if(!this.current(epoch))return false;return result.results.length===input.length&&result.results.every(item=>item.flagged===false);}
  finally{this.options.log?.({operation:'moderation',model:'omni-moderation-latest',latencyMs:Math.max(0,this.now()-started),inputTokens:null,outputTokens:null,costUsd:null});}
 }
 async submit({viewerId,idea}:{viewerId:string;idea:string}){
  if(!this.options.client)return false;idea=idea.trim();if(!viewerId||!idea||idea.length>300||/^\+1(?:\s|$)/.test(idea)||this.submissions.has(viewerId))return false;
  this.submissions.add(viewerId);const epoch=this.epoch;
  try{if(!await this.moderate([idea],epoch)||!this.current(epoch))return false;const order=++this.sequence,id=`idea-${order}`;this.ideas.set(id,{id,idea,order});this.publish(this.running?{}:{status:'collecting'});return true;}
  catch(error){if(this.current(epoch)&&!this.running)this.publish({errors:[error instanceof ForgeDailyCapError?'daily cap reached':'Idea moderation was unavailable; the proposal was not admitted.']});return false;}
 }
 endorse({viewerId,ideaId}:{viewerId:string;ideaId?:string}){
  const target=ideaId??[...this.ideas.values()].at(-1)?.id;if(!viewerId||!target||!this.ideas.has(target))return false;this.endorsements.set(viewerId,target);this.publish();return true;
 }
 /** Call on every authoritative phase change; a combat start retires all outstanding results. */
 observePhase(){if(this.running&&!this.options.isBetweenRounds())this.veto();}
 veto(){this.epoch++;this.controller?.abort();this.controller=null;this.running=false;this.publish({status:'vetoed',boss:null,errors:['Forge proposal vetoed.']});}
 resetBout(){this.epoch++;this.controller?.abort();this.controller=null;this.running=false;this.ideas.clear();this.submissions.clear();this.endorsements.clear();this.view=initial(!!this.options.client);this.publish();}
 private generationMetrics(operation:'generation'|'repair',response:ForgeResponse|undefined,started:number){
  const input=tokens(response?.usage?.input_tokens),output=tokens(response?.usage?.output_tokens),pricing=this.options.pricing,cached=tokens(response?.usage?.input_tokens_details?.cached_tokens)??0;
  const cost=pricing&&input!==null&&output!==null&&cached<=input?((input-cached)*pricing.inputUsdPerMillion+cached*(pricing.cachedInputUsdPerMillion??pricing.inputUsdPerMillion)+output*pricing.outputUsdPerMillion)/1e6:null;
  const metrics:ForgeCallMetrics={operation,model:'gpt-6-luna',latencyMs:Math.max(0,this.now()-started),inputTokens:input,outputTokens:output,costUsd:cost};this.options.log?.(metrics);return metrics;
 }
 async generate():Promise<BossDef|null>{
  if(!this.options.client||this.running||!this.options.isBetweenRounds())return null;const winner=this.ranked()[0];if(!winner){this.publish({status:'rejected',errors:['No moderated idea has been selected.']});return null;}
  const epoch=this.epoch,controller=new AbortController();this.controller=controller;this.running=true;const started=this.now();let calls:ForgeCallMetrics[]=[];
  const validPhase=()=>this.current(epoch)&&!controller.signal.aborted&&this.options.isBetweenRounds();
  this.publish({status:'generating',idea:winner.idea,boss:null,errors:[],before:null,after:null,factor:null,ai:null});
  let repair:ForgeRepair|undefined;
  try{
   let def:BossDef|undefined;
   for(let attempt=0;attempt<2;attempt++){
    let response:ForgeResponse|undefined;const callAt=this.now();
    try{response=await this.options.client.responses.create(forgeResponseRequest(winner.idea,repair),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)])});}
    finally{calls.push(this.generationMetrics(attempt?'repair':'generation',response,callAt));}
    if(!validPhase())return null;const text=output(response!);let raw:unknown,errors:string[];
    try{raw=JSON.parse(text);errors=(this.options.validate??validateBoss)(raw,this.options.protectedNames());}catch{raw=undefined;errors=['Response was not valid BossDef JSON.'];}
    if(!await this.moderate(raw===undefined?[text]:strings(raw),epoch,controller.signal))throw new Error('Generated text did not pass moderation');
    if(!validPhase())return null;
    if(!errors.length){def=raw as BossDef;break;}this.publish({status:'validating',errors});
    if(attempt)throw new Error('Repaired boss still failed deterministic validation');
    repair={previous:text,errors};
   }
   if(!def)throw new Error('No valid boss returned');this.publish({status:'validating',boss:def,errors:[]});
   const before=await (this.options.gate??gateBoss)(def);if(!validPhase())return null;let accepted=def,after=before,factor=1;
   if(!before.pass){this.publish({status:'tuning',before});const tuned=await (this.options.tune??tuneBoss)(def);accepted=tuned.def;after=tuned.after;factor=tuned.factor;}
   if(!validPhase())return null;
   if((this.options.validate??validateBoss)(accepted,this.options.protectedNames()).length||!after.pass)throw new Error('Boss failed the deterministic balance gate');
   // Tuning may alter arbitrary fields in an injected implementation: check all strings again.
   if(!await this.moderate(strings(accepted),epoch,controller.signal))throw new Error('Accepted boss text did not pass moderation');if(!validPhase())return null;
   if((this.options.validate??validateBoss)(accepted,this.options.protectedNames()).length)throw new Error('Boss failed the deterministic balance gate');
   const sum=(key:'inputTokens'|'outputTokens'|'costUsd')=>calls.every(call=>call[key]!==null)?calls.reduce((n,call)=>n+call[key]!,0):null;
   this.publish({status:'accepted',boss:accepted,before,after,factor,errors:[],ai:{model:'gpt-6-luna',latencyMs:Math.max(0,this.now()-started),inputTokens:sum('inputTokens'),outputTokens:sum('outputTokens'),costUsd:sum('costUsd'),repair:calls.length>1}});this.options.onAccepted(structuredClone(accepted));return structuredClone(accepted);
  }catch(error){if(this.current(epoch))this.publish({status:'rejected',boss:null,errors:[error instanceof ForgeDailyCapError?'daily cap reached':error instanceof Error&&['Model response was incomplete','Model declined this proposal','Generated text did not pass moderation','Accepted boss text did not pass moderation','Repaired boss still failed deterministic validation','Boss failed the deterministic balance gate'].includes(error.message)?error.message:'Forge generation failed; no boss was accepted.']});return null;}
  finally{if(this.current(epoch)){this.running=false;this.controller=null;if(this.view.status==='generating'||this.view.status==='validating'||this.view.status==='tuning')this.publish({status:'vetoed',boss:null,errors:['Round changed before the proposal could be accepted.']});}}
 }
}
export function createForgeService(options:ForgeOptions){return new BossForge(options);}
/** Commands are handled separately from the reducer; moderators' existing !veto uses veto(). */
export function forgeCommand(service:BossForge,{viewerId,text}:{viewerId:string;text:string}):Promise<boolean>|boolean{
 const match=/^!forge(?:\s+([\s\S]*))?$/i.exec(text.trim());if(!match)return false;const body=(match[1]??'').trim();const endorse=/^\+1(?:\s+([1-3]|idea-\d+))?$/i.exec(body);
 if(endorse){const selection=endorse[1];if(selection&&/^[1-3]$/.test(selection)&&!service.snapshot().ideas[Number(selection)-1])return false;const ideaId=selection&&/^[1-3]$/.test(selection)?service.snapshot().ideas[Number(selection)-1]?.id:selection;return service.endorse({viewerId,...(ideaId?{ideaId}:{})});}
 return service.submit({viewerId,idea:body});
}
