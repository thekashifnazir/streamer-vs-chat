import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {DEFAULT_BOSS,validateBoss,type BossDef} from './boss-def';
import {gateBoss,tuneBoss,scaleBoss} from './boss-forge';
import {createGame,step,bossMove,FOCUS_RULES} from './engine';
import {parseChatVote,MOVES} from './index';
import {DIFFICULTIES,tempoFor,scaleTelegraph} from './tempo';
const fixture=()=>JSON.parse(readFileSync(new URL('../../fixtures/bosses/tin-tactician.json',import.meta.url),'utf8')) as BossDef;
describe('Forge data-driven production reducer',()=>{
 it('normalises the canonical definition to the exact existing rules',()=>{expect(createGame({bossDef:DEFAULT_BOSS})).toEqual(createGame());});
 it('parses only custom commands and resolves their own defence, tell and damage',()=>{
  const def=fixture();def.moves[0]={...def.moves[0]!,command:'!sway',label:'SWAY',defence:'lean_left',telegraph_ms:1100,damage:15,hits:1};
  expect(parseChatVote('!SWAY hello','A',0,true,def)?.move).toBe('JAB');expect(parseChatVote('!jab','A',0,true,def)).toBeNull();
  let state=createGame({bossDef:def,moves:['JAB']});state=step(state,{kind:'advance'},2400);expect(state.activeAttack?.lands_at).toBe(3500);
  state=step(state,{kind:'pose',guard:false,lean:'L',source:'keyboard',at:3000},3000);state=step(state,{kind:'advance'},3500);expect(state.log.resolved.at(-1)?.outcome).toBe('DODGE');expect(state.boss.hp).toBe(def.hp-9);
 });
 it('custom fifth move is not SUPER gated and absent slots do not count',()=>{
  const def=fixture();def.moves.push({...def.moves[2]!,command:'!swerve'});let state=createGame({bossDef:def});state=step(state,{kind:'vote',user:'A',move:'SUPER',at:1,simulated:true},1);expect(state.tally.SUPER).toBe(1);
  state=createGame({bossDef:fixture()});state=step(state,{kind:'vote',user:'A',move:'SUPER',at:1,simulated:true},1);expect(state.voters).toBe(0);
 });
 it('resolves all three custom hits and never counters a partially defended chain',()=>{
  const def=fixture();def.moves[0]={...def.moves[0]!,damage:10,hits:3,defence:'lean_left'};let state=createGame({bossDef:def,moves:['JAB']});state=step(state,{kind:'advance'},3200);expect(state.streamer.hp).toBe(90);
  state=step(state,{kind:'pose',guard:false,lean:'L',source:'keyboard',at:3300},3300);state=step(state,{kind:'advance'},3800);expect(state.log.resolved.at(-1)).toMatchObject({outcome:'HIT',dmg:10,counter_dmg:0});
 });
 it('carries a definition across rounds/restarts and explicitly restores the default',()=>{
  let state=createGame({bossDef:fixture()});state=step(state,{kind:'restart'},10);expect(state.bossDef?.name).toBe('Tin Tactician');state=step(state,{kind:'restart',bossDef:null},20);expect(state.bossDef).toBeUndefined();
 });
 it('clears move scouting when a different definition replaces slot meanings',()=>{
  let state=createGame({bossDef:fixture()});state=step(state,{kind:'advance'},75000);
  state={...state,chatScouting:{...state.chatScouting,history:Array(12).fill('JAB'),card:'JAB',n:12,share:1,lowerBound:.9}};
  const def=fixture();def.moves[0]!.label='ANOTHER MOVE';const next=step(state,{kind:'next-round',bossDef:def},75001);expect(next.chatScouting.history).toEqual([]);expect(next.chatScouting.card).toBeNull();
 });
});
describe('Forge deterministic §5 balance gate',()=>{
 it('passes the canonical default at all four viewer sizes',()=>{const gate=gateBoss(DEFAULT_BOSS);expect(gate.pass).toBe(true);expect(gate.rounds).toBe(4000);expect(gate.viewers).toEqual([0,3,50,500]);expect(gateBoss(DEFAULT_BOSS)).toEqual(gate);},20000);
 it('rescues a legal double-damage custom boss with one bounded deterministic scale',()=>{
  const def=fixture();def.moves=def.moves.map(move=>({...move,damage:move.damage*2,chip:move.chip*2}));expect(validateBoss(def)).toEqual([]);
  const result=tuneBoss(def);expect(result.before.pass).toBe(false);expect(result.after.pass).toBe(true);expect(result.factor).toBeGreaterThanOrEqual(.2);expect(result.factor).toBeLessThanOrEqual(2);expect(validateBoss(result.def)).toEqual([]);for(let i=0;i<def.moves.length;i++){expect(result.def.moves[i]!.damage).toBeCloseTo(def.moves[i]!.damage*result.factor,10);expect(result.def.moves[i]!.chip).toBeCloseTo(def.moves[i]!.chip*result.factor,10);}expect(tuneBoss(def)).toEqual(result);
 },20000);
});

