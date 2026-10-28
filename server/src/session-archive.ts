import type {GameState} from '../../shared/src/engine';
import {summarizeGame,type GameSummary,type GameStats,type HighlightCandidate} from '../../shared/src/highlights';
const rank=(a:HighlightCandidate,b:HighlightCandidate)=>b.priority-a.priority||a.at-b.at||a.round-b.round||((a.beat??-1)-(b.beat??-1));
/** Exact session totals without retaining past match states/supporter arrays.
 * Identity credit is O(unique session voters), required for an exact session MVP.
 */
export class SessionArchive{
 matches=0;
 private totals:GameStats|null=null;
 private wins={streamer:0,boss:0};
 private credits=new Map<string,number>();
 private reactions=0;
 private reactionTotal=0;
 private top:HighlightCandidate[]=[];
 private credit(state:GameState,target:Map<string,number>){for(const hit of state.log.damage){const supporters=[...new Set(hit.supporters)];if(!supporters.length||hit.damage<=0)continue;for(const user of supporters)target.set(user,(target.get(user)??0)+hit.damage/supporters.length);}}
 add(state:GameState,runId:number){
  const summary=summarizeGame(state);this.matches++;
  if(!this.totals)this.totals={...summary.stats};else for(const key of Object.keys(this.totals) as (keyof GameStats)[])if(key!=='reactionMs')this.totals[key]+=summary.stats[key];
  this.wins.streamer+=summary.roundWins.streamer;this.wins.boss+=summary.roundWins.boss;
  this.credit(state,this.credits);
  for(const hit of state.log.resolved)if(hit.reaction_kind==='reacted'&&hit.reaction_ms!==null){this.reactions++;this.reactionTotal+=hit.reaction_ms;}
  this.top=[...this.top,...summary.topMoments.map(moment=>({...moment,id:`m${runId}:${moment.id}`}))].sort(rank).slice(0,3);
 }
 summary(state:GameState,runId:number):GameSummary{
  const summary=summarizeGame(state),stats={...summary.stats};
  if(this.totals)for(const key of Object.keys(stats) as (keyof GameStats)[])if(key!=='reactionMs')stats[key]+=this.totals[key];
  const reactions=state.log.resolved.filter(hit=>hit.reaction_kind==='reacted'&&hit.reaction_ms!==null);
  const n=this.reactions+reactions.length;stats.reactionMs=n?(this.reactionTotal+reactions.reduce((sum,hit)=>sum+hit.reaction_ms!,0))/n:null;
  const credits=new Map(this.credits);this.credit(state,credits);let mvp:GameSummary['chatMvp']=null;
  for(const [user,damage]of credits)if(!mvp||damage>mvp.damage+1e-9||Math.abs(damage-mvp.damage)<=1e-9&&user<mvp.user)mvp={user,damage};
  return {...summary,stats,roundWins:{streamer:this.wins.streamer+summary.roundWins.streamer,boss:this.wins.boss+summary.roundWins.boss},chatMvp:mvp,
   topMoments:[...this.top,...summary.topMoments.map(moment=>({...moment,id:`m${runId}:${moment.id}`}))].sort(rank).slice(0,3)};
 }
 get retainedStates(){return 0;}
 get identities(){return this.credits.size;}
}
