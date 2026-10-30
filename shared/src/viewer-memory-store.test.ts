import {expect,it,vi} from 'vitest';
import {ViewerMemory,emptyViewerMemory,type ViewerMemoryRuntime} from './viewer-memory';
import {createViewerMemoryStore,type ViewerMemorySave} from './viewer-memory-store';
const identity={channelId:'channel',userId:'viewer',displayName:'Fictional Viewer'};
const vote={...identity,serverSessionId:'session',beatId:'beat1',move:'HOOK_L' as const};
const round={channelId:'channel',serverSessionId:'session',roundId:'round1',winner:'boss' as const,reason:'ko' as const,koMove:'HOOK_L' as const,koSupporters:[{id:'viewer'}]};
function backend(){let value:ViewerMemorySave|null=null;return {load:vi.fn(async()=>value?structuredClone(value):null),save:vi.fn(async(next:ViewerMemorySave)=>{value=structuredClone(next);}),get value(){return value;}};}
it('restores session/vote/round/finalization dedup and recent nemesis activity after durable recreation',async()=>{
 const storage=backend();let now=1000;let store=await createViewerMemoryStore({backend:storage,source:'live',now:()=>now,persistRuntime:true});
 store.countedVote(vote);await store.completedRound(round);await store.finalizeSession({channelId:'channel',serverSessionId:'session',mvpId:'viewer'});
 store=await createViewerMemoryStore({backend:storage,source:'live',now:()=>now,persistRuntime:true});
 store.countedVote(vote);await store.completedRound(round);await store.finalizeSession({channelId:'channel',serverSessionId:'session',mvpId:'viewer'});
 expect(storage.value?.data.channels.channel!.viewers.viewer).toMatchObject({streams:1,votes:1,koVotes:1,mvpCount:1});
 expect(store.snapshot('channel')?.record).toEqual({streams:1,bossesKo:0,timesKo:1});
 store.countedVote({...vote,serverSessionId:'session2',beatId:'beat2'});await store.completedRound({...round,serverSessionId:'session2',roundId:'round2'});await store.finalizeSession({channelId:'channel',serverSessionId:'session2',mvpId:'viewer'});
 store=await createViewerMemoryStore({backend:storage,source:'live',now:()=>now,persistRuntime:true});expect(store.snapshot('channel')?.nemesis?.active).toBe(true);expect(store.snapshot('channel')?.mvpStreak).toBe(2);
 now+=30000;expect(store.snapshot('channel')?.nemesis?.active).toBe(false);
});
it('keeps runtime separate from the local file format and never touches simulated storage',async()=>{
 const storage=backend(),store=await createViewerMemoryStore({backend:storage,source:'live',now:()=>1000});store.countedVote(vote);await store.flush();expect(storage.value).not.toHaveProperty('runtime');expect(storage.value?.data.version).toBe(1);
 for(const source of ['sim','booth'] as const){const blocked=backend(),disabled=await createViewerMemoryStore({backend:blocked,source});disabled.observeChat(identity);disabled.countedVote(vote);await disabled.completedRound(round);await disabled.forget(identity);await disabled.flush();expect(disabled.snapshot('channel')).toBeNull();expect(blocked.load).not.toHaveBeenCalled();expect(blocked.save).not.toHaveBeenCalled();}
});
it('retention is rewritten on load and opted-out viewers stay forgotten after recreation',async()=>{
 const storage=backend(),now=100*86400000,memory=new ViewerMemory(emptyViewerMemory());memory.observeChat(identity,1);await storage.save({data:memory.data,runtime:memory.checkpoint()});
 let store=await createViewerMemoryStore({backend:storage,source:'live',now:()=>now,persistRuntime:true});expect(storage.value?.data.channels.channel!.viewers.viewer).toBeUndefined();
 store.countedVote(vote);await store.forget(identity);store=await createViewerMemoryStore({backend:storage,source:'live',now:()=>now,persistRuntime:true});store.countedVote(vote);await store.flush();expect(store.isOptedOut('channel','viewer')).toBe(true);expect(storage.value?.data.channels.channel!.viewers.viewer).toBeUndefined();
});
it('validates a runtime checkpoint before replacing state and never copies extra stored text',()=>{
 const memory=new ViewerMemory();memory.countedVote(vote,1000);const valid=memory.checkpoint();
 for(const runtime of [{version:2,sessions:[],lastVotes:[]},{...valid,sessions:[{...valid.sessions[0],voters:[3]}]},{...valid,lastVotes:[{key:'not JSON',at:1000}]},{...valid,lastVotes:[{key:JSON.stringify(['channel','viewer']),at:NaN}]}]){expect(()=>memory.restoreRuntime(runtime)).toThrow('Invalid viewer-memory runtime checkpoint');expect(memory.checkpoint()).toEqual(valid);}
 const extra={...valid,text:'private message',sessions:valid.sessions.map(item=>({...item,text:'private message'}))};memory.restoreRuntime(extra);expect(JSON.stringify(memory.checkpoint())).not.toContain('private message');
 const detached:ViewerMemoryRuntime=memory.checkpoint();detached.sessions[0]!.voters.length=0;expect(memory.checkpoint()).toEqual(valid);
});
it('prunes durable runtime on load at the exact retention and activity boundaries',async()=>{
 const day=86400000,at=100*day,storage=backend(),memory=new ViewerMemory();
 memory.countedVote({...vote,serverSessionId:'expired'},at-90*day-1);
 memory.countedVote({...vote,serverSessionId:'boundary'},at-90*day);
 memory.countedVote({...vote,serverSessionId:'recent'},at-29999);
 memory.countedVote({...vote,userId:'inactive'},at-30000);
 memory.finalizeSession({channelId:'channel',serverSessionId:'finalized',mvpId:'viewer'},at-100);
 await storage.save({data:memory.data,runtime:memory.checkpoint()});
 await createViewerMemoryStore({backend:storage,source:'live',now:()=>at,persistRuntime:true});
 expect(storage.value!.runtime!.sessions.map(s=>JSON.parse(s.key)[1])).toEqual(['boundary','recent','session','finalized']);
 expect(storage.value!.runtime!.lastVotes).toEqual([{key:JSON.stringify(['channel','viewer']),at:at-29999}]);
 expect(storage.value!.runtime!.sessions.find(s=>JSON.parse(s.key)[1]==='finalized')).toMatchObject({at:at-100,finalized:true});
});
it('removes forgotten identities from runtime and refreshes retries without changing counts or beats',async()=>{
 const memory=new ViewerMemory();memory.countedVote(vote,1);memory.countedVote({...vote,beatId:'beat2'},2);
 memory.refreshVote({...vote,displayName:'Refreshed'},3);
 expect(memory.data.channels.channel!.viewers.viewer).toMatchObject({name:'Refreshed',streams:1,votes:2,lastSeen:3});
 expect(memory.checkpoint().sessions[0]).toMatchObject({beatId:'beat2',votedThisBeat:['viewer']});
 expect(memory.checkpoint().lastVotes[0]!.at).toBe(3);
 memory.forget(identity);expect(JSON.stringify(memory.checkpoint())).not.toContain('viewer');
 memory.refreshVote(vote,4);expect(memory.data.channels.channel!.viewers.viewer).toBeUndefined();expect(memory.checkpoint().lastVotes).toEqual([]);
});
