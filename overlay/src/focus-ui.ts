import type {GameState} from '../../shared/src/engine';
/** Counts down on the authoritative game clock, including a paused snapshot. The words match the engine (FOCUS_RULES): at 100 FOCUS a
 * 1 s guard hold with no attack coming fires the FINISHER; punches then do double damage until the window closes. */
export function finisherPresentation(state:GameState,modes:{keyboard?:boolean;noPunch?:boolean}={}){
 const now=state.clock.paused_at??state.now;
 const seconds=state.finisher.ends_at===null?0:Math.max(0,Math.ceil((state.finisher.ends_at-now)/1000));
 const ready=state.focus===100&&state.finisher.used<2&&!state.round.over;
 const active=seconds>0&&!state.round.over;
 return {visible:active||!state.activeAttack&&ready,ready,active,seconds,text:active?modes.noPunch?`FINISHER! · ${seconds}s BONUS WINDOW`:`FINISHER! · ${modes.keyboard?'press J':'punch'} for 2× damage · ${seconds}s`:ready?`FINISHER READY · ${modes.keyboard?'hold K for 1 s':'hold your guard up 1 s'}`:''};
}
export function renderFocus(meter:HTMLElement,value:HTMLElement,fill:HTMLElement,state:GameState){
 value.textContent=state.focus===100&&state.finisher.used<2?'READY':'FOCUS';fill.style.width=`${state.focus}%`;
 meter.classList.toggle('ready',state.focus===100&&state.finisher.used<2);
 meter.setAttribute('aria-label',`Focus ${Math.round(state.focus)} of 100. Finishers ${state.finisher.used} of 2.`);
}
