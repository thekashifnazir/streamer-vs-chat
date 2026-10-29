import {TEMPO} from '../../shared/src/tempo';
import {createGame,step,type GameState} from '../../shared/src/engine';
import type {PoseState} from '@svc/shared';
import {assertSimulationAllowed} from './safety';
import {hasLiveCredentials} from './credentials';
/** Five-second, visibly simulated rehearsal. Defence is always the player's input. */
export function startColdOpen(now:number,seed:number,pose:PoseState):GameState{
 assertSimulationAllowed({liveTokenLoaded:hasLiveCredentials()});
 let state=createGame({seed,viewers:3,now:now-TEMPO.hard.beat,moves:['JAB']});
 for(let i=0;i<3;i++)state=step(state,{kind:'vote',user:`rehearsal-${i}`,move:'JAB',at:now-100,simulated:true},now-100);
 state=step(state,{...pose,at:now-50},now-50);
 state=step(state,{kind:'advance'},now);
 // The next beat's actual tally remains visible after the first draw resets it.
 for(let i=0;i<3;i++)state=step(state,{kind:'vote',user:`rehearsal-${i}`,move:'JAB',at:now,simulated:true},now);
 return state;
}
export function coldOpenStage(state:GameState,age:number):'telegraph'|'blocked'|'tally'|'missed'|'done'{
 const hit=state.log.resolved[0];
 if(age>=5000)return hit&&(hit.outcome==='BLOCK'||hit.outcome==='PERFECT')?'done':'missed';
 if(!hit)return 'telegraph';
 if(hit.outcome!=='BLOCK'&&hit.outcome!=='PERFECT')return 'missed';
 return age<1500?'blocked':'tally';
}
