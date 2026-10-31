import {mountHostedFlow} from './hosted-flow';
import {broadcastSupport,createGoLive,createStreamCamera,STREAM_KEY_SCOPE} from './go-live';
import {createHostedHealth} from './hosted-health';
import {hostedOnboardingMarkup,mountObsSetup,updateHostedOnboarding,setHostedExtraNotice,updateHostedConnectionPill} from './hosted-onboarding';
import {createHostedMemory} from './hosted-memory';
import type {GameSummary} from '../../shared/src/highlights';
import {createHostedForge} from './hosted-forge';
import type {BossDef} from '../../shared/src/boss-def';
import type {ForgeSnapshot} from '../../shared/src/forge-view';
import {createHostedClips} from './hosted-clips';
import {createHostedResults} from './hosted-results';
import type {GameState,EngineVote,EngineEvent} from '../../shared/src/engine';
import {getBrowserAuth} from './twitch/auth';
import {createBrowserChat} from './twitch/eventsub';
import {PlayMetrics} from './metrics';
import type {ChatVote,StreamerInput} from '@svc/shared';
export function mountHostedPlay(options:{getState:()=>GameState|null;onMemoryChange?:()=>void;onConnected?:()=>void;onStatus?:(message:string)=>void;onGreen?:(checked:boolean)=>void;onVote:(vote:EngineVote)=>boolean;onRaid?:(event:Extract<EngineEvent,{kind:'raid'}>)=>void;onControl:(event:StreamerInput)=>void;onViewers:(count:number)=>void;onDisconnect:()=>void;onSummary:()=>void;onHighlightsChange?:()=>void;betweenRounds:()=>boolean;onForgeAccepted:(boss:BossDef|null)=>void;onForgeSnapshot:(view:ForgeSnapshot|null)=>void;parseVote?:(text:string,user:string,at:number)=>ChatVote|null}){
 const auth=getBrowserAuth(),metrics=new PlayMetrics(),health=createHostedHealth();
 let connected=false,connectionNotice='',disposed=false;
 const slot=document.getElementById('hosted-onboarding-slot');
 const panel=slot?.querySelector<HTMLElement>('.hosted-panel')??document.createElement('section');panel.className='hosted-panel';
 if(!panel.childElementCount)panel.innerHTML=hostedOnboardingMarkup();
 if(!panel.isConnected){if(slot)slot.append(panel);else document.querySelector('main')!.prepend(panel);}
 const flow=mountHostedFlow(document);
 const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
 const connect=el<HTMLButtonElement>('twitch-connect');
 let skipped=false,streamPermissionRequested=false,liveSince:number|null=null,starting=false;
 const supported=broadcastSupport();
 const cameraBubble=createStreamCamera(el('stage'),el<HTMLVideoElement>('camera'),()=>el<HTMLInputElement>('stream-camera').checked);
 const broadcast=createGoLive({auth,stage:el('stage'),camera:cameraBubble,onState:(live,message)=>{if(disposed)return;if(live){liveSince??=Date.now();starting=false;}else{if(liveSince!==null)options.onControl({kind:'control',action:'stop',by:'capture'});liveSince=null;}el('broadcast-status').textContent=message;refresh();}});
 el<HTMLButtonElement>('go-live').hidden=!supported;el<HTMLDetailsElement>('advanced-obs').open=!supported;el('broadcast-support').textContent=supported?'':'Quick streaming needs desktop Chrome or Edge with tab sharing and H.264. Use the OBS setup below.';
 const report=(message:string)=>{connectionNotice=/^(For Twitch login|This build|Reconnect)/.test(message)?message:'';options.onStatus?.(message);refresh();};
 const botToggle=el<HTMLInputElement>('bot-results-toggle');
 const bot=createHostedResults({auth,getHealth:health.get,onStatus:message=>{setHostedExtraNotice(panel,'bot-results',message.startsWith('Reconnect to enable')?'':message);if(!message.startsWith('Reconnect to enable'))options.onStatus?.(message);refresh();}});
 const clips=createHostedClips({auth,getHealth:health.get,onStatus:message=>{setHostedExtraNotice(panel,'hosted-clips',message.startsWith('Reconnect to enable')?'':message);if(!message.startsWith('Reconnect to enable'))options.onStatus?.(message);},onChange:options.onHighlightsChange,onConfirmed:id=>bot.postClip(id)});
 const forge=createHostedForge({auth,getHealth:health.get,betweenRounds:options.betweenRounds,onAccepted:options.onForgeAccepted,onSnapshot:options.onForgeSnapshot,onStatus:message=>{setHostedExtraNotice(panel,'hosted-forge',auth.authenticated?message:'');if(auth.authenticated)options.onStatus?.(message);refresh();}});
 const memoryToggle=el<HTMLInputElement>('hosted-memory-toggle');
 const memory=createHostedMemory({auth,getHealth:health.get,getState:options.getState,onChange:options.onMemoryChange,onStatus:message=>{setHostedExtraNotice(panel,'hosted-memory',message);}});
 const syncMemory=async()=>{await memory.initialize();refresh();};
 memoryToggle.addEventListener('change',()=>{memoryToggle.checked=memory.setEnabled(memoryToggle.checked);refresh();});
 let latestChat:{userId:string;displayName:string}|null=null;
 const syncBot=async()=>{await bot.initialize();refresh();};
 botToggle.addEventListener('change',()=>{botToggle.checked=bot.setEnabled(botToggle.checked);refresh();});
 const refresh=()=>{updateHostedConnectionPill(document,auth.authenticated,auth.account?.login,auth.restored);updateHostedOnboarding(panel,{connected:auth.authenticated,login:auth.account?.login,notice:connectionNotice||undefined,scopes:auth.account?.scopes??[],bot:{available:bot.available,capable:bot.capable,enabled:bot.enabled},obsReady:obs.ready,clips:{available:clips.available,capable:clips.capable,enabled:clips.enabled},memory:{available:memory.available,capable:memory.capable,enabled:memory.enabled},forge:{available:forge.available,capable:forge.capable,enabled:forge.enabled}});flow.update({connected:auth.authenticated,live:broadcast.live,obs:obs.ready,skipped,preparing:starting});el('broadcast-label').textContent=`● LIVE on twitch.tv/${auth.account?.login??''} · ${String(Math.floor((Date.now()-(liveSince??Date.now()))/60000)).padStart(2,'0')}:${String(Math.floor((Date.now()-(liveSince??Date.now()))/1000)%60).padStart(2,'0')}`;el<HTMLButtonElement>('go-live').disabled=starting;if(streamPermissionRequested&&!auth.account?.scopes.includes(STREAM_KEY_SCOPE)){el('permission-banner').hidden=false;el('permission-copy').textContent='Going live needs one more Twitch permission to read your stream key. It stays in memory only.';}};
 el<HTMLInputElement>('hosted-clips-toggle').addEventListener('change',event=>{clips.setEnabled((event.target as HTMLInputElement).checked);refresh();});
 el<HTMLInputElement>('hosted-forge-toggle').addEventListener('change',event=>{forge.setEnabled((event.target as HTMLInputElement).checked);refresh();});
 const obs=mountObsSetup(panel,refresh);
 forge.setEnabled(false);
 const liveClock=setInterval(()=>{if(broadcast.live)refresh();},1000);
 el('skip-live').addEventListener('click',()=>{skipped=true;refresh();});
 el('go-live').addEventListener('click',()=>{if(!auth.authenticated||starting)return;if(!auth.account?.scopes.includes(STREAM_KEY_SCOPE)){streamPermissionRequested=true;refresh();return;}starting=true;refresh();void broadcast.start().finally(()=>{starting=false;refresh();});refresh();});
 el('end-stream').addEventListener('click',()=>{skipped=false;broadcast.stop();refresh();});
 el<HTMLInputElement>('stream-camera').addEventListener('change',()=>{if(!el<HTMLInputElement>('stream-camera').checked)cameraBubble.stop();else if(broadcast.live)void cameraBubble.start().catch(()=>{el('broadcast-status').textContent='Camera unavailable. Stream continues without the camera bubble.';});});
 const chat=createBrowserChat({auth,parseVote:options.parseVote,onRaid:options.onRaid,onChatMessage:message=>{latestChat={userId:message.userId,displayName:message.displayName};forge.onChat(message);memory.onChat(message);},now:()=>performance.now(),onChat:user=>{void metrics.observeChat(user);},onVote:vote=>{if(options.onVote(vote)){void metrics.acceptedVote(vote.user);memory.acceptedVote(vote,latestChat?.userId===vote.user?latestChat.displayName:'Viewer');}latestChat=null;},onControl:options.onControl,onViewers:options.onViewers,onStatus:message=>{
  report(message==='connected'?'LIVE · Twitch chat connected':message==='login-required'?'Reconnect: Twitch authorization expired':`Twitch: ${message}`);connected=auth.authenticated&&message==='connected';
  if(connected)options.onConnected?.();else options.onDisconnect();refresh();
  // Explicit transport readiness, rather than a loaded token, gates fights.
  if(!auth.authenticated){broadcast.stop('Twitch connection expired. Reconnect before going live.');skipped=false;connect.hidden=false;connect.textContent='Reconnect';}
 }});
 async function start(){
  try{await chat.start();if(disposed||!auth.authenticated)return;await health.refresh();if(disposed)return;void syncBot();void clips.initialize().then(refresh);void forge.initialize().then(refresh);void syncMemory();el('twitch-disconnect').hidden=!auth.hasToken;connect.hidden=auth.authenticated;refresh();if(!auth.authenticated)connect.textContent='Reconnect';}
  catch{connected=false;connect.hidden=false;connect.textContent='Reconnect';report('Reconnect to Twitch to read live chat.');options.onDisconnect();refresh();}
 }
 const login=(extraScopes:string[]=[])=>{if(!['https://streamervschat.kashifnazir.com','http://localhost:5173'].includes(location.origin)){report('For Twitch login open https://streamervschat.kashifnazir.com/play or http://localhost:5173/play (the registered redirect origins).');return;}try{location.assign(auth.loginUrl(extraScopes));}catch{report('This build needs VITE_TWITCH_CLIENT_ID. Ask the channel owner to configure the public Twitch client ID and rebuild.');}};
 connect.addEventListener('click',()=>login());el('twitch-reconnect').addEventListener('click',()=>login(streamPermissionRequested?[STREAM_KEY_SCOPE]:[]));
 el('twitch-disconnect').addEventListener('click',()=>{broadcast.stop();skipped=false;streamPermissionRequested=false;options.onDisconnect();void memory.dispose();memoryToggle.checked=false;memoryToggle.disabled=true;forge.dispose();clips.dispose();bot.setEnabled(false);botToggle.checked=false;chat.stop();auth.clear();connected=false;connect.hidden=false;connect.textContent='Connect Twitch';el('twitch-disconnect').hidden=true;report('Disconnected. Connect Twitch to play live, or open the no-login demo.');refresh();});
 el<HTMLInputElement>('green-background').addEventListener('change',event=>{document.getElementById('stage')!.classList.toggle('chroma-green',(event.target as HTMLInputElement).checked);options.onGreen?.((event.target as HTMLInputElement).checked);refresh();});
 const show=async()=>{options.onSummary();void memory.finalize();metrics.endFight();const json=JSON.stringify(await metrics.exportSnapshot(),null,2);el('play-results').textContent=json;el('play-results').hidden=false;el('copy-results').hidden=false;return json;};
 el('show-results').addEventListener('click',()=>{void show();});
 el('copy-results').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(await show());report('Counts-only results copied.');}catch{report('Copy unavailable. Select the JSON results shown below.');}});
 refresh();
 const initialize=async()=>{
  void health.get();
  if(!auth.authenticated)await auth.restore();
  if(disposed)return;
  refresh();
  if(auth.authenticated)void start();
  else{void syncBot();void clips.initialize().then(refresh);void forge.initialize().then(refresh);void syncMemory();report((history.state?.oauthError||new URLSearchParams(location.search).get('oauthError')==='1')?'Reconnect: Twitch authorization was not accepted.':'Connect Twitch to begin the baseline count. No simulated chat runs on this page.');}
 };
 void initialize();
 return {memoryView:()=>memory.view(),publicSummary:(summary:GameSummary)=>memory.publicSummary(summary),get forgeBusy(){return forge.busy;},observePhase:(reset=false)=>forge.observePhase(reset),get ready(){return connected&&auth.authenticated;},get hasToken(){return auth.hasToken;},metrics,observeGame:(state:GameState,hypeFull:boolean,reset=false)=>{bot.observeGame(state,hypeFull);clips.observeGame(state,reset);memory.observeGame(state,reset);},clipsSnapshot:()=>clips.snapshot(),startFight:()=>metrics.startFight(),endFight:()=>metrics.endFight(),dispose(){disposed=true;clearInterval(liveClock);broadcast.stop();void memory.dispose();forge.dispose();clips.dispose();bot.dispose();chat.stop();metrics.dispose();}};
}
