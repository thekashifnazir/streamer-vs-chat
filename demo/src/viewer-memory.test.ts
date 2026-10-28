import{afterEach,expect,it,vi}from'vitest';
import{createDemoViewerMemory,indexedDemoMemoryStore,seedDemoMemory,DEMO_MEMORY_DB,type DemoMemoryStore}from'./viewer-memory';
import{setLiveCredentials}from'./credentials';
import{createGame,step}from'../../shared/src/engine';
const at=Date.UTC(2026,9,28),channel='simulated-offline-channel';
afterEach(()=>{setLiveCredentials(false);vi.useRealTimers();});
function fakeIndexedDB(){
 const values=new Map<string,unknown>();let puts=0,opens=0;const requestedNames:string[]=[];
 const factory={open(name:string){opens++;requestedNames.push(name);const request:any={};const database={objectStoreNames:{contains:()=>true},close:vi.fn(),transaction(){const tx:any={abort(){tx.onabort?.();},objectStore(){return{get(key:string){const req:any={};queueMicrotask(()=>{req.result=structuredClone(values.get(key));req.onsuccess?.();});return req;},put(value:unknown,key:string){puts++;values.set(key,structuredClone(value));}};}};setTimeout(()=>tx.oncomplete?.(),0);return tx;}};request.result=database;queueMicrotask(()=>request.onsuccess?.());return request;}} as unknown as IDBFactory;
 return{factory,values,requestedNames,get puts(){return puts;},get opens(){return opens;}};
}
it('atomically seeds three made-up streams once and reloads without overwriting history',async()=>{
 const fake=fakeIndexedDB(),store=indexedDemoMemoryStore(fake.factory),seed=seedDemoMemory(at);
 const one=await store.loadOrSeed(seed),two=await store.loadOrSeed(seedDemoMemory(at+100000));expect(one).toEqual(two);expect(fake.puts).toBe(1);expect(one.channels[channel]!.record).toEqual({streams:3,bossesKo:1,timesKo:2});expect(one.channels[channel]!.viewers['sim-1']!.koVotes).toBe(2);expect(fake.requestedNames).toEqual([DEMO_MEMORY_DB]);store.close();
});
it('does not open storage or retain any data in hosted/live-credential mode',()=>{
 const fake=fakeIndexedDB();expect(createDemoViewerMemory({offline:false,factory:fake.factory})).toBeNull();setLiveCredentials(true);expect(createDemoViewerMemory({offline:true,factory:fake.factory})).toBeNull();expect(fake.opens).toBe(0);
});
it('works immediately in memory when IndexedDB is denied and rejects non-simulated identities',async()=>{
 const fake={open(){throw new Error('denied');}} as unknown as IDBFactory;
 const memory=createDemoViewerMemory({offline:true,factory:fake,now:()=>at,sessionId:'page'})!;expect(memory.view()?.simulated).toBe(true);expect(memory.view()?.record.streams).toBe(3);await memory.ready;
 let state=createGame({now:0});const votes=[{kind:'vote',user:'sim-1',move:'JAB',at:0,simulated:true},{kind:'vote',user:'real-user',move:'JAB',at:0,simulated:false}] as const;state=step(state,{kind:'vote-batch',votes:[...votes]},0);memory.votes(votes,state);expect(memory.view()?.nemesis?.active).toBe(true);await memory.close();
});
it('replays early simulated observations onto restored data rather than losing votes during opening',async()=>{
 let release!:(data:ReturnType<typeof seedDemoMemory>)=>void;let saved:any;const store:DemoMemoryStore={loadOrSeed:()=>new Promise(resolve=>{release=resolve;}),save:async data=>{saved=data;},close:vi.fn()};
 const memory=createDemoViewerMemory({offline:true,store,now:()=>at,sessionId:'page'})!,votes=[{kind:'vote',user:'sim-1',move:'JAB',at:0,simulated:true}] as const;let state=step(createGame({now:0}),{kind:'vote-batch',votes:[...votes]},0);memory.votes(votes,state);memory.votes(votes,state);release(seedDemoMemory(at));await memory.ready;await memory.close();expect(saved.channels[channel].viewers['sim-1'].votes).toBe(4);expect(saved.channels[channel].viewers['sim-1'].streams).toBe(4);expect(JSON.stringify(saved)).not.toContain('real-user');
});
it('keeps the seeded fallback on asynchronous storage failure and closes safely',async()=>{
 const store:DemoMemoryStore={loadOrSeed:async()=>{throw new Error('unavailable');},save:vi.fn(async()=>{}),close:vi.fn()};const memory=createDemoViewerMemory({offline:true,store,now:()=>at,sessionId:'page'})!;await memory.ready;expect(memory.view()?.hallOfFame[0]?.name).toBe('PixelMoth');await Promise.all([memory.close(),memory.close()]);expect(store.close).toHaveBeenCalledOnce();
});
it('never overwrites corrupt or non-simulated stored data with a fresh seed',async()=>{
 const data=seedDemoMemory(at);data.channels['real-channel']=data.channels[channel]!;const save=vi.fn(async()=>{}),close=vi.fn();const memory=createDemoViewerMemory({offline:true,store:{loadOrSeed:async()=>data,save,close},now:()=>at,sessionId:'page'})!;await memory.ready;expect(memory.view()?.simulated).toBe(true);await memory.close();expect(save).not.toHaveBeenCalled();expect(close).toHaveBeenCalledOnce();
});
it('observes actual KO supporters once and never mutates the reducer state',async()=>{
 const memory=createDemoViewerMemory({offline:true,now:()=>at,sessionId:'page'})!;await memory.ready;let state=createGame({now:0,moves:['HOOK_L']});state={...state,streamer:{...state.streamer,hp:5}};const votes=[{kind:'vote',user:'sim-1',move:'HOOK_L',at:0,simulated:true}] as const;state=step(state,{kind:'vote-batch',votes:[...votes]},0);memory.votes(votes,state);state=step(state,{kind:'advance'},3200);const before=JSON.stringify(state);memory.observe(state);memory.observe(state);expect(memory.view()?.record).toEqual({streams:4,bossesKo:1,timesKo:3});expect(memory.view()?.hallOfFame[0]?.koVotes).toBe(3);expect(JSON.stringify(state)).toBe(before);await memory.close();
});
it('preserves the seeded MVP streak when an idle landing visit closes without combat',async()=>{
 let saved:any;const memory=createDemoViewerMemory({offline:true,store:{loadOrSeed:async seed=>seed,save:async data=>{saved=data;},close(){}},now:()=>at,sessionId:'idle-page'})!;await memory.ready;await memory.close();expect(saved.channels[channel].mvpStreak).toBe(3);expect(saved.channels[channel].lastMvpId).toBe('sim-1');
});
it('credits the exact damaging COMBO hit once and resets cursors for subsequent matches',async()=>{
 const memory=createDemoViewerMemory({offline:true,now:()=>at,sessionId:'page'})!;await memory.ready;
 for(const seed of [1,2]){let state=createGame({seed,now:0,moves:['COMBO']});state={...state,streamer:{...state.streamer,hp:3}};const votes=[{kind:'vote',user:'sim-1',move:'COMBO',at:0,simulated:true}] as const;state=step(state,{kind:'vote-batch',votes:[...votes]},0);memory.votes(votes,state);state=step(state,{kind:'advance'},3200);expect(state.round.over).toBe(true);memory.observe(state);memory.observe(state);}
 expect(memory.view()?.hallOfFame[0]?.koVotes).toBe(4);expect(memory.view()?.record.timesKo).toBe(4);await memory.close();
});
it('does not repaint a disposed page when storage hydration finishes after close starts',async()=>{
 let release!:(data:ReturnType<typeof seedDemoMemory>)=>void;const onChange=vi.fn(),close=vi.fn(),store:DemoMemoryStore={loadOrSeed:()=>new Promise(resolve=>{release=resolve;}),save:async()=>{},close};const memory=createDemoViewerMemory({offline:true,store,now:()=>at,sessionId:'page',onChange})!;const closing=memory.close();release(seedDemoMemory(at));await closing;expect(onChange).not.toHaveBeenCalled();expect(close).toHaveBeenCalledOnce();
});
it('aligns the end-card stream MVP with cumulative memory across matches, using stable epsilon ties',async()=>{
 const memory=createDemoViewerMemory({offline:true,now:()=>at,sessionId:'page'})!;await memory.ready;
 for(const[seed,user,damage]of [[1,'sim-1',100],[2,'sim-2',50]] as const){let state=createGame({seed,now:0});const votes=[{kind:'vote',user,move:'JAB',at:0,simulated:true}] as const;state=step(state,{kind:'vote-batch',votes:[...votes]},0);memory.votes(votes,state);memory.observe({...state,log:{...state.log,damage:[{round:1,beat:0,at:3200,damage,supporters:[user]}]}});}
 expect(memory.summaryMvp()).toEqual({user:'sim-1',damage:100,displayName:'PixelMoth'});expect(memory.view()?.mvpStreak).toBe(4);
 const {summaryPresentation}=await import('../../overlay/src/summary');const {summarizeGame}=await import('../../shared/src/highlights');const card=summaryPresentation({...summarizeGame(createGame({now:0})),chatMvp:memory.summaryMvp()},[],'http://localhost/',memory.view());expect(card.mvp).toBe('PixelMoth · 100.0 DAMAGE');expect(card.mvpStreak).toBe('MVP 4 STREAMS RUNNING');
 // Within shared MVP epsilon, code-unit ID ordering wins rather than the slightly larger value.
 let state=createGame({seed:3,now:0});const votes=[{kind:'vote',user:'sim-2',move:'JAB',at:0,simulated:true}] as const;state=step(state,{kind:'vote-batch',votes:[...votes]},0);memory.votes(votes,state);memory.observe({...state,log:{...state.log,damage:[{round:1,beat:0,at:3200,damage:50+5e-10,supporters:['sim-2']}]}});expect(memory.summaryMvp()?.user).toBe('sim-1');await memory.close();
});
