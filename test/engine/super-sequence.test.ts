import {describe,it,expect} from 'vitest';
import {createGame,step,attackDuration,attackStepGap,type GameState,type SuperStep} from '../../shared/src/engine.js';
import {DIFFICULTIES,tempoFor} from '../../shared/src/tempo.js';
import {DEFAULT_BOSS} from '../../shared/src/boss-def.js';
const advance=(s:GameState,t:number)=>step(s,{kind:'advance'},t);
const pose=(s:GameState,t:number,guard:boolean,lean:'L'|'R'|null)=>step(s,{kind:'pose',at:t,guard,lean,source:'keyboard'},t);
function begin(){return advance(createGame({roundSeed:0,moves:['SUPER']}),2400);}
function perform(s:GameState,steps:SuperStep[],guards=true){
  const attack=s.activeAttack!,gap=attackStepGap(s,attack);
  for(let i=0;i<3;i++){
    const at=attack.lands_at+i*gap,defence=steps[i]!;
    s=pose(s,at-1,guards&&defence==='guard',defence==='lean_left'?'L':defence==='lean_right'?'R':null);
    s=advance(s,at);
  }
  return s;
}
describe('default SUPER sequence',()=>{
  it('draws seeded steps without adjacent repeats and reveals all steps immediately',()=>{
    const s=begin();expect(s.activeAttack?.super_steps).toEqual(['guard','lean_left','guard']);
    expect(begin().activeAttack?.super_steps).toEqual(s.activeAttack?.super_steps);
    for(let seed=0;seed<30;seed++){
      const a=advance(createGame({roundSeed:seed,moves:['SUPER']}),2400).activeAttack!;
      expect(a.super_steps).toHaveLength(3);expect(a.super_steps![0]).not.toBe(a.super_steps![1]);expect(a.super_steps![1]).not.toBe(a.super_steps![2]);
    }
  });
  for(const difficulty of DIFFICULTIES)it(`scales full timing on ${difficulty}`,()=>{
    const timing=tempoFor(difficulty),s=advance(createGame({difficulty,moves:['SUPER']}),timing.beat);
    expect(s.activeAttack!.lands_at).toBe(timing.beat+2*timing.telegraph);
    expect(attackDuration(s,'SUPER')).toBe(2*timing.telegraph+2*Math.round(600*timing.tempo));
  });
  it('resolves each step, counters once only after all clean and never PERFECT',()=>{
    let s=begin();s=perform(s,s.activeAttack!.super_steps!);
    expect(s.log.superSteps.map(x=>x.outcome)).toEqual(['BLOCK','DODGE','BLOCK']);
    expect(s.log.resolved[0]).toMatchObject({at:5200,outcome:'BLOCK',dmg:0,counter_dmg:8});
    expect(s.boss.hp).toBe(127);expect(s.scouting.dodges).toEqual(['L']);
  });
  it('uses worst HIT > CHIP > BLOCK > DODGE; clean guard is worse than clean lean',()=>{
    let s=begin();s=pose(s,3999,true,null);s=advance(s,5200);
    expect(s.log.superSteps.map(x=>x.outcome)).toEqual(['BLOCK','CHIP','BLOCK']);
    expect(s.log.resolved[0]).toMatchObject({outcome:'CHIP',dmg:3,counter_dmg:0});
    s=begin();s=pose(s,3999,true,null);s=pose(s,4599,false,null);s=advance(s,5200);
    expect(s.log.resolved[0]).toMatchObject({outcome:'HIT',dmg:17,counter_dmg:0});
    s=begin();s.activeAttack!.super_steps=['lean_left','lean_right','lean_left'];s=perform(s,s.activeAttack!.super_steps!);
    expect(s.log.resolved[0]).toMatchObject({outcome:'DODGE',counter_dmg:9});expect(s.scouting.dodges).toEqual(['L','R','L']);
  });
  it('braces only a pre-held correct first step and rewards a fully clean sequence once',()=>{
    let s=createGame({roundSeed:0,roundNumber:2,moves:['SUPER']});s.chatScouting.history=Array(12).fill('SUPER');
    s=pose(s,100,true,null);s=advance(s,2400);expect(s.activeAttack?.brace).toBe(true);
    s=perform(s,s.activeAttack!.super_steps!);expect(s.log.resolved[0]).toMatchObject({outcome:'BLOCK',counter_dmg:10,braced:true});
  });
  it('splits damage 8/8/9 and chip 3/3/4 with per-step mercy and credit',()=>{
    let s=begin();s=advance(s,4000);expect(s.streamer.hp).toBe(92);
    s=advance(s,4600);expect(s.streamer.hp).toBe(84);s=advance(s,5200);expect(s.streamer.hp).toBe(75);
    expect(s.log.damage.map(x=>x.damage)).toEqual([8,8,9]);
    s=begin();s.activeAttack!.super_steps=['lean_left','lean_right','lean_left'];s=pose(s,3999,true,null);s=advance(s,5200);
    expect(s.log.superSteps.map(x=>x.damage)).toEqual([3,3,4]);expect(s.log.resolved[0]?.dmg).toBe(10);
    s=begin();s.streamer.hp=35;s=advance(s,5200);expect(s.log.damage.map(x=>x.damage)).toEqual([8,4.800000000000001,5.399999999999999]);
  });
  it('retains votes across an occupied grid boundary without losing the last step',()=>{
    let s=begin();s=step(s,{kind:'vote',user:'viewer',move:'JAB',at:4500,simulated:true},4500);
    s=advance(s,4800);expect(s.activeAttack?.move).toBe('SUPER');expect(s.clock.next_beat).toBe(7200);expect(s.tally.JAB).toBe(1);
    s=advance(s,5200);expect(s.log.superSteps).toHaveLength(3);s=advance(s,7200);
    expect(s.clock.next_beat).toBe(9600);expect(s.tally.JAB).toBe(0);
  });
  it('does not draw a sequence that cannot finish before round end',()=>{
    let s=createGame({moves:Array(31).fill('SUPER')});s.streamer.hp=10000;s.streamer.max_hp=10000;s=advance(s,75000);
    expect(s.log.telegraphs.every(a=>a.at+attackDuration(s,a.move)<75000)).toBe(true);expect(s.round.ended_at).toBe(75000);
  });
  it('keeps custom fifth moves single defence with their stored timing',()=>{
    const boss=structuredClone(DEFAULT_BOSS);boss.name='Custom';boss.moves.forEach((m,i)=>m.command=['!aa','!bb','!cc','!dd','!ee'][i]!);boss.moves[4]!.label='CUSTOM';
    let s=advance(createGame({bossDef:boss,moves:['SUPER']}),2400);expect(s.activeAttack!.super_steps).toBeUndefined();expect(s.activeAttack!.lands_at).toBe(3200);
    s=pose(s,3000,false,'L');s=advance(s,3200);expect(s.log.resolved[0]?.outcome).toBe('DODGE');expect(s.log.superSteps).toEqual([]);
  });
});
