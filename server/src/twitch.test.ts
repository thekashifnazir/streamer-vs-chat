import { afterEach, expect, it, vi } from 'vitest';
const fakes = vi.hoisted(() => ({ apiConfig: undefined as any, wsConfig: undefined as any,disconnect:undefined as any, handler: undefined as any, success:undefined as any, cheerHandler:undefined as any, subHandler:undefined as any, raidHandler:undefined as any, cheer:vi.fn(), sub:vi.fn(), raid:vi.fn(), subscription: vi.fn(), send:vi.fn(async()=>({})), asUser:vi.fn(), createClip:vi.fn(async()=> 'pending-clip'), getClip:vi.fn(async()=>({id:'confirmed-clip',url:'https://clips.twitch.tv/confirmed-clip'})), stream:vi.fn(async()=>({viewers:42})) }));
vi.mock('@twurple/api', () => ({ ApiClient: class { users={getUserById:async()=>({name:'caster_login',displayName:'Caster Display'})};streams={getStreamByUserId:fakes.stream}; constructor(config: unknown) { fakes.apiConfig = config; } asUser(user:string,run:(ctx:any)=>Promise<unknown>){fakes.asUser(user);return run({chat:{sendChatMessage:fakes.send},streams:{getStreamByUserId:fakes.stream},clips:{createClip:fakes.createClip,getClipById:fakes.getClip}});} } }));
vi.mock('@twurple/eventsub-ws', () => ({ EventSubWsListener: class {
  constructor(config: unknown) { fakes.wsConfig = config; }
  onSubscriptionCreateSuccess(handler:any) {fakes.success=handler;} onSubscriptionCreateFailure() {} onRevoke() {} onUserSocketDisconnect(handler:any) {fakes.disconnect=handler;}
  onChannelChatMessage(...args: any[]) { fakes.subscription(...args); fakes.handler = args[2]; }
  onChannelCheer(user:string,handler:any){fakes.cheer(user);fakes.cheerHandler=handler;}
  onChannelSubscription(user:string,handler:any){fakes.sub(user);fakes.subHandler=handler;}
  onChannelRaidTo(user:string,handler:any){fakes.raid(user);fakes.raidHandler=handler;}
  start() {} stop() {}
} }));
import { createTwitchSession } from './twitch.js';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); delete process.env.TWURPLE_MOCK_API_PORT; vi.clearAllMocks(); });
it('pins mock API and WS to the shim and discards any supplied live provider', async () => {
  vi.stubEnv('TWURPLE_MOCK_API_PORT', '8080');
  const onMessage = vi.fn();
  const liveProvider = { getAccessTokenForUser: vi.fn(() => { throw new Error('Never access live credentials'); }) } as any;
  const session = createTwitchSession({ mock: true, authProvider: liveProvider, onMessage });
  expect(fakes.apiConfig.mockServerPort).toBe(8081);
  expect(fakes.wsConfig.url).toBe('ws://127.0.0.1:8081/ws');
  expect(process.env.TWURPLE_MOCK_API_PORT).toBe('8081');
  expect((await fakes.apiConfig.authProvider.getAccessTokenForUser('9001')).accessToken).toBe('local-mock-token');
  const caster=await fakes.apiConfig.authProvider.getAccessTokenForUser('9002');
  expect(caster.userId).toBe('9002');expect(caster.scope).toContain('bits:read');expect(caster.scope).toContain('channel:read:subscriptions');
  expect(liveProvider.getAccessTokenForUser).not.toHaveBeenCalled();
  expect(fakes.subscription).toHaveBeenCalledWith('9002', '9001', expect.any(Function));
  fakes.handler({ chatterId: 'viewer', chatterName: 'viewer', messageText: '!jab' });
  expect(onMessage).toHaveBeenCalledWith({ user: 'viewer', text: '!jab', simulated: true,role:'viewer' });
  session.stop();
});
it('maps optional broadcaster events and subscribes to raids TO this channel',()=>{
  const onTwist=vi.fn();const session=createTwitchSession({mock:true,onMessage:vi.fn(),onTwist});
  fakes.cheerHandler({bits:75});fakes.subHandler({});fakes.raidHandler({viewers:40});
  expect(onTwist.mock.calls.map(([event])=>event)).toEqual([{kind:'cheer',bits:75,simulated:true},{kind:'subscribe',simulated:true},{kind:'raid',viewers:40,simulated:true}]);
  expect(fakes.cheer).toHaveBeenCalledWith('9002');expect(fakes.sub).toHaveBeenCalledWith('9002');expect(fakes.raid).toHaveBeenCalledWith('9002');session.stop();
});
it('keeps legacy live chat available and skips missing optional scopes without network',()=>{
  delete process.env.TWURPLE_MOCK_API_PORT;
  const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});
  const provider={getCurrentScopesForUser:()=>['channel:bot','clips:edit']} as any;
  const session=createTwitchSession({mock:false,onMessage:vi.fn(),authProvider:provider,botId:'bot',broadcasterId:'caster'});
  expect(fakes.subscription).toHaveBeenCalledWith('caster','bot',expect.any(Function));
  expect(fakes.cheer).not.toHaveBeenCalled();expect(fakes.sub).not.toHaveBeenCalled();expect(fakes.raid).toHaveBeenCalledWith('caster');
  expect(warning).toHaveBeenCalledWith(expect.stringContaining('chat remains available'));session.stop();warning.mockRestore();
});
it('enables each scope independently and keeps callback simulation labels accurate',()=>{
  delete process.env.TWURPLE_MOCK_API_PORT;
  const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});const onTwist=vi.fn();
  const session=createTwitchSession({mock:false,onMessage:vi.fn(),onTwist,authProvider:{getCurrentScopesForUser:()=>['bits:read']} as any,botId:'bot',broadcasterId:'caster'});
  expect(fakes.cheer).toHaveBeenCalledWith('caster');expect(fakes.sub).not.toHaveBeenCalled();
  fakes.cheerHandler({bits:3});expect(onTwist).toHaveBeenCalledWith({kind:'cheer',bits:3,simulated:false});session.stop();warning.mockRestore();
});
it('exposes only parsed Twurple CLI commands with the registered session and subscription ID',async()=>{
  const log=vi.spyOn(console,'log').mockImplementation(()=>{});
  const session=createTwitchSession({mock:true,onMessage:vi.fn()});
  fakes.success({getCliTestCommand:async()=> 'twitch event trigger cheer -T websocket --session session_123 -u sub-456'},{type:'channel.cheer',id:'sub-456'});
  expect(await session.mockCommands()).toEqual([{type:'channel.cheer',subscriptionId:'sub-456',sessionId:'session_123',command:'twitch event trigger cheer -T websocket --session session_123 -u sub-456 --to-user 9002',args:['event','trigger','cheer','-T','websocket','--session','session_123','-u','sub-456','--to-user','9002']}]);
  fakes.success({getCliTestCommand:async()=> 'twitch event trigger cheer -T websocket --session session_123 -u sub-456; bad'},{type:'channel.cheer',id:'sub-456'});
  await expect(session.mockCommands()).rejects.toThrow('unexpected');session.stop();log.mockRestore();
});
it('rejects a mock environment in live mode', () => {
  vi.stubEnv('TWURPLE_MOCK_API_PORT', '8081');
  expect(() => createTwitchSession({ mock: false, onMessage: vi.fn() })).toThrow('Unset TWURPLE_MOCK_API_PORT');
});

