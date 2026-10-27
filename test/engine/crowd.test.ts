import{expect,it}from'vitest';
import{createCrowd,crowdVotes,crowdVoteCounts,type Crowd}from'../../shared/src/crowd.js';
import{createGame,step,emptyCounts}from'../../shared/src/engine.js';
import{simulateRound,simulateScoutingRound}from'../../scripts/sim.js';
it('crowd aggregation and individual votes use the same persona choices and authoritative tally',()=>{
  const state=createGame({viewers:500});
  const votes=crowdVotes(createCrowd(500,2026),state,100);
  const counts=crowdVoteCounts(createCrowd(500,2026),state);
  expect(new Set(votes.map(v=>v.user)).size).toBe(votes.length);
  expect(votes.every(v=>v.simulated)).toBe(true);
  expect(step(state,{kind:'vote-batch',votes},100).tally).toEqual(counts);
  expect(step(state,{kind:'crowd-votes',counts},100).tally).toEqual(counts);
});
it('spammers, tactics, participation rates and ready hype implement the five persona rules',()=>{
  const crowd:Crowd={viewers:5,personas:['spammer','tactician','chaos','hype','lurker'],random:()=>0};
  let state=createGame();state={...state,hype:100,scouting:{...state.scouting,card:'L'}};
  expect(crowdVoteCounts(crowd,state)).toEqual({...emptyCounts(),JAB:3,HOOK_L:1,SUPER:1});
  crowd.random=()=>.99;state={...state,hype:0,scouting:{...state.scouting,cooldown:2}};
  expect(crowdVoteCounts(crowd,state)).toEqual({...emptyCounts(),JAB:1,COMBO:2});
});
it('the five models finish deterministic single rounds through the same reducer',()=>{
  for(const player of ['casual','good','seated','nopunch','keyboard']as const){
    const first=simulateRound(player,50,2026),second=simulateRound(player,50,2026);
    expect(first).toEqual(second);expect(first.round.over).toBe(true);expect(first.round.number).toBe(1);
    expect(first.round.ended_at).toBeLessThanOrEqual(75000);expect(first.log.telegraphs.length).toBeLessThanOrEqual(30);
    if(player==='nopunch')expect(first.input.last_punch_at).toBe(-Infinity);
  }
});

it('scouting-enabled rounds carry actual R1 evidence and exercise an exploit and habit fix',()=>{
  const state=simulateScoutingRound('casual',0,2054);
  expect(state.round.number).toBe(2);expect(state.log.rounds).toHaveLength(2);
  expect(state.log.telegraphs.some(t=>t.round===1)).toBe(true);
  expect(state.log.telegraphs.some(t=>t.round===2&&t.exploit)).toBe(true);
  expect(state.log.fixes.some(f=>f.round===2)).toBe(true);
  const firstRoundEnd=state.log.rounds[0]!.at;
  expect(state.log.telegraphs.filter(t=>t.round===2).every(t=>t.at>firstRoundEnd)).toBe(true);
  expect(state.log.resolved.every((entry,i,list)=>i===0||entry.at>=list[i-1]!.at)).toBe(true);
});
it('a seeded carried habit activates tactical crowd votes and exploit reads in the same reducer',()=>{
  const state=simulateRound('nopunch',500,2026,{roundNumber:2,dodges:Array(12).fill('L')});
  expect(state.log.telegraphs.some(t=>t.exploit&&t.exploit_side==='L')).toBe(true);
  expect(state.input.last_punch_at).toBe(-Infinity);
});
