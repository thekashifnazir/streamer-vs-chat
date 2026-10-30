import {createHostedMemory,HOSTED_MEMORY_LABEL} from './hosted-memory';
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
 panel.innerHTML=`<h1>Try it on your channel</h1><p>Read your own Twitch chat in this window. No server or client secret. Reloading signs you out.</p><div class="hosted-actions"><button id="twitch-connect">Connect with Twitch</button><button id="twitch-disconnect" hidden>Disconnect</button><label><input id="green-background" type="checkbox"> Green background</label><button id="show-results">End session / Copy results</button></div><p id="twitch-status" role="status"></p><label><input id="bot-results-toggle" type="checkbox" disabled> Post results in chat (as streamervschatbot)</label><p id="bot-results-status" role="status"></p><label><input id="hosted-memory-toggle" type="checkbox" disabled> ${HOSTED_MEMORY_LABEL}</label><p id="hosted-memory-status" role="status"></p><p id="hosted-clips-status" role="status"></p><p id="hosted-forge-status" role="status"></p><details><summary>OBS setup · Window Capture + Chroma Key</summary><ol><li>Connect Twitch, confirm clear space, and start a keyboard or webcam fight.</li><li>In OBS add Window Capture and choose this Chrome window.</li><li>Enable Green background here; add a Chroma Key filter in OBS and choose green.</li><li>Crop to the game frame, check both rails are visible, then go live.</li></ol></details><p>Counts only: baseline chat rate (up to 10 minutes), fight rates, unique chatters and voters. No chat text or usernames in results. Identity hashes use a fresh in-memory salt per session.</p><pre id="play-results" hidden></pre><button id="copy-results" hidden>Copy results</button>`;
 document.querySelector('main')!.prepend(panel);
 const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
 const status=el('twitch-status'),connect=el<HTMLButtonElement>('twitch-connect');
 const report=(message:string)=>{status.textContent=message;options.onStatus?.(message);};
 const botToggle=el<HTMLInputElement>('bot-results-toggle');
 const bot=createHostedResults({auth,onStatus:message=>{el('bot-results-status').textContent=message;options.onStatus?.(message);}});
 const clips=createHostedClips({auth,onStatus:message=>{el('hosted-clips-status').textContent=message;options.onStatus?.(message);},onChange:options.onHighlightsChange,onConfirmed:id=>bot.postClip(id)});
 const forge=createHostedForge({auth,betweenRounds:options.betweenRounds,onAccepted:options.onForgeAccepted,onSnapshot:options.onForgeSnapshot,onStatus:message=>{el('hosted-forge-status').textContent=message;options.onStatus?.(message);}});
 const memoryToggle=el<HTMLInputElement>('hosted-memory-toggle');
 const memory=createHostedMemory({auth,getState:options.getState,onChange:options.onMemoryChange,onStatus:message=>{el('hosted-memory-status').textContent=message;}});
 const syncMemory=async()=>{await memory.initialize();memoryToggle.disabled=!memory.capable;};
 memoryToggle.addEventListener('change',()=>{memoryToggle.checked=memory.setEnabled(memoryToggle.checked);});
 let latestChat:{userId:string;displayName:string}|null=null;
 const syncBot=async()=>{await bot.initialize();botToggle.disabled=!bot.capable;botToggle.checked=bot.enabled;};
 botToggle.addEventListener('change',()=>{botToggle.checked=bot.setEnabled(botToggle.checked);});
 const chat=createBrowserChat({auth,parseVote:options.parseVote,onChatMessage:message=>{latestChat={userId:message.userId,displayName:message.displayName};forge.onChat(message);memory.onChat(message);},now:()=>performance.now(),onChat:user=>{void metrics.observeChat(user);},onVote:vote=>{if(options.onVote(vote)){void metrics.acceptedVote(vote.user);memory.acceptedVote(vote,latestChat?.userId===vote.user?latestChat.displayName:'Viewer');}latestChat=null;},onControl:options.onControl,onViewers:options.onViewers,onStatus:message=>{
  report(message==='connected'?'LIVE · Twitch chat connected':message==='login-required'?'Reconnect: Twitch authorization expired':`Twitch: ${message}`);connected=auth.authenticated&&message==='connected';
  if(connected)options.onConnected?.();else options.onDisconnect();
  // Explicit transport readiness, rather than a loaded token, gates fights.
  if(!auth.authenticated){connect.hidden=false;connect.textContent='Reconnect';}
 }});
 async function start(){
  try{await chat.start();void syncBot();void clips.initialize();void forge.initialize();void syncMemory();el('twitch-disconnect').hidden=!auth.hasToken;connect.hidden=auth.authenticated;if(!auth.authenticated)connect.textContent='Reconnect';}
  catch{connected=false;connect.hidden=false;connect.textContent='Reconnect';report('Reconnect to Twitch to read live chat.');options.onDisconnect();}
 }
 connect.addEventListener('click',()=>{if(!['https://streamervschat.kashifnazir.com','http://localhost:5173'].includes(location.origin)){report('For Twitch login open https://streamervschat.kashifnazir.com/play or http://localhost:5173/play (the registered redirect origins).');return;}try{location.assign(auth.loginUrl());}catch{report('This build needs VITE_TWITCH_CLIENT_ID. Ask the channel owner to configure the public Twitch client ID and rebuild.');}});
 el('twitch-disconnect').addEventListener('click',()=>{options.onDisconnect();void memory.dispose();memoryToggle.checked=false;memoryToggle.disabled=true;forge.dispose();clips.dispose();bot.setEnabled(false);botToggle.checked=false;chat.stop();auth.clear();connected=false;connect.hidden=false;connect.textContent='Connect with Twitch';el('twitch-disconnect').hidden=true;report('Disconnected. Connect Twitch to play live, or open the no-login demo.');});
 el<HTMLInputElement>('green-background').addEventListener('change',event=>{document.getElementById('stage')!.classList.toggle('chroma-green',(event.target as HTMLInputElement).checked);options.onGreen?.((event.target as HTMLInputElement).checked);});
 const show=async()=>{options.onSummary();void memory.finalize();metrics.endFight();const json=JSON.stringify(await metrics.exportSnapshot(),null,2);el('play-results').textContent=json;el('play-results').hidden=false;el('copy-results').hidden=false;return json;};
 el('show-results').addEventListener('click',()=>{void show();});
 el('copy-results').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(await show());report('Counts-only results copied.');}catch{report('Copy unavailable. Select the JSON results shown below.');}});
 if(!auth.authenticated){void syncBot();void clips.initialize();void forge.initialize();void syncMemory();}
 if(auth.authenticated)void start();else report(history.state?.oauthError?'Reconnect: Twitch authorization was not accepted.':'Connect Twitch to begin the baseline count. No simulated chat runs on this page.');
 return {memoryView:()=>memory.view(),publicSummary:(summary:GameSummary)=>memory.publicSummary(summary),get forgeBusy(){return forge.busy;},observePhase:(reset=false)=>forge.observePhase(reset),get ready(){return connected;},get hasToken(){return auth.hasToken;},metrics,observeGame:(state:GameState,hypeFull:boolean,reset=false)=>{bot.observeGame(state,hypeFull);clips.observeGame(state,reset);memory.observeGame(state,reset);},clipsSnapshot:()=>clips.snapshot(),startFight:()=>metrics.startFight(),endFight:()=>metrics.endFight(),dispose(){void memory.dispose();forge.dispose();clips.dispose();bot.dispose();chat.stop();metrics.dispose();}};
}
