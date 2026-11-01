export const VIDEO_URL='';
const icon=(path:string)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
const KEYBOARD_ICON=icon('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),WEBCAM_ICON=icon('<circle cx="12" cy="10" r="7"/><circle cx="12" cy="10" r="2.5"/><path d="M8 21h8M12 17v4"/>'),PLAY_ICON=icon('<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>');
const TWITCH_ICON=icon('<path d="M4 3h17v11l-5 5h-4l-3 3H7v-3H4z"/><path d="M11 8v4M16 8v4"/>');
/** Phones, tablets and very narrow windows: webcam play needs a computer, so they start on keyboard/tap and the Twitch
 * button says it needs a computer. style.css uses the same query (landing hero block). */
export const PHONE_QUERY='(max-width: 760px), (hover: none) and (pointer: coarse)';
/** The landing's Keyboard/Webcam default for a visitor with no saved choice: webcam on a computer. No matchMedia means keyboard. */
export function defaultLandingInput(win:Pick<Window,'matchMedia'>):'keyboard'|'pose'{const phone=win.matchMedia?.(PHONE_QUERY);return phone&&!phone.matches?'pose':'keyboard';}
// No chat command codes here: the hero says what happens in plain words. Boss art is a CSS frame of the boss sheet the HUD already loads.
// Two paths: the primary one is your real Twitch stream (/play); the demo below it is clearly the fake-chat try-out, webcam first.
const LANDING_HTML=`<div class="landing-main"><div class="landing-mast"><h1 class="landing-mark"><span class="mark-streamer">STREAMER</span> <span class="mark-chat"><b>VS</b> CHAT</span></h1><span class="landing-boss boss-frame" role="img" aria-label="The Chat Golem, the boss, winding up a super punch"></span></div>
<p class="landing-lede">A boxing game for your Twitch stream. Your chat picks the punches. You dodge them on your webcam.</p><div id="landing-modes" class="landing-modes"></div></div>
<div class="landing-side"><div class="landing-live"><a id="play-twitch" class="landing-twitch" href="/play">${TWITCH_ICON}<span class="twitch-label"><span class="twitch-main">PLAY ON YOUR TWITCH STREAM →</span><span class="twitch-phone">Needs a computer with Chrome and a webcam</span></span></a>
<p class="landing-live-note">Connect Twitch and go live from this page. Your viewers vote in chat. Free · Chrome on a computer.</p></div>
<section class="landing-try" aria-labelledby="landing-try-title"><div class="landing-try-head"><h2 id="landing-try-title" class="landing-try-title"><b>Try it now</b> · fake chat, no login</h2><p class="landing-options"><span id="landing-mode-label">Sound on · Medium</span> · <button id="demo-options" class="text-button" aria-controls="demo-more-options" aria-expanded="false">Options</button></p></div><div class="landing-play"><div class="landing-input" role="group" aria-label="How you play"><button id="demo-webcam" type="button" data-landing-input="pose" aria-pressed="false">${WEBCAM_ICON}<span>Webcam<small><span class="for-boss">Dodge</span><span class="for-trainer">Punch and slip</span> with your real body</small></span></button><button id="demo-keyboard" type="button" data-landing-input="keyboard" aria-pressed="true">${KEYBOARD_ICON}<span>Keyboard<small>No webcam? Use the keyboard</small></span></button></div>
<button id="play-now" class="primary" type="button">${PLAY_ICON}<span class="play-label"><span class="play-main">TRY THE DEMO</span><span class="play-sep"> · </span><span class="play-sub">KEYBOARD</span></span></button></div>
${VIDEO_URL?`<div class="landing-links"><a href="${VIDEO_URL}">Watch the 2-minute video</a></div>`:''}</section></div>
<section class="landing-how" aria-labelledby="landing-how-title"><h2 id="landing-how-title">HOW IT WORKS</h2><ol class="how-boss"><li><b>1</b><span><strong>Chat votes</strong> the boss's next punch</span></li><li><b>2</b><span><strong>You defend</strong> guard up, or lean left or right</span></li><li><b>3</b><span><strong>Knock him out</strong> every block wears him down</span></li></ol><ol class="how-trainer"><li><b>1</b><span><strong>Chat calls the combo</strong> viewers vote what you throw next</span></li><li><b>2</b><span><strong>You throw it</strong> punch, slip and guard on cue</span></li><li><b>3</b><span><strong>Three rounds</strong> then your workout summary</span></li></ol></section>`;
/** Move existing settings nodes rather than creating competing settings/safety state. */
export function mountDemoLanding(doc:Document){
 doc.body.classList.add('offline-demo-page');const get=(id:string)=>doc.getElementById(id)!;
 // Hero: wordmark, the pitch and the mode cards on the left; PLAY ON YOUR TWITCH STREAM, the "Try it now" demo block and the clip on the right.
 const intro=get('demo-intro');intro.innerHTML=LANDING_HTML;const side=intro.querySelector('.landing-side')!;
 const setup=get('fight-setup');const more=doc.createElement('details');more.id='demo-more-options';more.innerHTML='<summary hidden>Options</summary>';side.querySelector('.landing-try')!.append(more);
 more.append(get('start-difficulty').closest('.setup-section')!,get('no-punch').closest('label')!);
 // MORE TO TRY (Boss Forge, share link, 5-second rehearsal) is off the homepage (Kash, 1 Nov); its code still mounts there, hidden.
 const extras=doc.getElementById('more-to-try');if(extras)extras.hidden=true;
 const loop=doc.getElementById('landing-loop');if(loop){side.append(loop);const video=loop.querySelector('video');if(video&&doc.defaultView)startLandingLoop(doc.defaultView,video);}
 const sound=doc.createElement('label');sound.className='defence-only';sound.innerHTML='<input id="demo-sound" type="checkbox" role="switch" checked> Sound';more.append(sound);
 get('webcam-settings').querySelector('.webcam-actions')!.before(get('safety-card'));
 get('webcam-settings').querySelector('.webcam-header')!.append(get('posture').closest('label')!);
 setup.classList.add('demo-legacy-settings');get('fight-screen-heading').hidden=true;get('stage').hidden=true;
 get('demo-options').addEventListener('click',()=>{more.open=!more.open;get('demo-options').setAttribute('aria-expanded',String(more.open));});
 // Keyboard / Webcam is one remembered choice (the prefs `input` field rides on #input-source); TRY THE DEMO follows it.
 const source=get('input-source') as HTMLSelectElement,change=()=>source.dispatchEvent(new doc.defaultView!.Event('change'));
 const syncInput=()=>{for(const button of intro.querySelectorAll<HTMLElement>('[data-landing-input]'))button.setAttribute('aria-pressed',String(button.dataset.landingInput===source.value));intro.querySelector('.play-sub')!.textContent=source.value==='pose'?'WEBCAM':'KEYBOARD';};
 source.addEventListener('change',syncInput);syncInput();
 for(const button of intro.querySelectorAll<HTMLButtonElement>('[data-landing-input]'))button.addEventListener('click',()=>{if(source.value===button.dataset.landingInput)return;source.value=button.dataset.landingInput!;change();});
 get('play-now').addEventListener('click',()=>{if(source.value==='pose'){get('open-webcam').click();return;}source.value='keyboard';change();get('start-fight').click();});
}
/** The gameplay loop starts only after the page has loaded and while it is on screen, so it never
 * competes with first paint. Reduced motion keeps the poster frame and never fetches the video. */
export function startLandingLoop(win:Window,video:HTMLVideoElement,{delayMs=600}:{delayMs?:number}={}){
 const reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 let visible=true,started=false;
 const sync=()=>{if(!started)return;if(visible&&!reduced?.matches)void video.play()?.catch(()=>{});else video.pause();};
 const begin=()=>{
  if(started||reduced?.matches)return;started=true;video.preload='auto';video.autoplay=true;
  const Observer=(win as Window&typeof globalThis).IntersectionObserver;
  if(Observer)new Observer(entries=>{visible=entries.some(entry=>entry.isIntersecting);sync();}).observe(video);
  sync();
 };
 reduced?.addEventListener?.('change',()=>{if(reduced.matches)video.pause();else if(started)sync();else begin();});
 const schedule=()=>win.setTimeout(begin,delayMs);
 if(win.document.readyState==='complete')schedule();else win.addEventListener('load',schedule,{once:true});
}
