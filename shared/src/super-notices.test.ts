import {expect,it} from 'vitest';
import {createGame,step} from './engine';
import {createSuperNotices} from './super-notices';
it('announces once per round, with fresh HUD banners on later unlocks',()=>{
 const tracker=createSuperNotices();let before=createGame(),after=step(before,{kind:'cheer',bits:25},1);after.hype=100;
 expect(tracker.observe(before,after,1000)).toBe(true);expect(tracker.snapshot().readyAt).toBe(1000);
 before={...after,hype:0};after={...after,hype:100};expect(tracker.observe(before,after,2000)).toBe(false);expect(tracker.snapshot().readyAt).toBe(2000);
 before=after;after=step(before,{kind:'restart'},3);tracker.observe(before,after,3000);before=after;after={...after,hype:100};expect(tracker.observe(before,after,4000)).toBe(true);
});
it('drops hints beyond once per beat and never hints for custom or eligible SUPER',()=>{
 const tracker=createSuperNotices();let state=createGame();tracker.denied(state,'SUPER',10);tracker.denied(state,'SUPER',20);expect(tracker.snapshot().deniedAt).toBe(10);
 state={...state,clock:{...state.clock,beat:1}};tracker.denied(state,'SUPER',30);expect(tracker.snapshot().deniedAt).toBe(30);
 state={...state,hype:100,clock:{...state.clock,beat:2}};tracker.denied(state,'SUPER',40);expect(tracker.snapshot().deniedAt).toBe(30);
});
it('does not reset per-round announcement on pause/resume clock shifts',()=>{
 const tracker=createSuperNotices();let state=createGame();let next={...state,hype:100};tracker.observe(state,next,10);state=step(next,{kind:'control',action:'pause',by:'capture'},100);next=step(state,{kind:'control',action:'resume',by:'capture'},1100);tracker.observe(state,next,20);
 state={...next,hype:0};next={...next,hype:100};expect(tracker.observe(state,next,30)).toBe(false);
});

it('clears a paused preview denial at explicit START without treating resume as a new round',()=>{
 const tracker=createSuperNotices();let before=createGame();tracker.denied(before,'SUPER',10);before=step(before,{kind:'control',action:'stop',by:'capture'},0);
 const after=step(before,{kind:'restart'},100);tracker.observe(before,after,100,true);expect(tracker.snapshot().deniedAt).toBeNull();tracker.denied(after,'SUPER',110);expect(tracker.snapshot().deniedAt).toBe(110);
});
