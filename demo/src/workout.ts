import type {GameState} from '../../shared/src/engine';
import {summarizeGame} from '../../shared/src/highlights';
/** Plain counts from the match log; no calorie or health claims. Active time is the fight clock: pauses and between-round screens never advance it. */
export type WorkoutStats={punches:number;defences:number;activeMinutes:number};
export function workoutStats(state:GameState):WorkoutStats{
 const stats=summarizeGame(state).stats;
 return {punches:state.log.bossDamage.filter(hit=>hit.kind==='punch').length,defences:stats.blocks+stats.perfects+stats.dodges,activeMinutes:Math.round(stats.durationMs/6000)/10};
}
export function workoutText({punches,defences,activeMinutes}:WorkoutStats):string{
 return `${punches} ${punches===1?'punch':'punches'} · ${defences} clean ${defences===1?'defence':'defences'} · ${activeMinutes.toFixed(1)} active min`;
}
