export type PlayStep='twitch'|'live'|'fight';
export type PlayFlow={connected:boolean;live:boolean;obs:boolean;skipped:boolean;preparing?:boolean};
export function playStep(state:PlayFlow):PlayStep{return !state.connected?'twitch':state.live||state.obs||state.skipped?'fight':'live';}
/** Presentation only: retain original settings nodes/listeners and one safety control. */
export function mountHostedFlow(doc:Document){
 const get=(id:string)=>doc.getElementById(id)!;
 doc.body.classList.add('hosted-flow');
 const setup=get('fight-setup'),choices=doc.createElement('section');choices.id='defend-choice';choices.innerHTML='<h1>HOW WILL YOU DEFEND?</h1><div class="defend-cards"><button type="button" data-defend="pose"><small>BEST ON STREAM</small><strong>WEBCAM</strong><span>Your real guard and lean. 30 s setup.</span></button><button type="button" data-defend="keyboard"><small>FASTEST</small><strong>KEYBOARD</strong><span>K guard · A/D lean · J punch. Starts now.</span></button></div>';
 setup.prepend(choices);
 const more=doc.createElement('details');more.id='play-more-options';more.innerHTML='<summary>More options ▸</summary>';setup.append(more);
 for(const id of ['start-difficulty','no-punch','stream-sound']){const input=get(id);more.append(input.closest('.setup-section,.defence-only')!);}
 for(const selector of ['.stream-extras','.privacy-disclosure']){const node=doc.querySelector(selector);if(node)more.append(node);}
 // Move posture's source control into the webcam header; its existing toggle is shared.
 const posture=get('posture');get('webcam-settings').querySelector('.webcam-header')!.append(posture.closest('.setup-section')!.querySelector('select')!.closest('label')!);
 posture.closest('label')!.classList.add('source-only');
 const oldPosture=get('fight-setup').querySelector('[data-option-for=posture]')?.closest('.setup-section');oldPosture?.remove();
 get('webcam-settings').querySelector('.webcam-actions')!.before(get('safety-card'));
 get('input-source').closest('.setup-section')!.classList.add('play-source-legacy');
 get('setup-actions').classList.add('play-source-legacy');setup.querySelector('h2')?.classList.add('play-source-legacy');
 for(const button of choices.querySelectorAll<HTMLButtonElement>('[data-defend]'))button.addEventListener('click',()=>{
  const source=get('input-source') as HTMLSelectElement;source.value=button.dataset.defend!;source.dispatchEvent(new doc.defaultView!.Event('change'));
  if(source.value==='pose')get('open-webcam').click();else get('start-fight').click();
 });
 const groups=doc.createElement('ol');groups.className='play-calibration-groups';groups.innerHTML='<li class="active" data-calibration-group="0">Get in frame <small data-group-instruction></small></li><li data-calibration-group="1">Guard up</li><li data-calibration-group="2">Lean left, then right</li>';
 doc.querySelector('.webcam-checklist')!.before(groups);
 const hint=doc.createElement('p');hint.id='no-body-tips';hint.hidden=true;hint.textContent='Step back, put light in front of you, and keep both wrists in view.';get('webcam-preview').after(hint);
 let latest:PlayFlow={connected:false,live:false,obs:false,skipped:false};
 function update(state:PlayFlow){latest=state;const step=playStep(state);doc.body.dataset.playStep=step;doc.body.dataset.broadcastPreparing=String(!!state.preparing);
  for(const item of doc.querySelectorAll<HTMLElement>('[data-play-step]')){const order=['twitch','live','fight'];const position=order.indexOf(item.dataset.playStep!);const current=order.indexOf(step);item.dataset.state=position<current?'done':position===current?'current':'future';if(position===current)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');}
  get('connect-step').hidden=step!=='twitch';get('go-live-step').hidden=step!=='live';get('fight-setup').hidden=step!=='fight';get('broadcast-bar').hidden=!state.live;
  for(const id of ['fight-screen-heading','stage','how-to-play'])get(id).hidden=step!=='fight'&&!(id==='stage'&&state.preparing);
  const header=doc.querySelector<HTMLElement>('.demo-tag')!;header.classList.toggle('broadcast-live',state.live);if(state.live)header.textContent='● LIVE';
  const controls=doc.querySelector('.demo-controls')!;let dot=controls.querySelector<HTMLElement>('.broadcast-dot');if(!dot){dot=doc.createElement('span');dot.className='broadcast-dot';dot.textContent='● LIVE';controls.prepend(dot);}dot.hidden=!state.live;
 }
 update(latest);return {update};
}
