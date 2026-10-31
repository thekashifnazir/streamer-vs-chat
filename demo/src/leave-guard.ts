import type {GameState} from '../../shared/src/engine';
export type LeaveState={live:boolean;game:Pick<GameState,'round'|'match'>|null;ended?:boolean};
/** Closing the tab ends a browser broadcast and loses an unfinished match; between rounds, after a match or after End fight nothing is lost. */
export function shouldWarnBeforeLeave(state:LeaveState):boolean{return state.live===true||(!!state.game&&!state.ended&&!state.game.round.over&&!state.game.match.winner);}
/** The beforeunload listener exists only while a warning applies, so idle pages keep normal unload/bfcache behaviour. */
export function createLeaveGuard(target:Pick<Window,'addEventListener'|'removeEventListener'>,state:()=>LeaveState){
 let armed=false;
 const warn=(event:BeforeUnloadEvent)=>{if(!shouldWarnBeforeLeave(state()))return;event.preventDefault();event.returnValue='Leaving ends your live fight.';};
 return {get armed(){return armed;},sync(){const next=shouldWarnBeforeLeave(state());if(next===armed)return;armed=next;if(next)target.addEventListener('beforeunload',warn);else target.removeEventListener('beforeunload',warn);},dispose(){if(armed)target.removeEventListener('beforeunload',warn);armed=false;}};
}