it('takes broadcaster/mod roles from trusted IDs and EventSub badges',()=>{
  const onMessage=vi.fn();const session=createTwitchSession({mock:true,onMessage});
  fakes.handler({chatterId:'9002',chatterName:'caster',messageText:'stop',badges:{}});
  fakes.handler({chatterId:'17',chatterName:'mod',messageText:'!veto',badges:{moderator:'1'}});
  expect(onMessage.mock.calls.map(([message])=>message.role)).toEqual(['broadcaster','mod']);session.stop();
});
it('routes simulated results only to the local shim and refuses mode mismatch',async()=>{
  const fetcher=vi.fn(async(_url:string,_options:unknown)=>({ok:true}));vi.stubGlobal('fetch',fetcher);
  const session=createTwitchSession({mock:true,onMessage:vi.fn()});
  await expect(session.sendRoundResult('result',false)).rejects.toThrow('Refusing');
  await session.sendRoundResult('result',true);
  expect(fetcher.mock.calls[0]?.[0]).toBe('http://127.0.0.1:8081/results');
  expect(fakes.asUser).not.toHaveBeenCalled();session.stop();
});
it('sends real results in the bot user context and polls viewers without simulation',async()=>{
  delete process.env.TWURPLE_MOCK_API_PORT;
  const session=createTwitchSession({mock:false,onMessage:vi.fn(),authProvider:{} as any,botId:'bot',broadcasterId:'caster'});
  await expect(session.sendRoundResult('fake result',true)).rejects.toThrow('Refusing');
  expect(fakes.asUser).not.toHaveBeenCalled();
  await session.sendRoundResult('Round1 result',false);
  expect(fakes.asUser).toHaveBeenCalledWith('bot');expect(fakes.send).toHaveBeenCalledWith('caster','Round1 result');
  expect(await session.viewers()).toBe(42);session.stop();
});

