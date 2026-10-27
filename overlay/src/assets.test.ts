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
      command:side==='L'?'!hookl':'!hookr',highlightedMove:side==='L'?'HOOK_L':'HOOK_R'});
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
