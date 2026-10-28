import {expect,it} from 'vitest';
import {startColdOpen,coldOpenStage} from './cold-open';
import {step} from '../../shared/src/engine';
import {setLiveCredentials} from './credentials';
const neutral={kind:'pose' as const,source:'keyboard' as const,at:0,guard:false,lean:null};
it('cold open requires a real defence and never fabricates BLOCKED',()=>{
 let state=startColdOpen(2400,1,neutral);
 expect(state.activeAttack?.move).toBe('JAB');expect(state.tally.JAB).toBe(3);
 state=step(state,{kind:'advance'},3200);
 expect(state.log.resolved[0]?.outcome).toBe('HIT');expect(coldOpenStage(state,1000)).toBe('missed');
});
it('actual held guard resolves through the shared reducer and completes the five second shot',()=>{
 let state=startColdOpen(2400,1,{...neutral,guard:true});
 state=step(state,{kind:'advance'},3200);
 expect(state.log.resolved[0]).toMatchObject({outcome:'BLOCK',at:3200,dmg:0,counter_dmg:8});
 expect(coldOpenStage(state,1000)).toBe('blocked');expect(coldOpenStage(state,1800)).toBe('tally');expect(coldOpenStage(state,5000)).toBe('done');
});
it('cold open cannot inject simulated votes with hosted credentials',()=>{setLiveCredentials(true);try{expect(()=>startColdOpen(2400,1,neutral)).toThrow(/refuses/);}finally{setLiveCredentials(false);}});
