import {mulberry32} from '../shared/src/engine';
export class ChatLoadSchedule {
 private viewers:{last:number;next:number}[];private random:()=>number;
 constructor(count=1000,seed=2026,at=0){this.random=mulberry32(seed);this.viewers=Array.from({length:count},()=>({last:at-1000,next:at+1000+this.random()*3000}));}
 burst(at:number,limit=300):number {let changed=0;for(const viewer of this.viewers){if(changed>=limit)break;if(at-viewer.last>=1000){viewer.next=Math.min(viewer.next,at);changed++;}}return changed;}
 due(at:number):{user:string;text:string}[]{const messages:{user:string;text:string}[]=[];this.viewers.forEach((viewer,index)=>{if(viewer.next>at)return;messages.push({user:`load-viewer-${index}`,text:['!jab','!hookl','!hookr','!combo'][Math.floor(this.random()*4)]!});viewer.last=at;viewer.next=at+1000+this.random()*3000;});return messages;}
}
const counts=()=>({JAB:0,HOOK_L:0,HOOK_R:0,COMBO:0,SUPER:0});
const entries=(value:Record<string,unknown>)=>JSON.stringify(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));
export class LoadAudit {
 readonly seen=new Set<string>();readonly latency:number[]=[];readonly issues:string[]=[];readonly beats=new Set<string>();
 private expected=new Map<string,{votes:Record<string,string>;events:number}>();
 counted=0;ignored=0;maxDrift=0;drawnEvents=0;terminalEvents=0;snapshots=0;
 receive(audit:any,at:number){
  if(!audit)return;if(audit.overflow)this.issues.push('telemetry overflow');
  for(const receipt of audit.receipts??[]){if(this.seen.has(receipt.messageId))continue;this.seen.add(receipt.messageId);const latency=at-receipt.receivedAt;if(!Number.isFinite(latency)||latency<0)this.issues.push('invalid receive-clock latency');this.latency.push(latency);
   if(receipt.counted){this.counted++;const key=`${receipt.runId}:${receipt.round}:${receipt.beat}`,current=this.expected.get(key)??{votes:{},events:0};Object.defineProperty(current.votes,receipt.user,{value:receipt.move,enumerable:true,configurable:true,writable:true});current.events++;this.expected.set(key,current);}else this.ignored++;
  }
  for(const beat of audit.beats??[]){const key=`${beat.runId}:${beat.round}:${beat.beat}`;if(this.beats.has(key))continue;this.beats.add(key);this.maxDrift=Math.max(this.maxDrift,beat.observedAt-beat.at);const expected=this.expected.get(key)??{votes:{},events:0};
   if(entries(expected.votes)!==entries(beat.votes)||expected.events!==beat.acceptedEvents)this.issues.push(`latest-vote/count mismatch at${key}`);this.drawnEvents+=expected.events;this.expected.delete(key);
  }
 }
 snapshot(runId:number,state:any,tally?:any){
  if(state.round.over){const prefix=`${runId}:${state.round.number}:`;for(const[key,value]of this.expected)if(key.startsWith(prefix)){this.terminalEvents+=value.events;this.expected.delete(key);}return;}
  const key=`${runId}:${state.round.number}:${state.clock.beat}`,expected=this.expected.get(key)??{votes:{},events:0};
  if(entries(expected.votes)!==entries(state.votes))this.issues.push('WS latest-viewer map mismatch');
  const raw=counts(),normal=counts(),raid=counts();let normalN=0,raiderN=0;
  const boosted=state.raid.ends_at!==null&&(state.clock.paused_at??state.now)<state.raid.ends_at;
  for(const[user,move]of Object.entries(expected.votes)){raw[move as keyof typeof raw]++;if(boosted&&Object.hasOwn(state.raiders,user)&&state.raiders[user]){raid[move as keyof typeof raid]++;raiderN++;}else{normal[move as keyof typeof normal]++;normalN++;}}
  if(entries(raw)!==entries(state.tally)||state.voters!==Object.keys(expected.votes).length)this.issues.push('WS tally/raw-voter mismatch');
  if(tally){const weight=raiderN?Math.min(2,normalN/raiderN):0,weights=Object.fromEntries(Object.keys(raw).map(move=>[move,normal[move as keyof typeof normal]+raid[move as keyof typeof raid]*weight]));if(entries(raw)!==entries(tally.tally)||entries(weights)!==entries(tally.weights)||tally.voters!==Object.keys(expected.votes).length)this.issues.push('HUD tally/weight mismatch');}
  this.snapshots++;
 }
 assertPendingBeat(runId:number,state:any){const current=`${runId}:${state.round.number}:${state.clock.beat}`;for(const key of this.expected.keys())if(key!==current)this.issues.push(`unresolved prior beat${key}`);}
 pendingEvents(){return [...this.expected.values()].reduce((sum,value)=>sum+value.events,0);}
 percentile(fraction:number){if(!this.latency.length)return Infinity;const sorted=[...this.latency].sort((a,b)=>a-b);return sorted[Math.ceil(sorted.length*fraction)-1]!;}
 p95(){return this.percentile(.95);}
}