it('never calls any clip endpoint in mock mode even when supplied live credentials',async()=>{
  const s=createTwitchSession({mock:true,onMessage:vi.fn(),authProvider:{getAccessTokenForUser:()=>{throw new Error('live credentials forbidden');}} as any});
  expect(await s.clips.getStream()).toBeNull();expect(await s.clips.createClip()).toBeNull();expect(await s.clips.getClip('id')).toBeNull();
  expect(fakes.asUser).not.toHaveBeenCalled();expect(fakes.stream).not.toHaveBeenCalled();expect(fakes.createClip).not.toHaveBeenCalled();expect(fakes.getClip).not.toHaveBeenCalled();s.stop();
});
it('uses broadcaster context for clip lifecycle and exposes only actual returned evidence',async()=>{
  fakes.stream.mockResolvedValueOnce({startDate:new Date(1234)} as any);
  const s=createTwitchSession({mock:false,onMessage:vi.fn(),authProvider:{getCurrentScopesForUser:()=>['clips:edit']} as any,botId:'bot',broadcasterId:'caster'});
  expect(await s.clips.getStream()).toEqual({startedAt:1234});expect(await s.clips.createClip()).toBe('pending-clip');
  expect(await s.clips.getClip('pending-clip')).toEqual({id:'confirmed-clip',url:'https://clips.twitch.tv/confirmed-clip'});
  expect(fakes.asUser.mock.calls.map(([id])=>id)).toEqual(['caster','caster','caster']);
  expect(fakes.createClip).toHaveBeenCalledWith({channel:'caster'});expect(fakes.getClip).toHaveBeenCalledWith('pending-clip');s.stop();
});
it('missing clip permission skips creation without HTTP',async()=>{
  const s=createTwitchSession({mock:false,onMessage:vi.fn(),authProvider:{getCurrentScopesForUser:()=>[]} as any,botId:'bot',broadcasterId:'caster'});
  expect(await s.clips.createClip()).toBeNull();expect(fakes.createClip).not.toHaveBeenCalled();s.stop();
});

it('reports chat subscription recovery, preserves incoming IDs and does not confuse the broadcaster optional socket',()=>{
 const statuses=vi.fn(),message=vi.fn();const session=createTwitchSession({mock:true,onMessage:message,onStatus:statuses,logChat:false});expect(statuses).toHaveBeenLastCalledWith('connecting');
 fakes.success({}, {type:'channel.chat.message',id:'chat'});expect(statuses).toHaveBeenLastCalledWith('connected');fakes.disconnect('9002',new Error('optional'));expect(statuses).toHaveBeenLastCalledWith('connected');fakes.disconnect('9001',new Error('offline'));expect(statuses).toHaveBeenLastCalledWith('reconnecting');
 fakes.success({}, {type:'channel.chat.message',id:'chat2'});expect(statuses).toHaveBeenLastCalledWith('connected');fakes.handler({messageId:'load-1',chatterId:'viewer',messageText:'!jab'});expect(message.mock.calls[0]?.[0].messageId).toBe('load-1');session.stop();expect(statuses).toHaveBeenLastCalledWith('disconnected');
});
it('retires all old chat, optional-event and status callbacks while a same-channel replacement remains active',()=>{
 const oldMessage=vi.fn(),oldTwist=vi.fn(),oldStatus=vi.fn();const old=createTwitchSession({mock:true,onMessage:oldMessage,onTwist:oldTwist,onStatus:oldStatus});
 const callbacks={chat:fakes.handler,cheer:fakes.cheerHandler,sub:fakes.subHandler,raid:fakes.raidHandler,success:fakes.success,disconnect:fakes.disconnect};old.stop();expect(oldStatus.mock.calls.map(([status])=>status)).toEqual(['connecting','disconnected']);
 const message=vi.fn(),twist=vi.fn(),status=vi.fn();const replacement=createTwitchSession({mock:true,onMessage:message,onTwist:twist,onStatus:status});
 callbacks.chat({chatterId:'old',chatterName:'old-channel-viewer',messageText:'!jab'});callbacks.cheer({bits:25});callbacks.sub({});callbacks.raid({viewers:10});callbacks.success({}, {type:'channel.chat.message',id:'retired'});callbacks.disconnect('9001',new Error('retired connection'));old.stop();
 expect(oldMessage).not.toHaveBeenCalled();expect(oldTwist).not.toHaveBeenCalled();expect(oldStatus.mock.calls.map(([value])=>value)).toEqual(['connecting','disconnected']);expect(message).not.toHaveBeenCalled();expect(twist).not.toHaveBeenCalled();expect(status).toHaveBeenLastCalledWith('connecting');
 fakes.handler({chatterId:'new',chatterName:'new-channel-viewer',messageText:'!combo'});fakes.cheerHandler({bits:3});fakes.subHandler({});fakes.raidHandler({viewers:2});fakes.success({}, {type:'channel.chat.message',id:'current'});
 expect(message).toHaveBeenCalledOnce();expect(message).toHaveBeenCalledWith(expect.objectContaining({user:'new',text:'!combo'}));expect(twist).toHaveBeenCalledTimes(3);expect(status).toHaveBeenLastCalledWith('connected');replacement.stop();
});
it('loads broadcaster login and display names for local protection without consulting live APIs in mock mode',async()=>{
 const mock=createTwitchSession({mock:true,onMessage:vi.fn()});expect(await mock.broadcasterNames()).toEqual(['Mock Broadcaster']);mock.stop();delete process.env.TWURPLE_MOCK_API_PORT;
 const live=createTwitchSession({mock:false,onMessage:vi.fn(),authProvider:{getCurrentScopesForUser:()=>[]} as any,botId:'bot',broadcasterId:'caster'});expect(await live.broadcasterNames()).toEqual(['caster_login','Caster Display']);live.stop();
});
