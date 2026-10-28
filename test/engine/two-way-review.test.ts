import {expect,it} from 'vitest';
import {createGame,step,type GameState} from '../../shared/src/engine';
const cohort=(state:GameState,move:'JAB'|'COMBO',at=state.now,raider=false)=>step(state,{kind:'vote-batch',votes:Array.from({length:8},(_,i)=>({kind:'vote',user:`review-${i}`,move,at,simulated:true,raider}))},at);
it('all-raider zero-effective votes never become chat habit evidence',()=>{
 let state=step(createGame({moves:['JAB']}),{kind:'raid',viewers:8},0);state=cohort(state,'JAB',0,true);
 expect(state.tally.JAB).toBe(8);state=step(state,{kind:'advance'},2400);
 expect(state.chatScouting.history).toEqual([]);expect(state.chatScouting.openings[0]).toMatchObject({move:'JAB',voted:false});
});
it('eight immediate matching votes receive standard JAB damage without a coordination bonus',()=>{
 let state=cohort(createGame({moves:['JAB']}),'JAB');state=step(state,{kind:'advance'},3200);
 expect(state.log.resolved[0]?.dmg).toBe(8);expect(state.streamer.hp).toBe(92);expect(state.log.resolved[0]).not.toHaveProperty('sync_count');expect(state).not.toHaveProperty('sync');
});
it('standard COMBO applies mercy separately when crossing30HP despite eight matching votes',()=>{
 let state=cohort(createGame({moves:['COMBO']}),'COMBO');state={...state,streamer:{...state.streamer,hp:31}};state=step(state,{kind:'advance'},3500);
 expect(state.log.resolved[0]?.dmg).toBeCloseTo(7+7*.6);expect(state.streamer.hp).toBeCloseTo(19.8);
 expect(state.log.damage).toHaveLength(2);expect(state.log.damage[0]?.damage).toBeCloseTo(7);expect(state.log.damage[1]?.damage).toBeCloseTo(4.2);
});
it('a new round preserves opening history immutably and marks its next opening',()=>{
 let state=cohort(createGame({moves:['JAB']}),'JAB');state=step(state,{kind:'advance'},2400);state={...state,boss:{...state.boss,hp:1}};
 state=step(state,{kind:'punch',side:'L',source:'keyboard',at:2500},2500);const previous=state;state=step(state,{kind:'next-round'},5500);
 expect(state.chatScouting.openingPending).toBe(true);state=cohort(state,'JAB',5500);state=step(state,{kind:'advance'},7900);
 expect(state.chatScouting.openings.at(-1)).toMatchObject({round:2,beat:0});expect(previous.chatScouting.openings).toHaveLength(1);expect(state.chatScouting.openings).toHaveLength(2);
});
