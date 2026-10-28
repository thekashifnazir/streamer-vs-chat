import type {createViewerMemory} from '../memory';
import type {GameState} from '../../shared/src/engine';
import type {GameSummary} from '../../shared/src/highlights';
import type {ChatVote} from '@svc/shared';
import type {SessionChat} from './game-session';

type Store=Awaited<ReturnType<typeof createViewerMemory>>;
/** Observes authoritative evidence; never supplies reducer inputs or changes game state. */
export class ViewerMemorySession {
  channelId:string|null=null;
  constructor(private options:{store:Store;sessionId:string;enqueueNotice:(text:string)=>void;onChange:()=>void;onError:(error:unknown)=>void}){}
  selectChannel(id:string){this.channelId=id;}
  private identity(message:SessionChat){return {channelId:this.channelId!,userId:message.user,displayName:message.displayName??'Viewer'};}
  beforeChat(message:SessionChat){
    if(!this.channelId||message.simulated||message.source==='sim'||message.source==='booth')return;
    if(message.text.trim().split(/\s+/,1)[0]?.toLowerCase()==='!forgetme'){
      if(this.options.store.isOptedOut(this.channelId,message.user))return;
      const channelId=this.channelId;
      const saved=this.options.store.forget({channelId,userId:message.user});
      this.options.onChange();
      void saved.then(()=>{if(this.channelId!==channelId)return;this.options.enqueueNotice('Your viewer memory has been forgotten.');this.options.onChange();}).catch(this.options.onError);
    }else this.options.store.observeChat(this.identity(message));
  }
  acceptedVote(message:SessionChat,vote:ChatVote|null,beatId:string){
    if(!this.channelId||message.simulated||message.source==='sim'||message.source==='booth'||!vote)return;
    this.options.store.countedVote({...this.identity(message),serverSessionId:this.options.sessionId,beatId,move:vote.move});
  }
  transition(previous:GameState,next:GameState,runId:string){
    if(!this.channelId)return;
    for(const round of next.log.rounds.slice(previous.log.rounds.length)){
      const hit=round.reason==='ko'&&round.winner==='boss'?[...next.log.damage].reverse().find(hit=>hit.round===round.number&&hit.at===round.at&&hit.damage>0):undefined;
      const attack=hit?[...next.log.telegraphs].reverse().find(attack=>attack.round===hit.round&&attack.beat===hit.beat):undefined;
      void this.options.store.completedRound({channelId:this.channelId,serverSessionId:this.options.sessionId,roundId:`${runId}:${round.number}`,winner:round.winner,reason:round.reason,
        ...(attack?{koMove:attack.move,koSupporters:(hit?.supporters??[]).map(id=>({id}))}:{})}).catch(this.options.onError);
    }
  }
  publicSummary(summary:GameSummary):GameSummary {
    return this.channelId&&summary.chatMvp&&this.options.store.isOptedOut(this.channelId,summary.chatMvp.user)?{...summary,chatMvp:null}:summary;
  }
  view(summary?:GameSummary){return this.channelId?this.options.store.snapshot(this.channelId,{serverSessionId:this.options.sessionId,...(summary?{prospectiveMvpId:this.publicSummary(summary).chatMvp?.user??null}:{})}):null;}
  async finalize(summary:GameSummary){
    if(this.channelId&&summary.stats.attacks>0)await this.options.store.finalizeSession({channelId:this.channelId,serverSessionId:this.options.sessionId,mvpId:this.publicSummary(summary).chatMvp?.user??null});
  }
}
