export const VIDEO_URL='';
/** Move existing settings nodes rather than creating competing settings/safety state. */
export function mountDemoLanding(doc:Document){
 doc.body.classList.add('offline-demo-page');const get=(id:string)=>doc.getElementById(id)!;
 const intro=get('demo-intro');intro.innerHTML='<h1>Chat picks the attacks. You dodge them.</h1><p>This demo fakes the chat so you can try it in 10 seconds. No login.</p><button id="play-now" class="primary">PLAY NOW · KEYBOARD</button><div class="landing-links"><button id="demo-webcam" class="text-button">Use my webcam instead</button>'+(VIDEO_URL?`<a href="${VIDEO_URL}">Watch the 2-minute video</a>`:'')+'<a href="/play">Play with your real Twitch chat →</a></div><p class="landing-options"><span id="landing-mode-label">Sound on · Medium</span> · <button id="demo-options" class="text-button" aria-controls="demo-more-options" aria-expanded="false">Options</button></p>';
 const setup=get('fight-setup');const more=doc.createElement('details');more.id='demo-more-options';more.innerHTML='<summary hidden>Options</summary>';intro.append(more);
 more.append(get('start-difficulty').closest('.setup-section')!,get('no-punch').closest('label')!);
 const sound=doc.createElement('label');sound.className='defence-only';sound.innerHTML='<input id="demo-sound" type="checkbox" role="switch" checked> Sound';more.append(sound);
 get('webcam-settings').querySelector('.webcam-actions')!.before(get('safety-card'));
 get('webcam-settings').querySelector('.webcam-header')!.append(get('posture').closest('label')!);
 setup.classList.add('demo-legacy-settings');get('fight-screen-heading').hidden=true;get('stage').hidden=true;
 get('demo-options').addEventListener('click',()=>{more.open=!more.open;get('demo-options').setAttribute('aria-expanded',String(more.open));});
 get('play-now').addEventListener('click',()=>{const source=get('input-source') as HTMLSelectElement;source.value='keyboard';source.dispatchEvent(new doc.defaultView!.Event('change'));get('start-fight').click();});
 get('demo-webcam').addEventListener('click',()=>{const source=get('input-source') as HTMLSelectElement;source.value='pose';source.dispatchEvent(new doc.defaultView!.Event('change'));get('open-webcam').click();});
}
