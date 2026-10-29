import type {GameState} from '../../shared/src/engine';
/** Counts down on the authoritative game clock, including a paused snapshot. */
export function finisherPresentation(state:GameState){
 const now=state.clock.paused_at??state.now;
 const seconds=state.finisher.ends_at===null?0:Math.max(0,Math.ceil((state.finisher.ends_at-now)/1000));
 const ready=state.focus===100&&state.finisher.used<2&&!state.round.over;
 const active=seconds>0&&!state.round.over;
 return {visible:active||!state.activeAttack&&ready,ready,active,seconds,text:active?`FINISHER! · ${seconds}s BONUS WINDOW`:ready?'FINISHER READY: hold your guard 1 s':''};
}
export function renderFocus(meter:HTMLElement,value:HTMLElement,fill:HTMLElement,state:GameState){
 value.textContent=state.focus===100&&state.finisher.used<2?'READY':'FOCUS';fill.style.width=`${state.focus}%`;
 meter.classList.toggle('ready',state.focus===100&&state.finisher.used<2);
 meter.setAttribute('aria-label',`Focus ${Math.round(state.focus)} of 100. Finishers ${state.finisher.used} of 2.`);
}
