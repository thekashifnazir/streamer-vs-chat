import { afterEach, expect, it, vi } from 'vitest';
const fakes = vi.hoisted(() => ({ apiConfig: undefined as any, wsConfig: undefined as any, handler: undefined as any, subscription: vi.fn() }));
vi.mock('@twurple/api', () => ({ ApiClient: class { constructor(config: unknown) { fakes.apiConfig = config; } } }));
vi.mock('@twurple/eventsub-ws', () => ({ EventSubWsListener: class {
  constructor(config: unknown) { fakes.wsConfig = config; }
  onSubscriptionCreateSuccess() {} onSubscriptionCreateFailure() {} onRevoke() {} onUserSocketDisconnect() {}
  onChannelChatMessage(...args: any[]) { fakes.subscription(...args); fakes.handler = args[2]; }
  start() {} stop() {}
} }));
import { createTwitchSession } from './twitch.js';
afterEach(() => { vi.unstubAllEnvs(); delete process.env.TWURPLE_MOCK_API_PORT; vi.clearAllMocks(); });
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
  expect(onMessage).toHaveBeenCalledWith({ user: 'viewer', text: '!jab', simulated: true });
  session.stop();
});
it('rejects a mock environment in live mode', () => {
  vi.stubEnv('TWURPLE_MOCK_API_PORT', '8081');
  expect(() => createTwitchSession({ mock: false, onMessage: vi.fn() })).toThrow('Unset TWURPLE_MOCK_API_PORT');
});
