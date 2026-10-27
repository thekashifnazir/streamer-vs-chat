import {expect,it}from'vitest';
import{createGame,step,mulberry32,type GameState}from'../../shared/src/engine.js';
function freeze<T>(value:T):T{if(value&&typeof value==='object'){for(const nested of Object.values(value))freeze(nested);Object.freeze(value);}return value;}
const pose=(s:GameState,at:number,guard:boolean,lean:'L'|'R'|null=null)=>step(s,{kind:'pose',at,source:'keyboard',guard,lean},at);
it('keeps all prior state immutable through votes, attacks, counters, and scouting',()=>{
  let state=createGame({moves:['HOOK_L','COMBO'],roundNumber:2});
  state={...state,scouting:{...state.scouting,dodges:Array(11).fill('L')}};
  state=step(freeze(state),{kind:'vote',user:'v',move:'JAB',at:1,simulated:true},1);
  state=pose(freeze(state),3000,false,'R');
  const before=state;state=step(freeze(state),{kind:'advance'},3200);
  expect(before.boss.hp).toBe(135);expect(before.scouting.dodges).toHaveLength(11);
  expect(state.boss.hp).toBe(126);
  state=pose(freeze(state),5300,true);
  state=step(freeze(state),{kind:'advance'},5900);expect(state.log.resolved).toHaveLength(2);
});
it('counts arbitrary viewer identities as ordinary own keys',()=>{
  let state=createGame();
  for(const user of ['constructor','__proto__','toString'])state=step(state,{kind:'vote',user,move:'JAB',at:1,simulated:true},1);
  state=step(state,{kind:'vote',user:'__proto__',move:'HOOK_L',at:2,simulated:true},2);
  expect(state.voters).toBe(3);expect(state.tally.JAB).toBe(2);expect(state.tally.HOOK_L).toBe(1);
  expect(Object.values(state.tally).every(Number.isFinite)).toBe(true);
});
it('STOP between rounds freezes automatic next-round requests until explicit resume',()=>{
  let state=step(createGame({moves:[]}),{kind:'advance'},75000);
  state=step(state,{kind:'control',action:'stop',by:'capture'},75100);
  expect(state.paused).toBe(true);expect(state.stopped).toBe(true);
  expect(step(state,{kind:'next-round'},80000)).toBe(state);
  state=step(state,{kind:'control',action:'resume',by:'capture'},81000);
  state=step(state,{kind:'next-round'},81000);
  expect(state.round.number).toBe(2);expect(state.round.remaining_ms).toBe(75000);
});
it('freezes and shifts a pending combo hit, guard age, and the round deadline on resume',()=>{
  let state=pose(createGame({moves:['COMBO']}),2900,true);
  state=step(state,{kind:'control',action:'pause',by:'mod'},3300);
  expect(state.activeAttack?.combo_hit).toBe(1);
  const left=state.round.remaining_ms;
  state=step(state,{kind:'advance'},10000);expect(state.round.remaining_ms).toBe(left);
  state=step(state,{kind:'control',action:'resume',by:'mod'},10000);
  state=step(state,{kind:'advance'},10199);expect(state.log.resolved).toHaveLength(0);
  state=step(state,{kind:'advance'},10200);expect(state.log.resolved[0]?.outcome).toBe('PERFECT');
  expect(state.clock.ends_at).toBe(81700);
});
it('veto between combo hits cancels the remaining hit without undoing damage already taken',()=>{
  let state=step(createGame({moves:['COMBO']}),{kind:'advance'},3200);
  expect(state.streamer.hp).toBe(93);
  state=step(state,{kind:'control',action:'veto',by:'mod'},3300);
  state=step(state,{kind:'control',action:'resume',by:'mod'},4000);
  state=step(state,{kind:'advance'},5000);
  expect(state.streamer.hp).toBe(93);expect(state.counter.open).toBe(false);expect(state.activeAttack).toBe(null);
});
it('dropping and raising guard between combo hits still loses the second hit and counter',()=>{
  let state=pose(createGame({moves:['COMBO']}),2900,true);
  state=pose(state,3300,false);state=pose(state,3400,true);state=step(state,{kind:'advance'},3500);
  expect(state.streamer.hp).toBe(93);expect(state.boss.hp).toBe(135);
});
it('resets per-round resources, RNG, history and exploit cooldown while retaining scouting and wins',()=>{
  let state=createGame({seed:42,moves:[]});
  state={...state,hype:100,supers_used:3,history:['JAB','JAB'],scouting:{...state.scouting,dodges:Array(12).fill('L'),cooldown:3}};
  state=step(state,{kind:'advance'},75000);state=step(state,{kind:'next-round'},76000);
  expect(state.round.number).toBe(2);expect(state.match.round_wins.streamer).toBe(1);
  expect(state.hype).toBe(0);expect(state.supers_used).toBe(0);expect(state.history).toEqual([]);expect(state.scouting.cooldown).toBe(0);
  expect(state.scouting.dodges).toHaveLength(12);expect(state.scouting.card).toBe('L');expect(state.rng).toBe(44);
  expect(state.streamer.hp).toBe(100);expect(state.boss.hp).toBe(135);
});
it('matches the published mulberry32 check integers',()=>{
  for(const [seed,expected]of [[0,[1144304738,1416247,958946056]],[42,[2581720956,1925393290,3661312704]],[2026,[1955961175,1324980858,2839649622]]]as const){
    const random=mulberry32(seed);expect([random(),random(),random()].map(n=>n*4294967296)).toEqual(expected);
  }
});
