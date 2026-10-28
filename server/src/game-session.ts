import {type BossDef,isDefaultBoss,validateBoss} from '../../shared/src/boss-def';
import { parseChatVote, type StreamerInput, type TallySnapshot, type PoseState } from '@svc/shared';
import { createGame, step, weightedTally, type EngineEvent, type GameState } from '../../shared/src/engine';
import { parseChatControl, type ChatRole } from './chat-controls';
import { ResultsQueue } from './results-queue';
import type {GameSummary} from '../../shared/src/highlights';
import {SessionArchive} from './session-archive';
import type { CaptureOptions } from '@svc/shared';
import { RaidTracker } from './raid-tracker';
import type { IncomingTwist } from './twitch';
export type SessionCommand={kind:'session';action:'start'|'next-round'|'summary'};
export function parseSessionCommand(value:unknown):SessionCommand|null {
  if(!value||typeof value!=='object')return null;
  const event=value as Record<string,unknown>;
  return event.kind==='session'&&(event.action==='start'||event.action==='next-round'||event.action==='summary')?{kind:'session',action:event.action}:null;
}
export type SessionChat={user:string;text:string;simulated:boolean;role:ChatRole;displayName?:string;source?:'twitch'|'sim'|'booth'};
/** Owns the live clock and reducer. Waiting for explicit START avoids unattended live results. */
export class GameSession {
  private current:GameState;
  private armed=false;
  private pendingBoss:BossDef|null|undefined;
  private forgeHeld=false;
  queueBoss(def:BossDef|null):boolean {if(this.armed&&!this.current.round.over)return false;if(def&&validateBoss(def,[],{allowDefault:true}).length)return false;this.pendingBoss=def&&!isDefaultBoss(def)?structuredClone(def):null;return true;}
  cancelQueuedBoss():void {this.pendingBoss=undefined;}
  beginForge():boolean {if(this.armed&&!this.current.round.over)return false;this.forgeHeld=true;return true;}
  endForge():void {this.forgeHeld=false;if(this.current.round.over&&!this.current.match.winner)this.nextRoundAt=this.now()+3000;}
  private bossEvent(){const bossDef=this.pendingBoss;this.pendingBoss=undefined;return bossDef===undefined?{}:{bossDef};}
  private archive=new SessionArchive();
  private viewerNames=new Map<string,string>();
  private summaryKey:unknown[]=[];
  private cachedSummary:GameSummary|null=null;
  runId=0;
  summaryVisible=false;
  modes={seated:false,noPunch:false};
  private nextRoundAt:number|null=null;
  private safetyFrozen=false;
  private latestPose:(PoseState&{capture_at?:number})|null=null;
  private latestPoseAt=-Infinity;
  private results:ResultsQueue;
  private raiders=new RaidTracker();
  constructor(private options:{mock:boolean;seed?:number;now?:()=>number;sendResult:(text:string,simulated:boolean)=>Promise<unknown>;onError?:(error:unknown)=>void;onState?:(previous:GameState,next:GameState)=>void}) {
    this.current=createGame({seed:options.seed??Date.now()>>>0,now:this.now()});
    this.results=new ResultsQueue(text=>options.sendResult(text,options.mock),options.onError);
  }
  private now(){return this.options.now?.()??Date.now();}
  get state():GameState{return this.current;}
  get started(){return this.armed;}
  get archival(){return {matches:this.archive.matches,retainedStates:1,identities:this.archive.identities};}
  get frozen(){return this.safetyFrozen||this.current.paused;}
  tally():TallySnapshot {return {kind:'tally',tally:{...this.current.tally},weights:weightedTally(this.current),voters:this.current.voters,simulated:this.options.mock};}
  summary(){
    const state=this.current;
    const key=[this.archive.matches,state.log.damage,state.log.resolved,state.log.rounds,state.round.number,state.round.elapsed_ms,state.round.over,state.boss.hp,state.match.winner];
    if(!this.cachedSummary||key.some((value,index)=>value!==this.summaryKey[index])){
      this.cachedSummary=this.archive.summary(state,this.runId||1);this.summaryKey=key;
    }
    const value=this.cachedSummary,name=value.chatMvp&&this.viewerNames.get(value.chatMvp.user);
    return name?{...value,chatMvp:{...value.chatMvp!,displayName:name}}:value;
  }
  configure(options:CaptureOptions){this.modes={seated:options.seated,noPunch:options.noPunch};}
  private apply(event:EngineEvent,now:number) {
    const previous=this.current;
    const wasOver=this.current.round.over;
    this.current=step(this.current,event,now);
    this.options.onState?.(previous,this.current);
    if(this.armed&&!wasOver&&this.current.round.over) {
      const result=this.current.log.rounds.at(-1)!;
      const score=this.current.match.round_wins;
      const text=`Streamer vs Chat · Round ${result.number}: ${result.winner==='streamer'?'STREAMER':this.current.bossDef?.name??'CHAT GOLEM'} wins (${Math.round(result.streamer_hp)}/100 vs ${Math.round(result.boss_hp)}/${this.current.boss.max_hp} HP) · ${score.streamer}–${score.boss}${this.current.match.winner?' · MATCH OVER':''}`;
      this.results.enqueue(text,now);
      this.nextRoundAt=this.current.match.winner?null:now+3000;
    }
  }
  command(command:SessionCommand):void {
    const now=this.now();
    if(command.action==='summary'){this.summaryVisible=true;this.input({kind:'control',action:'stop',by:'capture'});return;}
    if(command.action==='start') {
      if(this.forgeHeld)return;
      if(this.armed)this.archive.add(this.current,this.runId);
      this.runId++;this.summaryVisible=false;
      this.armed=true;this.safetyFrozen=false;this.nextRoundAt=null;
      this.apply({kind:'restart',...this.bossEvent()},now);
    } else if(this.armed&&!this.frozen&&this.current.round.over&&!this.current.match.winner&&!this.forgeHeld) {
      this.nextRoundAt=null;this.apply({kind:'next-round',...this.bossEvent()},now);
    }
  }
  queueNotice(text:string):void {this.results.enqueue(text,this.now());}
  chat(message:SessionChat):ReturnType<typeof parseChatVote> {
    // A simulated message is never accepted by a live game session.
    if(message.simulated!==this.options.mock)return null;
    if(message.displayName)this.viewerNames.set(message.user,message.displayName);
    const raider=this.raiders.observe(message.user,this.now());
    const now=this.armed?this.now():this.current.now;
    const control=parseChatControl(message.text,message.user,message.role);
    if(control){this.input(control);return null;}
    const vote=parseChatVote(message.text,message.user,now,message.simulated,this.current.bossDef);
    if(vote){
      this.apply({...vote,raider},now);
      if(this.armed&&!this.current.paused&&!this.current.round.over&&this.current.votes[message.user]===vote.move)return vote;
    }
    return null;
  }
  twist(event:IncomingTwist):void {
    if(event.simulated!==this.options.mock)return;
    const now=this.now();
    // Membership belongs to the Twitch session, not a round or match restart.
    if(event.kind==='raid')this.raiders.start(event.viewers,now);
    if(this.armed&&!this.frozen&&!this.current.round.over)this.apply(event,now);
  }
  input(event:StreamerInput,receivedAt=this.now()):void {
    const now=this.armed?receivedAt:this.current.now;
    if(event.kind==='pose') {this.latestPose={...event,capture_at:event.at,at:receivedAt};this.latestPoseAt=receivedAt;}
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
      if(event.kind==='punch'&&this.modes.noPunch)return;
      this.apply(event.kind==='pose'?{...event,capture_at:event.at,at:receivedAt}:{...event,at:receivedAt},now);
    }
  }
  viewers(count:number):void {
    if(Number.isFinite(count))this.apply({kind:'viewers',count},this.armed?this.now():this.current.now);
  }
  advance():void {
    const now=this.now();
    if(this.armed) {
      this.apply({kind:'advance'},now);
      if(this.nextRoundAt!==null&&now>=this.nextRoundAt&&!this.frozen&&!this.forgeHeld) {
        this.nextRoundAt=null;this.apply({kind:'next-round',...this.bossEvent()},now);
      }
    }
    this.results.flush(now);
  }
  close():void{this.results.close();}
}
