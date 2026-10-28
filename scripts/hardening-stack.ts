import {spawn,type ChildProcess} from 'node:child_process';
import {once} from 'node:events';
import {connect} from 'node:net';
import {mkdtemp,writeFile,rm,stat} from 'node:fs/promises';
import {homedir,tmpdir} from 'node:os';
import {join,relative} from 'node:path';
import {WebSocket} from 'ws';
import {createMockShim} from './mock-shim';
export const pause=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
async function open(port:number){return await new Promise<boolean>(resolve=>{const socket=connect({host:'127.0.0.1',port});socket.setTimeout(200);socket.once('connect',()=>{socket.destroy();resolve(true);});for(const event of ['error','timeout'])socket.once(event,()=>{socket.destroy();resolve(false);});});}
export async function localJson(path:string,body?:unknown):Promise<any>{
 if(!path.startsWith('/__hardening/'))throw new Error('Only isolated hardening endpoints are permitted');
 const response=await fetch(`http://127.0.0.1:3000${path}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw new Error(`Hardening endpoint returned${response.status}`);return await response.json();
}
export async function startHardeningStack(){
 for(const port of [8080,8081,3000,44747])if(await open(port))throw new Error(`Port ${port} is busy; stop the other mock stack first.`);
 const temporary=await mkdtemp(join(tmpdir(),'svc-hardening-'));
 const legacy=join(homedir(),'.twitch-cli'),hasLegacy=await stat(legacy).then(()=>true,()=>false);
 const app=hasLegacy?legacy:join(process.platform==='darwin'?join(homedir(),'Library/Application Support'):process.platform==='win32'?process.env.APPDATA??join(homedir(),'AppData/Roaming'):process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'twitch-cli');
 const cache=relative(app,join(temporary,'events.db')),config=join(temporary,'mock.env');
 await writeFile(config,`DB_FILENAME=${cache}\nClientID=local-mock-client\ndisable_update_checks=true\n`);
 // Keep only execution/platform settings. Never import .env or server token files.
 const env:NodeJS.ProcessEnv={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,TEMP:process.env.TEMP,SystemRoot:process.env.SystemRoot,APPDATA:process.env.APPDATA,TZ:process.env.TZ,LANG:process.env.LANG,TWITCH_DB_FILENAME:cache,TWITCH_DISABLE_UPDATE_CHECKS:'true',TWURPLE_MOCK_API_PORT:'8081',TWITCH_MOCK:'1'};
 const children:ChildProcess[]=[];let tail='',closing:Promise<void>|undefined;
 const start=(command:string,args:string[])=>{const child=spawn(command,args,{stdio:['ignore','pipe','pipe'],env});children.push(child);child.on('error',error=>{tail+=String(error);});for(const stream of [child.stdout,child.stderr])stream?.on('data',data=>{tail=(tail+String(data)).slice(-12000);});return child;};
 const shim=createMockShim();let shimListening=false;let ws:WebSocket|undefined;
 function close(){return closing??=(async()=>{ws?.terminate();for(const child of [...children].reverse())if(child.pid&&child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');let timer:ReturnType<typeof setTimeout>|undefined;try{child.kill('SIGTERM');await Promise.race([exited,new Promise<void>(resolve=>{timer=setTimeout(resolve,3000);})]);if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await exited;}}finally{if(timer)clearTimeout(timer);}}if(shimListening)await shim.close();else shim.server.close();await rm(temporary,{recursive:true,force:true});})();}
 const wait=async(test:()=>Promise<boolean>,description:string)=>{const deadline=Date.now()+20000;while(Date.now()<deadline){if(children.some(child=>child.exitCode!==null||child.signalCode!==null))throw new Error(`Mock child exited during${description}: ${tail}`);if(await test())return;await pause(50);}throw new Error(`Timed out: ${description}: ${tail}`);};
 try{
  const launchCli=()=>start('twitch',['--config',config,'event','websocket','start-server','--port','8080']);
  let cli=launchCli();await wait(()=>open(8080),'CLI startup');
  await new Promise<void>((resolve,reject)=>{shim.server.once('error',reject);shim.server.listen(8081,'127.0.0.1',resolve);});shimListening=true;
  start(process.execPath,['--expose-gc','--import','tsx','server/src/index.ts','--mock','--hardening']);
  await wait(async()=>{try{const [status,health]=await Promise.all([localJson('/__hardening/status'),fetch('http://127.0.0.1:8081/health').then(res=>res.json())]);return !!status&&health.subscriptions?.length>0;}catch{return false;}},'hardening telemetry/chat subscription');
  ws=new WebSocket('ws://127.0.0.1:3000/ws',{origin:'http://localhost:5173'});await once(ws,'open');
  const restartCli=async(downtimeMs=0)=>{
   if(closing||!Number.isFinite(downtimeMs)||downtimeMs<0||downtimeMs>30000)throw new Error('Invalid isolated CLI restart');
   const old=cli;
   if(old.exitCode===null&&old.signalCode===null){
    const exited=once(old,'exit');let timer:ReturnType<typeof setTimeout>|undefined;old.kill('SIGTERM');
    try{await Promise.race([exited,new Promise<void>(resolve=>{timer=setTimeout(resolve,3000);})]);}finally{clearTimeout(timer);}
    if(old.exitCode===null&&old.signalCode===null){old.kill('SIGKILL');await exited;}
   }
   children.splice(children.indexOf(old),1);await pause(downtimeMs);if(closing)return;
   cli=launchCli();await wait(()=>open(8080),'CLI restart');
  };
  return {ws,close,restartCli,status:()=>localJson('/__hardening/status'),start:(viewers=0)=>localJson('/__hardening/start',{viewers}),gc:()=>localJson('/__hardening/gc',{}),log:()=>tail};
 }catch(error){await close();throw error;}
}
