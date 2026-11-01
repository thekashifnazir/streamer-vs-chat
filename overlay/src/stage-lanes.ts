import type {GameState} from '../../shared/src/engine';
import {availableMoves,bossMove} from '../../shared/src/engine';
import {chatCommand} from '../../shared/src/chat-commands';
import type {BossImpact} from './boss-feedback';
/** The approved fight stage (Kash, 1 Nov): the centre column of the 1920x1080 Rails stage is split into fixed lanes, top to bottom. Nothing
 * renders in the camera lane; the camera circle (demo and /play: 20% x 28% of the stage, 3% off the bottom, so y 745 to 1048) sits in it. */
export const STAGE_LANES={centre:{left:470,right:1450},clock:{top:24,bottom:130},call:{top:142,bottom:548},prompt:{top:556,bottom:676},camera:{top:700,bottom:1080}} as const;
export type PromptKind='counter'|'finisher'|'super-denied'|'super-ready';
/** Webcam play, lowest priority in the prompt lane: shown only while no other prompt is up. */
export const HANDS_PROMPT='STEP BACK · KEEP BOTH HANDS IN VIEW';
export type PromptCandidate={kind:PromptKind;key:string};
/** Read-only view of the engine's counter window (RULES.counter, opened by a clean block or dodge). Keyboard play names the key. */
export function counterPrompt(state:GameState,modes:{keyboard?:boolean;noPunch?:boolean}={}){
 const visible=state.counter.open&&!state.round.over&&!modes.noPunch;
 return {visible,key:visible?`counter:${state.match.seed}:${state.round.number}:${state.counter.closes_at}`:'',text:visible?`COUNTER · PUNCH NOW${modes.keyboard?' · J':''}`:''};
}
/** During the counter window the call lane names what you just did ("BLOCKED!" + "JAB | GUARD ✓"); the prompt lane says what to do next. */
export function counterCall(state:GameState,seated=false){
 const last=state.log.resolved.filter(entry=>entry.round===state.round.number).at(-1);
 if(!last)return {banner:'COUNTER HIT!',move:'COUNTER',cue:'✓'};
 const banner=last.outcome==='PERFECT'?'PERFECT!':last.outcome==='DODGE'?'DODGED!':last.outcome==='BLOCK'?'BLOCKED!':'COUNTER HIT!';
 return {banner,move:bossMove(state,last.move).label,cue:`${last.defence==='lean'?seated?'TILT':'LEAN':'GUARD'} ✓`};
}
/** One prompt line: only one message at a time and the newest wins; a tie goes to the earlier candidate. */
export function createPromptLane(){
 const seen=new Map<string,number>();
 return {pick(candidates:readonly PromptCandidate[],now:number):PromptKind|null{
  const live=new Set(candidates.map(candidate=>candidate.key));for(const key of [...seen.keys()])if(!live.has(key))seen.delete(key);
  let best:PromptKind|null=null,bestAt=-Infinity;
  for(const candidate of candidates){if(!seen.has(candidate.key))seen.set(candidate.key,now);const at=seen.get(candidate.key)!;if(at>bestAt){best=candidate.kind;bestAt=at;}}
  return best;
 }};
}
/** "PUNCH! −1.5" only for a punch the camera or J key threw; the automatic counter after a clean defence names that defence
 * ("BLOCK HIT", "DODGE HIT"; Kash, 1 Nov: "COUNTER!" after a dodge read as a detected punch). Finishers name themselves. */
export function punchPopText(impact:Pick<BossImpact,'kind'|'amount'|'brace'|'defence'>){
 const label=impact.kind==='finisher'?'FINISHER!':impact.kind==='counter'?impact.brace?'READ IT!':impact.defence==='lean'?'DODGE HIT':impact.defence==='guard'?'BLOCK HIT':'DEFENCE HIT':'PUNCH!';
 return `${label}\n−${Number(impact.amount.toFixed(2))}`;
}
/** While nobody in chat has voted this round, the vote table becomes a how-to-join panel with this boss's own commands. */
export function joinCommands(state:GameState){return availableMoves(state).filter(move=>move!=='SUPER').map(move=>chatCommand(move,state.bossDef,true).split('/')[0]!).join(' · ');}
export function roundHasVotes(state:GameState){
 return state.voters>0||Object.values(state.tally).some(count=>count>0)||state.log.resolved.some(entry=>entry.round===state.round.number&&!!entry.supporters?.length)||!!state.activeAttack?.supporters?.length;
}
