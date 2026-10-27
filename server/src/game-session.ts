import { parseChatVote, type StreamerInput, type TallySnapshot, type PoseState } from '@svc/shared';
import { createGame, step, type EngineEvent, type GameState } from '../../shared/src/engine';
import { parseChatControl, type ChatRole } from './chat-controls';
import { ResultsQueue } from './results-queue';
export type SessionCommand={kind:'session';action:'start'|'next-round'};
export function parseSessionCommand(value:unknown):SessionCommand|null {
  if(!value||typeof value!=='object')return null;
  const event=value as Record<string,unknown>;
  return event.kind==='session'&&(event.action==='start'||event.action==='next-round')?{kind:'session',action:event.action}:null;
}
export type SessionChat={user:string;text:string;simulated:boolean;role:ChatRole};
/** Owns the live clock and reducer. Waiting for explicit START avoids unattended live results. */
export class GameSession {
  private current:GameState;
  private armed=false;
  private nextRoundAt:number|null=null;
  private safetyFrozen=false;
  private latestPose:PoseState|null=null;
  private latestPoseAt=-Infinity;
  private results:ResultsQueue;
  constructor(private options:{mock:boolean;seed?:number;now?:()=>number;sendResult:(text:string,simulated:boolean)=>Promise<unknown>;onError?:(error:unknown)=>void}) {
    this.current=createGame({seed:options.seed??Date.now()>>>0,now:this.now()});
    this.results=new ResultsQueue(text=>options.sendResult(text,options.mock),options.onError);
  }
  private now(){return this.options.now?.()??Date.now();}
  get state():GameState{return this.current;}
  get started(){return this.armed;}
  get frozen(){return this.safetyFrozen||this.current.paused;}
  tally():TallySnapshot {return {kind:'tally',tally:{...this.current.tally},voters:this.current.voters,simulated:this.options.mock};}
  private apply(event:EngineEvent,now:number) {
    const wasOver=this.current.round.over;
    this.current=step(this.current,event,now);
    if(this.armed&&!wasOver&&this.current.round.over) {
      const result=this.current.log.rounds.at(-1)!;
      const score=this.current.match.round_wins;
      const text=`Streamer vs Chat · Round ${result.number}: ${result.winner==='streamer'?'STREAMER':'CHAT GOLEM'} wins (${Math.round(result.streamer_hp)}/100 vs ${Math.round(result.boss_hp)}/135 HP) · ${score.streamer}–${score.boss}${this.current.match.winner?' · MATCH OVER':''}`;
      this.results.enqueue(text,now);
      this.nextRoundAt=this.current.match.winner?null:now+3000;
    }
  }
  command(command:SessionCommand):void {
    const now=this.now();
    if(command.action==='start') {
      this.armed=true;this.safetyFrozen=false;this.nextRoundAt=null;
      this.apply({kind:'restart'},now);
    } else if(this.armed&&!this.frozen&&this.current.round.over&&!this.current.match.winner) {
      this.nextRoundAt=null;this.apply({kind:'next-round'},now);
    }
  }
  chat(message:SessionChat):void {
    // A simulated message is never accepted by a live game session.
    if(message.simulated!==this.options.mock)return;
    const now=this.armed?this.now():this.current.now;
    const control=parseChatControl(message.text,message.user,message.role);
    if(control){this.input(control);return;}
    const vote=parseChatVote(message.text,message.user,now,message.simulated);
    if(vote)this.apply(vote,now);
  }
  input(event:StreamerInput,receivedAt=this.now()):void {
    const now=this.armed?receivedAt:this.current.now;
    if(event.kind==='pose') {this.latestPose={...event,at:receivedAt};this.latestPoseAt=receivedAt;}
    if(event.kind==='control') {
      this.safetyFrozen=event.action!=='resume';
      this.apply(event,now);
      if(event.action==='resume'&&this.armed&&!this.current.paused) {
        // Paused frames update only this input cache. Never resurrect a stale
        // held defence after a stopped capture disconnects or ceases heartbeats.
        const pose=this.latestPose&&receivedAt-this.latestPoseAt<1000?this.latestPose:
          {kind:'pose' as const,guard:false,lean:null,source:'keyboard' as const,at:receivedAt};
        this.apply({...pose,at:receivedAt},now);
      }
    } else if(this.armed&&!this.safetyFrozen) {
      this.apply({...event,at:receivedAt},now);
    }
  }
  viewers(count:number):void {
    if(Number.isFinite(count))this.apply({kind:'viewers',count},this.armed?this.now():this.current.now);
  }
  advance():void {
    const now=this.now();
    if(this.armed) {
      this.apply({kind:'advance'},now);
      if(this.nextRoundAt!==null&&now>=this.nextRoundAt&&!this.frozen) {
        this.nextRoundAt=null;this.apply({kind:'next-round'},now);
      }
    }
    this.results.flush(now);
  }
  close():void{this.results.close();}
}
