import { createServer } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';
import { expect, it } from 'vitest';
import { CaptureInputs } from './inputs';

it('rejects oversized capture frames without crashing and releases capture ownership',async()=>{
  const channel=new CaptureInputs();
  const http=createServer();
  const ws=new WebSocketServer({server:http,maxPayload:1024});
  ws.on('connection',client=>channel.attach(client));
  http.listen(0,'127.0.0.1');await once(http,'listening');
  const url=`ws://127.0.0.1:${(http.address() as AddressInfo).port}`;
  const first=new WebSocket(url);
  let second:WebSocket|undefined;
  try {
    await once(first,'open');
    let message=once(first,'message');
    first.send(JSON.stringify({kind:'pose',guard:true,lean:'L',at:1,source:'keyboard'}));
    expect(JSON.parse(String((await message)[0]))).toMatchObject({state:{guard:true,lean:'L'},captureAt:1});
    const closed=once(first,'close');first.send('x'.repeat(2048));await closed;
    second=new WebSocket(url);await once(second,'open');
    message=once(second,'message');
    second.send(JSON.stringify({kind:'pose',guard:false,lean:null,at:2,source:'pose'}));
    expect(JSON.parse(String((await message)[0]))).toMatchObject({kind:'input-status',state:{guard:false,lean:null},captureAt:2});
  } finally {
    first.terminate();second?.terminate();
    for(const client of ws.clients)client.terminate();
    await new Promise<void>(resolve=>ws.close(()=>resolve()));
    await new Promise<void>(resolve=>http.close(()=>resolve()));
  }
});
