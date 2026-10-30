import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHostedResults,BOT_POST_HINT} from './hosted-results';
import {createGame,step,type GameState} from '../../shared/src/engine';
import {validateResult} from '../../worker/src/validation';
const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
function setup(scopes=['user:read:chat','channel:bot']){
 const backendRequest=vi.fn(async(_path:string,_init?:RequestInit)=>Response.json({pending:0,dropReason:null}));
 const auth={authenticated:true,account:{id:'me',login:'name',expiresIn:3600,scopes},backendRequest};
 const fetch=vi.fn(async()=>Response.json({bot:true})),onStatus=vi.fn();
 const client=createHostedResults({auth,fetch,onStatus});return {client,auth,fetch,backendRequest,onStatus};
}
afterEach(()=>vi.useRealTimers());
it('health and scope gate the default and older tokens keep live gameplay available',async()=>{
 vi.useFakeTimers();const s=setup(['user:read:chat']);await s.client.initialize();expect(s.client.enabled).toBe(false);expect(s.onStatus).toHaveBeenCalledWith('Reconnect to enable bot results (channel:bot).');expect(s.auth.authenticated).toBe(true);s.client.dispose();
 const off=setup();off.fetch.mockResolvedValue(Response.json({bot:false}));await off.client.initialize();expect(off.client.enabled).toBe(false);off.client.dispose();
 const on=setup();await on.client.initialize();expect(on.client.enabled).toBe(true);expect(on.fetch).toHaveBeenCalledWith('/api/health',{cache:'no-store'});on.client.dispose();
});
it('posts each round once and existing hype notice once, without awaiting delivery',async()=>{
 vi.useFakeTimers();const s=setup();await s.client.initialize();const state=createGame({seed:1});s.client.observeGame(state);const over:GameState={...state,streamer:{...state.streamer,hp:22},log:{...state.log,rounds:[{number:1,winner:'streamer',at:75000,reason:'ko',streamer_hp:22,boss_hp:0,boss_max_hp:135}]},match:{...state.match,round_wins:{streamer:1,boss:0}}};s.client.observeGame(over,true);s.client.observeGame(over,false);await flush();const posts=s.backendRequest.mock.calls.filter(call=>call[0]==='/api/results');expect(posts).toHaveLength(2);expect(JSON.parse(posts[0]![1]!.body as string)).toMatchObject({kind:'round',number:1,winner:'streamer',hookL:'!left',hookR:'!right',bossName:'CHAT GOLEM',difficulty:'hard',score:{streamer:1,boss:0}});expect(JSON.parse(posts[1]![1]!.body as string)).toEqual({kind:'hype-full'});s.client.dispose();
});
it('delivery and status failures never clear credentials or control play; polling is bounded and stops on dispose',async()=>{
 vi.useFakeTimers();const s=setup();await s.client.initialize();await flush();s.backendRequest.mockRejectedValue(new Error('offline'));s.client.observeGame(createGame({seed:1}),true);await flush();expect(s.onStatus).toHaveBeenCalledWith('Bot result could not be queued; gameplay continues.');expect(s.auth.authenticated).toBe(true);s.backendRequest.mockResolvedValue(Response.json({dropReason:'missing_scope'}));await vi.advanceTimersByTimeAsync(15000);expect(s.onStatus).toHaveBeenCalledWith(`${BOT_POST_HINT} (missing_scope)`);s.client.dispose();const count=s.backendRequest.mock.calls.length;await vi.advanceTimersByTimeAsync(60000);expect(s.backendRequest).toHaveBeenCalledTimes(count);
});
it('does not replay results collected while disabled, and 503 is an isolated status',async()=>{
 vi.useFakeTimers();const s=setup();await s.client.initialize();s.client.setEnabled(false);const state=createGame({seed:1});s.client.observeGame(state,true);s.client.setEnabled(true);s.backendRequest.mockResolvedValue(new Response(null,{status:503}));s.client.observeGame(state,true);await flush();expect(s.onStatus).toHaveBeenCalledWith('Bot results unavailable.');expect(s.auth.authenticated).toBe(true);s.client.dispose();
});
it('the no-login entry never loads hosted API code: play is imported only inside the live route branch',()=>{
 const source=readFileSync(new URL('./main.ts',import.meta.url),'utf8');expect(source).not.toContain("fetch('/api");const marker=source.lastIndexOf('if(liveMode){',source.indexOf("await import('./play')"));expect(marker).toBeGreaterThan(-1);const importAt=source.indexOf("await import('./play')");expect(importAt).toBeGreaterThan(marker);expect(source.slice(marker,importAt)).not.toContain('} else');
});

it('baselines historical results instead of reposting them with the final match score',async()=>{
 vi.useFakeTimers();const s=setup();await s.client.initialize();
 let state=createGame({seed:9});state.boss.hp=1;state=step(state,{kind:'punch',side:'L',at:100,source:'keyboard'},100);
 state=step(state,{kind:'next-round'},200);state.boss.hp=1;state=step(state,{kind:'punch',side:'L',at:300,source:'keyboard'},300);
 expect(state.log.rounds).toHaveLength(2);s.client.observeGame(state);s.client.observeGame(state);await flush();
 expect(s.backendRequest.mock.calls.filter(call=>call[0]==='/api/results')).toHaveLength(0);s.client.dispose();
});
it('posts validator-compatible R1/R2/R3 results exactly once and allows new results after same-seed and new-seed restarts',async()=>{
 vi.useFakeTimers();const s=setup();await s.client.initialize();let state=createGame({seed:1});s.client.observeGame(state);
 function observe(next:GameState){state=next;s.client.observeGame(state);s.client.observeGame(state);}
 state.boss.hp=1;observe(step(state,{kind:'punch',side:'L',at:100,source:'keyboard'},100));
 observe(step(state,{kind:'next-round'},200));state.streamer.hp=1;state.moves=['JAB'];observe(step(state,{kind:'advance'},state.clock.next_beat+800));
 observe(step(state,{kind:'next-round'},3500));state.boss.hp=1;observe(step(state,{kind:'punch',side:'L',at:3600,source:'keyboard'},3600));
 await flush();const bodies=()=>s.backendRequest.mock.calls.filter(call=>call[0]==='/api/results').map(call=>JSON.parse(call[1]!.body as string));
 expect(bodies().map(body=>[body.number,body.score,body.matchOver])).toEqual([[1,{streamer:1,boss:0},false],[2,{streamer:1,boss:1},false],[3,{streamer:2,boss:1},true]]);
 for(const seed of [1,2]){observe(step(state,{kind:'restart',seed},state.now+100));state.boss.hp=1;observe(step(state,{kind:'punch',side:'L',at:state.now+100,source:'keyboard'},state.now+100));}
 await flush();expect(bodies()).toHaveLength(5);for(const body of bodies())expect(validateResult(body)).toEqual(body);s.client.dispose();
});
it('posts verified clip IDs only when the existing bot opt-in is enabled',async()=>{
 vi.useFakeTimers();const s=setup();await s.client.initialize();s.client.postClip('ConfirmedClip');await flush();const posts=s.backendRequest.mock.calls.filter(call=>call[0]==='/api/results');expect(posts).toHaveLength(1);expect(JSON.parse(posts[0]![1]!.body as string)).toEqual({kind:'clip',clipId:'ConfirmedClip'});s.client.setEnabled(false);s.client.postClip('NotPosted');await flush();expect(s.backendRequest.mock.calls.filter(call=>call[0]==='/api/results')).toHaveLength(1);s.client.dispose();
});
