import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
import {createViewerMemory} from '../memory';
import {GameSession,type SessionChat} from './game-session';
import {ViewerMemorySession} from './viewer-memory-session';
const cleanup:(()=>Promise<unknown>)[]=[];
afterEach(async()=>{await Promise.all(cleanup.splice(0).map(close=>close()));});
async function rig(source:'live'|'sim'='live'){
 const directory=await mkdtemp(join(tmpdir(),'svc-memory-session-'));cleanup.push(()=>rm(directory,{recursive:true,force:true}));const file=join(directory,'viewers.json');let now=0;
 const store=await createViewerMemory({file,source,now:()=>now}),sent:{text:string;at:number}[]=[],errors=vi.fn();let game!:GameSession;
 const bridge=new ViewerMemorySession({store,sessionId:'server-session',enqueueNotice:text=>game.queueNotice(text),onChange:vi.fn(),onError:errors});bridge.selectChannel('channel');
 game=new GameSession({mock:source==='sim',seed:1,now:()=>now,sendResult:async(text)=>{sent.push({text,at:now});},onState:(previous,next)=>bridge.transition(previous,next,`epoch-1:${game.runId}`)});cleanup.push(async()=>game.close());
 const chat=(user:string,text:string,displayName=user,origin?:SessionChat['source'])=>{const message:SessionChat={user,text,displayName,simulated:source==='sim',role:'viewer',...(origin?{source:origin}:{})};bridge.beforeChat(message);const accepted=game.chat(message);bridge.acceptedVote(message,accepted,`epoch-1:${game.runId}:${game.state.round.number}:${game.state.clock.beat}`);return accepted;};
 return {file,store,game,bridge,sent,errors,chat,at:(time:number)=>{now=time;},settled:async()=>{await store.flush();await new Promise(resolve=>setImmediate(resolve));},data:async()=>JSON.parse(await readFile(file,'utf8'))};
}
it('attributes a lethal first COMBO hit from the actual damage ledger to final supporters only',async()=>{
 const r=await rig();r.game.command({kind:'session',action:'start'});r.game.state.moves=['COMBO'];r.game.state.streamer.hp=2;
 r.chat('A','!combo','Alpha');r.chat('B','!combo','Beta');r.chat('B','!hookl','Beta');r.at(2400);r.game.advance();expect(r.game.state.activeAttack?.supporters).toEqual(['A']);r.at(3200);r.game.advance();await r.settled();
 expect(r.game.state.round).toMatchObject({over:true,end_reason:'ko'});expect(r.game.state.log.damage).toHaveLength(1);expect(r.game.state.log.damage[0]?.damage).toBe(2);const data=await r.data();expect(data.channels.channel.viewers.A).toMatchObject({votes:1,koVotes:1,favMove:'COMBO'});expect(data.channels.channel.viewers.B).toMatchObject({votes:1,koVotes:0});expect(r.bridge.view()?.record).toEqual({streams:1,bossesKo:0,timesKo:1});expect(r.errors).not.toHaveBeenCalled();
});
it('does not give original JAB voters KO credit after the no-triple rule redirects their draw',async()=>{
 const r=await rig();r.game.command({kind:'session',action:'start'});r.game.state.history=['JAB','JAB'];r.game.state.streamer.hp=2;r.chat('A','!jab');r.at(2400);r.game.advance();expect(r.game.state.activeAttack?.move).not.toBe('JAB');expect(r.game.state.activeAttack?.supporters).toEqual([]);r.at(3500);r.game.advance();await r.settled();const data=await r.data();expect(data.channels.channel.viewers.A.koVotes).toBe(0);expect(r.bridge.view()?.record.timesKo).toBe(1);
});
it('forgets immediately and sends only one acknowledgement through the round-result10s queue',async()=>{
 const r=await rig();r.game.command({kind:'session',action:'start'});r.game.state.moves=['JAB'];r.game.state.streamer.hp=2;r.chat('A','!jab','Alpha');r.at(3200);r.game.advance();await r.settled();expect(r.sent).toHaveLength(1);expect(r.game.summary().chatMvp?.user).toBe('A');
 r.at(3300);r.chat('A','!FoRgEtMe details ignored');expect(r.bridge.publicSummary(r.game.summary()).chatMvp).toBeNull();expect(r.bridge.view()?.hallOfFame).toEqual([]);r.chat('A','!forgetme');await r.settled();expect(r.sent).toHaveLength(1);r.at(13199);r.game.advance();await r.settled();expect(r.sent).toHaveLength(1);r.at(13200);r.game.advance();await r.settled();expect(r.sent).toHaveLength(2);expect(r.sent[1]?.text).toContain('forgotten');expect(r.sent[1]!.at-r.sent[0]!.at).toBe(10000);
 r.chat('A','!jab','Renamed');await r.settled();const data=await r.data();expect(data.channels.channel.optOut).toEqual(['A']);expect(data.channels.channel.viewers).toEqual({});expect(JSON.stringify(data)).not.toContain('Alpha');
});
it('ignores preview and ineligible SUPER votes, and memory observation never mutates reducer state',async()=>{
 const r=await rig();expect(r.chat('A','!jab')).toBeNull();r.game.command({kind:'session',action:'start'});expect(r.chat('A','!super')).toBeNull();r.game.state.hype=100;expect(r.chat('A','!super')).toMatchObject({move:'SUPER'});expect(r.chat('A','!jab')).toMatchObject({move:'JAB'});
 const before=JSON.stringify(r.game.state);r.bridge.transition(r.game.state,r.game.state,'same');r.bridge.view(r.game.summary());r.bridge.publicSummary(r.game.summary());expect(JSON.stringify(r.game.state)).toBe(before);await r.settled();const viewer=(await r.data()).channels.channel.viewers.A;expect(viewer).toMatchObject({streams:1,votes:1,koVotes:0});
});
it('finalizes shutdown MVP once for the server session and does not award each match or preview',async()=>{
 const r=await rig();r.game.command({kind:'session',action:'start'});r.game.state.moves=['JAB'];r.game.state.streamer.hp=2;r.chat('A','!jab');r.at(3200);r.game.advance();await r.settled();expect(r.bridge.view(r.game.summary())?.mvpStreak).toBe(1);expect((await r.data()).channels.channel.viewers.A.mvpCount).toBe(0);
 r.game.command({kind:'session',action:'start'});r.game.state.moves=['JAB'];r.game.state.streamer.hp=2;r.chat('A','!jab');r.at(6400);r.game.advance();await r.settled();await r.bridge.finalize(r.game.summary());await r.bridge.finalize(r.game.summary());expect(r.bridge.view(r.game.summary())?.mvpStreak).toBe(1);const data=await r.data();expect(data.channels.channel.viewers.A).toMatchObject({streams:1,mvpCount:1,koVotes:2,votes:2});expect(data.channels.channel.record.streams).toBe(1);
 r.game.command({kind:'session',action:'start'});r.game.state.moves=['JAB'];r.chat('B','!jab');r.at(9600);r.game.advance();expect(r.game.summary().chatMvp?.user).toBe('B');expect(r.bridge.view(r.game.summary())?.mvpStreak).toBe(0);await r.bridge.finalize(r.game.summary());expect((await r.data()).channels.channel.viewers.B.mvpCount).toBe(0);
});
it('keeps channels isolated and a simulated coordinator never opens or overwrites the memory file',async()=>{
 const r=await rig();r.game.command({kind:'session',action:'start'});r.chat('A','!jab','Alpha');r.chat('A','!forgetme');await r.settled();r.bridge.selectChannel('other-channel');r.chat('A','!jab','Other name');await r.settled();const data=await r.data();expect(data.channels.channel.viewers).toEqual({});expect(data.channels['other-channel'].viewers.A.name).toBe('Other name');
 const fake=await rig('sim');await writeFile(fake.file,'leave-untouched');fake.game.command({kind:'session',action:'start'});fake.chat('A','!jab');fake.chat('A','!forgetme');fake.at(3200);fake.game.advance();await fake.bridge.finalize(fake.game.summary());await fake.store.flush();expect(fake.bridge.view()).toBeNull();expect(await readFile(fake.file,'utf8')).toBe('leave-untouched');
});
it('does not send a delayed forget acknowledgement to a newly selected channel',async()=>{
 const r=await rig();let release!:()=>void;const deferred=new Promise<void>(resolve=>{release=resolve;}),forget=r.store.forget;
 vi.spyOn(r.store,'forget').mockImplementation(event=>forget(event).then(()=>deferred));r.chat('A','!forgetme');r.bridge.selectChannel('other-channel');await r.store.flush();release();await new Promise(resolve=>setImmediate(resolve));expect(r.sent).toEqual([]);
});
it('explicit sim/booth sources never record names, votes or forget acknowledgements even if simulated is false',async()=>{
 const r=await rig();r.game.command({kind:'session',action:'start'});expect(r.chat('booth-person','!jab','Private booth name','booth')).toMatchObject({move:'JAB'});expect(r.chat('sim-person','!hookl','Private sim name','sim')).toMatchObject({move:'HOOK_L'});
 expect(r.game.state.votes).toMatchObject({'booth-person':'JAB','sim-person':'HOOK_L'});r.chat('booth-person','!forgetme','Private booth name','booth');r.chat('sim-person','!forgetme','Private sim name','sim');await r.settled();expect((await r.data()).channels).toEqual({});expect(r.sent).toEqual([]);
});
