import { createServer } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';
import { expect, it,vi } from 'vitest';
import { CaptureInputs } from './inputs';

it('rejects oversized capture frames without crashing and releases capture ownership',async()=>{
  const started=vi.fn();const channel=new CaptureInputs({onSession:started});
  const http=createServer();
  const ws=new WebSocketServer({server:http,maxPayload:1024});
  ws.on('connection',client=>channel.attach(client));
  http.listen(0,'127.0.0.1');await once(http,'listening');
  const url=`ws://127.0.0.1:${(http.address() as AddressInfo).port}`;
  const first=new WebSocket(url);
  let second:WebSocket|undefined;
  try {
    await once(first,'open');
    let message=once(first,'message');first.send(JSON.stringify({kind:'session',action:'start'}));
    expect(JSON.parse(String((await message)[0]))).toMatchObject({kind:'input-error',message:expect.stringContaining('INPUTS LOCKED')});expect(started).not.toHaveBeenCalled();
    message=once(first,'message');first.send(JSON.stringify({kind:'control',action:'resume',by:'capture'}));expect(JSON.parse(String((await message)[0])).stopped).toBe(false);
    message=once(first,'message');
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

it('clears game defence after a stopped capture disconnects and a moderator resumes',async()=>{
  const {GameSession}=await import('./game-session');
  const game=new GameSession({mock:true,sendResult:async()=>{}});
  let channel:CaptureInputs;
  channel=new CaptureInputs({onInput:(event,at)=>game.input(event,at),onSession:event=>game.command(event)});
  const http=createServer();const ws=new WebSocketServer({server:http});
  let serverClosed:Promise<unknown[]>;
  ws.on('connection',client=>{channel.attach(client);serverClosed=once(client,'close');});
  http.listen(0,'127.0.0.1');await once(http,'listening');
  const client=new WebSocket(`ws://127.0.0.1:${(http.address() as AddressInfo).port}`);
  try {
    await once(client,'open');
    const resumed=once(client,'message');client.send(JSON.stringify({kind:'control',action:'resume',by:'capture'}));await resumed;
    client.send(JSON.stringify({kind:'session',action:'start'}));
    let message=once(client,'message');
    client.send(JSON.stringify({kind:'pose',guard:true,lean:'R',at:1,source:'keyboard'}));await message;
    expect(game.state.input.guard).toBe(true);
    game.chat({user:'mod',role:'mod',text:'!pause',simulated:true});
    channel.setStopped(game.frozen,Date.now());
    client.close();await serverClosed!;
    game.chat({user:'mod',role:'mod',text:'!resume',simulated:true});
    expect(game.state.input).toMatchObject({guard:false,lean:null});
  } finally {
    game.close();client.terminate();for(const peer of ws.clients)peer.terminate();
    await new Promise<void>(resolve=>ws.close(()=>resolve()));
    await new Promise<void>(resolve=>http.close(()=>resolve()));
  }
});
