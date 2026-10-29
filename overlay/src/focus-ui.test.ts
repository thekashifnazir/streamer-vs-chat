import {expect,it} from 'vitest';
import {createGame} from '../../shared/src/engine';
import {finisherPresentation,renderFocus} from './focus-ui';
it('shows FOCUS and ready/max-two state in the same HUD nodes',()=>{
 const state=createGame(),classes=new Set<string>(),meter={classList:{toggle:(key:string,on:boolean)=>on?classes.add(key):classes.delete(key)},setAttribute:(_key:string,value:string)=>{label=value;}};let label='';const value={textContent:''},fill={style:{width:''}};
 state.focus=100;renderFocus(meter as unknown as HTMLElement,value as HTMLElement,fill as HTMLElement,state);
 expect(value.textContent).toBe('READY');expect(fill.style.width).toBe('100%');expect(classes.has('ready')).toBe(true);expect(label).toContain('Finishers 0 of 2');
 expect(finisherPresentation(state)).toMatchObject({visible:true,text:'FINISHER READY: hold your guard 1 s'});
 state.finisher.used=2;expect(finisherPresentation(state).visible).toBe(false);
});
it('uses game time for the FINISHER countdown and hides its ready prompt during an attack',()=>{
 const state=createGame();state.finisher.ends_at=4000;state.now=1000;expect(finisherPresentation(state).text).toBe('FINISHER! · 3s BONUS WINDOW');
 state.clock.paused_at=1000;state.now=10000;expect(finisherPresentation(state).seconds).toBe(3);
 state.activeAttack={move:'JAB'} as typeof state.activeAttack;expect(finisherPresentation(state)).toMatchObject({visible:true,active:true});state.finisher.ends_at=null;state.focus=100;expect(finisherPresentation(state).visible).toBe(false);
 state.round.over=true;expect(finisherPresentation(state).visible).toBe(false);
});
