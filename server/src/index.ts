import 'dotenv/config';
import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { parseChatVote } from '@svc/shared';
import { VoteTally } from './tally.js';
import { createAuth } from './auth.js';
import { createTwitchSession } from './twitch.js';

const mock = process.argv.includes('--mock') || process.env.TWITCH_MOCK === '1';
const tally = new VoteTally(mock);
let twitch: ReturnType<typeof createTwitchSession> | undefined;
const sockets = new WebSocketServer({ noServer: true });
function broadcast() {
  const message = JSON.stringify(tally.snapshot());
  for (const client of sockets.clients) if (client.readyState === WebSocket.OPEN) client.send(message);
}
const onMessage = ({user,text,simulated}: {user:string;text:string;simulated:boolean}) => {
  const vote = parseChatVote(text,user,Date.now(),simulated);
  if (vote) { tally.accept(vote); broadcast(); }
};
const auth = mock ? undefined : await createAuth({onReady: async (authProvider, accounts) => {
  twitch?.stop();
  twitch = createTwitchSession({mock:false,onMessage,authProvider,...accounts});
}});
const server = createServer(async (req,res) => {
  try {
    if (auth && await auth.handle(req,res)) return;
    if (req.url === '/health') {
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ok:true,mode:mock?'mock':'live'}));
      return;
    }
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
    res.end(`<h1>Streamer vs Chat · Day 1</h1><p>${mock ? 'SIMULATED chat. POST to localhost:8081/inject.' : '<a href="/auth/bot">Connect bot</a> · <a href="/auth/broadcaster">Connect broadcaster</a>'}</p><p><a href="http://localhost:5173/overlay/">Open overlay</a> · <a href="http://localhost:5173/capture/">Open capture</a></p>`);
  } catch(error) {
    console.error('[server] Request failed:', error instanceof Error ? error.message : 'Unknown error');
    if(!res.headersSent) res.writeHead(500, {'Content-Type':'text/plain'});
    res.end('Request failed; check server log.');
  }
});
server.on('upgrade', (req,socket,head) => {
  if (req.url !== '/ws') {socket.destroy();return;}
  // Only local capture/overlay origins; OBS may omit Origin.
  const origin = req.headers.origin;
  if (origin && !['http://localhost:5173','http://127.0.0.1:5173','http://localhost:3000','http://127.0.0.1:3000'].includes(origin)) {socket.destroy();return;}
  sockets.handleUpgrade(req,socket,head,client => {
    client.send(JSON.stringify(tally.snapshot()));
    // Day 1 consumes no client state: the server owns every tally.
  });
});
server.listen(3000,'127.0.0.1',() => {
  console.log(`[server] http://localhost:3000 · ${mock ? 'SIMULATED' : 'live auth'} · overlay http://localhost:5173/overlay/`);
  if(mock) twitch = createTwitchSession({mock:true,onMessage});
});
let closing = false;
async function close() {
  if(closing) return; closing = true;
  twitch?.stop(); await auth?.close();
  for(const socket of sockets.clients) socket.terminate();
  sockets.close(); server.close();
}
process.on('SIGINT',()=>void close()); process.on('SIGTERM',()=>void close());
