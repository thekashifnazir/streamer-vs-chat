import {expect,it} from 'vitest';
import {createGame,step,type GameState} from '../../shared/src/engine.js';
import {highlightCandidates,summarizeGame,summarizeSession} from '../../shared/src/highlights.js';
import type {Move} from '../../shared/src/index.js';
const advance=(s:GameState,at:number)=>step(s,{kind:'advance'},at);
const vote=(s:GameState,user:string,move:Move,raider=false)=>step(s,{kind:'vote',user,move,raider,at:s.now,simulated:true},s.now);
const pose=(s:GameState,at:number,guard:boolean,lean:'L'|'R'|null=null)=>step(s,{kind:'pose',guard,lean,at,source:'keyboard'},at);
it('snapshots unique latest supporters of the selected move across vote reset and later recasts',()=>{
 let s=vote(vote(vote(createGame(),'alice','HOOK_L'),'alice','JAB'),'bob','JAB');s=vote(s,'other','HOOK_R');
 s=advance(s,2400);const attack=s.activeAttack!;
 expect(attack.supporters).toEqual(['alice','bob']);expect(Object.isFrozen(attack.supporters)).toBe(true);expect(s.votes).toEqual({});
 s=vote(s,'alice','COMBO');s=advance(s,3200);
 expect(s.log.resolved[0]?.supporters).toEqual(['alice','bob']);expect(attack.supporters).toEqual(['alice','bob']);
 expect(summarizeGame(s).chatMvp).toEqual({user:'alice',damage:4});
});
it('credits actual capped HP loss rather than nominal overkill damage',()=>{
 let s=vote(vote(createGame(),'z','JAB'),'a','JAB');s={...s,streamer:{...s.streamer,hp:3}};
 s=advance(s,3200);expect(s.log.resolved[0]).toMatchObject({dmg:4.8,actual_dmg:3});
 expect(summarizeGame(s).chatMvp).toEqual({user:'a',damage:1.5});expect(summarizeGame(s).stats.damageTaken).toBe(3);
});
it('gives no individual credit to autopilot, all-raider autopilot, or synthetic aggregate votes',()=>{
 for(let s of [createGame(),vote(step(createGame(),{kind:'raid',viewers:1},0),'raider','HOOK_R',true),step(createGame(),{kind:'crowd-votes',counts:{JAB:1,HOOK_L:0,HOOK_R:0,COMBO:0,SUPER:0}},0)]){
  s=advance(s,3200);expect(s.log.resolved[0]?.actual_dmg).toBeGreaterThan(0);expect(s.log.resolved[0]?.supporters).toEqual([]);expect(summarizeGame(s).chatMvp).toBe(null);
 }
});
it('splits credit equally among people despite raid weighting and handles prototype identities safely',()=>{
 let s=step(createGame(),{kind:'raid',viewers:1},0);s=vote(vote(vote(s,'normal','JAB'),'__proto__','JAB',true),'constructor','JAB');
 s=advance(s,3200);expect(summarizeGame(s).chatMvp).toEqual({user:'__proto__',damage:8/3});
});
it('records partial COMBO damage once and retains supporters through its second hit',()=>{
 let s=vote(createGame(),'voter','COMBO');s=advance(s,3200);
 expect(summarizeGame(s).stats.damageTaken).toBe(7);expect(summarizeGame(s).chatMvp).toEqual({user:'voter',damage:7});
 s=pose(s,3300,true);s=advance(s,3500);
 expect(s.log.resolved[0]).toMatchObject({actual_dmg:7,supporters:['voter']});
 expect(summarizeGame(s).stats.damageTaken).toBe(7);expect(summarizeGame(s).chatMvp).toEqual({user:'voter',damage:7});
});
it('creates one PERFECT candidate per attack, including a fully blocked COMBO',()=>{
 const prev=createGame({moves:['COMBO']});let next=pose(prev,2900,true);next=advance(next,3500);
 expect(highlightCandidates(prev,next)).toEqual([{id:'r1:b0:perfect',kind:'perfect',priority:100,round:1,beat:0,at:3500}]);
 expect(highlightCandidates(next,advance(next,4000))).toEqual([]);
});
it('emits KO for either side, and never fabricates a KO for timeout',()=>{
 const before=createGame();let bossWin={...before,streamer:{...before.streamer,hp:1}};bossWin=advance(bossWin,3200);
 expect(highlightCandidates(before,bossWin)).toMatchObject([{id:'r1:ko',kind:'ko',priority:300,winner:'boss'}]);
 let streamerWin={...before,boss:{...before.boss,hp:1}};streamerWin=step(streamerWin,{kind:'punch',side:'L',at:1,source:'keyboard'},1);
 expect(highlightCandidates(before,streamerWin)).toMatchObject([{kind:'ko',winner:'streamer'}]);
 expect(highlightCandidates(before,advance(pose(createGame({moves:[]}),0,true),75000)).filter(h=>h.kind==='ko')).toEqual([]);
});
it('remembers low HP through healing and emits exactly one comeback on a streamer round win',()=>{
 const before=createGame({moves:['JAB']});let s={...before,streamer:{...before.streamer,hp:20}};
 s=advance(s,3200);s=step(step(s,{kind:'subscribe'},3300),{kind:'subscribe'},3400);expect(s.streamer.hp).toBeGreaterThan(30);
 s={...s,boss:{...s.boss,hp:1}};s=step(s,{kind:'punch',side:'L',at:4000,source:'keyboard'},4000);
 expect(s.log.rounds[0]?.min_streamer_hp).toBeCloseTo(15.2);
 expect(highlightCandidates(before,s).map(h=>h.kind)).toEqual(['ko','comeback']);expect(highlightCandidates(s,advance(s,5000))).toEqual([]);
});
it('uses a strict below30 comeback threshold and resets the low-water mark each round',()=>{
 let s=createGame({moves:[]});s={...s,streamer:{...s.streamer,hp:30},round:{...s.round,min_streamer_hp:30}};s=advance(s,75000);
 expect(highlightCandidates(createGame(),s).some(h=>h.kind==='comeback')).toBe(false);
 const next=step(s,{kind:'next-round'},78000);expect(next.round.min_streamer_hp).toBe(100);
});
it('summarizes actual damage, outcomes, reacted-only timing and round duration',()=>{
 let s=pose(createGame({moves:['JAB','HOOK_L','JAB']}),0,true);s=advance(s,3200);
 s=pose(s,5000,false,'R');s=advance(s,5600);
 s=pose(s,7700,true);s=advance(s,8000);
 const summary=summarizeGame(s);expect(summary.stats).toMatchObject({attacks:3,blocks:1,dodges:1,perfects:1,defended:3,hits:0,damageTaken:0,damageDealt:28,reactionMs:350,rightDodges:1,leftDodges:0,durationMs:8000});
 expect(summary.chatMvp).toBe(null);
});
it('retains match evidence while filtering round summaries and picks deterministic top3 moments',()=>{
 let s=pose(createGame({moves:['JAB','JAB','JAB']}),2900,true);s=advance(s,3200);s=pose(s,4000,false);s=pose(s,5300,true);s=advance(s,5600);s=pose(s,6000,false);s=pose(s,7700,true);s=advance(s,8000);
 s={...s,boss:{...s.boss,hp:1}};s=step(s,{kind:'punch',side:'L',at:9000,source:'keyboard'},9000);const first=s;
 s=step(s,{kind:'next-round'},12000);s=vote(s,'new','JAB');s=advance(s,15200);
 expect(summarizeGame(s,1).stats.perfects).toBe(3);expect(summarizeGame(s,2).chatMvp).toEqual({user:'new',damage:8});
 expect(summarizeGame(s).topMoments.map(h=>h.id)).toEqual(['r1:ko','r1:b0:perfect','r1:b1:perfect']);
 expect(highlightCandidates(first,s)).toEqual([]);expect(summarizeGame(s,1).stats.durationMs).toBe(9000);
});

