import {describe,it,expect} from 'vitest';
import {defenceReadProbability} from './sim-model';
import {READ_MODEL,simulateRound} from '../../scripts/sim';
import {tempoFor} from './tempo';
import {DEFAULT_BOSS} from './boss-def';
describe('INFERRED warning-time reaction model',()=>{
 it('uses the written formula and leaves hard unchanged',()=>{
  expect(defenceReadProbability(.55,800)).toBe(.55);
  expect(defenceReadProbability(.55,1200)).toBeCloseTo(.63);
  expect(defenceReadProbability(.55,1000)).toBeCloseTo(.59);
  expect(defenceReadProbability(.55,650)).toBeCloseTo(.52);
  expect(defenceReadProbability(.94,1200)).toBe(.95);
 });
 it('scales early cohort fraction from the beat without changing hard',()=>{
  for(const level of ['easy','medium','hard','expert'] as const)expect(READ_MODEL.earlyFraction(level)).toBe(1000/tempoFor(level).beat);
  expect(READ_MODEL.earlyFraction()).toBe(1000/2400);
 });
 it('keeps Expert600ms Forge responses chronological after the draw',()=>{
  const bossDef={...structuredClone(DEFAULT_BOSS),name:'Quick Golem',moves:structuredClone(DEFAULT_BOSS.moves.slice(0,4)).map(move=>({...move,telegraph_ms:600}))};
  const state=simulateRound('casual',50,2026,{difficulty:'expert',bossDef});
  expect(state.round.over).toBe(true);
  for(const input of state.log.inputs){const attack=state.log.telegraphs.find(attack=>input.at>=attack.at&&input.at<attack.lands_at);if(attack)expect(input.at).toBeGreaterThan(attack.at);}
 });
 it('queues long Expert Forge counter punches across the next draw',()=>{
  const bossDef={...structuredClone(DEFAULT_BOSS),name:'Long Golem',moves:structuredClone(DEFAULT_BOSS.moves.slice(0,4)).map(move=>({...move,damage:8,chip:0,hits:3,telegraph_ms:1200}))};
  for(const player of ['good','keyboard'] as const){
   const state=simulateRound(player,50,2026,{difficulty:'expert',bossDef});
   expect(state.round.over).toBe(true);
   expect(state.log.resolved.length).toBeGreaterThan(0);
  }
 });
 it('keeps the omitted difficulty exactly equivalent to hard',()=>{
  for(const viewers of [0,3,50,500])expect(simulateRound('casual',viewers,2026)).toEqual(simulateRound('casual',viewers,2026,{difficulty:'hard'}));
 });
});
