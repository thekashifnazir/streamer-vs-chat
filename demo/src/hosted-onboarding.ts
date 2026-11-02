export const OBS_VIDEO_URL='';
export const OBS_SCENE_MAC_URL='';
export const OBS_SCENE_WINDOWS_URL='';
export function obsResourceLinks(urls={mac:OBS_SCENE_MAC_URL,windows:OBS_SCENE_WINDOWS_URL,video:OBS_VIDEO_URL}){
 const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('\"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 return ([[urls.mac,'⬇ OBS scene file (Mac)'],[urls.windows,'⬇ OBS scene file (Windows)'],[urls.video,'▶ Watch the 60 s setup']] as const).filter(([url])=>url).map(([url,label])=>`<a href="${escape(url)}">${label}</a>`).join('');
}
export type ExtraState={available:boolean;enabled:boolean;capable:boolean};
export type HostedOnboardingState={connected:boolean;/** At least one round finished this page load; until then there are no results to finish. */played?:boolean;obsReady?:boolean;login?:string;notice?:string;scopes:string[];bot:ExtraState;clips:ExtraState;memory:ExtraState;forge:ExtraState};
// [id, chip title, the fuller explanation (More options lists it), the one line that says what the extra does on stream (the chip's tooltip)]
const extras=[['bot-results','Results in chat','As streamervschatbot.','Our bot posts each round result in your chat.'],['hosted-clips','KO clips','Confirmed highlights from your live stream.','Makes Twitch clips of KOs and big moments.'],['hosted-forge','Boss Forge','Let chat design a balanced boss.','Chat designs the next boss with !forge.'],['hosted-memory','Remember viewers','Names and votes for 90 days. Viewers can type !forgetme. Turn on each session.','Keeps names and votes 90 days. Viewers can !forgetme. Turn on each session.']] as const;
/** Step 1, before Connect: what Twitch will ask for and why (scopes in twitch/auth.ts loginUrl, stream key in go-live.ts). */
export const CONNECT_PERMISSIONS='Free, nothing to install. Twitch will ask to let us read your chat (for viewers\' votes), post in it as our bot (round results) and make clips (KOs). GO LIVE asks once more, to read your stream key.';
export function hostedOnboardingMarkup(){return `<nav class="play-step-bar" aria-label="Setup steps"><span data-play-step="twitch">1 · Twitch</span><span data-play-step="live">2 · Go live</span><span data-play-step="fight">3 · Set up your fight</span></nav>
<section class="onboarding-step" id="connect-step"><span class="step-number">1</span><h1>Your chat controls the boss. Your body is the defence.</h1><p>Viewers vote in your Twitch chat for the boss's next attack: a jab, a left or right hook, or a combo. You block and dodge on your webcam. Or pick Crowd Trainer after connecting: chat calls boxing combos and you throw them.</p><p id="connect-step-body" role="status"></p><p class="connect-permissions">${CONNECT_PERMISSIONS}</p><button id="twitch-connect">Connect Twitch</button><p class="connect-footnote">Chrome on a computer · about 2 minutes to your first fight · <a href="/">Try it without Twitch first →</a></p></section>
<section id="go-live-step"><h1>GO LIVE FROM THIS PAGE</h1><p>No OBS needed. Chrome will ask to share this tab: pick it and keep tab audio on. Only the fight screen goes on stream.</p><p id="broadcast-support" role="status"></p><button id="go-live" type="button">GO LIVE ON TWITCH</button><label class="switch-row"><input id="stream-camera" type="checkbox" role="switch" checked> Show my camera on stream</label><details id="advanced-obs"><summary>⚙ Advanced setup · use OBS</summary><article class="obs-compact" id="obs-step"><div class="obs-resources"${obsResourceLinks()?'':' hidden'}>${obsResourceLinks()}</div><div class="obs-platforms" role="group" aria-label="OBS platform"><button type="button" data-obs-platform="mac" aria-pressed="true">Mac</button><button type="button" data-obs-platform="windows" aria-pressed="false">Windows</button></div><div id="obs-instructions" class="obs-instructions"><div data-obs-guide="mac"><ol><li>Sources + → macOS Screen Capture → Window: Streamer vs Chat · Twitch play → Cmd+F</li><li>Sources + → macOS Audio Capture → Google Chrome</li><li>Start Fight: the OBS audio meter should move</li></ol></div><div data-obs-guide="windows" hidden><ol><li>Sources + → Window Capture → Streamer vs Chat · Twitch play → tick Capture Audio</li><li>Start Fight: the meter should move</li></ol></div></div><button id="obs-done" type="button">Done, it's in OBS</button><details class="obs-more"><summary>More OBS options</summary><p>Enable Green background here; add a green Chroma Key filter in OBS. Crop to the game frame and keep your webcam as a normal OBS camera source.</p><label class="switch-row"><input id="green-background" type="checkbox" role="switch"> Green background</label></details></article></details><button id="skip-live" class="text-button" type="button">Skip: I'm already live →</button></section>
<div id="broadcast-bar" role="status" hidden><span id="broadcast-label"></span><button id="end-stream" type="button">End stream</button></div><p id="broadcast-status" role="status"></p>
<div class="permission-banner" id="permission-banner" hidden><span id="permission-copy">Posting results and making clips need one more Twitch permission.</span><button id="twitch-reconnect">Reconnect once</button></div>
<section class="stream-extras"><h2>What your stream gets</h2><div class="extras-grid">${extras.map(([id,title,body,meaning])=>`<label class="extra-tile" title="${meaning}" data-description="${meaning}" data-detail="${body}"><span class="extra-title">${title}${id==='hosted-memory'?'<small class="session-opt-in">Turn on each session</small>':''}</span><small class="extra-meaning">${meaning}</small><span class="extra-pill" id="${id}-pill">Connect first</span><input id="${id}-toggle" type="checkbox" role="switch" disabled aria-label="${title}"></label>`).join('')}</div></section><div class="privacy-disclosure"><p>Always: counts only.</p><p>Remember my viewers: names for 90 days; viewers can type !forgetme.</p></div><button id="twitch-disconnect" class="text-button" title="Signed in on this computer until you disconnect" hidden>Disconnect</button><button id="show-results" title="Ends this session: shows the session card and copies counts-only results (no names) to your clipboard" hidden>Finish &amp; copy results</button><pre id="play-results" hidden></pre><button id="copy-results" hidden>Copy results</button>`;}
export function updateHostedOnboarding(panel:HTMLElement,state:HostedOnboardingState){
 const el=<T extends HTMLElement>(id:string)=>(panel.querySelector<T>(`#${id}`)??panel.ownerDocument.getElementById(id)) as T;
 for(const [id,index]of [['connect-step',1],['obs-step',2]] as const){const step=el(id),status=!state.connected?(index===1?'active':'future'):(index===1?'done':state.obsReady?'done':'active');step.dataset.state=status;if(status==='active')step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');const number=step.querySelector('.step-number');if(number)number.textContent=status==='done'?'✓':String(index);}
 el('connect-step-body').textContent=state.connected?`Connected as ${state.login??'your channel'}`:state.notice??'';
 el('twitch-connect').hidden=state.connected;el('twitch-disconnect').hidden=!state.connected;el('show-results').hidden=!state.connected||!state.played;

 let permission=false;
 for(const [id,key,scope]of [['bot-results','bot','channel:bot'],['hosted-clips','clips','clips:edit'],['hosted-memory','memory',null],['hosted-forge','forge',null]] as const){const value=state[key];const missing=state.connected&&value.available&&scope!==null&&!state.scopes.includes(scope);permission||=missing;el(`${id}-pill`).textContent=!value.available?'Unavailable':!state.connected?'Connect first':missing?'Needs reconnect':value.enabled?'On':'Off';const toggle=el<HTMLInputElement>(`${id}-toggle`);toggle.disabled=!state.connected||!value.capable;toggle.checked=value.enabled;}
 el('permission-banner').hidden=!permission;
}

/** Feature notices live in their tile tooltip; no duplicate status paragraphs. */
export function setHostedExtraNotice(panel:HTMLElement,id:string,message:string){
 const tile=(panel.querySelector<HTMLElement>(`#${id}-toggle`)??panel.ownerDocument.getElementById(`${id}-toggle`))?.closest<HTMLElement>('.extra-tile');
 if(tile)tile.title=[tile.dataset.description,message].filter(Boolean).join(' · ');
}
export function updateHostedConnectionPill(document:Document,connected:boolean,login?:string,restored=false){
 const pill=document.querySelector<HTMLElement>('#connection-pill,.demo-tag');if(!pill)return;
 pill.textContent=connected?`${restored?'Reconnected':'Connected'} as ${login??'your channel'}`:'Not connected';
 pill.dataset.connected=String(connected);pill.dataset.state=connected?'connected':'disconnected';pill.classList.add('header-status');
}

/** OBS completion is explicit and tab-local; green background is an independent choice. */
export function mountObsSetup(panel:HTMLElement,onChange:()=>void){
 const document=panel.ownerDocument;
 let done=false;
 try{done=document.defaultView?.sessionStorage.getItem('svc.obs-ready')==='yes';}catch{/* Still usable without storage. */}
 for(const button of panel.querySelectorAll<HTMLButtonElement>('[data-obs-platform]'))button.addEventListener('click',()=>{
  for(const choice of panel.querySelectorAll<HTMLButtonElement>('[data-obs-platform]'))choice.setAttribute('aria-pressed',String(choice===button));
  for(const guide of panel.querySelectorAll<HTMLElement>('[data-obs-guide]'))guide.hidden=guide.dataset.obsGuide!==button.dataset.obsPlatform;
 });
 panel.querySelector<HTMLButtonElement>('#obs-done')!.addEventListener('click',()=>{done=true;try{document.defaultView?.sessionStorage.setItem('svc.obs-ready','yes');}catch{}onChange();});
 return {get ready(){return done;}};
}
