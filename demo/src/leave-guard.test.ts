import {expect,it,vi} from 'vitest';
import {createGame,step} from '../../shared/src/engine';
import {createLeaveGuard,shouldWarnBeforeLeave,type LeaveState} from './leave-guard';
const fighting=createGame({seed:7,now:0}),paused=step(fighting,{kind:'control',action:'stop',by:'capture'},10);
const roundOver={...fighting,round:{...fighting.round,over:true,winner:'boss' as const}},matchOver={...roundOver,match:{...roundOver.match,winner:'boss' as const}};
it('warns while the browser broadcast is live or a match is still being fought, including while paused',()=>{
 expect(shouldWarnBeforeLeave({live:false,game:null})).toBe(false);
 expect(shouldWarnBeforeLeave({live:true,game:null})).toBe(true);
 expect(shouldWarnBeforeLeave({live:false,game:fighting})).toBe(true);
 expect(shouldWarnBeforeLeave({live:false,game:paused})).toBe(true);
 expect(shouldWarnBeforeLeave({live:false,game:roundOver})).toBe(false);
 expect(shouldWarnBeforeLeave({live:false,game:matchOver})).toBe(false);
 expect(shouldWarnBeforeLeave({live:false,game:fighting,ended:true})).toBe(false);
 expect(shouldWarnBeforeLeave({live:true,game:matchOver,ended:true})).toBe(true);
});
it('warns while a Crowd Trainer workout runs (paused included), not on its summary',()=>{
 expect(shouldWarnBeforeLeave({live:false,game:null,workout:true})).toBe(true);
 expect(shouldWarnBeforeLeave({live:false,game:null,workout:false})).toBe(false);
 expect(shouldWarnBeforeLeave({live:true,game:null,workout:false})).toBe(true);
});
it('adds one beforeunload listener only while a warning applies and removes it cleanly',()=>{
 const listeners=new Set<(event:BeforeUnloadEvent)=>void>();
 const target={addEventListener:vi.fn((_type:string,listener:any)=>listeners.add(listener)),removeEventListener:vi.fn((_type:string,listener:any)=>listeners.delete(listener))};
 let state:LeaveState={live:false,game:null};const guard=createLeaveGuard(target as unknown as Window,()=>state);
 guard.sync();expect(listeners.size).toBe(0);expect(guard.armed).toBe(false);
 state={live:false,game:fighting};guard.sync();guard.sync();expect(target.addEventListener).toHaveBeenCalledOnce();expect(target.addEventListener).toHaveBeenCalledWith('beforeunload',expect.any(Function));expect(listeners.size).toBe(1);
 const event={preventDefault:vi.fn(),returnValue:undefined as unknown};[...listeners][0]!(event as unknown as BeforeUnloadEvent);
 expect(event.preventDefault).toHaveBeenCalledOnce();expect(event.returnValue).toBeTruthy();
 // A match that ended between syncs does not block leaving.
 state={live:false,game:matchOver};const late={preventDefault:vi.fn(),returnValue:undefined as unknown};[...listeners][0]!(late as unknown as BeforeUnloadEvent);expect(late.preventDefault).not.toHaveBeenCalled();expect(late.returnValue).toBeUndefined();
 guard.sync();expect(listeners.size).toBe(0);expect(target.removeEventListener).toHaveBeenCalledWith('beforeunload',expect.any(Function));
 state={live:true,game:null};guard.sync();expect(listeners.size).toBe(1);guard.dispose();expect(listeners.size).toBe(0);expect(guard.armed).toBe(false);
});
