import { afterEach, expect, it, vi } from 'vitest';
const fakes = vi.hoisted(() => ({ apiConfig: undefined as any, wsConfig: undefined as any, handler: undefined as any, subscription: vi.fn(), send:vi.fn(async()=>({})), asUser:vi.fn(), stream:vi.fn(async()=>({viewers:42})) }));
vi.mock('@twurple/api', () => ({ ApiClient: class { streams={getStreamByUserId:fakes.stream}; constructor(config: unknown) { fakes.apiConfig = config; } asUser(user:string,run:(ctx:any)=>Promise<unknown>){fakes.asUser(user);return run({chat:{sendChatMessage:fakes.send}});} } }));
vi.mock('@twurple/eventsub-ws', () => ({ EventSubWsListener: class {
  constructor(config: unknown) { fakes.wsConfig = config; }
  onSubscriptionCreateSuccess() {} onSubscriptionCreateFailure() {} onRevoke() {} onUserSocketDisconnect() {}
  onChannelChatMessage(...args: any[]) { fakes.subscription(...args); fakes.handler = args[2]; }
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
  expect(liveProvider.getAccessTokenForUser).not.toHaveBeenCalled();
  expect(fakes.subscription).toHaveBeenCalledWith('9002', '9001', expect.any(Function));
  fakes.handler({ chatterId: 'viewer', chatterName: 'viewer', messageText: '!jab' });
  expect(onMessage).toHaveBeenCalledWith({ user: 'viewer', text: '!jab', simulated: true,role:'viewer' });
  session.stop();
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
