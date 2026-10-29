import {isDefaultBoss,type BossDef} from './boss-def.js';
import {MOVES,type Move} from './index.js';
/** Display names only: stored move IDs and the canonical BossDef remain stable. */
export const DEFAULT_CHAT_COMMANDS:Record<Move,{primary:string;short:string}>={
 JAB:{primary:'!jab',short:'!j'},HOOK_L:{primary:'!left',short:'!l'},HOOK_R:{primary:'!right',short:'!r'},COMBO:{primary:'!combo',short:'!c'},SUPER:{primary:'!super',short:'!s'},
};
export function chatCommand(move:Move,boss?:BossDef,compact=false):string{
 if(boss&&!isDefaultBoss(boss))return boss.moves[MOVES.indexOf(move)]?.command??'—';
 const command=DEFAULT_CHAT_COMMANDS[move];return compact?`${command.primary}/${command.short}`:`${command.primary} (${command.short})`;
}
export function chatCommandLegend(boss?:BossDef):string{
 if(boss&&!isDefaultBoss(boss))return boss.moves.map(move=>`${move.command} = ${move.label}`).join(' · ');
 return '!jab (!j) = guard · !left (!l) = hook from the left → LEAN → · !right (!r) = hook from the right → ← LEAN · !combo (!c) = guard · !super (!s) = follow all 3 GUARD / LEAN steps (full hype only)';
}
/** Counts stay exact in accessible labels; compact thousands fit the narrow seated rail. */
export function voteCountLabel(count:number):string{return count<1000?String(count):count<1_000_000?`${Math.round(count/1000)}k`:`${Math.round(count/1_000_000)}m`;}
