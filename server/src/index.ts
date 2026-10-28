import { randomUUID } from 'node:crypto';
import { writeFile,rename } from 'node:fs/promises';
import { highlightCandidates } from '../../shared/src/highlights.js';
import { ServerHighlightCoordinator, type HighlightEntry } from './clips.js';
import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { CaptureInputs } from './inputs.js';
import { createAuth } from './auth.js';
import { createTwitchSession, type IncomingChat, type IncomingTwist } from './twitch.js';
import { GameSession } from './game-session.js';
import { createWireProjection } from './wire-state.js';
import { parseChatControl } from './chat-controls.js';

const mock=process.argv.includes('--mock')||process.env.TWITCH_MOCK==='1';
if(!mock)await import('dotenv/config');
let twitch:ReturnType<typeof createTwitchSession>|undefined;
const sockets=new WebSocketServer({noServer:true,maxPayload:16*1024});
const sessionId=randomUUID();
let persisted=Promise.resolve();
const confirmedHighlights=new Map<string,HighlightEntry>();
const replayTimeouts=new Map<string,ReturnType<typeof setTimeout>>();
function entries(){return [...confirmedHighlights.values(),...highlights.snapshot().filter(entry=>!confirmedHighlights.has(entry.highlight.id))];}
const highlights=new ServerHighlightCoordinator({transport:{
  getStream:async()=>twitch?.clips.getStream()??null,
  createClip:async()=>twitch?.clips.createClip()??null,
  getClip:async id=>twitch?.clips.getClip(id)??null,
},onReplayRequest:request=>{
  if(!captureInputs.requestReplay({kind:'replay-request',...request}))highlights.ackReplay(request.highlightId,false);
  else replayTimeouts.set(request.highlightId,setTimeout(()=>{replayTimeouts.delete(request.highlightId);highlights.ackReplay(request.highlightId,false);},5000));
},onChange:()=>{
  let changed=false;
  for(const entry of highlights.snapshot())if(entry.status==='confirmed'&&!confirmedHighlights.has(entry.highlight.id)){confirmedHighlights.set(entry.highlight.id,entry);changed=true;}
  broadcast();if(!changed)return;
  const confirmed=[...confirmedHighlights.values()];
  const contents=JSON.stringify({sessionId,clips:confirmed},null,2);
  persisted=persisted.catch(()=>{}).then(async()=>{await writeFile('highlights.json.tmp',contents,{mode:0o600});await rename('highlights.json.tmp','highlights.json');}).catch(()=>console.error('[highlights] Could not save confirmed clip metadata.'));
}});
const game=new GameSession({mock,onState:(previous,next)=>{
  const candidates=highlightCandidates(previous,next);
  for(const candidate of candidates.filter((item,index)=>!candidates.slice(0,index).some(other=>other.at===item.at))) {
    const highlight={...candidate,id:`${sessionId}:m${game.runId}:${candidate.id}`};
    captureInputs.requestReplay({kind:'replay-capture',highlightId:highlight.id,at:highlight.at});
    highlights.enqueue(highlight);
  }
},sendResult:async(text,simulated)=>{
  if(!twitch)throw new Error('Round result transport is not connected');
  await twitch.sendRoundResult(text,simulated);
},onError:()=>console.error('[bot] Round result could not be sent; check the Twitch connection or local mock shim.')});
const projectState=createWireProjection();
function messages(){
  const visible=game.summaryVisible||!!game.state.match.winner;
  return [game.tally(),{kind:'tick',state:projectState(game.state),simulated:mock,started:game.started,modes:game.modes},
    {kind:'highlights',...(visible?{summary:game.summary()}:{}),entries:entries(),visible}];
}
function broadcast(){
  for(const message of messages()) {
    const json=JSON.stringify(message);
    for(const client of sockets.clients)if(client.readyState===WebSocket.OPEN)client.send(json);
  }
}
const captureInputs=new CaptureInputs({onOptions:options=>{game.configure(options);broadcast();},onReplay:result=>{clearTimeout(replayTimeouts.get(result.highlightId));replayTimeouts.delete(result.highlightId);highlights.ackReplay(result.highlightId,result.available);},onInput:(event,at)=>{
  game.input(event,at);captureInputs.setStopped(game.frozen,at);if(event.kind==='control')broadcast();
},onSession:event=>{
  game.command(event);captureInputs.setStopped(game.frozen,Date.now());broadcast();
}});
const onMessage=(message:IncomingChat)=>{
  game.chat(message);captureInputs.setStopped(game.frozen,Date.now());
  if(message.simulated===mock&&parseChatControl(message.text,message.user,message.role))broadcast();
};
const onTwist=(event:IncomingTwist)=>{game.twist(event);};
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
// Routine chat, pose and optional-event views share this 10 Hz clock. Safety controls,
// session commands, options and highlight status changes flush immediately.
const ticks=setInterval(()=>{captureInputs.expire(Date.now());game.advance();captureInputs.setStopped(game.frozen,Date.now());broadcast();},100);
const viewers=setInterval(()=>void updateViewers(),60000);
server.listen(3000,'127.0.0.1',()=>{
  console.log(`[server] http://localhost:3000 · ${mock?'SIMULATED':'live auth'} · Open /capture and press START MATCH when ready.`);
  if(mock){twitch=createTwitchSession({mock:true,onMessage,onTwist});void updateViewers();}
});
let closing=false;
async function close(){
  if(closing)return;closing=true;clearInterval(ticks);clearInterval(viewers);game.close();for(const timer of replayTimeouts.values())clearTimeout(timer);highlights.close();await persisted;twitch?.stop();await auth?.close();
  for(const client of sockets.clients)client.terminate();sockets.close();server.close();
}
process.on('SIGINT',()=>void close());process.on('SIGTERM',()=>void close());
