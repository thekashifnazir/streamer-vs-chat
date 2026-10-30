import {hostedOnboardingMarkup,updateHostedOnboarding} from './hosted-onboarding';
import {createHostedMemory} from './hosted-memory';
import type {GameSummary} from '../../shared/src/highlights';
import {createHostedForge} from './hosted-forge';
import type {BossDef} from '../../shared/src/boss-def';
import type {ForgeSnapshot} from '../../shared/src/forge-view';
import {createHostedClips} from './hosted-clips';
import {createHostedResults} from './hosted-results';
import type {GameState} from '../../shared/src/engine';
import {getBrowserAuth} from './twitch/auth';
import {createBrowserChat} from './twitch/eventsub';
import {PlayMetrics} from './metrics';
import type {ChatVote,StreamerInput} from '@svc/shared';
export function mountHostedPlay(options:{getState:()=>GameState|null;onMemoryChange?:()=>void;onConnected?:()=>void;onStatus?:(message:string)=>void;onGreen?:(checked:boolean)=>void;onVote:(vote:ChatVote)=>boolean;onControl:(event:StreamerInput)=>void;onViewers:(count:number)=>void;onDisconnect:()=>void;onSummary:()=>void;onHighlightsChange?:()=>void;betweenRounds:()=>boolean;onForgeAccepted:(boss:BossDef|null)=>void;onForgeSnapshot:(view:ForgeSnapshot|null)=>void;parseVote?:(text:string,user:string,at:number)=>ChatVote|null}){
 const auth=getBrowserAuth(),metrics=new PlayMetrics();
 let connected=false;
 const panel=document.createElement('section');panel.className='hosted-panel';
 panel.innerHTML=hostedOnboardingMarkup();
 document.querySelector('main')!.prepend(panel);
 const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
 const status=el('twitch-status'),connect=el<HTMLButtonElement>('twitch-connect');
 const report=(message:string)=>{status.textContent=message;options.onStatus?.(message);};
 const botToggle=el<HTMLInputElement>('bot-results-toggle');
 const bot=createHostedResults({auth,onStatus:message=>{el('bot-results-status').textContent=message.startsWith('Reconnect to enable')?'':message;if(!message.startsWith('Reconnect to enable'))options.onStatus?.(message);refresh();}});
 const clips=createHostedClips({auth,onStatus:message=>{el('hosted-clips-status').textContent=message.startsWith('Reconnect to enable')?'':message;if(!message.startsWith('Reconnect to enable'))options.onStatus?.(message);},onChange:options.onHighlightsChange,onConfirmed:id=>bot.postClip(id)});
 const forge=createHostedForge({auth,betweenRounds:options.betweenRounds,onAccepted:options.onForgeAccepted,onSnapshot:options.onForgeSnapshot,onStatus:message=>{el('hosted-forge-status').textContent=message;options.onStatus?.(message);refresh();}});
 const memoryToggle=el<HTMLInputElement>('hosted-memory-toggle');
 const memory=createHostedMemory({auth,getState:options.getState,onChange:options.onMemoryChange,onStatus:message=>{el('hosted-memory-status').textContent=message;}});
 const syncMemory=async()=>{await memory.initialize();refresh();};
 memoryToggle.addEventListener('change',()=>{memoryToggle.checked=memory.setEnabled(memoryToggle.checked);refresh();});
 let latestChat:{userId:string;displayName:string}|null=null;
 const syncBot=async()=>{await bot.initialize();refresh();};
 botToggle.addEventListener('change',()=>{botToggle.checked=bot.setEnabled(botToggle.checked);refresh();});
 const refresh=()=>updateHostedOnboarding(panel,{connected:auth.authenticated,login:auth.account?.login,scopes:auth.account?.scopes??[],bot:{available:bot.available,capable:bot.capable,enabled:bot.enabled},obsReady:el<HTMLInputElement>('green-background').checked,clips:{available:clips.available,capable:clips.capable,enabled:clips.enabled},memory:{available:memory.available,capable:memory.capable,enabled:memory.enabled},forge:{available:forge.available,capable:forge.capable,enabled:forge.enabled}});
 el<HTMLInputElement>('hosted-clips-toggle').addEventListener('change',event=>{clips.setEnabled((event.target as HTMLInputElement).checked);refresh();});
 el<HTMLInputElement>('hosted-forge-toggle').addEventListener('change',event=>{forge.setEnabled((event.target as HTMLInputElement).checked);refresh();});
 el('show-obs').addEventListener('click',()=>{const steps=el('obs-instructions');steps.hidden=!steps.hidden;el('show-obs').setAttribute('aria-expanded',String(!steps.hidden));});
 el('go-to-fight').addEventListener('click',()=>{if(auth.authenticated)document.getElementById('fight-setup')?.scrollIntoView({behavior:'smooth',block:'start'});});
 const chat=createBrowserChat({auth,parseVote:options.parseVote,onChatMessage:message=>{latestChat={userId:message.userId,displayName:message.displayName};forge.onChat(message);memory.onChat(message);},now:()=>performance.now(),onChat:user=>{void metrics.observeChat(user);},onVote:vote=>{if(options.onVote(vote)){void metrics.acceptedVote(vote.user);memory.acceptedVote(vote,latestChat?.userId===vote.user?latestChat.displayName:'Viewer');}latestChat=null;},onControl:options.onControl,onViewers:options.onViewers,onStatus:message=>{
  report(message==='connected'?'LIVE · Twitch chat connected':message==='login-required'?'Reconnect: Twitch authorization expired':`Twitch: ${message}`);connected=auth.authenticated&&message==='connected';
  if(connected)options.onConnected?.();else options.onDisconnect();refresh();
  // Explicit transport readiness, rather than a loaded token, gates fights.
  if(!auth.authenticated){connect.hidden=false;connect.textContent='Reconnect';}
 }});
 async function start(){
  try{await chat.start();void syncBot();void clips.initialize().then(refresh);void forge.initialize().then(refresh);void syncMemory();el('twitch-disconnect').hidden=!auth.hasToken;connect.hidden=auth.authenticated;refresh();if(!auth.authenticated)connect.textContent='Reconnect';}
  catch{connected=false;connect.hidden=false;connect.textContent='Reconnect';report('Reconnect to Twitch to read live chat.');options.onDisconnect();refresh();}
 }
 const login=()=>{if(!['https://streamervschat.kashifnazir.com','http://localhost:5173'].includes(location.origin)){report('For Twitch login open https://streamervschat.kashifnazir.com/play or http://localhost:5173/play (the registered redirect origins).');return;}try{location.assign(auth.loginUrl());}catch{report('This build needs VITE_TWITCH_CLIENT_ID. Ask the channel owner to configure the public Twitch client ID and rebuild.');}};
 connect.addEventListener('click',login);el('twitch-reconnect').addEventListener('click',login);
 el('twitch-disconnect').addEventListener('click',()=>{options.onDisconnect();void memory.dispose();memoryToggle.checked=false;memoryToggle.disabled=true;forge.dispose();clips.dispose();bot.setEnabled(false);botToggle.checked=false;chat.stop();auth.clear();connected=false;connect.hidden=false;connect.textContent='Connect with Twitch';el('twitch-disconnect').hidden=true;report('Disconnected. Connect Twitch to play live, or open the no-login demo.');refresh();});
 el<HTMLInputElement>('green-background').addEventListener('change',event=>{document.getElementById('stage')!.classList.toggle('chroma-green',(event.target as HTMLInputElement).checked);options.onGreen?.((event.target as HTMLInputElement).checked);refresh();});
 const show=async()=>{options.onSummary();void memory.finalize();metrics.endFight();const json=JSON.stringify(await metrics.exportSnapshot(),null,2);el('play-results').textContent=json;el('play-results').hidden=false;el('copy-results').hidden=false;return json;};
 el('show-results').addEventListener('click',()=>{void show();});
 el('copy-results').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(await show());report('Counts-only results copied.');}catch{report('Copy unavailable. Select the JSON results shown below.');}});
 refresh();
 if(!auth.authenticated){void syncBot();void clips.initialize().then(refresh);void forge.initialize().then(refresh);void syncMemory();}
 if(auth.authenticated)void start();else report(history.state?.oauthError?'Reconnect: Twitch authorization was not accepted.':'Connect Twitch to begin the baseline count. No simulated chat runs on this page.');
 return {memoryView:()=>memory.view(),publicSummary:(summary:GameSummary)=>memory.publicSummary(summary),get forgeBusy(){return forge.busy;},observePhase:(reset=false)=>forge.observePhase(reset),get ready(){return connected;},get hasToken(){return auth.hasToken;},metrics,observeGame:(state:GameState,hypeFull:boolean,reset=false)=>{bot.observeGame(state,hypeFull);clips.observeGame(state,reset);memory.observeGame(state,reset);},clipsSnapshot:()=>clips.snapshot(),startFight:()=>metrics.startFight(),endFight:()=>metrics.endFight(),dispose(){void memory.dispose();forge.dispose();clips.dispose();bot.dispose();chat.stop();metrics.dispose();}};
}
