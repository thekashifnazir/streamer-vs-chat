import {describe,expect,it} from 'vitest';
import {formatHypeFull,formatRoundResult,type ResultRoundData} from './result-text';
import {DIFFICULTIES,difficultyName} from './tempo';

const round:ResultRoundData={number:1,winner:'streamer',streamerHp:73.49,bossHp:0,bossMaxHp:135,bossName:'CHAT GOLEM',score:{streamer:1,boss:0},matchOver:false,difficulty:'hard',hookL:'!left (!l)',hookR:'!right (!r)'};
// The pre-extraction server template is an independent byte-for-byte parity oracle.
function previousServerText(result:ResultRoundData){
 return `Streamer vs Chat · Round ${result.number}: ${result.winner==='streamer'?'STREAMER':result.bossName} wins (${Math.round(result.streamerHp)}/100 vs ${Math.round(result.bossHp)}/${result.bossMaxHp} HP) · ${result.score.streamer}–${result.score.boss}${result.matchOver?' · MATCH OVER':''} · ${difficultyName(result.difficulty)} · Chat: ${result.hookL} / ${result.hookR}`;
}
describe('shared result text preserves the local bot output',()=>{
 it('retains the literal default round line',()=>{
  expect(formatRoundResult(round)).toBe('Streamer vs Chat · Round 1: STREAMER wins (73/100 vs 0/135 HP) · 1–0 · Hard · Chat: !left (!l) / !right (!r)');
 });
 for(const difficulty of DIFFICULTIES)for(const winner of ['streamer','boss'] as const)for(const matchOver of [false,true]){
  it(`is byte-identical for ${difficulty}, ${winner}, matchOver=${matchOver}, default and custom bosses`,()=>{
   for(const boss of [{bossName:'CHAT GOLEM',bossMaxHp:135,hookL:'!left (!l)',hookR:'!right (!r)'},{bossName:'Nak Muay',bossMaxHp:135,hookL:'!elbowl',hookR:'!elbowr'}]){
    const input={...round,...boss,difficulty,winner,matchOver,number:3,streamerHp:0.5,bossHp:91.51,score:{streamer:1,boss:2}};
    expect(formatRoundResult(input)).toBe(previousServerText(input));
   }
  });
 }
 it('does not invent command aliases for hosted primary commands or Forge commands',()=>{
  expect(formatRoundResult({...round,hookL:'!left',hookR:'!right'})).toMatch(/Chat: !left \/ !right$/);
  expect(formatRoundResult({...round,hookL:'!teep',hookR:'!clinch'})).toMatch(/Chat: !teep \/ !clinch$/);
 });
 it('retains the exact HYPE-full notice',()=>expect(formatHypeFull()).toBe('HYPE is full! Type !s for the SUPER'));
});
