import type {GameState} from '../../shared/src/engine';
import {parseChatVote} from '../../shared/src/index';
import type {IncomingChat} from './twitch';
export class HardeningTelemetry{
 unhandledErrors=0;ingested=0;parsedVotes=0;countedVoteEvents=0;resultsSent=0;resultAttempts=0;overflow=false;
 private receipts:any[]=[];private beats:any[]=[];private accepted=new Map<string,number>();private last:any=null;
 private drift={samples:0,lastMs:0,maxMs:0};
 message(message:IncomingChat,state:GameState,runId:number,receivedAt:number){
  const vote=parseChatVote(message.text,message.user,receivedAt,message.simulated),counted=!!vote&&!state.paused&&!state.round.over&&Object.hasOwn(state.votes,message.user)&&state.votes[message.user]===vote.move;
  this.ingested++;if(vote)this.parsedVotes++;if(counted)this.countedVoteEvents++;
  const receipt={seq:this.ingested,messageId:message.messageId??String(this.ingested),receivedAt,counted,user:message.user,move:vote?.move??null,runId,round:state.round.number,beat:state.clock.beat};
  this.last=receipt;this.receipts.push(receipt);if(this.receipts.length>10000){this.receipts.shift();this.overflow=true;}
  if(counted){const key=`${runId}:${state.round.number}:${state.clock.beat}`;this.accepted.set(key,(this.accepted.get(key)??0)+1);while(this.accepted.size>1000)this.accepted.delete(this.accepted.keys().next().value!);}
 }
 state(previous:GameState,next:GameState,runId:number,observedAt:number){
  const added=next.log.telegraphs.slice(previous.log.telegraphs.length);
  for(const [index,attack]of added.entries()){
   const key=`${runId}:${attack.round}:${attack.beat}`,delay=Math.max(0,observedAt-attack.at);this.drift.samples++;this.drift.lastMs=delay;this.drift.maxMs=Math.max(this.drift.maxMs,delay);
   this.beats.push({runId,round:attack.round,beat:attack.beat,at:attack.at,observedAt,votes:index===0?{...previous.votes}:{},acceptedEvents:this.accepted.get(key)??0});this.accepted.delete(key);
  }
  if(this.beats.length>1000){this.beats=this.beats.slice(-1000);this.overflow=true;}
 }
 snapshot(drain=false){const value={seq:this.ingested,receivedAt:this.last?.receivedAt??null,messageId:this.last?.messageId??null,emittedAt:Date.now(),receipts:[...this.receipts],beats:[...this.beats],overflow:this.overflow};if(drain){this.receipts=[];this.beats=[];}return value;}
 status(){return {unhandledErrors:this.unhandledErrors,ingested:this.ingested,parsedVotes:this.parsedVotes,countedVoteEvents:this.countedVoteEvents,lastSeq:this.ingested,lastMessageId:this.last?.messageId??null,receivedAt:this.last?.receivedAt??null,drift:{...this.drift},memory:process.memoryUsage(),resultsSent:this.resultsSent,resultAttempts:this.resultAttempts,overflow:this.overflow};}
}
