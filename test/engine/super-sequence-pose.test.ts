import {describe,it,expect} from 'vitest';
import {createGame,step,attackStepGap,type GameState} from '../../shared/src/engine.js';
// The reducer is source-agnostic; this proves webcam (source:'pose') input alone can clear every SUPER step.
const advance=(s:GameState,t:number)=>step(s,{kind:'advance'},t);
const pose=(s:GameState,t:number,guard:boolean,lean:'L'|'R'|null)=>step(s,{kind:'pose',at:t,guard,lean,source:'pose'},t);
describe('SUPER with webcam pose input',()=>{
 it('clears all three guard / lean steps on 30 seeds with pose-source inputs only',()=>{
  for(let seed=0;seed<30;seed++){
   let s=advance(createGame({roundSeed:seed,moves:['SUPER']}),2400);
   const attack=s.activeAttack!,steps=attack.super_steps!,gap=attackStepGap(s,attack);
   for(let i=0;i<3;i++){const at=attack.lands_at+i*gap,defence=steps[i]!;
    s=pose(s,at-150,defence==='guard',defence==='lean_left'?'L':defence==='lean_right'?'R':null);s=advance(s,at);}
   expect(s.log.superSteps.map(x=>x.outcome)).toEqual(steps.map(defence=>defence==='guard'?'BLOCK':'DODGE'));
   expect(s.log.resolved[0]?.counter_dmg).toBeGreaterThan(0);expect(s.log.inputs.every(input=>input.source==='pose')).toBe(true);
  }
 });
});
