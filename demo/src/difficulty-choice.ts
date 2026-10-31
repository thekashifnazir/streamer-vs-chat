import {createGame} from '../../shared/src/engine';
import type {Difficulty} from '../../shared/src/tempo';
/** The preview and START read the same selection; practice never creates a running clock. */
export function createSelectedGame(select:Pick<HTMLSelectElement,'value'>,options:Parameters<typeof createGame>[0]={}){
 return createGame({...options,difficulty:select.value as Difficulty});
}
