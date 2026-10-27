import {expect,it}from'vitest';
import {createGame,step,wilsonLower,type GameState,type Side}from'../../shared/src/engine.js';
import type{Move}from'../../shared/src/index.js';
const advance=(s:GameState,at:number)=>step(s,{kind:'advance'},at);
function scouting(dodges:Side[],moves:Move[]=[],roundNumber=2):GameState{
  let state=createGame({roundNumber,moves});
  state={...state,boss:{hp:1000,max_hp:1000},scouting:{...state.scouting,dodges}};
  return advance(state,0);
}
const pose=(s:GameState,at:number,guard:boolean,lean:Side|null=null,capture_at=at)=>step(s,{kind:'pose',guard,lean,at,capture_at,source:'pose'},at);
it('never invents a habit for balanced or small samples, including a dominant first round',()=>{
  expect(scouting(Array.from({length:200},(_,i)=>i%2?'L':'R')).scouting.card).toBe(null);
  expect(scouting(Array(11).fill('L')).scouting.card).toBe(null);
  expect(scouting(Array(100).fill('L'),[],1).scouting.card).toBe(null);
});
it('enforces the Wilson boundary independently of sample size and the65% share boundary',()=>{
  expect(wilsonLower(10,12)).toBeGreaterThanOrEqual(.60);expect(wilsonLower(9,12)).toBeLessThan(.60);
  expect(scouting([...Array(10).fill('L'),...Array(2).fill('R')]).scouting.card).toBe('L');
  expect(scouting([...Array(9).fill('L'),...Array(3).fill('R')]).scouting.card).toBe(null);
  expect(wilsonLower(649,1000)).toBeGreaterThan(.60);
  expect(scouting([...Array(649).fill('L'),...Array(351).fill('R')]).scouting.card).toBe(null);
  expect(scouting([...Array(650).fill('L'),...Array(350).fill('R')]).scouting.card).toBe('L');
});
it('fixes the original card at5/8, caps healing, logs actual resolution time, and waits12new dodges',()=>{
  let state=scouting(Array(12).fill('L'),Array(15).fill('HOOK_L'));
  state={...state,streamer:{...state.streamer,hp:95}};
  state=pose(state,100,false,'R');state=advance(state,5600);
  expect(state.scouting.card).toBe('L');expect(state.scouting.fixes).toBe(0);
  state=advance(state,8000);
  expect(state.streamer.hp).toBe(100);expect(state.scouting.n).toBe(0);expect(state.scouting.card).toBe(null);
  expect(state.scouting.last_fix).toEqual({round:2,at:8000,side:'L',hp_gained:5});
  expect(state.log.fixes).toEqual([{round:2,at:8000,side:'L',hp_gained:5}]);
  expect(state.scouting.since_fix).toBe(15);expect(state.scouting.dodges).toHaveLength(15);
  state=advance(state,34400);expect(state.scouting.n).toBe(11);expect(state.scouting.card).toBe(null);
  state=advance(state,36800);expect(state.scouting.n).toBe(12);expect(state.scouting.card).toBe('R');
});
it('stamps exploit side at draw without adding damage and enforces exactly3drawn cooldown beats',()=>{
  let state=scouting(Array(12).fill('L'),Array(5).fill('HOOK_L'));
  state=pose(state,100,true);state=advance(state,12800);
  expect(state.log.telegraphs.map(t=>[t.exploit,t.exploit_side])).toEqual([[true,'L'],[false,undefined],[false,undefined],[false,undefined],[true,'L']]);
  expect(state.log.resolved.every(r=>r.outcome==='CHIP'&&r.dmg===3)).toBe(true);
});
it('keeps original fix logs immutable while freezing the visible FIXED stamp through pause',()=>{
  let state=scouting(Array(12).fill('L'),Array(3).fill('HOOK_L'));
  state=pose(state,100,false,'R');state=advance(state,8000);
  state=step(state,{kind:'control',action:'pause',by:'mod'},8500);
  state=step(state,{kind:'control',action:'resume',by:'mod'},18500);
  expect(state.scouting.last_fix?.at).toBe(18000);expect(state.log.fixes[0]?.at).toBe(8000);
});
it('retains matchwide round-tagged evidence and scopes pause/veto edits to the current round',()=>{
  let state=pose(createGame({moves:['JAB']}),2000,true);
  state=advance(state,75000);state=step(state,{kind:'next-round'},76000);
  expect(state.log.inputs[0]?.round).toBe(1);expect(state.log.resolved[0]?.round).toBe(1);
  state=advance(state,78400);state=step(state,{kind:'control',action:'pause',by:'mod'},78500);
  state=step(state,{kind:'control',action:'resume',by:'mod'},80000);
  expect(state.log.telegraphs.map(t=>[t.round,t.beat,t.lands_at])).toEqual([[1,0,3200],[2,0,80700]]);
  state=step(state,{kind:'control',action:'veto',by:'mod'},80100);
  expect(state.log.telegraphs.map(t=>t.vetoed)).toEqual([false,true]);
});
it('records held defence as held rather than fabricating a zero-millisecond reaction',()=>{
  let state=pose(createGame({moves:['JAB']}),1000,true,null,777);
  state=pose(state,2600,true,null,2550);state=advance(state,3200);
  expect(state.log.resolved[0]).toMatchObject({guard:true,lean:null,defence:'guard',reaction_kind:'held',reaction_ms:null,received_at:1000,capture_at:777});
  expect(state.log.inputs).toEqual([{round:1,at:1000,capture_at:777,source:'pose',guard:true,lean:null}]);
});
it('records receive-time reactions and raw capture metadata for guard CHIP and wrong-lean HIT',()=>{
  let chip=pose(createGame({moves:['HOOK_L']}),2900,true,null,2800);chip=advance(chip,3200);
  expect(chip.log.resolved[0]).toMatchObject({outcome:'CHIP',defence:'guard',reaction_kind:'reacted',reaction_ms:500,received_at:2900,capture_at:2800});
  let wrong=pose(createGame({moves:['HOOK_L']}),2900,false,'L',2810);wrong=advance(wrong,3200);
  expect(wrong.log.resolved[0]).toMatchObject({outcome:'HIT',guard:false,lean:'L',defence:'lean',reaction_ms:500,reaction_kind:'reacted'});
});
it('keeps withdrawn failed attempts and distinguishes no response',()=>{
  let state=pose(createGame({moves:['JAB']}),2700,true,null,2650);state=pose(state,3000,false);state=advance(state,3200);
  expect(state.log.resolved[0]).toMatchObject({outcome:'HIT',guard:false,defence:'guard',reaction_ms:300,capture_at:2650});
  expect(state.log.inputs).toHaveLength(2);
  expect(advance(createGame({moves:['JAB']}),3200).log.resolved[0]).toMatchObject({defence:'none',reaction_kind:'none',reaction_ms:null,capture_at:null,received_at:null});
});
it('reaction elapsed time excludes pause but original receive/capture timestamps do not shift',()=>{
  let state=pose(createGame({moves:['JAB','JAB']}),2900,true,null,2800);
  state=step(state,{kind:'control',action:'pause',by:'mod'},3000);
  state=step(state,{kind:'control',action:'resume',by:'mod'},10000);state=advance(state,10200);
  expect(state.log.resolved[0]).toMatchObject({reaction_ms:500,received_at:2900,capture_at:2800});
  expect(state.log.inputs[0]?.at).toBe(2900);
  state=advance(state,12600);
  expect(state.log.resolved[1]).toMatchObject({reaction_kind:'held',reaction_ms:null,received_at:2900,capture_at:2800});
});
