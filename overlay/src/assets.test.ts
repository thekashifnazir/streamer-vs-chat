import { readFileSync, existsSync } from 'node:fs';
import { expect, it } from 'vitest';
import { animationFrame, bossAtlasUrl, bossSheetUrl, type BossAtlas } from './assets';
import { defenceCue } from './hud';
const atlas=JSON.parse(readFileSync(new URL(bossAtlasUrl),'utf8')) as BossAtlas;
it('uses the supplied local atlas and keeps each windup inside the800ms telegraph',()=>{
  expect(existsSync(new URL(bossSheetUrl))).toBe(true);
  for(const clip of ['jab','hookl','hookr','combo','super']) {
    const frames=atlas.animations[`${clip}_windup`]!;
    expect(frames.reduce((sum,name)=>sum+atlas.frames[name]!.duration,0)).toBe(800);
    expect(animationFrame(atlas,`${clip}_windup`,0)).toBe(frames[0]);
    expect(animationFrame(atlas,`${clip}_windup`,799)).toBe(frames.at(-1));
    expect(animationFrame(atlas,`${clip}_windup`,1000)).toBe(frames.at(-1));
  }
});
it('lands the second combo frame at300ms and holds KO instead of looping',()=>{
  expect(animationFrame(atlas,'combo_hit',299)).toBe('combo_hit_1');
  expect(animationFrame(atlas,'combo_hit',300)).toBe('combo_hit_2');
  expect(animationFrame(atlas,'ko',60_000)).toBe('ko_2');
  expect(animationFrame(atlas,'idle',640)).toBe('idle_0');
});
it('pairs each attack with the player defence direction',()=>{
  expect(defenceCue('HOOK_L')).toBe('LEAN →');
  expect(defenceCue('HOOK_R')).toBe('← LEAN');
  expect(defenceCue('JAB')).toBe('GUARD');
  expect(defenceCue('COMBO')).toBe('GUARD');
  expect(defenceCue('SUPER')).toBe('LEAN ANY WAY');
});

import { createGame } from '../../shared/src/engine';
import { FIXED_STAMP_MS, exploitHabitNote, scoutingPresentation } from './hud';
function scouted(side:'L'|'R') {
  const state=createGame({roundNumber:2});
  // Old dodges before a fixed habit must not inflate the new card percentage.
  state.scouting={...state.scouting,card:side,n:14,since_fix:20,
    dodges:[...Array<'L'|'R'>(20).fill(side),...Array<'L'|'R'>(12).fill(side),side==='L'?'R':'L',side==='L'?'R':'L']};
  return state;
}
it('projects exact post-fix evidence and the opposite-lean exploit command for either habit',()=>{
  for(const side of ['L','R'] as const) {
    const view=scoutingPresentation(scouted(side));
    expect(view).toMatchObject({kind:'habit',side,n:14,count:12,percent:86,
      command:side==='L'?'!left/!l':'!right/!r',highlightedMove:side==='L'?'HOOK_L':'HOOK_R'});
  }
});
it('never invents a card before round2 or when the authoritative habit is absent',()=>{
  const state=scouted('L');state.round.number=1;
  expect(scoutingPresentation(state)).toEqual({kind:'hidden'});
  state.round.number=2;state.scouting.card=null;state.scouting.last_fix=null;
  expect(scoutingPresentation(state)).toEqual({kind:'hidden'});
});
it('keeps the evidence visible but removes exploit glow throughout all three cooldown beats',()=>{
  const state=scouted('R');
  for(const cooldown of [3,2,1]) {
    state.scouting.cooldown=cooldown;
    expect(scoutingPresentation(state)).toMatchObject({kind:'habit',cooldown,highlightedMove:undefined});
  }
  state.scouting.cooldown=0;
  expect(scoutingPresentation(state)).toMatchObject({highlightedMove:'HOOK_R'});
});
it('shows an authoritative FIXED stamp with capped healing, then hides it; pause freezes its age',()=>{
  const state=scouted('L');state.scouting.card=null;
  state.scouting.last_fix={at:2000,side:'L',hp_gained:4};state.now=2000;
  expect(scoutingPresentation(state)).toEqual({kind:'fixed',side:'L',healed:4});
  state.now=2000+FIXED_STAMP_MS-1;expect(scoutingPresentation(state).kind).toBe('fixed');
  state.now++;expect(scoutingPresentation(state).kind).toBe('hidden');
  state.clock.paused_at=2500;state.now=50_000;
  expect(scoutingPresentation(state).kind).toBe('fixed');
});
it('names the exploited habit from the attack snapshot, including after the live card is cleared',()=>{
  const state=scouted('L');state.scouting.card=null;
  state.activeAttack={round:2,beat:1,move:'HOOK_L',at:2400,lands_at:3200,exploit:true,exploit_side:'L',vetoed:false};
  expect(exploitHabitNote(state)).toBe('EXPLOIT · YOU DODGE LEFT');
  state.activeAttack={...state.activeAttack,move:'HOOK_R',exploit_side:'R'};
  expect(exploitHabitNote(state)).toBe('EXPLOIT · YOU DODGE RIGHT');
  state.activeAttack.exploit=false;expect(exploitHabitNote(state)).toBe('');
});

