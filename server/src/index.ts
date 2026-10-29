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
import {HardeningTelemetry} from './hardening.js';
import {attachOverlaySockets} from './overlay-sockets.js';
import {createViewerMemory} from '../memory.js';
import {ViewerMemorySession} from './viewer-memory-session.js';
import {createForgeService,forgeCommand} from './forge.js';
import {createOpenAIForgeClient} from './forge-client.js';

const mock=process.argv.includes('--mock')||process.env.TWITCH_MOCK==='1';
const hardening=process.argv.includes('--hardening');
if(hardening&&!mock)throw new Error('--hardening is available only with --mock');
const telemetry=hardening?new HardeningTelemetry():undefined;
if(telemetry){
  process.on('uncaughtExceptionMonitor',()=>{telemetry.unhandledErrors++;});
  process.on('unhandledRejection',error=>{telemetry.unhandledErrors++;throw error instanceof Error?error:new Error('Unhandled server rejection');});
}
let transport='connecting';
if(!mock)await import('dotenv/config');
let twitch:ReturnType<typeof createTwitchSession>|undefined;
const sockets=new WebSocketServer({noServer:true,maxPayload:16*1024});
const sessionId=randomUUID();
const viewerMemory=await createViewerMemory({source:mock?'sim':'live'});
const memorySession=new ViewerMemorySession({store:viewerMemory,sessionId,enqueueNotice:text=>game.queueNotice(text),onChange:()=>broadcast(),onError:()=>console.error('[memory] Viewer memory could not be saved; no acknowledgement was sent.')});
let gameEpoch=0;
let forge:ReturnType<typeof createForgeService>|undefined;
let forgeRun=0,forgeRoundPending=false;
let broadcasterNames:string[]=[],broadcasterNamesReady=false;
const recentNames=new Map<string,string>();
let persisted=Promise.resolve();
const confirmedHighlights=new Map<string,HighlightEntry>();
const replayTimeouts=new Map<string,ReturnType<typeof setTimeout>>();
function entries(){return [...confirmedHighlights.values(),...highlights.snapshot().filter(entry=>!confirmedHighlights.has(entry.highlight.id))];}
function makeHighlights(){return new ServerHighlightCoordinator({transport:{
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
}});}
let highlights=makeHighlights();
function makeGame(){gameEpoch++;return new GameSession({mock,onState:(previous,next)=>{
  forge?.observePhase();
  if(!previous.round.over&&next.round.over)forgeRoundPending=true;
  memorySession.transition(previous,next,`${gameEpoch}:${game.runId}`);
  telemetry?.state(previous,next,game.runId,Date.now());
  const candidates=highlightCandidates(previous,next);
  for(const candidate of candidates.filter((item,index)=>!candidates.slice(0,index).some(other=>other.at===item.at))) {
    const highlight={...candidate,id:`${sessionId}:e${gameEpoch}:m${game.runId}:${candidate.id}`};
    captureInputs.requestReplay({kind:'replay-capture',highlightId:highlight.id,at:highlight.at});
    highlights.enqueue(highlight);
  }
},sendResult:async(text,simulated)=>{
  if(!twitch)throw new Error('Round result transport is not connected');
  if(telemetry)telemetry.resultAttempts++;
  await twitch.sendRoundResult(text,simulated);if(telemetry)telemetry.resultsSent++;
},onError:()=>console.error('[bot] Bot message could not be sent; check the Twitch connection or local mock shim.')});}
let game=makeGame();
// The key is supplied only by the existing live-server .env configuration. Mock
// startup never constructs a network client or reads a key/token file.
forge=createForgeService({client:!mock&&process.env.OPENAI_API_KEY?createOpenAIForgeClient({apiKey:process.env.OPENAI_API_KEY,mode:'live'}):null,
 protectedNames:()=>[...broadcasterNames,...recentNames.values()],
 isBetweenRounds:()=>broadcasterNamesReady&&(!game.started||game.state.round.over),
 onChange:()=>broadcast(),onAccepted:boss=>{if(!game.queueBoss(boss))throw new Error('Round already started');},
 log:metrics=>console.log(`[forge] ${JSON.stringify(metrics)}`),
});
async function runForge(){
 if(closing||!forge||!forge.snapshot().ideas.length||!forge.snapshot().betweenRounds)return;
 const status=forge.snapshot().status;if(['generating','validating','tuning'].includes(status))return;
 const target=game;if(!target.beginForge())return;const run=++forgeRun;
 try{await forge.generate();}finally{if(run===forgeRun&&target===game){target.endForge();broadcast();}}
}
function cancelForge(reset=false){forgeRun++;if(reset)forge?.resetBout();else{forge?.veto();game.cancelQueuedBoss();}game.endForge();}
const projectState=createWireProjection();
function messages(drain=false){
  const visible=game.summaryVisible||!!game.state.match.winner;
  const summary=visible?memorySession.publicSummary(game.summary()):undefined;
  const audit=telemetry?.snapshot(drain);
  return [{...game.tally(),...(audit?{hardening:audit}:{})},{kind:'tick',state:projectState(game.state),simulated:mock,started:game.started,inputsStopped:captureInputs.stopped,modes:game.modes,transport,...(audit?{hardening:audit}:{})},
    {kind:'memory',memory:memorySession.view(summary)},
    {kind:'forge',forge:forge?.snapshot()},
    {kind:'highlights',...(summary?{summary}:{}),entries:entries(),visible}];
}
function broadcast(){
  for(const message of messages(true)) {
    const json=JSON.stringify(message);
    for(const client of sockets.clients)if(client.readyState===WebSocket.OPEN)client.send(json);
  }
}
const captureInputs=new CaptureInputs({onOptions:options=>{game.configure(options);broadcast();},onReplay:result=>{clearTimeout(replayTimeouts.get(result.highlightId));replayTimeouts.delete(result.highlightId);highlights.ackReplay(result.highlightId,result.available);},onInput:(event,at)=>{
  if(event.kind==='control'&&event.action!=='resume')cancelForge();
  game.input(event,at);captureInputs.setStopped(game.frozen||(!game.started&&captureInputs.stopped),at);if(event.kind==='control')broadcast();
},onSession:event=>{
  if(event.action==='start')cancelForge(true);
  game.command(event);if(event.action==='summary')void memorySession.finalize(game.summary()).then(()=>broadcast()).catch(()=>console.error('[memory] Could not finalize viewer memory.'));
  captureInputs.setStopped(game.frozen||(!game.started&&captureInputs.stopped),Date.now());broadcast();
}});
const onMessage=(message:IncomingChat)=>{
  if(message.simulated===mock&&message.displayName){recentNames.delete(message.user);recentNames.set(message.user,message.displayName);while(recentNames.size>100)recentNames.delete(recentNames.keys().next().value!);}
  if(message.simulated===mock&&/^!forge(?:\s|$)/i.test(message.text.trim())){
   if(/^!forge\s*$/i.test(message.text.trim())&&(message.role==='mod'||message.role==='broadcaster'))void runForge();
   else if(forge)void Promise.resolve(forgeCommand(forge,{viewerId:message.user,text:message.text})).catch(()=>{});
  }
  const control=message.simulated===mock?parseChatControl(message.text,message.user,message.role):null;
  if(control&&control.action!=='resume')cancelForge();
  const receivedAt=Date.now();memorySession.beforeChat(message);const vote=game.chat(message);
  memorySession.acceptedVote(message,vote,`${gameEpoch}:${game.runId}:${game.state.round.number}:${game.state.clock.beat}`);
  telemetry?.message(message,game.state,game.runId,receivedAt);captureInputs.setStopped(game.frozen||(!game.started&&captureInputs.stopped),Date.now());
  if(control)broadcast();
};
const onTwist=(event:IncomingTwist)=>{game.twist(event);};
const onStatus=(status:typeof transport)=>{transport=status;if(typeof game!=='undefined')broadcast();};
async function updateViewers(){
  try {const transport=twitch,epoch=gameEpoch;if(transport){const count=await transport.viewers();if(transport===twitch&&epoch===gameEpoch)game.viewers(count);}}
  catch {console.error('[viewers] Could not refresh viewer count; retaining the last value.');}
}
let closing=false;
let rebinding:Promise<void>=Promise.resolve();
const auth=mock?undefined:await createAuth({onReady:(authProvider,accounts)=>{
 const task=rebinding.catch(()=>{}).then(async()=>{
  if(closing)return;
  twitch?.stop();
  if(memorySession.channelId&&memorySession.channelId!==accounts.broadcasterId){
    cancelForge(true);recentNames.clear();broadcasterNames=[];broadcasterNamesReady=false;
    game.input({kind:'control',action:'stop',by:'capture'});highlights.close();await highlights.idle();await memorySession.finalize(game.summary());
    for(const timer of replayTimeouts.values())clearTimeout(timer);replayTimeouts.clear();confirmedHighlights.clear();highlights=makeHighlights();
    game.close();game=makeGame();game.input({kind:'control',action:'stop',by:'capture'});captureInputs.setStopped(true,Date.now());
  }
  memorySession.selectChannel(accounts.broadcasterId);
  if(closing)return;
  twitch=createTwitchSession({mock:false,onMessage,onTwist,onStatus,authProvider,...accounts});
  const source=twitch;try{const names=await source.broadcasterNames();if(source===twitch&&names.length){broadcasterNames=names;broadcasterNamesReady=true;}}catch{console.error('[forge] Broadcaster names unavailable; generation remains disabled.');}
  await updateViewers();
 });rebinding=task;return task;
}});
const server=createServer(async(req,res)=>{
  try {
    if(auth&&await auth.handle(req,res))return;
    if(req.url?.startsWith('/__hardening/')){
      if(!telemetry){res.writeHead(404);res.end();return;}
      if(req.url==='/__hardening/gc'&&req.method==='POST'){global.gc?.();}
      else if(req.url==='/__hardening/start'&&req.method==='POST'){
        let body='';for await(const chunk of req){body+=String(chunk);if(body.length>1024)throw new Error('Hardening request too large');}
        const options=body?JSON.parse(body):{};game.command({kind:'session',action:'start'});
        if(Number.isSafeInteger(options.viewers)&&options.viewers>=0)game.viewers(options.viewers);
      }
      else if(req.url!=='/__hardening/status'){res.writeHead(404);res.end();return;}
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({...telemetry.status(),game:{runId:game.runId,round:game.state.round.number,beat:game.state.clock.beat,started:game.started,paused:game.frozen,matchWinner:game.state.match.winner,roundWins:game.state.match.round_wins,roundOver:game.state.round.over,streamerHp:game.state.streamer.hp,bossHp:game.state.boss.hp,roundResults:game.state.log.rounds},archive:game.archival,transport,gcAvailable:typeof global.gc==='function'}));return;
    }
    if(req.url==='/health') {
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,mode:mock?'mock':'live',started:game.started}));return;
    }
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    res.end(`<h1>Streamer vs Chat</h1><p>${mock?'SIMULATED chat. POST to localhost:8081/inject.':'<a href="/auth/bot">Connect bot</a> · <a href="/auth/broadcaster">Connect broadcaster</a>'}</p><p><a href="http://localhost:5173/overlay">OBS overlay</a> · <a href="http://localhost:5173/capture">Capture / start match</a></p>`);
  } catch {
    console.error('[server] Request failed.');if(!res.headersSent)res.writeHead(500,{'Content-Type':'text/plain'});res.end('Request failed; check server log.');
  }
});
attachOverlaySockets(server,sockets,()=>messages(),client=>captureInputs.attach(client));
// Routine chat, pose and optional-event views share this 10 Hz clock. Safety controls,
// session commands, options and highlight status changes flush immediately.
let nextBroadcast=Date.now();
const ticks=setInterval(()=>{const now=Date.now();captureInputs.expire(now);game.advance();if(forgeRoundPending){forgeRoundPending=false;void runForge();}captureInputs.setStopped(game.frozen||(!game.started&&captureInputs.stopped),now);if(now>=nextBroadcast){nextBroadcast=now+100;broadcast();}},20);
const viewers=setInterval(()=>void updateViewers(),60000);
server.listen(3000,'127.0.0.1',()=>{
  console.log(`[server] http://localhost:3000 · ${mock?'SIMULATED':'live auth'} · Open /capture and press START MATCH when ready.`);
  if(mock){twitch=createTwitchSession({mock:true,onMessage,onTwist,onStatus,logChat:!hardening});void updateViewers();}
});
async function close(){
  cancelForge();
  if(closing)return;closing=true;clearInterval(ticks);clearInterval(viewers);await rebinding.catch(()=>{});twitch?.stop();
  try{await memorySession.finalize(game.summary());await viewerMemory.flush();}catch{console.error('[memory] Could not save viewer memory on shutdown.');}
  game.close();for(const timer of replayTimeouts.values())clearTimeout(timer);highlights.close();await persisted;await auth?.close();
  for(const client of sockets.clients)client.terminate();sockets.close();server.close();
}
process.on('SIGINT',()=>void close());process.on('SIGTERM',()=>void close());
