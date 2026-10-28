import type {Server} from 'node:http';
import {WebSocketServer,type WebSocket} from 'ws';
/** Immediate authoritative snapshot on every connection, including an overlay reload. */
export function attachOverlaySockets(server:Server,sockets:WebSocketServer,snapshots:()=>unknown[],attach:(socket:WebSocket)=>void){
 server.on('upgrade',(req,socket,head)=>{
  if(req.url!=='/ws'){socket.destroy();return;}
  const origin=req.headers.origin;
  if(origin&&!['http://localhost:5173','http://127.0.0.1:5173','http://localhost:3000','http://127.0.0.1:3000'].includes(origin)){socket.destroy();return;}
  sockets.handleUpgrade(req,socket,head,client=>{for(const message of snapshots())client.send(JSON.stringify(message));attach(client);});
 });
}
