import { afterEach, expect, it, vi } from 'vitest';
const fakes = vi.hoisted(() => ({ apiConfig: undefined as any, wsConfig: undefined as any, handler: undefined as any, success:undefined as any, cheerHandler:undefined as any, subHandler:undefined as any, raidHandler:undefined as any, cheer:vi.fn(), sub:vi.fn(), raid:vi.fn(), subscription: vi.fn(), send:vi.fn(async()=>({})), asUser:vi.fn(), stream:vi.fn(async()=>({viewers:42})) }));
vi.mock('@twurple/api', () => ({ ApiClient: class { streams={getStreamByUserId:fakes.stream}; constructor(config: unknown) { fakes.apiConfig = config; } asUser(user:string,run:(ctx:any)=>Promise<unknown>){fakes.asUser(user);return run({chat:{sendChatMessage:fakes.send}});} } }));
vi.mock('@twurple/eventsub-ws', () => ({ EventSubWsListener: class {
  constructor(config: unknown) { fakes.wsConfig = config; }
  onSubscriptionCreateSuccess(handler:any) {fakes.success=handler;} onSubscriptionCreateFailure() {} onRevoke() {} onUserSocketDisconnect() {}
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
