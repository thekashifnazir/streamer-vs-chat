import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { connect } from 'node:net';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { mkdtemp,writeFile,rm,stat } from 'node:fs/promises';
import { homedir,tmpdir } from 'node:os';
import { join,relative } from 'node:path';
import { createMockShim } from './mock-shim.js';
import { createTwitchSession, type IncomingTwist, type IncomingChat } from '../server/src/twitch.js';
import { GameSession } from '../server/src/game-session.js';

const execute=promisify(execFile);
const abort=new AbortController();
async function portOpen(port:number) {
  return await new Promise<boolean>(resolve=>{
    const socket=connect({host:'127.0.0.1',port});socket.setTimeout(200);
    socket.once('connect',()=>{socket.destroy();resolve(true);});
    socket.once('error',()=>{socket.destroy();resolve(false);});
    socket.once('timeout',()=>{socket.destroy();resolve(false);});
  });
}
async function waitFor<T>(description:string,read:()=>Promise<T>|T,ready:(value:T)=>boolean) {
  const deadline=Date.now()+15000;
  while(Date.now()<deadline) {
    abort.signal.throwIfAborted();
    const value=await read();if(ready(value))return value;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  throw new Error(`Timed out waiting for ${description}`);
}

// Opt-in integration command: real Twitch CLI, local mock only. No auth controller,
// dotenv import, server token file, OAuth request, or live Twitch API is involved.
for(const port of [8080,8081,44747])if(await portOpen(port))throw new Error(`Port ${port} is in use; stop dev:mock or another Twitch CLI mock before running test:mock-events.`);
const temporary=await mkdtemp(join(tmpdir(),'svc-twitch-events-'));
const legacy=join(homedir(),'.twitch-cli');
const hasLegacy=await stat(legacy).then(()=>true,()=>false);
const appDirectory=hasLegacy?legacy:join(process.platform==='darwin'?join(homedir(),'Library/Application Support'):process.platform==='win32'?process.env.APPDATA??join(homedir(),'AppData/Roaming'):process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'twitch-cli');
// Twitch CLI stores generated events in SQLite even with websocket transport.
// Relocate that cache using its supported DB_FILENAME option; HOME stays intact.
const cachePath=relative(appDirectory,join(temporary,'eventCache.db'));
const config=join(temporary,'twitch-cli.env');
await writeFile(config,`DB_FILENAME=${cachePath}\nClientID=local-mock-client\ndisable_update_checks=true\n`);
const cliEnv={...process.env,TWITCH_DB_FILENAME:cachePath,TWITCH_DISABLE_UPDATE_CHECKS:'true'};
const cli=spawn('twitch',['--config',config,'event','websocket','start-server','--port','8080'],{stdio:['ignore','pipe','pipe'],env:cliEnv});
let cliLog='';let cliError:Error|undefined;
cli.once('error',error=>{cliError=error;});
for(const stream of [cli.stdout,cli.stderr])stream?.on('data',chunk=>{cliLog=(cliLog+String(chunk)).slice(-16000);});
const shim=createMockShim();
let listening=false;
let session:ReturnType<typeof createTwitchSession>|undefined;
let now=1000;
const game=new GameSession({mock:true,seed:1,now:()=>now,sendResult:async()=>{throw new Error('No round should end during transport checks');}});
let cleanupTask:Promise<void>|undefined;
function cleanup():Promise<void> {
  return cleanupTask??= (async()=>{
    session?.stop();game.close();
    if(listening)await shim.close();else shim.server.close();
    if(cli.pid&&cli.exitCode===null&&cli.signalCode===null) {
      const exited=once(cli,'exit');cli.kill('SIGTERM');await exited;
    }
    await rm(temporary,{recursive:true,force:true});
  })();
}
const signalHandlers=new Map<'SIGINT'|'SIGTERM',()=>void>();
for(const signal of ['SIGINT','SIGTERM'] as const) {
  const handler=()=>{
    abort.abort();
    void cleanup().then(()=>process.exit(signal==='SIGINT'?130:143),()=>process.exit(1));
  };
  signalHandlers.set(signal,handler);process.once(signal,handler);
}
try {
  await waitFor('Twitch CLI on8080',async()=>{
    if(cliError)throw new Error(`Twitch CLI is required: ${cliError.message}`);
    if(cli.exitCode!==null||cli.signalCode!==null)throw new Error(`Twitch CLI exited: ${cliLog}`);
    return await portOpen(8080);
  },Boolean);
  await new Promise<void>((resolve,reject)=>{shim.server.once('error',reject);shim.server.listen(8081,'127.0.0.1',resolve);});
  listening=true;
  const received:IncomingTwist[]=[];const chat:IncomingChat[]=[];
  session=createTwitchSession({mock:true,onMessage:message=>{chat.push(message);game.chat(message);},onTwist:event=>{received.push(event);game.twist(event);}});
  const commands=await waitFor('all three registered Twurple CLI commands',()=>session!.mockCommands(),items=>items.length===3);
  assert.deepEqual(commands.map(item=>item.type).sort(),['channel.cheer','channel.raid','channel.subscribe']);
  game.command({kind:'session',action:'start'});
  // Fixture initial condition for the heal assertion; damage rules have golden coverage.
  game.state.streamer.hp=82;
  for(const command of commands) {
    now+=100;
    assert.equal(command.args[command.args.indexOf('--session')+1],command.sessionId);
    assert.equal(command.args[command.args.indexOf('-u')+1],command.subscriptionId);
    const extra=command.type==='channel.cheer'?['--cost','35']:[];
    const output=await execute('twitch',['--config',config,...command.args,'--no-config',...extra],{timeout:10000,maxBuffer:256*1024,env:cliEnv,signal:abort.signal});
    const kind=command.type==='channel.cheer'?'cheer':command.type==='channel.subscribe'?'subscribe':'raid';
    const event=await waitFor(`${command.type} callback`,()=>received.find(item=>item.kind===kind),Boolean);
    assert.ok(event);assert.equal(event.simulated,true);
    assert.equal(received.filter(item=>item.kind===kind).length,1,'Each CLI event must reach exactly one account socket');
    if(event.kind==='cheer'){assert.equal(event.bits,35);assert.equal(game.state.hype,25);}
    if(event.kind==='subscribe')assert.equal(game.state.streamer.hp,90);
    if(event.kind==='raid') {
      assert.ok(Number.isInteger(event.viewers)&&event.viewers>0);
      const viewers=/"viewers"\s*:\s*(\d+)/.exec(output.stdout);
      if(viewers)assert.equal(event.viewers,Number(viewers[1]));
      assert.equal(game.state.raid.ends_at,now+15000);
    }
    const effect=event.kind==='cheer'?`hype=${game.state.hype}`:event.kind==='subscribe'?`HP=${game.state.streamer.hp}`:`phaseEndsAt=${game.state.raid.ends_at}`;
    console.log(`[PASS SIMULATED] ${command.type} → ${JSON.stringify(event)} → ${effect} · session ${command.sessionId} · subscription ${command.subscriptionId}`);
  }
  const injected=await fetch('http://127.0.0.1:8081/inject',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'!jab',user:'mock-events-viewer'})});
  assert.equal(injected.status,200);
  const message=await waitFor('injected chat through the same shim',()=>chat.find(item=>item.user==='mock-events-viewer'),Boolean);
  assert.equal(message!.text,'!jab');assert.equal(message!.simulated,true);
  assert.equal(game.state.tally.JAB,1);
  assert.equal(received.length,3);
  console.log('[PASS SIMULATED] chat injection still reaches the bot subscription through shim8081.');
} finally {
  await cleanup();
  for(const [signal,handler]of signalHandlers)process.removeListener(signal,handler);
}
// Twurple's ten-minute event-deduplication timers remain referenced after stop().
// All owned sockets, CLI processes and files are closed before ending this CLI.
process.exit(0);
