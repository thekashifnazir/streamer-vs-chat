import {TEMPO} from './tempo.js';
/** INFERRED body-reaction model; stored BossDef limits remain unscaled. */
export function defenceReadProbability(p:number,effectiveTelegraphMs:number):number{
  return Math.min(.95,p+.08*(effectiveTelegraphMs-TEMPO.hard.telegraph)/400);
}
