export const OBS_VIDEO_URL='';
export type ExtraState={available:boolean;enabled:boolean;capable:boolean};
export type HostedOnboardingState={connected:boolean;obsReady?:boolean;login?:string;notice?:string;scopes:string[];bot:ExtraState;clips:ExtraState;memory:ExtraState;forge:ExtraState};
const extras=[['bot-results','Post results in chat','As streamervschatbot'],['hosted-clips','Clips','Confirmed highlights from your live stream'],['hosted-memory','Remember my viewers','Names and votes for 90 days. Viewers can type !forgetme. Turn on each session.'],['hosted-forge','Boss Forge','Let chat design a balanced boss']] as const;
export function hostedOnboardingMarkup(){return `<header class="onboarding-heading"><p class="onboarding-eyebrow">LIVE · YOUR TWITCH CHAT</p><h1>GET ON STREAM IN 3 STEPS</h1><p class="onboarding-subline">Your chat controls the boss. You defend with your body or your keyboard.</p><a class="demo-link" href="/">▶ Try the demo · no Twitch needed</a></header><div class="onboarding-steps"><article class="onboarding-step" id="connect-step"><span class="step-number">1</span><h2 class="step-title">Connect Twitch</h2><p class="step-body" id="connect-step-body">Read your Twitch chat in this window.</p><button id="twitch-connect">Connect with Twitch</button><button id="twitch-disconnect" class="text-button" hidden>Disconnect</button></article><article class="onboarding-step" id="obs-step"><span class="step-number">2</span><h2 class="step-title">Add it to OBS</h2><div class="obs-platforms" role="group" aria-label="OBS platform"><button type="button" data-obs-platform="mac" aria-pressed="true">Mac</button><button type="button" data-obs-platform="windows" aria-pressed="false">Windows</button></div><div id="obs-instructions" class="obs-instructions"><div data-obs-guide="mac"><ol><li>Sources + → macOS Screen Capture → Method: Window Capture → “Streamer vs Chat · Twitch play” (this Chrome window) → OK → Cmd+F to fit.</li><li>Sound is a second source: + → macOS Audio Capture → Application Audio Capture → Google Chrome. Window Capture has no audio option on macOS.</li></ol></div><div data-obs-guide="windows" hidden><ol><li>Sources + → Window Capture → “Streamer vs Chat · Twitch play” (this Chrome window) → tick Capture Audio.</li></ol></div><p>With Sound on stream on, START FIGHT plays the announcer and the OBS meter should move. M mutes and unmutes.</p><p>Enable Green background here; add a Chroma Key filter in OBS and choose green. Crop to the game frame and keep your webcam as a normal OBS camera source.</p></div><label class="switch-row"><input id="green-background" type="checkbox" role="switch"> Green background</label><button id="obs-done" type="button">Done, it's in OBS</button>${OBS_VIDEO_URL?`<a href="${OBS_VIDEO_URL}">Watch the 60 s OBS setup</a>`:''}</article></div><div class="permission-banner" id="permission-banner" hidden><span>Posting results and making clips need one more Twitch permission.</span><button id="twitch-reconnect">Reconnect once</button></div><section class="stream-extras"><h2>Stream extras <span>· Optional. Change them any time.</span></h2><div class="extras-grid">${extras.map(([id,title,body])=>`<label class="extra-tile" title="${body}" data-description="${body}"><span class="extra-title">${title}${id==='hosted-memory'?'<small class="session-opt-in">Turn on each session</small>':''}</span><span class="extra-pill" id="${id}-pill">Connect first</span><input id="${id}-toggle" type="checkbox" role="switch" disabled aria-label="${title}"></label>`).join('')}</div></section><details class="privacy-disclosure"><summary>What do these record? More about extras →</summary><p>Counts only: baseline chat rate (up to 10 minutes), fight rates, unique chatters and voters. No chat text or usernames in results. Identity hashes use a fresh in-memory salt per session. Remember my viewers is separate and optional: Twitch IDs, display names and vote counts are stored for 90 days; viewers can type !forgetme.</p></details><button id="show-results" hidden>End session &amp; copy results</button><pre id="play-results" hidden></pre><button id="copy-results" hidden>Copy results</button>`;}
export function updateHostedOnboarding(panel:HTMLElement,state:HostedOnboardingState){
 const el=<T extends HTMLElement>(id:string)=>panel.querySelector<T>(`#${id}`)!;
 for(const [id,index]of [['connect-step',1],['obs-step',2]] as const){const step=el(id),status=!state.connected?(index===1?'active':'future'):(index===1?'done':state.obsReady?'done':'active');step.dataset.state=status;if(status==='active')step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');step.querySelector('.step-number')!.textContent=status==='done'?'✓':String(index);}
 el('connect-step-body').textContent=state.connected?`Connected as ${state.login??'your channel'}`:state.notice??'Read your Twitch chat in this window.';
 el('twitch-connect').hidden=state.connected;el('twitch-disconnect').hidden=!state.connected;el('show-results').hidden=!state.connected;

 let permission=false;
 for(const [id,key,scope]of [['bot-results','bot','channel:bot'],['hosted-clips','clips','clips:edit'],['hosted-memory','memory',null],['hosted-forge','forge',null]] as const){const value=state[key];const missing=state.connected&&value.available&&scope!==null&&!state.scopes.includes(scope);permission||=missing;el(`${id}-pill`).textContent=!value.available?'Unavailable':!state.connected?'Connect first':missing?'Needs reconnect':value.enabled?'On':'Off';const toggle=el<HTMLInputElement>(`${id}-toggle`);toggle.disabled=!state.connected||!value.capable;toggle.checked=value.enabled;}
 el('permission-banner').hidden=!permission;
}

/** Feature notices live in their tile tooltip; no duplicate status paragraphs. */
export function setHostedExtraNotice(panel:HTMLElement,id:string,message:string){
 const tile=panel.querySelector<HTMLElement>(`#${id}-toggle`)?.closest<HTMLElement>('.extra-tile');
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
