import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {DEFAULT_BOSS,validateBoss,type BossDef} from './boss-def';
import {gateBoss,tuneBoss,scaleBoss} from './boss-forge';
import {createGame,step,bossMove} from './engine';
import {parseChatVote,MOVES} from './index';
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
it('compiled R1 arithmetic matches production reducer HP and winner for seeded plans',()=>{
 for(const def of [DEFAULT_BOSS,fixture()])for(const player of [0,1] as const)for(const sample of [0,19,145]){
  const plan=forgePlan(def,player,2,sample),events:{event:EngineEvent;at:number}[]=[];
  let state=createGame({bossDef:def,moves:plan.map(item=>item.move)});
  plan.forEach((item,beat)=>{
   const spec=bossMove(state,item.move),draw=(beat+1)*2400,landing=draw+spec.telegraph_ms,end=landing+(spec.hits-1)*300;
   events.push({event:{kind:'pose',guard:false,lean:null,source:'keyboard',at:draw+1},at:draw+1});
   const guard=item.outcome==='BLOCK'||item.outcome==='PERFECT'||item.outcome==='CHIP';
   const lean=item.outcome==='DODGE'?(spec.defence==='lean_left'?'L':'R'):null;
   const at=landing-(item.outcome==='PERFECT'?300:500);events.push({event:{kind:'pose',guard,lean,source:'keyboard',at},at});
   for(let punch=0;punch<item.punches;punch++)events.push({event:{kind:'punch',side:'L',source:'keyboard',at:end+100+punch*450},at:end+100+punch*450});
   if(item.stray)events.push({event:{kind:'punch',side:'L',source:'keyboard',at:end+1100},at:end+1100});
  });
  for(const {event,at} of events.sort((a,b)=>a.at-b.at))if(at<75000)state=step(state,event,at);
  state=step(state,{kind:'advance'},75000);const fast=evaluateForgePlan(def,plan);
  expect(fast.hp).toBeCloseTo(state.streamer.hp,8);expect(fast.bossHp).toBeCloseTo(state.boss.hp,8);expect(fast.winner).toBe(state.round.winner);
 }
});
