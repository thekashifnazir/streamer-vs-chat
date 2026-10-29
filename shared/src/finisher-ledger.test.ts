import {expect,it} from 'vitest';
import {createGame,step} from './engine';
import {createBossImpactLedger} from './boss-impact';
import {summarizeGame} from './highlights';
it('keeps FINISHER and doubled punches in the recap and presentation ledger without chat MVP credit',()=>{
 let state=createGame({moves:[]});state.focus=100;state.finisher.ready_at=0;
 state=step(state,{kind:'pose',guard:true,lean:null,source:'keyboard',at:0},0);
 const ledger=createBossImpactLedger('recap');let next=step(state,{kind:'advance'},1000);ledger.observe(state,next);state=next;
 next=step(state,{kind:'punch',side:'L',source:'keyboard',at:1100},1100);ledger.observe(state,next);state=next;
 expect(ledger.snapshot().entries.map(hit=>[hit.kind,hit.amount])).toEqual([['finisher',4],['punch',2]]);
 const summary=summarizeGame(state);expect(summary.stats.damageDealt).toBe(6);expect(summary.chatMvp).toBeNull();expect(summary.stats.attacks).toBe(0);
});
it('counts each successful SUPER lean step in recap direction totals without duplicating the aggregate',()=>{
 let state=step(createGame({moves:['SUPER']}),{kind:'advance'},2400);const steps=state.activeAttack!.super_steps!;
 for(let i=0;i<3;i++){const defence=steps[i]!;state=step(state,{kind:'pose',guard:defence==='guard',lean:defence==='lean_left'?'L':defence==='lean_right'?'R':null,source:'keyboard',at:3999+i*600},3999+i*600);state=step(state,{kind:'advance'},4000+i*600);}
 const stats=summarizeGame(state).stats;expect(stats.leftDodges).toBe(steps.filter(step=>step==='lean_left').length);expect(stats.rightDodges).toBe(steps.filter(step=>step==='lean_right').length);expect(stats.attacks).toBe(1);
});
