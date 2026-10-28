import{createServer}from'node:http';
import{once}from'node:events';
import{WebSocketServer,WebSocket}from'ws';
import{expect,it}from'vitest';
import{createGame,step}from'../../shared/src/engine';
import{attachOverlaySockets}from'./overlay-sockets';
it('overlay reload receives the current authoritative state within1s over real localhost WebSockets',async()=>{
 const server=createServer(),sockets=new WebSocketServer({noServer:true});let state=createGame({moves:['JAB']});
 attachOverlaySockets(server,sockets,()=>[{kind:'tick',state,transport:'reconnecting'}],()=>{});server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address() as {port:number};
 const connect=async()=>{const started=performance.now(),client=new WebSocket(`ws://127.0.0.1:${address.port}/ws`);const message=once(client,'message');const [data]=await Promise.race([message,new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(new Error('snapshot not received in1s')),1000);message.finally(()=>clearTimeout(timer));})]);return{client,state:JSON.parse(String(data)),elapsed:performance.now()-started};};
 try{const first=await connect();expect(first.elapsed).toBeLessThan(1000);expect(first.state.state.streamer.hp).toBe(100);first.client.terminate();state=step(state,{kind:'advance'},3200);state=step(state,{kind:'vote',user:'reload-viewer',move:'HOOK_L',at:3300,simulated:true},3300);const second=await connect();expect(second.elapsed).toBeLessThan(1000);expect(second.state.state.streamer.hp).toBe(92);expect(second.state.state.log.resolved[0].at).toBe(3200);expect(second.state.state.round).toEqual(state.round);expect(second.state.state.clock).toEqual(state.clock);expect(second.state.state.now).toBe(state.now);expect(second.state.state.boss.hp).toBe(state.boss.hp);expect(second.state.state.votes).toEqual({'reload-viewer':'HOOK_L'});expect(second.state.state.tally).toEqual(state.tally);expect(second.state.state.voters).toBe(1);expect(second.state.transport).toBe('reconnecting');second.client.terminate();}
 finally{for(const client of sockets.clients)client.terminate();await new Promise<void>(resolve=>sockets.close(()=>resolve()));await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
