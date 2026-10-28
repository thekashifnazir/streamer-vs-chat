import type {Move} from '@svc/shared';
import type {GameState,Resolution} from '../../shared/src/engine';
const moves:Move[]=['JAB','HOOK_L','HOOK_R','COMBO','SUPER'];
export type ChatScoutingView={history:Move[];card:Move|null;n:number;share:number;lowerBound:number;openingPending?:boolean;openings?:{round:number;beat:number;at:number;move:Move;voted:boolean}[]};
/** Thresholds and the opening decision belong to the engine; this only names evidence. */
export function chatHabitPresentation(state:Pick<GameState,'round'>&{chatScouting?:ChatScoutingView},seated=false){
 const card=state.chatScouting;
 if(state.round.number<2||!card?.card)return {visible:false} as const;
 const counts=Object.fromEntries(moves.map(move=>[move,card.history.filter(value=>value===move).length])) as Record<Move,number>;
 const move=card.card,verb=seated?'TILT':'LEAN';
 const defence=move==='HOOK_L'?`${verb} RIGHT`:move==='HOOK_R'?`${verb} LEFT`:move==='SUPER'?`${verb} EITHER WAY`:'GUARD';
 const opening=card.openings?.at(-1);
 return {visible:true,move,opening:card.openingPending?'OPENING RESET':opening?`${opening.voted?'OPEN':'AUTO'}: ${opening.move.replaceAll('_',' ')}`:'',openingDetail:opening?`Round ${opening.round}, beat ${opening.beat}: ${opening.voted?'chat-selected':'autopilot'} opening`:'Waiting for an opening pick',percent:Math.round(card.share*100),n:card.n,counts,
  instruction:`PRE-HOLD ${defence}`,distribution:`JAB ${counts.JAB} · HOOK L ${counts.HOOK_L} · HOOK R ${counts.HOOK_R} · COMBO ${counts.COMBO} · SUPER ${counts.SUPER}`,
  evidence:moves.map(move=>`${move.replaceAll('_',' ')} ${counts[move]}`).join(', ')} as const;
}
export function readItResolution(result:(Resolution&{braced?:boolean})|undefined):boolean{
 return result?.braced===true&&['BLOCK','PERFECT','DODGE'].includes(result.outcome);
}
