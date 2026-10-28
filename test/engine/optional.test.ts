import {expect,it} from 'vitest';
import {createGame,drawMove,step,weightedTally,type GameState,type EngineVote} from '../../shared/src/engine.js';
import type {Move} from '../../shared/src/index.js';
const advance=(s:GameState,at:number)=>step(s,{kind:'advance'},at);
const raid=(s=createGame(),at=0,viewers=20)=>step(s,{kind:'raid',viewers},at);
const vote=(s:GameState,user:string,move:Move,raider=false,at=s.now)=>step(s,{kind:'vote',user,move,raider,at,simulated:false},at);
const guard=(s:GameState,at=0)=>step(s,{kind:'pose',guard:true,lean:null,at,source:'keyboard'},at);
it('adds capped positive integer cheers and eight-HP subscriptions',()=>{
  let s={...createGame(),hype:60,streamer:{hp:80,max_hp:100}};
  for(const bits of [0,-1,1.5,NaN,Infinity])expect(step(s,{kind:'cheer',bits},0).hype).toBe(60);
  s=step(s,{kind:'cheer',bits:1},0);expect(s.hype).toBe(61);
  s=step(s,{kind:'cheer',bits:1000},0);expect(s.hype).toBe(86);
  s=step(s,{kind:'cheer',bits:Number.MAX_VALUE},0);expect(s.hype).toBe(100);
  s=step(s,{kind:'subscribe'},0);expect(s.streamer.hp).toBe(88);
  s=step(step(s,{kind:'subscribe'},0),{kind:'subscribe'},0);expect(s.streamer.hp).toBe(100);
});
it('ignores all optional buffs while paused or after a round',()=>{
  const base={...createGame(),hype:10,streamer:{hp:50,max_hp:100}};
  for(const s of [step(base,{kind:'control',action:'pause',by:'mod'},0),{...base,round:{...base.round,over:true}}]){
    for(const event of [{kind:'cheer',bits:25},{kind:'subscribe'},{kind:'raid',viewers:100}] as const){
      const next=step(s,event,0);expect(next.hype).toBe(10);expect(next.streamer.hp).toBe(50);expect(next.raid.ends_at).toBe(null);
    }
  }
});
it('accepts a zero-capacity raid, rejects malformed raids, and replaces the cohort without deleting votes',()=>{
  expect(raid(createGame(),0,0).raid.ends_at).toBe(15000);
  for(const viewers of [-1,NaN,Infinity,1.5])expect(raid(createGame(),0,viewers).raid.ends_at).toBe(null);
  let s=vote(vote(raid(),'normal','JAB'),'old','COMBO',true);
  const previous=s;s=raid(s,100,5);
  expect(s.raid.ends_at).toBe(15100);expect(s.raiders).toEqual({});expect(s.voters).toBe(2);
  expect(weightedTally(s)).toMatchObject({JAB:1,COMBO:1});expect(previous.raiders.old).toBe(true);
});
it('keeps raw people counts while uniformly limiting all raiders to half the draw',()=>{
  let s=vote(vote(vote(raid(),'n1','JAB'),'n2','JAB'),'r1','HOOK_L',true);
  expect(weightedTally(s)).toMatchObject({JAB:2,HOOK_L:2});expect(s.tally.HOOK_L).toBe(1);expect(s.voters).toBe(3);
  s=vote(s,'r2','COMBO',true);s=vote(s,'r3','COMBO',true);
  expect(weightedTally(s)).toMatchObject({JAB:2,HOOK_L:2/3,COMBO:4/3});
  const weights=weightedTally(s);expect(weights.HOOK_L+weights.COMBO).toBe(2);
  expect(s.tally).toMatchObject({JAB:2,HOOK_L:1,COMBO:2});expect(s.voters).toBe(5);
});
it('uses autopilot for an all-raider beat, and ordinary votes after phase expiry',()=>{
  let s=vote(raid(),'r','COMBO',true);
  expect(Object.values(weightedTally(s)).reduce((a,b)=>a+b,0)).toBe(0);
  s=advance(s,2400);expect(s.log.telegraphs[0]?.move).toBe('HOOK_R');expect(s.tally.COMBO).toBe(0);
  s=vote(advance(guard(s,2400),15000),'r','COMBO',true);
  expect(s.raid.ends_at).toBe(null);expect(weightedTally(s).COMBO).toBe(1);
});
it('updates latest votes and same-move membership without inflating distinct voters',()=>{
  let s=vote(vote(raid(),'n','JAB'),'r','COMBO',true);
  s=vote(s,'r','HOOK_L',true);expect(s.tally).toMatchObject({COMBO:0,HOOK_L:1});expect(s.voters).toBe(2);
  const before=s;s=vote(s,'r','HOOK_L',false);expect(weightedTally(s).HOOK_L).toBe(1);expect(before.raiders.r).toBe(true);
  s=vote(s,'r','HOOK_L',true);expect(s.voters).toBe(2);expect(s.raiders.r).toBe(true);
  s=vote(s,'r','SUPER',false);expect(s.votes.r).toBe('HOOK_L');expect(s.raiders.r).toBe(true);
  s=step(s,{kind:'cheer',bits:100},0);s=step(step(step(s,{kind:'cheer',bits:25},0),{kind:'cheer',bits:25},0),{kind:'cheer',bits:25},0);
  s=vote(s,'r','SUPER',false);expect(s.tally.SUPER).toBe(1);expect(s.raiders.r).toBe(false);
});
it('handles arbitrary mock viewer IDs with own keys and uniform flags',()=>{
  let s=vote(raid(),'normal','JAB');
  for(const user of ['__proto__','constructor','toString'])s=vote(s,user,'COMBO',true);
  expect(s.voters).toBe(4);expect(s.tally.COMBO).toBe(3);expect(weightedTally(s).COMBO).toBe(1);
  s=vote(s,'__proto__','HOOK_R',false);expect(s.tally.COMBO).toBe(2);expect(s.tally.HOOK_R).toBe(1);expect(s.voters).toBe(4);
});
it('draws fractional raid weights continuously, preserving interval boundaries',()=>{
  expect(drawMove({JAB:2,HOOK_L:1.5,HOOK_R:1,COMBO:1.5},[],()=>.6)).toBe('HOOK_R');
});
it('expires Phase2 before a draw at the exact same millisecond',()=>{
  let s=raid(guard(createGame()),1800);s=advance(s,14400);
  s=vote(s,'normal','JAB',false,16799);
  for(let i=0;i<4;i++)s=vote(s,`raider${i}`,'COMBO',true,16799);
  expect(weightedTally(s)).toMatchObject({JAB:1,COMBO:1});
  s={...s,rng:2026,history:[]};s=advance(s,16800);
  expect(s.raid.ends_at).toBe(null);expect(s.log.telegraphs.at(-1)?.move).toBe('COMBO');
});
it('freezes the phase timer and weights through pause, then shifts the deadline',()=>{
  let s=vote(vote(raid(),'n','JAB'),'r','COMBO',true);
  s=step(s,{kind:'control',action:'pause',by:'mod'},1000);s=advance(s,30000);
  expect(s.raid.ends_at).toBe(15000);expect(weightedTally(s)).toMatchObject({JAB:1,COMBO:1});
  s=step(s,{kind:'control',action:'resume',by:'mod'},30000);expect(s.raid.ends_at).toBe(44000);
  s=advance(guard(s,30000),44000);expect(s.raid.ends_at).toBe(null);
});
it('carries an unexpired phase across rounds but clears it on restart or expiry',()=>{
  let s=raid();s={...s,boss:{...s.boss,hp:1}};
  s=step(s,{kind:'punch',side:'L',at:100,source:'keyboard'},100);expect(s.round.over).toBe(true);
  expect(step(s,{kind:'next-round'},3100).raid.ends_at).toBe(15000);
  expect(step(s,{kind:'restart'},3100).raid.ends_at).toBe(null);
  expect(step(s,{kind:'next-round'},15000).raid.ends_at).toBe(null);
});
it('supports flagged vote batches without mutating their input state',()=>{
  const s=raid();const votes:EngineVote[]=[{kind:'vote',user:'n',move:'JAB',at:1,simulated:false},{kind:'vote',user:'r',move:'COMBO',raider:true,at:1,simulated:false}];
  const next=step(s,{kind:'vote-batch',votes},1);expect(s.votes).toEqual({});expect(s.raiders).toEqual({});expect(next.voters).toBe(2);expect(weightedTally(next)).toMatchObject({JAB:1,COMBO:1});
});
