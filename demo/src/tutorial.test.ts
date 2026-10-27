import { expect, test } from 'vitest';
import { InputTutorial } from './tutorial';
import { assertSimulationAllowed } from './safety';
import { createSimulationSource } from './source';
import { createGame, step } from '../../shared/src/engine';

test('three keyboard inputs finish the tutorial without login or a timer', () => {
  const tutorial = new InputTutorial();
  expect(tutorial.input({kind:'punch',side:'L',source:'keyboard',at:0})).toBe(false);
  tutorial.input({kind:'pose',guard:true,lean:null,source:'keyboard',at:100});
  expect(tutorial.step).toBe(1);
  tutorial.input({kind:'pose',guard:false,lean:'L',source:'keyboard',at:200});
  expect(tutorial.input({kind:'punch',side:'L',source:'keyboard',at:300})).toBe(true);
});

test('simulated sources refuse live tokens unless mock is explicit (acceptance 18)', () => {
  expect(()=>createSimulationSource({viewers:50,seed:1,liveTokenLoaded:true})).toThrow(/refuses/);
  expect(()=>createSimulationSource({viewers:50,seed:1,liveTokenLoaded:true,mock:true})).not.toThrow();
  expect(()=>assertSimulationAllowed({liveTokenLoaded:true})).toThrow(/refuses/);
  expect(()=>assertSimulationAllowed({liveTokenLoaded:true,mock:true})).not.toThrow();
  expect(()=>assertSimulationAllowed({liveTokenLoaded:false})).not.toThrow();
});

test('the demo crowd feeds simulated votes into the same fight reducer', () => {
  let state=createGame({seed:42,viewers:50,now:0});
  const source=createSimulationSource({viewers:50,seed:42,liveTokenLoaded:false});
  const votes=source.votes(state,0);
  expect(votes.length).toBeGreaterThan(0);
  expect(votes.every(vote=>vote.simulated)).toBe(true);
  state=step(state,{kind:'vote-batch',votes},0);
  state=step(state,{kind:'advance'},2400);
  expect(state.activeAttack?.lands_at).toBe(3200);
  const lean=state.activeAttack?.move==='HOOK_L'?'R':state.activeAttack?.move==='HOOK_R'?'L':null;
  state=step(state,{kind:'pose',guard:true,lean,source:'keyboard',at:2800},2800);
  state=step(state,{kind:'advance'},3500);
  expect(state.streamer.hp).toBe(100);
  expect(state.boss.hp).toBeLessThan(135);
});
