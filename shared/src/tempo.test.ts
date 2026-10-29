import {expect,it} from 'vitest';
import {DIFFICULTIES,TEMPO,tempoFor,scaleTelegraph} from './tempo';
import {createGame,step} from './engine';
import {DEFAULT_BOSS} from './boss-def';
it('defines all four tempos and scales stored tells and the COMBO gap once',()=>{
 expect(TEMPO).toEqual({easy:{tempo:1.5,beat:3600,telegraph:1200,comboGap:450},medium:{tempo:1.25,beat:3000,telegraph:1000,comboGap:375},hard:{tempo:1,beat:2400,telegraph:800,comboGap:300},expert:{tempo:.8125,beat:1950,telegraph:650,comboGap:244}});
 expect(tempoFor()).toBe(TEMPO.hard);expect(createGame().difficulty).toBe('hard');
 for(const level of DIFFICULTIES)expect(tempoFor(level).comboGap).toBe(Math.round(300*TEMPO[level].tempo));
});
for(const difficulty of DIFFICULTIES)it(`${difficulty}: first attack lands at its beat plus effective tell`,()=>{
 const timing=tempoFor(difficulty);let state=createGame({difficulty,moves:['JAB']});state=step(state,{kind:'advance'},timing.beat);
 expect(state.activeAttack?.lands_at).toBe(timing.beat+timing.telegraph);expect(state.clock.next_beat).toBe(2*timing.beat);
 state=step(state,{kind:'advance'},timing.beat+timing.telegraph-1);expect(state.log.resolved).toHaveLength(0);
 state=step(state,{kind:'advance'},timing.beat+timing.telegraph);expect(state.log.resolved[0]?.at).toBe(timing.beat+timing.telegraph);
});
it('scales a stored Forge 1000ms tell to1250ms at Medium without modifying stored bounds',()=>{
 const def={...structuredClone(DEFAULT_BOSS),name:'Tin Golem',moves:structuredClone(DEFAULT_BOSS.moves.slice(0,4))};def.moves[0]!.telegraph_ms=1000;
 const state=step(createGame({difficulty:'medium',bossDef:def,moves:['JAB']}),{kind:'advance'},3000);
 expect(state.activeAttack?.lands_at).toBe(4250);expect(state.bossDef?.moves[0]?.telegraph_ms).toBe(1000);expect(scaleTelegraph(1000,'medium')).toBe(1250);
});
it('scales COMBO spacing while keeping counters, punch throttle and round length unchanged',()=>{
 for(const difficulty of DIFFICULTIES){const timing=tempoFor(difficulty);let state=createGame({difficulty,moves:['COMBO']});const first=timing.beat+timing.telegraph;
 state=step(state,{kind:'advance'},first);expect(state.streamer.hp).toBe(93);expect(state.counter.open).toBe(false);
 state=step(state,{kind:'advance'},first+timing.comboGap);expect(state.streamer.hp).toBe(86);expect(state.log.resolved.at(-1)?.at).toBe(first+timing.comboGap);expect(state.clock.ends_at).toBe(75000);}
});
it('preserves difficulty through next round, restart and pause/resume',()=>{
 let state=createGame({difficulty:'expert'});state=step(state,{kind:'control',action:'pause',by:'capture'},100);state=step(state,{kind:'control',action:'resume',by:'capture'},1100);expect(state.clock.next_beat).toBe(2950);
 state=step(state,{kind:'advance'},76000);state=step(state,{kind:'next-round'},76001);expect(state.difficulty).toBe('expert');
 state=step(state,{kind:'restart'},76002);expect(state.difficulty).toBe('expert');state=step(state,{kind:'restart',difficulty:'easy'},76003);expect(state.difficulty).toBe('easy');
});
