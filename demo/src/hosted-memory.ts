import type {BrowserAuth} from './twitch/auth';
import type {HostedChatMessage} from './twitch/eventsub';
import type {GameState} from '../../shared/src/engine';
import type {ChatVote} from '../../shared/src/index';
import type {GameSummary} from '../../shared/src/highlights';
import {validateMemoryEvent,type MemoryEvent,type MemorySnapshot} from '../../shared/src/memory-events';
import type {ViewerMemoryView} from '../../shared/src/viewer-memory';
export const HOSTED_MEMORY_LABEL='Remember my viewers (stores Twitch IDs, names and vote counts for 90 days; viewers can type !forgetme)';
/** Explicitly opted-in live observer. No storage, raw text retention, or reducer inputs. */
export function createHostedMemory(options:{auth:Pick<BrowserAuth,'authenticated'|'account'|'backendRequest'>;getState:()=>GameState|null;fetch?:typeof fetch;sessionId?:string;onChange?:()=>void;onStatus?:(message:string)=>void;setInterval?:typeof globalThis.setInterval;clearInterval?:typeof globalThis.clearInterval}){
 const request=options.fetch??globalThis.fetch.bind(globalThis),schedule=options.setInterval??globalThis.setInterval,cancel=options.clearInterval??globalThis.clearInterval;
 const sessionId=options.sessionId??crypto.randomUUID();
 let available=false,enabled=false,disposed=false,generation=0,revision=0,epoch=0,seed:number|undefined,roundCursor=0,damageCursor=0,observed:GameState|null=null,finalized=false,combat=false;
 let view:ViewerMemoryView|null=null,timer:ReturnType<typeof setInterval>|undefined,flight:Promise<void>|null=null,snapshotting=false,inFlightEvents=0,retryAfter=0;
 let queue:MemoryEvent[]=[],accountId:string|null=null;
 const accepted=new Map<string,Set<string>>();
 const controllers=new Set<AbortController>(),optOut=new Set<string>(),names=new Map<string,string>(),credit=new Map<string,number>();
 const active=()=>enabled&&!disposed&&options.auth.authenticated&&accountId!==null&&options.auth.account?.id===accountId;
 const report=(message:string)=>options.onStatus?.(message);
 function baseline(state:GameState|null){observed=state;seed=state?.match.seed;roundCursor=state?.log.rounds.length??0;damageCursor=state?.log.damage.length??0;}
 function mvp():GameSummary['chatMvp']{let best:GameSummary['chatMvp']=null;for(const[user,damage]of credit)if(!optOut.has(user)&&(!best||damage>best.damage+1e-9||Math.abs(damage-best.damage)<=1e-9&&user<best.user))best={user,damage,...(names.has(user)?{displayName:names.get(user)}:{})};return best;}
 function apply(data:MemorySnapshot,token:number,currentView=true){
  if(!active()||token!==generation||!data?.view||data.view.simulated!==false||!Array.isArray(data.optOut)||!Array.isArray(data.forgotten))return;
  for(const user of data.optOut){optOut.add(user);names.delete(user);credit.delete(user);}
  if(currentView)view=data.view;if(data.forgotten.length)report('Your viewer memory has been forgotten.');options.onChange?.();
 }
 async function send(path:string,init:RequestInit,token:number){if(!active()||token!==generation)return false;const requestRevision=revision;const controller=new AbortController();controllers.add(controller);const timeout=setTimeout(()=>controller.abort(),10000);try{const response=await options.auth.backendRequest(path,{...init,signal:controller.signal});if(!response.ok)throw new Error('Memory unavailable');const data=await response.json();apply(data,token,requestRevision===revision);return true;}catch{if(active()&&token===generation)report('Viewer memory unavailable; gameplay continues.');return false;}finally{clearTimeout(timeout);controllers.delete(controller);}}
 function flush():Promise<void>{
  if(!active()||Date.now()<retryAfter)return Promise.resolve();if(flight)return flight;
  const token=generation;
  const task=(async()=>{while(active()&&generation===token&&queue.length){const events=queue.splice(0,100);inFlightEvents=events.length;const sent=await send('/api/memory/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events})},token);if(generation!==token)break;inFlightEvents=0;if(!sent){queue.unshift(...events);retryAfter=Date.now()+15000;break;}}})();
  flight=task;void task.finally(()=>{if(flight===task){flight=null;if(active()&&queue.length)void flush();}});return task;
 }
 function enqueue(event:MemoryEvent){if(!active()||!validateMemoryEvent(event))return;if(event.kind==='forget'&&queue.some(pending=>pending.kind==='forget'&&pending.userId===event.userId))return;if(queue.length+inFlightEvents>=1000){const expendable=event.kind==='forget'?queue.map(pending=>pending.kind!=='forget').lastIndexOf(true):-1;if(expendable>=0)queue.splice(expendable,1);else{report('Viewer memory queue full; gameplay continues.');return;}}revision++;queue.push(event);void flush();}
 async function snapshot(){if(!active()||snapshotting)return;snapshotting=true;const token=generation;try{await flush();if(!active()||generation!==token||queue.length>0||inFlightEvents>0)return;const winner=mvp();await send(`/api/memory/snapshot?sessionId=${sessionId}${winner?`&mvpId=${winner.user}`:''}`,{},token);}finally{snapshotting=false;}}
 function clear(){generation++;for(const controller of controllers)controller.abort();controllers.clear();queue=[];flight=null;inFlightEvents=0;retryAfter=0;view=null;names.clear();credit.clear();accepted.clear();combat=false;finalized=false;if(timer!==undefined)cancel(timer);timer=undefined;baseline(options.getState());options.onChange?.();}
 function setEnabled(value:boolean){const nextAccount=options.auth.account?.id??null;if(nextAccount!==accountId){optOut.clear();accountId=nextAccount;}enabled=value&&available&&!disposed&&options.auth.authenticated&&accountId!==null;clear();if(enabled){timer=schedule(()=>{void snapshot();},15000);void snapshot();}return enabled;}
 function observeGame(state:GameState,reset=false){
  if(reset||seed!==state.match.seed){epoch++;seed=state.match.seed;roundCursor=0;damageCursor=0;observed=null;}
  if(!active()){baseline(state);return;}
  // Enabling midway through a match baselines all earlier evidence.
  if(!observed){observed=state;roundCursor=state.log.rounds.length;damageCursor=state.log.damage.length;return;}
  combat ||=state.log.resolved.length>0||state.log.damage.length>damageCursor;
  for(const hit of state.log.damage.slice(damageCursor)){const voters=accepted.get(`${epoch}:${hit.round}:${hit.beat}`);const supporters=[...new Set(hit.supporters)];if(hit.damage<=0||!supporters.length)continue;for(const user of supporters)if(voters?.has(user)&&!optOut.has(user))credit.set(user,(credit.get(user)??0)+hit.damage/supporters.length);}damageCursor=state.log.damage.length;
  for(const round of state.log.rounds.slice(roundCursor)){
   const hit=round.reason==='ko'&&round.winner==='boss'?[...state.log.damage].reverse().find(item=>item.round===round.number&&item.at===round.at&&item.damage>0):undefined;
   const attack=hit?[...state.log.telegraphs].reverse().find(item=>item.round===hit.round&&item.beat===hit.beat):undefined;
   enqueue({kind:'round',sessionId,roundId:`${epoch}:${round.number}`,winner:round.winner,reason:round.reason,...(attack?{koMove:attack.move,koSupporters:hit!.supporters.filter(user=>!optOut.has(user)&&accepted.get(`${epoch}:${hit!.round}:${hit!.beat}`)?.has(user))}:{})});
  }roundCursor=state.log.rounds.length;observed=state;
 }
 async function finalize(){if(!active()||finalized||!combat)return;finalized=true;enqueue({kind:'finalize',sessionId,mvpId:mvp()?.user??null});await flush();}
 return {
  get capable(){return available&&options.auth.authenticated&&!!options.auth.account?.id;},get enabled(){return active();},
  async initialize(){try{const response=await request('/api/health',{cache:'no-store'});available=response.ok&&(await response.json()).memory===true;}catch{available=false;}if(disposed)return;if(!available)report('Viewer memory is disabled on this host.');},
  setEnabled,observeGame,snapshot,flush,finalize,
  onChat(message:HostedChatMessage){if(!active())return;const userId=message.userId;if(message.text.trim().split(/\s+/,1)[0]?.toLowerCase()==='!forgetme'){optOut.add(userId);names.delete(userId);credit.delete(userId);view=null;enqueue({kind:'forget',sessionId,userId});options.onChange?.();return;}if(optOut.has(userId))return;const event:MemoryEvent={kind:'chat-seen',sessionId,userId,displayName:message.displayName};if(!validateMemoryEvent(event))return;names.set(userId,message.displayName);while(names.size>5000)names.delete(names.keys().next().value!);enqueue(event);},
  acceptedVote(vote:ChatVote,displayName:string){if(!active()||vote.simulated||optOut.has(vote.user))return;const state=options.getState();if(!state||state.paused||state.round.over||state.votes[vote.user]!==vote.move)return;const beatId=`${epoch}:${state.round.number}:${state.clock.beat}`;const event:MemoryEvent={kind:'vote',sessionId,beatId,userId:vote.user,displayName,move:vote.move};if(!validateMemoryEvent(event))return;let voters=accepted.get(beatId);if(!voters){voters=new Set();accepted.set(beatId,voters);}voters.add(vote.user);while(accepted.size>32)accepted.delete(accepted.keys().next().value!);enqueue(event);},
  view:()=>active()?view:null,
  publicSummary(summary:GameSummary):GameSummary {return enabled?{...summary,chatMvp:active()?mvp():null}:summary.chatMvp&&optOut.has(summary.chatMvp.user)?{...summary,chatMvp:null}:summary;},
  async dispose(){if(disposed)return;await finalize();disposed=true;enabled=false;clear();},
 };
}
