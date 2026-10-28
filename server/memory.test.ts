import {mkdtemp,readFile,writeFile,rm,readdir,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,expect,it} from 'vitest';
import {createViewerMemory} from './memory';
import {ViewerMemory,emptyViewerMemory,validateViewerMemory} from '../shared/src/viewer-memory';
const temporary:string[]=[];
afterEach(async()=>{await Promise.all(temporary.splice(0).map(path=>rm(path,{recursive:true,force:true})));});
async function rig(){const directory=await mkdtemp(join(tmpdir(),'svc-memory-'));temporary.push(directory);let at=10000000000;const file=join(directory,'viewers.json');return {file,now:()=>at,at:(time:number)=>{at=time;},open:()=>createViewerMemory({file,source:'live',now:()=>at})};}
const identity={channelId:'channel-a',userId:'A',displayName:'Alpha'};
const vote=(serverSessionId='session-1')=>({...identity,serverSessionId,beatId:'r1:b0',move:'HOOK_L' as const});
const ko=(serverSessionId='session-1',roundId='match-1:round-1')=>({channelId:identity.channelId,serverSessionId,roundId,winner:'boss' as const,reason:'ko' as const,koMove:'HOOK_L' as const,koSupporters:[{id:'A'},{id:'A'}]});
it('19 credits exact distinct KO-beat supporters across server sessions and selects a nemesis at two',async()=>{
 const r=await rig();let store=await r.open();store.countedVote(vote());await store.completedRound(ko());expect(store.snapshot(identity.channelId)?.nemesis).toBeNull();
 store=await r.open();store.countedVote(vote('session-2'));await store.completedRound(ko('session-2'));const view=store.snapshot(identity.channelId)!;
 expect(view.nemesis).toEqual({name:'Alpha',koVotes:2,favMove:'HOOK_L',active:true});expect(view.record).toEqual({streams:2,bossesKo:0,timesKo:2});
 const data=JSON.parse(await readFile(r.file,'utf8'));expect(data.channels['channel-a'].viewers.A).toMatchObject({streams:2,votes:2,koVotes:2,koVotesByMove:{HOOK_L:2}});
});
it('20 forget deletes immediately, durably persists only an ID opt-out and never re-records later votes',async()=>{
 const r=await rig(),store=await r.open();store.countedVote(vote());await store.completedRound(ko());await store.forget(identity);
 let data=JSON.parse(await readFile(r.file,'utf8'));expect(data.channels['channel-a'].viewers).toEqual({});expect(data.channels['channel-a'].optOut).toEqual(['A']);expect(store.isOptedOut('channel-a','A')).toBe(true);expect(JSON.stringify(data)).not.toContain('Alpha');
 const restarted=await r.open();restarted.observeChat({...identity,displayName:'New name'});restarted.countedVote(vote('new-session'));await restarted.completedRound(ko('new-session'));data=JSON.parse(await readFile(r.file,'utf8'));expect(data.channels['channel-a'].viewers).toEqual({});expect(data.channels['channel-a'].optOut).toEqual(['A']);
});
it('21 removes records older than90days on load, retains exact boundary and permanent opt-out',async()=>{
 const r=await rig(),store=await r.open();store.observeChat(identity);store.observeChat({...identity,userId:'B'});await store.forget({...identity,userId:'forgotten'});await store.flush();
 const data=JSON.parse(await readFile(r.file,'utf8'));data.channels['channel-a'].viewers.A.lastSeen=r.now()-91*86400000;data.channels['channel-a'].viewers.A.firstSeen=0;data.channels['channel-a'].viewers.B.lastSeen=r.now()-90*86400000;data.channels['channel-a'].viewers.B.firstSeen=0;await writeFile(r.file,JSON.stringify(data));
 await r.open();const clean=JSON.parse(await readFile(r.file,'utf8'));expect(Object.keys(clean.channels['channel-a'].viewers)).toEqual(['B']);expect(clean.channels['channel-a'].optOut).toEqual(['forgotten']);
});
it('22 allowlists identity metadata after100 messages and stores no message bodies or extra fields',async()=>{
 const r=await rig(),store=await r.open();for(let i=0;i<100;i++)store.observeChat({...identity,displayName:`Name${i}`,text:`private-body-${i}`,token:'private-token'} as typeof identity);await store.flush();const raw=await readFile(r.file,'utf8');expect(raw).not.toContain('private-body');expect(raw).not.toContain('private-token');expect(JSON.parse(raw).channels['channel-a'].viewers.A.name).toBe('Name99');
});
it('never reads or writes any storage for sim/booth and keeps channel identities isolated',async()=>{
 const r=await rig();await writeFile(r.file,'invalid-do-not-read');for(const source of ['sim','booth'] as const){const store=await createViewerMemory({file:r.file,source});store.countedVote(vote());await store.completedRound(ko());await store.forget(identity);await store.flush();expect(store.snapshot(identity.channelId)).toBeNull();}expect(await readFile(r.file,'utf8')).toBe('invalid-do-not-read');
 await rm(r.file);const store=await r.open();store.countedVote(vote());await store.forget(identity);store.countedVote({...vote(),channelId:'channel-b'});await store.flush();expect(store.snapshot('channel-a')?.hallOfFame).toEqual([]);expect(store.snapshot('channel-b')?.hallOfFame[0]?.name).toBe('Alpha');
});
it('counts streams/session once, ignores timeouts for KOs and deduplicates round and MVP finalization',async()=>{
 const r=await rig(),store=await r.open();store.countedVote(vote());store.countedVote({...vote(),move:'JAB'});await store.completedRound({...ko(),reason:'timeout'});await store.completedRound({...ko(),reason:'timeout'});await store.completedRound({...ko(),'roundId':'r2',winner:'streamer'});
 await store.finalizeSession({channelId:'channel-a',serverSessionId:'session-1',mvpId:'A'});await store.finalizeSession({channelId:'channel-a',serverSessionId:'session-1',mvpId:'A'});
 const data=JSON.parse(await readFile(r.file,'utf8')).channels['channel-a'];expect(data.record).toEqual({streams:1,bossesKo:1,timesKo:0});expect(data.viewers.A).toMatchObject({streams:1,votes:1,koVotes:0,mvpCount:1});expect(store.snapshot('channel-a')?.mvpStreak).toBe(1);expect(store.snapshot('channel-a',{prospectiveMvpId:'A',serverSessionId:'session-1'})?.mvpStreak).toBe(1);
 store.countedVote({...vote(),userId:'B',displayName:'Beta'});expect(store.snapshot('channel-a',{prospectiveMvpId:'B',serverSessionId:'session-1'})?.mvpStreak).toBe(0);await store.finalizeSession({channelId:'channel-a',serverSessionId:'session-1',mvpId:'B'});expect(store.snapshot('channel-a')?.mvpStreak).toBe(1);
 expect(store.snapshot('channel-a',{prospectiveMvpId:'A'})?.mvpStreak).toBe(2); // next stream preview, no durable award
 const restarted=await r.open();restarted.countedVote(vote('s2'));await restarted.finalizeSession({channelId:'channel-a',serverSessionId:'s2',mvpId:'A'});expect(restarted.snapshot('channel-a')?.mvpStreak).toBe(2);
});
it('uses KO signature, recency and stable ID tie breaks; ordinary messages never activate nemesis',()=>{
 const m=new ViewerMemory();for(const userId of ['B','A']){m.countedVote({...vote(),userId,displayName:userId},100);m.completedRound({...ko(),roundId:userId+'1',koSupporters:[{id:userId}]},100);m.completedRound({...ko(),roundId:userId+'2',koSupporters:[{id:userId}]},100);}
 expect(m.snapshot('channel-a',100).nemesis?.name).toBe('A');expect(m.snapshot('channel-a',30100).nemesis?.active).toBe(false);
 m.observeChat({...identity,userId:'B',displayName:'Beta'},30101);expect(m.snapshot('channel-a',30101).nemesis).toMatchObject({name:'Beta',active:false});
 m.countedVote({...vote(),userId:'B',displayName:'Beta',move:'JAB'},30102);expect(m.snapshot('channel-a',30102).nemesis).toMatchObject({name:'Beta',favMove:'HOOK_L',active:true});
 expect(JSON.stringify(m.snapshot('channel-a',30102))).not.toContain('"id"');
});
it('rejects corrupt storage without overwriting opt-outs and strips unknown fields from valid loads',async()=>{
 const r=await rig();for(const raw of ['{','null',JSON.stringify({version:0,channels:{}}),JSON.stringify({version:1,channels:{a:{optOut:['A']}}})]){await writeFile(r.file,raw);await expect(r.open()).rejects.toThrow();expect(await readFile(r.file,'utf8')).toBe(raw);}
 const data=emptyViewerMemory();(data as unknown as Record<string,unknown>).message='secret';expect(JSON.stringify(validateViewerMemory(data,r.now()))).not.toContain('secret');await writeFile(r.file,JSON.stringify(data));await r.open();expect(await readFile(r.file,'utf8')).not.toContain('secret');
});
it('serializes overlapping atomic saves, leaves no temporary files and enforces owner-only permissions',async()=>{
 const r=await rig(),store=await r.open();store.countedVote(vote());const first=store.flush();store.countedVote({...vote(),beatId:'r1:b1'});const second=store.flush();await store.forget(identity);await Promise.all([first,second]);
 const data=JSON.parse(await readFile(r.file,'utf8'));expect(data.channels['channel-a'].viewers).toEqual({});expect(data.channels['channel-a'].optOut).toEqual(['A']);expect(await readdir(join(r.file,'..'))).toEqual(['viewers.json']);if(process.platform!=='win32')expect((await stat(r.file)).mode&0o777).toBe(0o600);
});
it('refreshes nemesis activity on accepted replacements while counting just one vote per eligible beat',async()=>{
 const r=await rig(),store=await r.open();store.countedVote(vote());await store.completedRound(ko());await store.completedRound(ko('session-1','r2'));r.at(r.now()+29999);store.countedVote({...vote(),move:'JAB'});r.at(r.now()+29999);expect(store.snapshot('channel-a')?.nemesis?.active).toBe(true);await store.flush();const data=JSON.parse(await readFile(r.file,'utf8'));expect(data.channels['channel-a'].viewers.A.votes).toBe(1);
 r.at(r.now()+1);expect(store.snapshot('channel-a')?.nemesis?.active).toBe(false);await store.finalizeSession({channelId:'channel-a',serverSessionId:'session-1',mvpId:'A'});await store.forget(identity);expect(store.snapshot('channel-a')?.mvpStreak).toBe(0);
});
it('handles prototype-shaped channel/viewer IDs safely without leaking IDs in the view',()=>{
 const m=new ViewerMemory();for(const userId of ['__proto__','constructor']){m.countedVote({...vote(),channelId:'__proto__',userId,displayName:'Safe name'},1);m.completedRound({...ko(),channelId:'__proto__',roundId:userId+'1',koSupporters:[{id:userId}]},1);m.completedRound({...ko(),channelId:'__proto__',roundId:userId+'2',koSupporters:[{id:userId}]},1);}expect(m.snapshot('__proto__',1).hallOfFame).toHaveLength(2);expect(m.snapshot('__proto__',1).nemesis?.koVotes).toBe(2);const key:string='constructor';expect(validateViewerMemory(JSON.parse(JSON.stringify(m.data)),1).channels['__proto__']?.viewers[key]?.koVotes).toBe(2);
});
