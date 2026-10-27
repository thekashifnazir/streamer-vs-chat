import { ApiClient } from '@twurple/api';
import type { AuthProvider, AccessTokenWithUserId } from '@twurple/auth';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import type { ChatRole } from './chat-controls';

export type IncomingChat = { user: string; text: string; simulated: boolean; role:ChatRole };
export const MOCK_BOT_ID = '9001';
export const MOCK_BROADCASTER_ID = '9002';

/** Deliberately local dummy credentials: no validation, refresh or token-file access. */
function mockAuthProvider(): AuthProvider {
  const token: AccessTokenWithUserId = {
    userId: MOCK_BOT_ID, accessToken: 'local-mock-token', refreshToken: null,
    scope: ['user:read:chat', 'user:write:chat', 'user:bot'],
    expiresIn: null, obtainmentTimestamp: 0,
  };
  return {
    clientId: 'local-mock-client',
    getCurrentScopesForUser: () => token.scope,
    getAccessTokenForUser: async () => token,
    getAnyAccessToken: async () => token,
  };
}

export function createTwitchSession(options: {
  mock: boolean;
  onMessage: (message: IncomingChat) => void;
  authProvider?: AuthProvider;
  botId?: string;
  broadcasterId?: string;
}) {
  if (options.mock) {
    // Twurple uses this for BOTH its subscription API and WS URL.
    process.env.TWURPLE_MOCK_API_PORT = '8081';
  } else if (process.env.TWURPLE_MOCK_API_PORT) {
    throw new Error('Unset TWURPLE_MOCK_API_PORT for live mode; use npm run dev:mock for simulated chat.');
  }
  const authProvider = options.mock ? mockAuthProvider() : options.authProvider;
  const botId = options.mock ? MOCK_BOT_ID : options.botId;
  const broadcasterId = options.mock ? MOCK_BROADCASTER_ID : options.broadcasterId;
  if (!authProvider || !botId || !broadcasterId) {
    throw new Error('Both Twitch accounts must be authorized before EventSub starts.');
  }
  const apiClient = new ApiClient({ authProvider, ...(options.mock ? { mockServerPort: 8081 } : {}) });
  const listener = new EventSubWsListener({
    apiClient,
    ...(options.mock ? { url: 'ws://127.0.0.1:8081/ws' } : {}),
  });
  listener.onSubscriptionCreateSuccess((_subscription, apiSubscription) => {
    console.log(`[eventsub] channel.chat.message active (${options.mock ? 'SIMULATED' : 'LIVE'}), subscription ${apiSubscription.id}`);
  });
  listener.onSubscriptionCreateFailure(() => {
    console.error('[eventsub] Chat subscription failed. Check bot scopes and broadcaster authorization.');
  });
  listener.onRevoke((_subscription, status) => {
    console.error(`[eventsub] Subscription revoked (${status}); reauthorize at http://localhost:3000/auth`);
  });
  listener.onUserSocketDisconnect((_userId, error) => {
    if (error) console.error('[eventsub] Socket disconnected; Twurple will reconnect.');
  });
  // Chat only today; cheer/subscription/raid remain day4.
  listener.onChannelChatMessage(broadcasterId, botId, (event) => {
    const role:ChatRole=event.chatterId===broadcasterId?'broadcaster':Object.hasOwn(event.badges??{},'moderator')?'mod':'viewer';
    const message = { user: event.chatterId, text: event.messageText, simulated: options.mock,role };
    console.log(`[chat ${options.mock ? 'SIMULATED' : 'LIVE'}] ${event.chatterName}: ${event.messageText}`);
    options.onMessage(message);
  });
  listener.start();
  return {
    stop:()=>listener.stop(),
    async viewers():Promise<number> {
      if(options.mock)return 0;
      const stream=await apiClient.streams.getStreamByUserId(broadcasterId);
      return stream?.viewers??0;
    },
    async sendRoundResult(text:string,simulated:boolean):Promise<void> {
      if(simulated!==options.mock)throw new Error('Refusing simulated results on live Twitch or live results on the mock transport');
      if(options.mock) {
        const response=await fetch('http://127.0.0.1:8081/results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,simulated:true}),signal:AbortSignal.timeout(5000)});
        if(!response.ok)throw new Error(`Local result shim returned${response.status}`);
        return;
      }
      await apiClient.asUser(botId,ctx=>ctx.chat.sendChatMessage(broadcasterId,text));
    },
  };
}
