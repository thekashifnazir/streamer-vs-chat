import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { once } from 'node:events';
import { WebSocket, WebSocketServer } from 'ws';
import { expect, test } from 'vitest';
import { createMockShim } from './mock-shim.js';

test('shim injects chat using the registered subscription and preserves upstream notifications', async () => {
  const upstream = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: [], total: 0 }));
  });
  const upstreamWs = new WebSocketServer({ server: upstream });
  upstreamWs.on('connection', (socket) => socket.send(JSON.stringify({ metadata: { message_type: 'session_welcome' }, payload: { session: { id: 'test-session' } } })));
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const shim = createMockShim((upstream.address() as AddressInfo).port);
  shim.server.listen(0, '127.0.0.1');
  await once(shim.server, 'listening');
  const base = `http://127.0.0.1:${(shim.server.address() as AddressInfo).port}`;
  const client = new WebSocket(base.replace('http:', 'ws:') + '/ws');
  try {
    const [welcome] = await once(client, 'message');
    expect(JSON.parse(welcome.toString()).payload.session.id).toBe('test-session');
    const subscriptionResponse = await fetch(`${base}/mock/eventsub/subscriptions`, { method: 'POST', body: JSON.stringify({
      type: 'channel.chat.message', version: '1', condition: { broadcaster_user_id: '9002', user_id: '9001' },
      transport: { method: 'websocket', session_id: 'test-session' },
    }) });
    expect(subscriptionResponse.status).toBe(202);
    const { data: [subscription] } = await subscriptionResponse.json();
    const notification = once(client, 'message');
    const injected = await fetch(`${base}/inject`, { method: 'POST', body: JSON.stringify({ message: '!jab', user: 'viewer-A' }) });
    expect(await injected.json()).toEqual({ simulated: true, delivered: 1 });
    const [frame] = await notification;
    const envelope = JSON.parse(frame.toString());
    expect(envelope.metadata.message_type).toBe('notification');
    expect(envelope.payload.subscription.id).toBe(subscription.id);
    expect(envelope.payload.event.message.text).toBe('!jab');
    expect(envelope.payload.event.chatter_user_id).toBe('viewer-A');
    const forwarded = once(client, 'message');
    for (const socket of upstreamWs.clients) socket.send('{"upstream":"unchanged"}');
    expect((await forwarded)[0].toString()).toBe('{"upstream":"unchanged"}');
    const deleted = await fetch(`${base}/eventsub/subscriptions?id=${subscription.id}`, { method: 'DELETE' });
    expect(deleted.status).toBe(204);
    expect((await fetch(`${base}/inject`, { method: 'POST', body: '{}' })).status).toBe(409);
  } finally {
    client.terminate();
    await shim.close();
    for (const socket of upstreamWs.clients) socket.terminate();
    await new Promise<void>((resolve) => upstreamWs.close(() => resolve()));
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
  }
});
