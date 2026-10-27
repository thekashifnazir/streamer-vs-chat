import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import type { AddressInfo } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';

type Subscription = {
  id: string; status: string; type: string; version: string; cost: number;
  condition: { broadcaster_user_id: string; user_id: string };
  transport: { method: 'websocket'; session_id: string }; created_at: string;
};

async function bodyOf(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 64 * 1024) throw new Error('Request body exceeds 64 KiB');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function json(response: ServerResponse, status: number, data: unknown) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(data));
}

/** Local-only EventSub bridge. No Twitch credentials or live endpoints are used. */
export function createMockShim(upstreamPort = 8080) {
  const sessions = new Map<string, WebSocket>();
  const subscriptions = new Map<string, Subscription>();
  const results:{text:string;simulated:true;at:number}[]=[];
  const sockets = new WebSocketServer({ noServer: true });
  const upstreamSockets = new Set<WebSocket>();

  const server = createServer((request, response) => {
    void handle(request, response).catch((error: unknown) => {
      if (!response.headersSent) json(response, 400, { error: String(error) });
      else response.destroy();
    });
  });

  async function handle(request: IncomingMessage, response: ServerResponse) {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    // Twurple's CLI mock API prepends /mock; the CLI websocket server does not.
    const pathname = url.pathname.replace(/^\/mock(?=\/)/, '');
    if (pathname === '/health') {
      json(response, 200, { simulated: true, sessions: sessions.size, subscriptions: [...subscriptions.values()] });
      return;
    }
    if(pathname==='/results') {
      if(request.method==='GET'){json(response,200,{simulated:true,results});return;}
      if(request.method==='POST') {
        const input=JSON.parse(await bodyOf(request)) as Record<string,unknown>;
        if(input.simulated!==true||typeof input.text!=='string'||input.text.length>500){json(response,400,{error:'Only simulated round results up to500 characters are accepted'});return;}
        results.push({text:input.text,simulated:true,at:Date.now()});if(results.length>100)results.shift();
        console.log(`[bot SIMULATED] ${input.text}`);json(response,200,{simulated:true,accepted:true});return;
      }
      json(response,405,{error:'Use GET or POST'});return;
    }
    if (pathname === '/inject' && request.method === 'POST') {
      const input = JSON.parse((await bodyOf(request)) || '{}') as Record<string, unknown>;
      const text = input.text ?? input.message ?? '!jab';
      const user = input.user ?? (input.role==='broadcaster'?'9002':'simulated-viewer');
      const role=input.role??'viewer';
      if(!['viewer','mod','broadcaster'].includes(String(role))){json(response,400,{error:'role must be viewer, mod or broadcaster'});return;}
      if (typeof text !== 'string' || typeof user !== 'string' || !user || text.length > 500) {
        json(response, 400, { error: 'Use {"text":"!jab","user":"viewer-id"}' });
        return;
      }
      let delivered = 0;
      for (const subscription of subscriptions.values()) {
        if (input.session && input.session !== subscription.transport.session_id) continue;
        const socket = sessions.get(subscription.transport.session_id);
        if (!socket || socket.readyState !== WebSocket.OPEN) continue;
        socket.send(JSON.stringify({
          metadata: {
            message_id: randomUUID(), message_type: 'notification', message_timestamp: new Date().toISOString(),
            subscription_type: subscription.type, subscription_version: subscription.version,
          },
          payload: {
            subscription,
            event: {
              broadcaster_user_id: subscription.condition.broadcaster_user_id,
              broadcaster_user_login: 'simulated_broadcaster', broadcaster_user_name: 'Simulated Broadcaster',
              chatter_user_id: user, chatter_user_login: user, chatter_user_name: user,
              message_id: randomUUID(), message: { text, fragments: [{ type: 'text', text, cheermote: null, emote: null, mention: null }] },
              color: '#FFC857', badges: role==='mod'?[{set_id:'moderator',id:'1',info:''}]:role==='broadcaster'?[{set_id:'broadcaster',id:'1',info:''}]:[], message_type: 'text', cheer: null, reply: null, channel_points_custom_reward_id: null,
            },
          },
        }));
        delivered++;
      }
      json(response, delivered ? 200 : 409, { simulated: true, delivered, ...(delivered ? {} : { error: 'No chat subscription is ready. Start dev:mock and wait for the subscription log.' }) });
      return;
    }
    const body = await bodyOf(request);
    if (pathname === '/eventsub/subscriptions') {
      if (request.method === 'POST') {
        const input = JSON.parse(body) as Partial<Subscription>;
        if (input.type === 'channel.chat.message') {
          if (input.version !== '1' || input.transport?.method !== 'websocket' || !sessions.has(input.transport.session_id) || !input.condition?.broadcaster_user_id || !input.condition.user_id) {
            json(response, 400, { error: 'Bad Request', status: 400, message: 'Chat subscription needs version 1, an active session, broadcaster_user_id and user_id' });
            return;
          }
          if ([...subscriptions.values()].some((sub) => sub.transport.session_id === input.transport!.session_id && sub.condition.user_id === input.condition!.user_id)) {
            json(response, 409, { error: 'Conflict', status: 409, message: 'Chat subscription already exists' });
            return;
          }
          const subscription: Subscription = {
            id: randomUUID(), status: 'enabled', type: input.type, version: '1', cost: 0,
            condition: input.condition, transport: input.transport, created_at: new Date().toISOString(),
          };
          subscriptions.set(subscription.id, subscription);
          console.log(`[mock shim] SIMULATED chat subscription ${subscription.id} session ${subscription.transport.session_id}`);
          json(response, 202, { data: [subscription], total: subscriptions.size, total_cost: 0, max_total_cost: 10 });
          return;
        }
      }
      if (request.method === 'DELETE' && subscriptions.delete(url.searchParams.get('id') ?? '')) {
        response.writeHead(204).end();
        return;
      }
    }
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === 'string' && !['host', 'connection', 'content-length'].includes(key)) headers[key] = value;
    }
    const upstream = await fetch(`http://127.0.0.1:${upstreamPort}${pathname}${url.search}`, {
      method: request.method, headers, ...(body ? { body } : {}), signal: AbortSignal.timeout(5000),
    });
    if (pathname === '/eventsub/subscriptions' && request.method === 'GET' && upstream.ok) {
      const data = await upstream.json() as { data: Subscription[]; total: number };
      const extra = [...subscriptions.values()].filter((sub) => !url.searchParams.has('type') || url.searchParams.get('type') === sub.type);
      data.data.push(...extra);
      data.total += extra.length;
      json(response, upstream.status, data);
      return;
    }
    response.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/json' });
    response.end(Buffer.from(await upstream.arrayBuffer()));
  }

  server.on('upgrade', (request, socket, head) => {
    if (new URL(request.url ?? '/', 'http://127.0.0.1').pathname !== '/ws') { socket.destroy(); return; }
    sockets.handleUpgrade(request, socket, head, (downstream) => {
      const target=new URL(request.url??'/ws','http://127.0.0.1');
      const resumeFrom=target.searchParams.get('shim_resume');target.searchParams.delete('shim_resume');
      const upstream = new WebSocket(`ws://127.0.0.1:${upstreamPort}${target.pathname}${target.search}`);
      upstreamSockets.add(upstream);
      let sessionId: string | undefined;
      let reconnecting=false;
      upstream.on('message', (data, isBinary) => {
        try {
          const envelope = JSON.parse(data.toString());
          if (envelope.metadata?.message_type === 'session_welcome') {
            sessionId = envelope.payload.session.id as string;
            sessions.set(sessionId, downstream);
            if(resumeFrom)for(const sub of subscriptions.values())if(sub.transport.session_id===resumeFrom)sub.transport.session_id=sessionId;
          }
          if(envelope.metadata?.message_type==='session_reconnect'&&sessionId) {
            reconnecting=true;
            const next=new URL(envelope.payload.session.reconnect_url);
            const resumed=new URL(`ws://127.0.0.1:${(server.address() as AddressInfo).port}/ws${next.search}`);
            resumed.searchParams.set('shim_resume',sessionId);
            envelope.payload.session.reconnect_url=resumed.toString();
            if(downstream.readyState===WebSocket.OPEN)downstream.send(JSON.stringify(envelope));
            return;
          }
        } catch { /* Forward upstream frames unchanged. */ }
        if (downstream.readyState === WebSocket.OPEN) downstream.send(data, { binary: isBinary });
      });
      downstream.on('message', (data, isBinary) => {
        if (upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary: isBinary });
      });
      const cleanup = () => {
        upstreamSockets.delete(upstream);
        if (sessionId) {
          if(sessions.get(sessionId)===downstream)sessions.delete(sessionId);
          if(!reconnecting)for(const [id,sub]of subscriptions)if(sub.transport.session_id===sessionId)subscriptions.delete(id);
        }
      };
      upstream.on('error', () => downstream.close(1011, 'CLI mock unavailable'));
      upstream.on('close', (code, reason) => {
        cleanup();
        // Reserved close codes describe local observations and cannot go on the wire.
        downstream.close([1005, 1006, 1015].includes(code) ? 1011 : code, reason);
      });
      downstream.on('error', () => upstream.terminate());
      downstream.on('close', () => { cleanup(); upstream.close(); });
    });
  });
  return {
    server,
    async close() {
      for (const socket of upstreamSockets) socket.terminate();
      for (const socket of sockets.clients) socket.terminate();
      await new Promise<void>((resolve) => sockets.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const shim = createMockShim();
  shim.server.listen(8081, '127.0.0.1', () => console.log('[mock shim] SIMULATED EventSub ws://127.0.0.1:8081/ws · POST /inject'));
  shim.server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void shim.close(); });
}