import {forgePlan,evaluateForgePlan} from './boss-forge';
import type {EngineEvent} from './engine';
it('compiled focus/finisher/SUPER arithmetic matches production HP and winner for seeded plans',()=>{
 for(const difficulty of DIFFICULTIES)for(const def of [DEFAULT_BOSS,fixture()])for(const player of [0,1] as const)for(const sample of [0,19,145]){
  const plan=forgePlan(def,player,2,sample,difficulty),events:{at:number;run:()=>void}[]=[];
  const tempo=tempoFor(difficulty),reserved=def===DEFAULT_BOSS?2*tempo.telegraph+2*Math.round(600*tempo.tempo):Math.max(...def.moves.map(move=>scaleTelegraph(move.telegraph_ms,difficulty)+(move.hits-1)*tempo.comboGap));
  // Forge's conservative schedule reserves the whole longest chain before
  // admitting any final draw, even if that particular draw is a shorter move.
  expect(plan).toHaveLength(Math.floor((74999-reserved)/tempo.beat));
  expect(plan.length*tempo.beat+reserved).toBeLessThan(75000);
  let state=createGame({bossDef:def,difficulty,moves:plan.map(item=>item.move)});
  const queue=(at:number,run:()=>void)=>events.push({at,run});
  const pose=(at:number,guard:boolean,lean:'L'|'R'|null=null)=>{state=step(state,{kind:'pose',guard,lean,source:'keyboard',at},at);};
  plan.forEach((item,beat)=>{
   if(item.skip)return;
   const spec=bossMove(state,item.move),draw=(beat+1)*tempoFor(difficulty).beat,isSuper=!!item.superSteps;
   const landing=draw+scaleTelegraph(spec.telegraph_ms,difficulty)*(isSuper?2:1),gap=isSuper?Math.round(600*tempoFor(difficulty).tempo):tempoFor(difficulty).comboGap,end=landing+(isSuper?2:spec.hits-1)*gap;
   queue(draw,()=>{state=step(state,{kind:'advance'},draw);if(item.superSteps&&state.activeAttack){state={...state,activeAttack:{...state.activeAttack,super_steps:item.superSteps.map(step=>step.defence)}};}});
   queue(draw+1,()=>pose(draw+1,false));
   if(item.superSteps)item.superSteps.forEach((part,index)=>{
    const at=Math.max(index?landing+(index-1)*gap+1:draw+2,landing+index*gap-500),guard=part.outcome==='BLOCK'||part.outcome==='CHIP',lean=part.outcome==='DODGE'?(part.defence==='lean_left'?'L':'R'):null;
    queue(at,()=>pose(at,guard,lean));
   });
   else{
    const guard=item.outcome==='BLOCK'||item.outcome==='PERFECT'||item.outcome==='CHIP',lean=item.outcome==='DODGE'?(spec.defence==='lean_left'?'L':'R'):null;
    const at=landing-(item.outcome==='PERFECT'?300:500);queue(at,()=>pose(at,guard,lean));
   }
   queue(end,()=>{state=step(state,{kind:'advance'},end);if(state.focus===100&&state.finisher.used<2&&!state.activeAttack)pose(end,!!item.finisher);});
   for(let punch=0;punch<item.punches;punch++){const at=end+100+punch*450;queue(at,()=>{state=step(state,{kind:'punch',side:'L',source:'keyboard',at},at);});}
   if(item.stray){const at=end+1100;queue(at,()=>{state=step(state,{kind:'punch',side:'L',source:'keyboard',at},at);});}
  });
  for(const {at,run}of events.sort((a,b)=>a.at-b.at))if(at<75000)run();
  state=step(state,{kind:'advance'},75000);const fast=evaluateForgePlan(def,plan,difficulty);
  expect(fast.hp,`${difficulty} ${def.name} p${player} s${sample}`).toBeCloseTo(state.streamer.hp,8);expect(fast.bossHp,`${difficulty} ${def.name} p${player} s${sample}`).toBeCloseTo(state.boss.hp,8);expect(fast.winner).toBe(state.round.winner);
 }
},120000);
it('scales Forge telegraphs and hit gaps through difficulty timing',()=>{
 const def=fixture();def.moves[0]={...def.moves[0]!,telegraph_ms:1000,hits:2};
 const state=step(createGame({bossDef:def,difficulty:'medium',moves:['JAB']}),{kind:'advance'},3000);
 expect(state.activeAttack?.lands_at).toBe(4250);
 expect(step(state,{kind:'advance'},4625).log.resolved.at(-1)?.at).toBe(4625);
});
it('excludes Expert terminal-COMBO punches after the 75s timeout',()=>{
 const def=fixture();def.moves[0]={...def.moves[0]!,defence:'lean_left',chip:0};
 const plan=Array.from({length:38},(_,index)=>({move:index===37?'COMBO':'JAB',outcome:index===37?'BLOCK':'CHIP',punches:index===37?2:0,stray:index===37})) as import('./boss-forge').ForgePlanBeat[];
 let state=createGame({bossDef:def,difficulty:'expert',moves:plan.map(item=>item.move)});
 state=step(state,{kind:'pose',guard:true,lean:null,source:'keyboard',at:0},0);
 state=step(state,{kind:'advance'},75000);
 const fast=evaluateForgePlan(def,plan,'expert');
 expect(state.log.resolved.at(-1)?.at).toBe(74994);
 expect(fast).toEqual({hp:100,bossHp:def.hp-8,winner:state.round.winner});
 expect(fast.bossHp).toBe(state.boss.hp);
});
it('orders a previous Expert stray after the next attack lethal hit',()=>{
 const def=fixture();def.moves[0]={...def.moves[0]!,defence:'lean_left',damage:12,chip:0,telegraph_ms:1200,hits:3};
 def.moves[1]={...def.moves[1]!,damage:30,chip:0,telegraph_ms:600,hits:1};
 const plan:import('./boss-forge').ForgePlanBeat[]=[...Array.from({length:3},()=>({move:'HOOK_L' as const,outcome:'HIT' as const,punches:0,stray:false})),{move:'JAB',outcome:'CHIP',punches:0,stray:true},{move:'HOOK_L',outcome:'HIT',punches:0,stray:false}];
 // Three hits leave10HP. Long chain ends9263; stray10363 follows lethal hit10238.
 let state=createGame({bossDef:def,difficulty:'expert',moves:plan.map(item=>item.move)});
 state=step(state,{kind:'pose',guard:true,lean:null,source:'keyboard',at:7801},7801);
 state=step(state,{kind:'pose',guard:false,lean:null,source:'keyboard',at:9751},9751);
 state=step(state,{kind:'punch',side:'L',source:'keyboard',at:10363},10363);
 state=step(state,{kind:'advance'},75000);
 const fast=evaluateForgePlan(def,plan,'expert');expect(fast.hp).toBe(0);expect(fast.bossHp).toBe(def.hp);expect(fast.hp).toBe(state.streamer.hp);expect(fast.bossHp).toBe(state.boss.hp);expect(fast.winner).toBe(state.round.winner);
});
it('fires a ready guarded gap before a simultaneous next draw',()=>{
 const def=fixture();def.moves[0]={...def.moves[0]!,defence:'lean_left',telegraph_ms:1169,hits:1};
 const reads=Math.ceil(100/FOCUS_RULES.clean),plan=Array.from({length:reads+1},()=>({move:'JAB' as const,outcome:'DODGE' as const,punches:0,stray:false,finisher:true}));
 let state=createGame({bossDef:def,difficulty:'expert',moves:plan.map(item=>item.move)});
 for(let beat=0;beat<plan.length;beat++){
  const draw=(beat+1)*1950,landing=draw+950;
  state=step(state,{kind:'advance'},draw);
  state=step(state,{kind:'pose',guard:false,lean:null,source:'keyboard',at:draw+1},draw+1);
  state=step(state,{kind:'pose',guard:false,lean:'L',source:'keyboard',at:landing-500},landing-500);
  state=step(state,{kind:'advance'},landing);
  if(state.focus===100)state=step(state,{kind:'pose',guard:true,lean:'L',source:'keyboard',at:landing},landing);
 }
 expect(state.log.finishers[0]?.at).toBe((reads+1)*1950);
 // Compare the completed bounded plan, before unspecified autopilot inputs.
 const fast=evaluateForgePlan(def,plan,'expert');
 expect(fast.hp).toBe(state.streamer.hp);expect(fast.bossHp).toBe(state.boss.hp);
});
