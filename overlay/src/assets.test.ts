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
