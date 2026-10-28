import {expect,it} from 'vitest';
import {createGame,step,weightedTally} from '../../shared/src/engine';
import {summarizeGame} from '../../shared/src/highlights';
import {createWireProjection} from './wire-state';
it('omits historical attribution without mutating server evidence or HUD combat fields',()=>{
 let state=createGame();state=step(state,{kind:'vote',user:'viewer',move:'COMBO',at:0,simulated:true},0);
 state=step(state,{kind:'advance'},3500);const project=createWireProjection(),view=project(state);
 expect(state.log.damage).toHaveLength(2);expect(state.log.resolved[0]?.supporters).toEqual(['viewer']);
 expect(view.log.damage).toEqual([]);expect(view.log.telegraphs[0]).not.toHaveProperty('supporters');expect(view.log.resolved[0]).not.toHaveProperty('supporters');
 expect(view.log.resolved[0]).toMatchObject({move:'COMBO',dmg:14,counter_dmg:0,outcome:'HIT'});
 expect(summarizeGame(state).chatMvp).toEqual({user:'viewer',damage:14});
 const next=project(step(state,{kind:'advance'},3600));
 expect(next.log.telegraphs).toBe(view.log.telegraphs);expect(next.log.resolved).toBe(view.log.resolved);
});
it('strips active supporters while retaining current raid weights and all live input state',()=>{
 let state=step(createGame(),{kind:'raid',viewers:10},0);
 for(const [user,move,raider]of [['a','JAB',false],['b','COMBO',true]] as const)state=step(state,{kind:'vote',user,move,raider,at:0,simulated:true},0);
 const project=createWireProjection();expect(weightedTally(project(state))).toEqual(weightedTally(state));
 state=step(state,{kind:'advance'},2400);const view=project(state);
 expect(view.activeAttack).not.toHaveProperty('supporters');expect(state.activeAttack).toHaveProperty('supporters');expect(view.input).toBe(state.input);
});
it('removes500-voter historical identities from serialized resolved attack telemetry',()=>{
 let state=createGame();state=step(state,{kind:'vote-batch',votes:Array.from({length:500},(_,i)=>({kind:'vote',user:`private-viewer-${i}`,move:'JAB',at:0,simulated:true}))},0);
 state=step(state,{kind:'advance'},3200);const raw=JSON.stringify(state),view=JSON.stringify(createWireProjection()(state));
 expect(view).not.toContain('private-viewer-');expect(view.length).toBeLessThan(raw.length/5);
});
it('preserves READ IT, chat habit and opening metadata while keeping combat credit private',()=>{
 let state=createGame({roundNumber:2,moves:['JAB']});
 state={...state,chatScouting:{...state.chatScouting,history:Array(12).fill('JAB'),card:'JAB',n:12,share:1,lowerBound:.8}};
 state=step(state,{kind:'pose',guard:true,lean:null,source:'keyboard',at:0},0);
 state=step(state,{kind:'vote-batch',votes:Array.from({length:8},(_,i)=>({kind:'vote',user:`brace-private-${i}`,move:'JAB',at:0,simulated:true}))},0);
 const project=createWireProjection();state=step(state,{kind:'advance'},2400);const tell=project(state);
 expect(tell.activeAttack).toMatchObject({brace:true});expect(tell.activeAttack).not.toHaveProperty('supporters');
 expect(tell.chatScouting).toMatchObject({card:'JAB',n:12,share:1});expect(tell.chatScouting.openings[0]).toMatchObject({round:2,beat:0,move:'JAB',voted:true});
 state=step(state,{kind:'advance'},3200);const view=project(state);
 expect(view.log.resolved[0]).toMatchObject({outcome:'BLOCK',counter_dmg:10,braced:true,dmg:0});
 expect(view.log.resolved[0]).not.toHaveProperty('supporters');expect(view.log.damage).toEqual([]);
 expect(state.boss.hp).toBe(125);
});
