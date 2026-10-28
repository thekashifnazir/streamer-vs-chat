import { ApiClient } from '@twurple/api';
import type { AuthProvider, AccessTokenWithUserId } from '@twurple/auth';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import type { ChatRole } from './chat-controls';
import type { ClipTransport } from './clips';

export type IncomingChat = { user: string; text: string; simulated: boolean; role:ChatRole; displayName?:string;messageId?:string };
export type IncomingTwist = { simulated:boolean } & ({kind:'cheer';bits:number}|{kind:'subscribe'}|{kind:'raid';viewers:number});
export type MockEventCommand = {type:'channel.cheer'|'channel.subscribe'|'channel.raid';subscriptionId:string;sessionId:string;command:string;args:string[]};
export const MOCK_BOT_ID = '9001';
export const MOCK_BROADCASTER_ID = '9002';

/** Deliberately local dummy credentials: no validation, refresh or token-file access. */
function mockAuthProvider(): AuthProvider {
  const bot: AccessTokenWithUserId = {
    userId: MOCK_BOT_ID, accessToken: 'local-mock-token', refreshToken: null,
    scope: ['user:read:chat', 'user:write:chat', 'user:bot'],
    expiresIn: null, obtainmentTimestamp: 0,
  };
  const broadcaster:AccessTokenWithUserId={...bot,userId:MOCK_BROADCASTER_ID,accessToken:'local-mock-broadcaster-token',scope:['channel:bot','clips:edit','bits:read','channel:read:subscriptions']};
  const tokenFor=(user:Parameters<AuthProvider['getCurrentScopesForUser']>[0])=>{
    const id=typeof user==='object'?user.id:String(user);
    return id===MOCK_BOT_ID?bot:id===MOCK_BROADCASTER_ID?broadcaster:null;
  };
  return {
    clientId: 'local-mock-client',
    getCurrentScopesForUser: user => tokenFor(user)?.scope??[],
    getAccessTokenForUser: async user => tokenFor(user),
    getAnyAccessToken: async user => user?tokenFor(user)??bot:bot,
  };
}

