import type {GameState,Move} from './index';
/** Presentation timestamps are wall milliseconds, never reducer deadlines. */
export type SuperNotices={readyAt:number|null;deniedAt:number|null;round:number;beat:number};
export function createSuperNotices(){
 let value:SuperNotices={readyAt:null,deniedAt:null,round:1,beat:0},announced=false,deniedBeat:number|null=null;
 return {
  observe(before:GameState,after:GameState,now:number,sessionReset=false){
   const reset=sessionReset||before.match.seed!==after.match.seed||before.round.number!==after.round.number||after.round.elapsed_ms<before.round.elapsed_ms||(!before.paused&&before.clock.started_at!==after.clock.started_at);
   if(reset){value={readyAt:null,deniedAt:null,round:after.round.number,beat:after.clock.beat};announced=false;deniedBeat=null;}
   value={...value,round:after.round.number,beat:after.clock.beat};
   if(!after.bossDef&&!after.round.over&&after.hype===100&&after.supers_used<3&&(reset||before.hype<100)){
    value.readyAt=now;const notify=!announced;announced=true;return notify;
   }
   return false;
  },
  denied(state:GameState,move:Move,now:number){
   if(move!=='SUPER'||state.bossDef||state.paused||state.round.over||(state.hype===100&&state.supers_used<3)||deniedBeat===state.clock.beat)return;
   deniedBeat=state.clock.beat;value={...value,round:state.round.number,beat:state.clock.beat,deniedAt:now};
  },
  snapshot():SuperNotices{return {...value};},
 };
}
