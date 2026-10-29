import type {GameState,Winner} from './engine.js';
export type HighlightCandidate={id:string;kind:'ko'|'comeback'|'perfect';priority:300|200|100;round:number;beat:number|null;at:number;winner?:Winner};
export type GameStats={attacks:number;defended:number;perfects:number;blocks:number;dodges:number;chips:number;hits:number;damageTaken:number;damageDealt:number;reactionMs:number|null;leftDodges:number;rightDodges:number;durationMs:number};
export type GameSummary={round:number|null;winner:Winner|null;roundWins:Record<Winner,number>;stats:GameStats;chatMvp:{user:string;damage:number;displayName?:string}|null;topMoments:HighlightCandidate[]};
function moments(state:GameState):HighlightCandidate[]{
  const result:HighlightCandidate[]=[];
  for(const round of state.log.rounds){
    if(round.reason==='ko')result.push({id:`r${round.number}:ko`,kind:'ko',priority:300,round:round.number,beat:null,at:round.at,winner:round.winner});
    // Low-water mark survives subscription/fix heals. Strictly below30, streamer round win.
    if(round.winner==='streamer'&&(round.min_streamer_hp??round.streamer_hp)<30)result.push({id:`r${round.number}:comeback`,kind:'comeback',priority:200,round:round.number,beat:null,at:round.at,winner:'streamer'});
  }
  for(const hit of state.log.resolved)if(hit.outcome==='PERFECT')result.push({id:`r${hit.round}:b${hit.beat}:perfect`,kind:'perfect',priority:100,round:hit.round,beat:hit.beat,at:hit.at});
  return result;
}
const rank=(a:HighlightCandidate,b:HighlightCandidate)=>b.priority-a.priority||a.at-b.at||a.round-b.round||((a.beat??-1)-(b.beat??-1));
/** New evidence only; stable IDs allow transport retries to deduplicate independently. */
export function highlightCandidates(previous:GameState,next:GameState):HighlightCandidate[]{
  const seen=new Set(moments(previous).map(moment=>moment.id));
  return moments(next).filter(moment=>!seen.has(moment.id)).sort(rank);
}
/** Credit actual HP loss equally to unique final-move voters, regardless of raid boost.
 * Boost affects the draw, not credit. Autopilot/anonymous aggregate votes earn no MVP.
 * Ties use ascending identity (code-unit order), never arrival/object order.
 */
export function summarizeGame(state:GameState,round?:number):GameSummary{
  const selected=(n:number)=>round===undefined||round===n;
  const hits=state.log.resolved.filter(hit=>selected(hit.round));
  const rounds=state.log.rounds.filter(result=>selected(result.number));
  const reactions=hits.filter(hit=>hit.reaction_kind==='reacted'&&hit.reaction_ms!==null);
  const byOutcome=(outcome:string)=>hits.filter(hit=>hit.outcome===outcome).length;
  const credits=new Map<string,number>();
  const damageLog=state.log.damage.filter(hit=>selected(hit.round));
  for(const hit of damageLog){
    const supporters=[...new Set(hit.supporters)].sort(),damage=hit.damage;
    if(!supporters.length||damage<=0)continue;
    for(const user of supporters)credits.set(user,(credits.get(user)??0)+damage/supporters.length);
  }
  let chatMvp:GameSummary['chatMvp']=null;
  for(const [user,damage]of credits)if(!chatMvp||damage>chatMvp.damage+1e-9||(Math.abs(damage-chatMvp.damage)<=1e-9&&user<chatMvp.user))chatMvp={user,damage};
  const current=selected(state.round.number)&&!state.round.over;
  const superDodges=(state.log.superSteps??[]).filter(step=>selected(step.round)&&step.outcome==='DODGE');
  const stats:GameStats={attacks:hits.length,defended:byOutcome('BLOCK')+byOutcome('PERFECT')+byOutcome('DODGE'),perfects:byOutcome('PERFECT'),blocks:byOutcome('BLOCK'),dodges:byOutcome('DODGE'),chips:byOutcome('CHIP'),hits:byOutcome('HIT'),
    damageTaken:damageLog.reduce((sum,hit)=>sum+hit.damage,0),
    damageDealt:rounds.reduce((sum,result)=>sum+(result.boss_max_hp??135)-result.boss_hp,0)+(current?state.boss.max_hp-state.boss.hp:0),
    reactionMs:reactions.length?reactions.reduce((sum,hit)=>sum+hit.reaction_ms!,0)/reactions.length:null,
    leftDodges:hits.filter(hit=>!hit.super_steps&&hit.outcome==='DODGE'&&hit.lean==='L').length+superDodges.filter(step=>step.lean==='L').length,rightDodges:hits.filter(hit=>!hit.super_steps&&hit.outcome==='DODGE'&&hit.lean==='R').length+superDodges.filter(step=>step.lean==='R').length,
    durationMs:rounds.reduce((sum,result)=>sum+(result.duration_ms??0),0)+(current?state.round.elapsed_ms:0)};
  return {round:round??null,winner:round===undefined?state.match.winner:rounds.at(-1)?.winner??null,roundWins:{...state.match.round_wins},stats,chatMvp,
    topMoments:moments(state).filter(moment=>selected(moment.round)).sort(rank).slice(0,3)};
}
/** Each state is one distinct match snapshot, oldest first, including the current match.
 * Caller owns match boundaries; repeating snapshots would count the same evidence twice.
 */
export function summarizeSession(states:readonly GameState[]):GameSummary{
  const summaries=states.map(state=>summarizeGame(state));
  const stats:GameStats={attacks:0,defended:0,perfects:0,blocks:0,dodges:0,chips:0,hits:0,damageTaken:0,damageDealt:0,reactionMs:null,leftDodges:0,rightDodges:0,durationMs:0};
  const roundWins={streamer:0,boss:0};
  let reactionTotal=0,reactionCount=0;
  const credits=new Map<string,number>();
  for(let i=0;i<states.length;i++){
    const summary=summaries[i]!,state=states[i]!;
    for(const key of Object.keys(stats) as (keyof GameStats)[])if(key!=='reactionMs')stats[key]+=summary.stats[key];
    roundWins.streamer+=summary.roundWins.streamer;roundWins.boss+=summary.roundWins.boss;
    for(const hit of state.log.resolved)if(hit.reaction_kind==='reacted'&&hit.reaction_ms!==null){reactionTotal+=hit.reaction_ms;reactionCount++;}
    for(const hit of state.log.damage){const supporters=[...new Set(hit.supporters)];if(hit.damage<=0||!supporters.length)continue;for(const user of supporters)credits.set(user,(credits.get(user)??0)+hit.damage/supporters.length);}
  }
  stats.reactionMs=reactionCount?reactionTotal/reactionCount:null;
  let chatMvp:GameSummary['chatMvp']=null;
  for(const [user,damage]of credits)if(!chatMvp||damage>chatMvp.damage+1e-9||(Math.abs(damage-chatMvp.damage)<=1e-9&&user<chatMvp.user))chatMvp={user,damage};
  return {round:null,winner:summaries.at(-1)?.winner??null,roundWins,stats,chatMvp,
    topMoments:states.flatMap((state,index)=>moments(state).map(moment=>({...moment,id:`m${index+1}:${moment.id}`}))).sort(rank).slice(0,3)};
}
