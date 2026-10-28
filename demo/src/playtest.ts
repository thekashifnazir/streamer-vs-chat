import {PlayMetrics} from './metrics';
export type PlaytestSnapshot={simulated:true;rounds:number;sessionMinutes:number;votes:number;uniqueChatters:number;acceptedVoters:number;votesPerMinute:number;roundStats:{round:number;votes:number;uniqueChatters:number;acceptedVoters:number;minutes:number;votesPerMinute:number;completed:boolean}[]};
/** Explicit consent, local export only. No token, browser storage or network API. */
export class LocalPlaytestStats {
  private session:PlayMetrics|null=null;
  private rounds:PlayMetrics|null=null;
  private roundOpen=false;
  constructor(private options:ConstructorParameters<typeof PlayMetrics>[0]={}){}
  get enabled(){return this.session!==null;}
  setEnabled(enabled:boolean):void {
    if(enabled===this.enabled)return;
    this.dispose();
    if(enabled){this.session=new PlayMetrics(this.options);this.rounds=new PlayMetrics(this.options);this.session.startFight();}
  }
  startRound():void{if(!this.enabled)return;if(this.roundOpen)this.endRound();this.rounds!.startFight();this.roundOpen=true;}
  endRound():void{this.rounds?.endFight();this.roundOpen=false;}
  vote(userId:string,accepted=true):void {
    if(!this.session||!this.rounds||!this.roundOpen)return;
    for(const metrics of [this.session,this.rounds]){void metrics.observeChat(userId);if(accepted)void metrics.acceptedVote(userId);}
  }
  async exportSnapshot():Promise<PlaytestSnapshot|null>{
    const session=this.session,rounds=this.rounds;if(!session||!rounds)return null;
    const [totals,perRound]=await Promise.all([session.exportSnapshot(),rounds.exportSnapshot()]);
    if(this.session!==session||this.rounds!==rounds)return null; // Consent may be withdrawn during hashing.
    const fight=totals.fights[0]!;
    return {simulated:true,rounds:perRound.fightsPlayed,sessionMinutes:totals.sessionMinutes,votes:fight.messages,uniqueChatters:fight.uniqueChatters,acceptedVoters:fight.acceptedVoters,votesPerMinute:fight.messagesPerMinute,
      roundStats:perRound.fights.map(value=>({round:value.fight,votes:value.messages,uniqueChatters:value.uniqueChatters,acceptedVoters:value.acceptedVoters,minutes:value.minutes,votesPerMinute:value.messagesPerMinute,completed:value.completed}))};
  }
  dispose():void{this.session?.dispose();this.rounds?.dispose();this.session=null;this.rounds=null;this.roundOpen=false;}
}
