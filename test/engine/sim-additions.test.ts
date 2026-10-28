import {expect,it} from 'vitest';
import {simulateRound,simulateScoutingRound,PLAYERS,READ_MODEL} from '../../scripts/sim';
it('preserves SPEC player guesses and runs no phantom chat mechanics with zero viewers',()=>{
 expect(PLAYERS.nopunch).toEqual({p:.55,perfect:.15,lean:.75,punch:0});expect(READ_MODEL.attempt).toBe(.35);
 const state=simulateScoutingRound('nopunch',0,2026,{profile:'coordinated'});
 expect(state.chatScouting.history).toEqual([]);expect(state.log.telegraphs.some(t=>t.brace)).toBe(false);
});
it('large crowds retain ordinary counter and hit numbers after SYNC removal',()=>{
 const state=simulateRound('casual',500,2026);
 expect(state.log.telegraphs.length).toBeGreaterThan(0);
 for(const hit of state.log.resolved){
  expect([0,8,9,11]).toContain(hit.counter_dmg);
  if(hit.move==='JAB'&&hit.outcome==='HIT')expect([8,4.8]).toContain(hit.dmg);
 }
});
it('a coordinated group requires eight participants; tiny crowds retain ordinary personas',()=>{
 for(const viewers of [0,3])expect(simulateScoutingRound('casual',viewers,2026,{profile:'coordinated'})).toEqual(simulateScoutingRound('casual',viewers,2026,{profile:'ordinary'}));
});
it('coordinated warmups create readable chat evidence and real pre-held brace rewards',()=>{
 let braces=0;
 for(let seed=1;seed<=20;seed++){
  const state=simulateScoutingRound('casual',500,seed,{profile:'coordinated'});
  braces+=state.log.resolved.filter(t=>t.round===2&&t.braced).length;
  expect(state.chatScouting.history.length).toBeLessThanOrEqual(12);
  for(const resolution of state.log.resolved.filter(t=>t.braced))expect(['BLOCK','PERFECT','DODGE']).toContain(resolution.outcome);
 }
 expect(braces).toBeGreaterThan(0);
});
