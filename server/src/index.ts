import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { CaptureInputs } from './inputs.js';
import { createAuth } from './auth.js';
import { createTwitchSession, type IncomingChat, type IncomingTwist } from './twitch.js';
import { GameSession } from './game-session.js';

const mock=process.argv.includes('--mock')||process.env.TWITCH_MOCK==='1';
if(!mock)await import('dotenv/config');
let twitch:ReturnType<typeof createTwitchSession>|undefined;
const sockets=new WebSocketServer({noServer:true,maxPayload:16*1024});
const game=new GameSession({mock,sendResult:async(text,simulated)=>{
  if(!twitch)throw new Error('Round result transport is not connected');
  await twitch.sendRoundResult(text,simulated);
},onError:()=>console.error('[bot] Round result could not be sent; check the Twitch connection or local mock shim.')});
function messages(){return [game.tally(),{kind:'tick',state:game.state,simulated:mock,started:game.started}];}
function broadcast(){
  for(const message of messages()) {
    const json=JSON.stringify(message);
    for(const client of sockets.clients)if(client.readyState===WebSocket.OPEN)client.send(json);
  }
}
const captureInputs=new CaptureInputs({onInput:(event,at)=>{
  game.input(event,at);captureInputs.setStopped(game.frozen,at);broadcast();
},onSession:event=>{
  game.command(event);captureInputs.setStopped(game.frozen,Date.now());broadcast();
}});
const onMessage=(message:IncomingChat)=>{
  game.chat(message);captureInputs.setStopped(game.frozen,Date.now());broadcast();
};
const onTwist=(event:IncomingTwist)=>{game.twist(event);broadcast();};
async function updateViewers(){
  try {if(twitch)game.viewers(await twitch.viewers());}
  catch {console.error('[viewers] Could not refresh viewer count; retaining the last value.');}
}
const auth=mock?undefined:await createAuth({onReady:async(authProvider,accounts)=>{
  twitch?.stop();twitch=createTwitchSession({mock:false,onMessage,onTwist,authProvider,...accounts});await updateViewers();
}});
const server=createServer(async(req,res)=>{
  try {
    if(auth&&await auth.handle(req,res))return;
    if(req.url==='/health') {
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,mode:mock?'mock':'live',started:game.started}));return;
    }
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    res.end(`<h1>Streamer vs Chat</h1><p>${mock?'SIMULATED chat. POST to localhost:8081/inject.':'<a href="/auth/bot">Connect bot</a> · <a href="/auth/broadcaster">Connect broadcaster</a>'}</p><p><a href="http://localhost:5173/overlay">OBS overlay</a> · <a href="http://localhost:5173/capture">Capture / start match</a></p>`);
  } catch {
    console.error('[server] Request failed.');if(!res.headersSent)res.writeHead(500,{'Content-Type':'text/plain'});res.end('Request failed; check server log.');
  }
});
server.on('upgrade',(req,socket,head)=>{
  if(req.url!=='/ws'){socket.destroy();return;}
  const origin=req.headers.origin;
  if(origin&&!['http://localhost:5173','http://127.0.0.1:5173','http://localhost:3000','http://127.0.0.1:3000'].includes(origin)){socket.destroy();return;}
  sockets.handleUpgrade(req,socket,head,client=>{
    for(const message of messages())client.send(JSON.stringify(message));
    captureInputs.attach(client);
  });
});
const ticks=setInterval(()=>{captureInputs.expire(Date.now());game.advance();captureInputs.setStopped(game.frozen,Date.now());broadcast();},100);
const viewers=setInterval(()=>void updateViewers(),60000);
server.listen(3000,'127.0.0.1',()=>{
  console.log(`[server] http://localhost:3000 · ${mock?'SIMULATED':'live auth'} · Open /capture and press START MATCH when ready.`);
  if(mock){twitch=createTwitchSession({mock:true,onMessage,onTwist});void updateViewers();}
});
let closing=false;
async function close(){
  if(closing)return;closing=true;clearInterval(ticks);clearInterval(viewers);game.close();twitch?.stop();await auth?.close();
  for(const client of sockets.clients)client.terminate();sockets.close();server.close();
}
process.on('SIGINT',()=>void close());process.on('SIGTERM',()=>void close());
