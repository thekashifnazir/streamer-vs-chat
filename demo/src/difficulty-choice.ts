import {createGame} from '../../shared/src/engine';
import type {Difficulty} from '../../shared/src/tempo';
/** Webcam reactions land later than key presses (dwell plus pose latency), so webcam starts on Easy. */
export const WEBCAM_DIFFICULTY:Difficulty='easy';
export const KEYBOARD_DIFFICULTY:Difficulty='medium';
export function difficultyLabel(value:string,pose:boolean):string{
 const name=value?value[0]!.toUpperCase()+value.slice(1):'';
 return pose&&value===WEBCAM_DIFFICULTY?`${name} · recommended for webcam`:name;
}
/** The preview and START read the same selection; practice never creates a running clock. */
export function createSelectedGame(select:Pick<HTMLSelectElement,'value'>,options:Parameters<typeof createGame>[0]={}){
 return createGame({...options,difficulty:select.value as Difficulty});
}