import { isTallySnapshot, raidPresentation, voteShares } from './hud';
import type { TallySnapshot } from '@svc/shared';
function tally():TallySnapshot {
  return {kind:'tally',simulated:true,voters:4,tally:{JAB:3,HOOK_L:1,HOOK_R:0,COMBO:0,SUPER:0}};
}
it('keeps raw voter counts while projecting the supplied weighted shares and leader',()=>{
  const message={...tally(),weights:{JAB:3,HOOK_L:2,HOOK_R:0,COMBO:0,SUPER:0}};
  expect(isTallySnapshot(message)).toBe(true);
  expect(voteShares(message)).toMatchObject({percent:{JAB:60,HOOK_L:40},highest:3,total:5});
  expect(message.tally).toEqual(tally().tally);expect(message.voters).toBe(4);
  expect(voteShares(tally()).percent).toMatchObject({JAB:75,HOOK_L:25});
});
it('rejects malformed optional influence weights instead of displaying NaN or negative bars',()=>{
  for(const weights of [null,{}, {JAB:NaN,HOOK_L:1,HOOK_R:0,COMBO:0,SUPER:0},
    {JAB:Infinity,HOOK_L:1,HOOK_R:0,COMBO:0,SUPER:0},
    {JAB:-1,HOOK_L:1,HOOK_R:0,COMBO:0,SUPER:0},
    {JAB:Number.MAX_VALUE,HOOK_L:Number.MAX_VALUE,HOOK_R:0,COMBO:0,SUPER:0}]) {
    expect(isTallySnapshot({...tally(),weights})).toBe(false);
  }
  expect(isTallySnapshot({...tally(),weights:{JAB:1.5,HOOK_L:.5,HOOK_R:0,COMBO:0,SUPER:0}})).toBe(true);
});
it('shows zero influence rather than inventing a share when the raid cap suppresses all-raider votes',()=>{
  const message={...tally(),weights:{JAB:0,HOOK_L:0,HOOK_R:0,COMBO:0,SUPER:0}};
  expect(voteShares(message)).toMatchObject({total:0,highest:0,percent:{JAB:0,HOOK_L:0,HOOK_R:0,COMBO:0,SUPER:0}});
  expect(message.voters).toBe(4);
});
it('shows the fifteen-second raid phase, freezes while paused, and hides exactly at expiry',()=>{
  const state=createGame({now:1000});state.raid.ends_at=16_000;
  expect(raidPresentation(state)).toEqual({active:true,seconds:15});
  state.now=15_999;expect(raidPresentation(state)).toEqual({active:true,seconds:1});
  state.now=16_000;expect(raidPresentation(state)).toEqual({active:false,seconds:0});
  state.clock.paused_at=10_000;state.now=90_000;
  expect(raidPresentation(state)).toEqual({active:true,seconds:6});
});

import {framePlacement} from './assets';
it('keeps atlas artwork at a fixed approximately420px scale and invariant anchor',()=>{
 expect(framePlacement(atlas.frames.idle_0!,470,486).height).toBeGreaterThan(400);expect(framePlacement(atlas.frames.idle_0!,470,486).height).toBeLessThan(440);
 for(const frame of Object.values(atlas.frames)){
  const draw=framePlacement(frame,470,486);
  expect(draw.height).toBe(frame.frame.h);
  expect(draw.width/frame.frame.w).toBe(1);
  expect(draw.x-frame.spriteSourceSize.x+frame.sourceSize.w*frame.anchor.x).toBe(235);
  expect(draw.y-frame.spriteSourceSize.y+frame.sourceSize.h*frame.anchor.y).toBeCloseTo(468);
 }
});
it('enforces36px gameplay labels with the explicit26px wrapping connection exception',()=>{
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
 const gameplayCss=css.replace(/\.rails-hud \.streamer footer>\.connection\{[^}]*\}/g,'');
 const sizes=[...gameplayCss.matchAll(/font-size:\s*([\d.]+)px/g),...gameplayCss.matchAll(/font:[^;{}]*?\s([\d.]+)px/g)].map(match=>Number(match[1]));
 expect(sizes.length).toBeGreaterThan(40);expect(sizes.every(size=>size>=36)).toBe(true);
 expect(css).toContain('.vote-command small .vote-count{font-size:38px}');expect(css).toContain('[data-id="habit-n"]{font-size:40px}');
});

it('fits every atlas frame inside486px transparent headroom at the fixed ground pivot',()=>{
 for(const frame of Object.values(atlas.frames)){const draw=framePlacement(frame,470,486);expect(draw.x).toBeGreaterThanOrEqual(0);expect(draw.x+draw.width).toBeLessThanOrEqual(470);expect(draw.y).toBeGreaterThanOrEqual(0);expect(draw.y+draw.height).toBeLessThanOrEqual(486);}
});
