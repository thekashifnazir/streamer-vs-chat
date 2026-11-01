export const VIDEO_URL='';
/** Move existing settings nodes rather than creating competing settings/safety state. */
export function mountDemoLanding(doc:Document){
 doc.body.classList.add('offline-demo-page');const get=(id:string)=>doc.getElementById(id)!;
 const intro=get('demo-intro');intro.innerHTML='<h1>Chat picks the attacks. You dodge them.</h1><p>This demo fakes the chat so you can try it in 10 seconds. No login.</p><button id="play-now" class="primary">PLAY NOW · KEYBOARD</button><div class="landing-links"><button id="demo-webcam" class="text-button">Use my webcam instead</button>'+(VIDEO_URL?`<a href="${VIDEO_URL}">Watch the 2-minute video</a>`:'')+'<a href="/play">Play with your real Twitch chat →</a></div><p class="landing-real-note">Real chat adds: go live from this page, results posted in chat, clips, Boss Forge and a voice corner coach between rounds.</p><p class="landing-options"><span id="landing-mode-label">Sound on · Medium</span> · <button id="demo-options" class="text-button" aria-controls="demo-more-options" aria-expanded="false">Options</button></p>';
 const setup=get('fight-setup');const more=doc.createElement('details');more.id='demo-more-options';more.innerHTML='<summary hidden>Options</summary>';intro.append(more);
 more.append(get('start-difficulty').closest('.setup-section')!,get('no-punch').closest('label')!);
 const loop=doc.getElementById('landing-loop');if(loop){intro.append(loop);const video=loop.querySelector('video');if(video&&doc.defaultView)startLandingLoop(doc.defaultView,video);}
 const sound=doc.createElement('label');sound.className='defence-only';sound.innerHTML='<input id="demo-sound" type="checkbox" role="switch" checked> Sound';more.append(sound);
 get('webcam-settings').querySelector('.webcam-actions')!.before(get('safety-card'));
 get('webcam-settings').querySelector('.webcam-header')!.append(get('posture').closest('label')!);
 setup.classList.add('demo-legacy-settings');get('fight-screen-heading').hidden=true;get('stage').hidden=true;
 get('demo-options').addEventListener('click',()=>{more.open=!more.open;get('demo-options').setAttribute('aria-expanded',String(more.open));});
 get('play-now').addEventListener('click',()=>{const source=get('input-source') as HTMLSelectElement;source.value='keyboard';source.dispatchEvent(new doc.defaultView!.Event('change'));get('start-fight').click();});
 get('demo-webcam').addEventListener('click',()=>{const source=get('input-source') as HTMLSelectElement;source.value='pose';source.dispatchEvent(new doc.defaultView!.Event('change'));get('open-webcam').click();});
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
