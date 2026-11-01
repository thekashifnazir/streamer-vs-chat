import {PlayMetrics} from './metrics';
import type {GameState} from '../../shared/src/engine';
import {summarizeGame} from '../../shared/src/highlights';
type RoundResult={won:boolean;defences:number;damageDealt:number;damageTaken:number};
export type PlaytestSnapshot={simulated:true;note:string;rounds:number;roundsWon:number;defences:number;damageDealt:number;damageTaken:number;sessionMinutes:number;votes:number;uniqueChatters:number;acceptedVoters:number;votesPerMinute:number;roundStats:{round:number;won:boolean|null;defences:number|null;damageDealt:number|null;damageTaken:number|null;votes:number;uniqueChatters:number;acceptedVoters:number;minutes:number;votesPerMinute:number;completed:boolean}[]};
export const PLAYTEST_NOTE='Offline demo: chat and votes are SIMULATED. Counted on this device for this visit only; nothing is sent or stored.';
const roundResult=(state:GameState):RoundResult=>{const summary=summarizeGame(state,state.round.number);return {won:summary.winner==='streamer',defences:summary.stats.defended,damageDealt:Math.round(summary.stats.damageDealt),damageTaken:Math.round(summary.stats.damageTaken)};};
/** Counts the visit from page load, in memory only. No token, browser storage or network API; a reload starts again. */
export class LocalPlaytestStats {
  private session:PlayMetrics|null;
  private rounds:PlayMetrics|null;
  private results:(RoundResult|null)[]=[];
  private roundOpen=false;
  constructor(options:ConstructorParameters<typeof PlayMetrics>[0]={}){this.session=new PlayMetrics(options);this.rounds=new PlayMetrics(options);this.session.startFight();}
  startRound():void{if(!this.rounds)return;if(this.roundOpen)this.endRound();this.rounds.startFight();this.results.push(null);this.roundOpen=true;}
  /** With the finished round's state, its fight numbers join the export; without one (a new match mid-round) it counts as unfinished. */
  endRound(state?:GameState):void{if(!this.roundOpen)return;this.rounds?.endFight();this.roundOpen=false;if(state?.round.over)this.results[this.results.length-1]=roundResult(state);}
  vote(userId:string,accepted=true):void {
    if(!this.session||!this.rounds||!this.roundOpen)return;
    for(const metrics of [this.session,this.rounds]){void metrics.observeChat(userId);if(accepted)void metrics.acceptedVote(userId);}
  }
  async exportSnapshot():Promise<PlaytestSnapshot|null>{
    const session=this.session,rounds=this.rounds;if(!session||!rounds)return null;
    const [totals,perRound]=await Promise.all([session.exportSnapshot(),rounds.exportSnapshot()]);
    if(this.session!==session||this.rounds!==rounds)return null; // Disposed while hashing.
    const fight=totals.fights[0]!,done=this.results.filter((result):result is RoundResult=>!!result),sum=(key:keyof Omit<RoundResult,'won'>)=>done.reduce((total,result)=>total+result[key],0);
    return {simulated:true,note:PLAYTEST_NOTE,rounds:done.length,roundsWon:done.filter(result=>result.won).length,defences:sum('defences'),damageDealt:sum('damageDealt'),damageTaken:sum('damageTaken'),
      sessionMinutes:totals.sessionMinutes,votes:fight.messages,uniqueChatters:fight.uniqueChatters,acceptedVoters:fight.acceptedVoters,votesPerMinute:fight.messagesPerMinute,
      roundStats:perRound.fights.map((value,index)=>{const result=this.results[index]??null;return {round:value.fight,won:result?.won??null,defences:result?.defences??null,damageDealt:result?.damageDealt??null,damageTaken:result?.damageTaken??null,votes:value.messages,uniqueChatters:value.uniqueChatters,acceptedVoters:value.acceptedVoters,minutes:value.minutes,votesPerMinute:value.messagesPerMinute,completed:value.completed};})};
  }
  dispose():void{this.session?.dispose();this.rounds?.dispose();this.session=null;this.rounds=null;this.roundOpen=false;}
}