export function createTwitchSession(options: {
  mock: boolean;
  onMessage: (message: IncomingChat) => void;
  onTwist?: (event:IncomingTwist) => void;
  onStatus?:(status:'connecting'|'connected'|'reconnecting'|'disconnected')=>void;
  logChat?:boolean;
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
  const mockSubscriptions=new Map<MockEventCommand['type'],{id:string;getCliTestCommand:()=>Promise<string>}>();
  async function mockCommands():Promise<MockEventCommand[]> {
    if(!options.mock)return [];
    return await Promise.all([...mockSubscriptions].map(async([type,subscription])=>{
      const base=await subscription.getCliTestCommand();
      // Parse Twurple's known command grammar; never pass a shell command to exec.
      const match=/^twitch event trigger (cheer|subscribe|raid) -T websocket --session ([\w-]+) -u ([\w-]+)$/.exec(base);
      if(!match||match[3]!==subscription.id)throw new Error('Twurple returned an unexpected mock CLI command');
      const args=['event','trigger',match[1]!,'-T','websocket','--session',match[2]!,'-u',match[3]!,'--to-user',broadcasterId!];
      return {type,subscriptionId:match[3]!,sessionId:match[2]!,command:`twitch ${args.join(' ')}`,args};
    }));
  }
  let stopped=false;options.onStatus?.('connecting');
  listener.onSubscriptionCreateSuccess((subscription, apiSubscription) => {
    if(stopped)return;
    if(apiSubscription.type==='channel.chat.message'&&!stopped)options.onStatus?.('connected');
    console.log(`[eventsub] ${apiSubscription.type} active (${options.mock ? 'SIMULATED' : 'LIVE'}), subscription ${apiSubscription.id}`);
    if(options.mock&&['channel.cheer','channel.subscribe','channel.raid'].includes(apiSubscription.type)) {
      const type=apiSubscription.type as MockEventCommand['type'];
      mockSubscriptions.set(type,{id:apiSubscription.id,getCliTestCommand:()=>subscription.getCliTestCommand()});
      void mockCommands().then(commands=>{
        if(stopped)return;
        const command=commands.find(item=>item.type===type);
        if(command)console.log(`[mock trigger SIMULATED] ${command.command}`);
      }).catch(()=>console.error('[mock] Could not obtain the registered CLI command.'));
    }
  });
  listener.onSubscriptionCreateFailure((subscription) => {
    if(stopped)return;
    console.error(`[eventsub] ${subscription.id} subscription failed. Check the matching account scopes and broadcaster authorization.`);
  });
  listener.onRevoke((_subscription, status) => {
    if(stopped)return;
    console.error(`[eventsub] Subscription revoked (${status}); reauthorize at http://localhost:3000/auth`);
  });
  listener.onUserSocketDisconnect((userId, error) => {
    if(stopped)return;
    if(userId===botId&&!stopped)options.onStatus?.('reconnecting');
    if (error) console.error('[eventsub] Socket disconnected; Twurple will reconnect.');
  });
  listener.onChannelChatMessage(broadcasterId, botId, (event) => {
    if(stopped)return;
    const role:ChatRole=event.chatterId===broadcasterId?'broadcaster':Object.hasOwn(event.badges??{},'moderator')?'mod':'viewer';
    const message = { ...(typeof event.messageId==='string'?{messageId:event.messageId}:{}),user: event.chatterId, text: event.messageText, simulated: options.mock,role,...(typeof event.chatterDisplayName==='string'&&event.chatterDisplayName?{displayName:event.chatterDisplayName}:{}) };
    if(options.logChat!==false)console.log(`[chat ${options.mock ? 'SIMULATED' : 'LIVE'}] ${event.chatterName}: ${event.messageText}`);
    options.onMessage(message);
  });
  const scopes=authProvider.getCurrentScopesForUser?.(broadcasterId)??[];
  if(scopes.includes('bits:read'))listener.onChannelCheer(broadcasterId,event=>{if(!stopped)options.onTwist?.({kind:'cheer',bits:event.bits,simulated:options.mock});});
  else console.warn('[eventsub] Cheer disabled: reauthorize /auth/broadcaster with bits:read; chat remains available.');
  if(scopes.includes('channel:read:subscriptions'))listener.onChannelSubscription(broadcasterId,event=>{if(!stopped)options.onTwist?.({kind:'subscribe',simulated:options.mock});});
  else console.warn('[eventsub] Subscriptions disabled: reauthorize /auth/broadcaster with channel:read:subscriptions; chat remains available.');
  listener.onChannelRaidTo(broadcasterId,event=>{if(!stopped)options.onTwist?.({kind:'raid',viewers:event.viewers,simulated:options.mock});});
  listener.start();
  const clips:ClipTransport={
    async getStream(){
      if(options.mock)return null;
      const stream=await apiClient.asUser(broadcasterId,ctx=>ctx.streams.getStreamByUserId(broadcasterId));
      return stream?{startedAt:stream.startDate.getTime()}:null;
    },
    async createClip(){
      if(options.mock)return null;
      if(!scopes.includes('clips:edit'))return null;
      return await apiClient.asUser(broadcasterId,ctx=>ctx.clips.createClip({channel:broadcasterId}));
    },
    async getClip(id){
      if(options.mock)return null;
      const clip=await apiClient.asUser(broadcasterId,ctx=>ctx.clips.getClipById(id));
      return clip?{id:clip.id,url:clip.url}:null;
    },
  };
  return {
    clips,
    stop:()=>{if(stopped)return;stopped=true;listener.stop();options.onStatus?.('disconnected');},
    mockCommands,
    async broadcasterNames():Promise<string[]> {
      if(options.mock)return ['Mock Broadcaster'];
      const user=await apiClient.users.getUserById(broadcasterId);
      return user?[user.name,user.displayName].filter(Boolean):[];
    },
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
