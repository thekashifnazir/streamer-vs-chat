import {describe,it,expect} from 'vitest';
import {createGame,step,FOCUS_RULES,type GameState,type Outcome} from '../../shared/src/engine.js';
const advance=(s:GameState,t:number)=>step(s,{kind:'advance'},t);
const pose=(s:GameState,t:number,guard:boolean,lean:'L'|'R'|null=null)=>step(s,{kind:'pose',at:t,guard,lean,source:'keyboard'},t);
const punch=(s:GameState,t:number)=>step(s,{kind:'punch',at:t,side:'L',source:'keyboard'},t);
const control=(s:GameState,t:number,action:'pause'|'stop'|'resume')=>step(s,{kind:'control',action,by:'test'},t);
function ready(){const s=createGame({moves:[]});s.focus=100;s.finisher.ready_at=0;return s;}
describe('FOCUS and FINISHER',()=>{
  it('gains12 for BLOCK/DODGE,24 for PERFECT, loses10 for HIT and unchanged for CHIP',()=>{
    for(const [move,guard,lean,at,outcome,gain]of [['JAB',true,null,100,'BLOCK',12],['JAB',true,null,2900,'PERFECT',24],['HOOK_L',false,'R',100,'DODGE',12],['JAB',false,null,100,'HIT',-10],['HOOK_L',true,null,100,'CHIP',0]] as const){
      let s=createGame({moves:[move]});s.focus=20;s=pose(s,at,guard,lean);s=advance(s,3200);
      expect(s.log.resolved[0]?.outcome).toBe(outcome);expect(s.focus).toBe(20+gain);
    }
    let s=createGame({moves:['JAB']});s=advance(s,3200);expect(s.focus).toBe(0);
  });
  it('adds10 per clean SUPER step and subtracts10 per HIT, with no aggregate extra gain',()=>{
    let s=createGame({moves:['SUPER'],roundSeed:0});s.focus=20;s=pose(s,100,true);s=advance(s,4000);expect(s.focus).toBe(30);
    s=pose(s,4500,false,'L');s=advance(s,4600);expect(s.focus).toBe(40);s=advance(s,5200);expect(s.focus).toBe(30);
    expect(s.log.superSteps.map(x=>x.outcome)).toEqual(['BLOCK','DODGE','HIT']);
  });
  it('requires1000ms continuous guard, cannot trigger while an attack is active',()=>{
    let s=ready();s=pose(s,100,true);s=advance(s,1099);expect(s.finisher.used).toBe(0);s=pose(s,1099,false);s=pose(s,1100,true);s=advance(s,2099);expect(s.finisher.used).toBe(0);
    s=advance(s,2100);expect(s.finisher.used).toBe(1);expect(s.focus).toBe(0);expect(s.boss.hp).toBe(131);
    let active=createGame({moves:['JAB']});active=advance(active,2400);active.focus=100;active.finisher.ready_at=2400;active=pose(active,2401,true);active=advance(active,3200);expect(active.finisher.used).toBe(0);active=advance(active,3401);expect(active.finisher.used).toBe(1);
  });
  it('counts guard held during an attack and fires at the first ready idle instant',()=>{
    let s=createGame({moves:['JAB']});s.focus=90;s=pose(s,100,true);s=advance(s,3200);
    expect(s.log.resolved[0]?.counter_dmg).toBe(8);expect(s.log.finishers[0]?.at).toBe(3200);expect(s.boss.hp).toBe(123);
  });
  it('never backdates a ready finisher after a long SUPER or veto/resume',()=>{
    let s=createGame({moves:['SUPER'],roundSeed:0});s.focus=90;s=pose(s,100,true,'L');s=advance(s,5200);
    expect(s.log.finishers[0]?.at).toBe(5200);
    let veto=createGame({moves:['SUPER']});veto=pose(veto,100,true);veto=advance(veto,2400);veto.focus=100;veto.finisher.ready_at=2400;
    veto=step(veto,{kind:'control',action:'veto',by:'mod'},3000);veto=control(veto,13000,'resume');veto=advance(veto,13001);
    expect(veto.log.finishers[0]?.at).toBe(13000);
  });
  it('never shifts beat deadlines or the75s round end',()=>{
    let s=ready();s.moves=['JAB','JAB'];s=pose(s,100,true);s=advance(s,1100);expect(s.finisher.ends_at).toBe(4100);expect(s.clock.next_beat).toBe(2400);
    s=advance(s,2400);expect(s.activeAttack?.at).toBe(2400);s=advance(s,4800);expect(s.log.telegraphs.map(x=>x.at)).toEqual([2400,4800]);
    s=advance(s,75000);expect(s.round.ended_at).toBe(75000);
  });
  it('doubles punches only inside the3s half-open window, including counter punches',()=>{
    let s=pose(ready(),100,true);s=advance(s,1100);const before=s.boss.hp;
    s=punch(s,1101);expect(before-s.boss.hp).toBe(2);s.counter={open:true,closes_at:3000};s=punch(s,1600);expect(s.log.bossDamage.at(-1)).toMatchObject({kind:'punch',damage:3});
    s=punch(s,4099);expect(s.log.bossDamage.at(-1)?.damage).toBe(2);s=punch(s,4549);expect(s.log.bossDamage.at(-1)?.damage).toBe(1);
    let edge=pose(ready(),100,true);edge=advance(edge,1100);edge=punch(edge,4100);expect(edge.log.bossDamage.at(-1)?.damage).toBe(1);
  });
  it('caps two finishers per round and resets focus/usage/window on next round',()=>{
    let s=pose(ready(),100,true);s=advance(s,1100);s.focus=100;s.finisher.ready_at=1200;s=advance(s,1200);expect(s.finisher.used).toBe(2);
    s.focus=100;s.finisher.ready_at=1300;s=advance(s,1300);expect(s.finisher.used).toBe(2);expect(s.log.finishers).toHaveLength(2);
    s.boss.hp=1;s=punch(s,1400);s=step(s,{kind:'next-round'},1500);expect(s.focus).toBe(0);expect(s.finisher).toEqual({used:0,ends_at:null,ready_at:null});
  });
  it('pauses both the guard duration and finisher window in game time',()=>{
    let s=pose(ready(),100,true);s=control(s,600,'stop');s=advance(s,10600);expect(s.finisher.used).toBe(0);s=control(s,10600,'resume');s=advance(s,11099);expect(s.finisher.used).toBe(0);s=advance(s,11100);expect(s.finisher.ends_at).toBe(14100);
    s=control(s,11600,'pause');s=control(s,21600,'resume');expect(s.finisher.ends_at).toBe(24100);s=punch(s,24099);expect(s.log.bossDamage.at(-1)?.damage).toBe(2);
  });
  it('records actual finisher damage, KO and cap consistently without chat damage credit',()=>{
    let s=ready();s.boss.hp=3;s=pose(s,100,true);s=advance(s,1100);
    expect(s.round).toMatchObject({over:true,winner:'streamer',ended_at:1100});expect(s.log.finishers[0]).toMatchObject({damage:4,actual_damage:3});expect(s.log.bossDamage[0]).toMatchObject({kind:'finisher',damage:3});expect(s.log.damage).toEqual([]);
    expect(FOCUS_RULES).toMatchObject({finisherDamage:4,window:3000,maxFinishers:2});
  });
});