it('retains partial COMBO damage and credit after veto or a punch KO before the second hit',()=>{
 for(const action of ['veto','ko']){
  let s=advance(vote(createGame(),'voter','COMBO'),3200);
  if(action==='veto')s=step(s,{kind:'control',action:'veto',by:'mod'},3250);
  else {s={...s,boss:{...s.boss,hp:1}};s=step(s,{kind:'punch',side:'L',at:3250,source:'keyboard'},3250);}
  expect(s.activeAttack).toBe(null);expect(s.log.resolved).toHaveLength(0);
  expect(summarizeGame(s).stats.damageTaken).toBe(7);expect(summarizeGame(s).chatMvp).toEqual({user:'voter',damage:7});
 }
});

it('aggregates sessions across restarted matches, merging all voter credit and preserving unique moment IDs',()=>{
 let first=advance(vote(createGame(),'a','JAB'),3200);
 let second=advance(vote(vote(createGame(),'z','HOOK_L'),'a','HOOK_L'),3200);
 const summary=summarizeSession([first,second]);
 expect(summary.stats.damageTaken).toBe(20);expect(summary.chatMvp).toEqual({user:'a',damage:14});expect(summary.stats.durationMs).toBe(6400);
 const perfect=advance(pose(createGame({moves:['JAB']}),2900,true),3200);
 expect(summarizeSession([perfect,perfect]).topMoments.map(h=>h.id)).toEqual(['m1:r1:b0:perfect','m2:r1:b0:perfect']);
 expect(summarizeSession([])).toMatchObject({winner:null,chatMvp:null,topMoments:[],stats:{damageTaken:0,reactionMs:null},roundWins:{streamer:0,boss:0}});
});
it('weights session reaction means by reacted attacks and excludes held defences',()=>{
 let a=advance(pose(createGame({moves:['JAB','HOOK_L']}),2900,true),3200);a=advance(pose(a,5000,false,'R'),5600);
 const b=advance(pose(createGame({moves:['JAB']}),2500,true),3200);
 const held=advance(pose(createGame({moves:['JAB']}),0,true),3200);
 expect(summarizeSession([a,b,held]).stats.reactionMs).toBeCloseTo(800/3);
});
