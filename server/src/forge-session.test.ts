import {expect,it,vi} from 'vitest';
import {GameSession} from './game-session';
import {DEFAULT_BOSS,type BossDef} from '../../shared/src/boss-def';
const custom=():BossDef=>({...structuredClone(DEFAULT_BOSS),name:'Clockwork Crab',moves:structuredClone(DEFAULT_BOSS.moves.slice(0,4))});
it('queues accepted bosses only between rounds and prevents START while generating',()=>{
 let now=0;const session=new GameSession({mock:true,now:()=>now,sendResult:vi.fn(async()=>{})});
 expect(session.beginForge()).toBe(true);expect(session.queueBoss(custom())).toBe(true);session.command({kind:'session',action:'start'});expect(session.started).toBe(false);session.endForge();session.command({kind:'session',action:'start'});expect(session.state.bossDef?.name).toBe('Clockwork Crab');expect(session.queueBoss(custom())).toBe(false);expect(session.beginForge()).toBe(false);
 session.close();
});
it('holds automatic next rounds while forging and resumes with the queued definition',()=>{
 let now=0;const session=new GameSession({mock:true,now:()=>now,sendResult:vi.fn(async()=>{})});session.command({kind:'session',action:'start'});now=75000;session.advance();expect(session.state.round.over).toBe(true);session.beginForge();expect(session.queueBoss(custom())).toBe(true);now=80000;session.advance();expect(session.state.round.number).toBe(1);session.endForge();now=83001;session.advance();expect(session.state.round.number).toBe(2);expect(session.state.bossDef?.name).toBe('Clockwork Crab');session.close();
});
it('a veto can discard an accepted queued boss without replacing the current definition',()=>{
 let now=0;const session=new GameSession({mock:true,now:()=>now,sendResult:vi.fn(async()=>{})});session.queueBoss(custom());session.cancelQueuedBoss();session.command({kind:'session',action:'start'});expect(session.state.bossDef).toBeUndefined();session.close();
});
