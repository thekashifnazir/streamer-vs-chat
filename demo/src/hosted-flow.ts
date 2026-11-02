export type PlayStep='twitch'|'live'|'fight';
/** Steps 2-3 and webcam setup with nothing running: the captured #stage shows as a small preview top right (CSS scales it; it stays rendered on screen for Element Capture). */
export const STAGE_PREVIEW='.hosted-flow:is([data-play-step=live],[data-play-step=fight]):not(.stream-compact):not(.fight-started)';
// How-to-play stick figures, in the defence cards' 240x150 frame and stroke (setup-ui.ts commands()).
const FIG={guard:'<path d="m120 13 36 14v28c0 23-36 39-36 39S84 78 84 55V27z" fill="#ffdc43" fill-opacity=".12" stroke-width="2"/><circle cx="120" cy="40" r="15"/><path d="M120 57v40m0-31-23 15 5-31m18 16 23 15-5-31M120 97l-23 30m23-30 23 30"/>',lean:'<g transform="rotate(-18 120 100)"><circle cx="120" cy="40" r="15"/><path d="M120 57v40m0-31-23 15m23-15 23 15M120 97l-23 30m23-30 23 30"/></g>',punch:'<circle cx="100" cy="40" r="15"/><path d="M100 57v40m0-31-20 15 5-31m15 16h60M100 97l-23 30m23-30 23 30"/>'};
const HIT='<g fill="none" stroke="#ff268a" stroke-width="5" stroke-linecap="round"><path d="M176 55l14-10m-14 21h18m-18 10 14 10"/></g>';
const figure=(body:string,label:string,mirror=false)=>`<svg viewBox="0 0 240 150" role="img" aria-label="${label}"><g${mirror?' transform="translate(240 0) scale(-1 1)"':''}><g fill="none" stroke="#ffdc43" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${body}</g>${body===FIG.punch?HIT:''}</g></svg>`;
const moveCard=(key:string,title:string,body:string,svg:string,data='')=>`<article class="defence-card play-move-card"${data}><div class="defence-picture">${svg}</div><div class="defence-title"><kbd>${key}</kbd><h3>${title}</h3></div><p>${body}</p></article>`;
export type PlayFlow={connected:boolean;live:boolean;obs:boolean;skipped:boolean;preparing?:boolean};
export function playStep(state:PlayFlow):PlayStep{return !state.connected?'twitch':state.live||state.obs||state.skipped?'fight':'live';}
/** Presentation only: retain original settings nodes/listeners and one safety control. */
export function mountHostedFlow(doc:Document){
 const get=(id:string)=>doc.getElementById(id)!;
 doc.body.classList.add('hosted-flow');
 const setup=get('fight-setup'),choices=doc.createElement('section');choices.id='defend-choice';choices.innerHTML='<h1>HOW WILL YOU DEFEND?</h1><div class="defend-cards"><button type="button" data-defend="pose"><small>BEST ON STREAM</small><strong>WEBCAM</strong><span>Your real guard and lean. 30 s setup.</span></button><button type="button" data-defend="keyboard"><small>FASTEST</small><strong>KEYBOARD</strong><span>K guard · A/D lean · J punch. Quick practice, then fight.</span></button></div>';
 setup.prepend(choices);
 const more=doc.createElement('details');more.id='play-more-options';more.innerHTML='<summary>More options ▸</summary>';setup.append(more);
 for(const id of ['start-difficulty','no-punch','stream-sound']){const input=get(id);more.append(input.closest('.setup-section,.defence-only')!);}
 // Step 3 reads top to bottom: game mode, how you defend, what your stream gets; difficulty, sound and voices stay in More options.
 const mode=setup.querySelector<HTMLElement>('.trainer-mode-choice');if(mode){choices.before(mode);const title=mode.querySelector('h3');if(title)title.textContent='CHOOSE YOUR FIGHT';}
 const extras=doc.querySelector('.stream-extras');if(extras)more.before(extras);
 const privacy=doc.querySelector('.privacy-disclosure');if(privacy)more.append(privacy);
 // PLAIN sits in the HUD footer, which goes on stream. Hide it there (CSS) and offer it here in plain words, mirroring the HUD input so prefs keep working.
 const plain=doc.querySelector<HTMLInputElement>('#game-hud [data-id=plain]');
 if(plain){const row=doc.createElement('label');row.className='defence-only';row.innerHTML='<input id="steady-bars" type="checkbox" role="switch" /><span><strong>Steady bars</strong><br />Health, hype and vote bars jump to each new value instead of sliding.</span>';more.append(row);doc.body.classList.add('play-plain-moved');
  const mirror=row.querySelector('input')!,sync=()=>{mirror.checked=plain.checked;};plain.addEventListener('change',sync);sync();
  mirror.addEventListener('change',()=>{plain.checked=mirror.checked;plain.dispatchEvent(new doc.defaultView!.Event('change'));});}
 // Move posture's source control into the webcam header; its existing toggle is shared.
 const posture=get('posture');get('webcam-settings').querySelector('.webcam-header')!.append(posture.closest('.setup-section')!.querySelector('select')!.closest('label')!);
 posture.closest('label')!.classList.add('source-only');
 const oldPosture=get('fight-setup').querySelector('[data-option-for=posture]')?.closest('.setup-section');oldPosture?.remove();
 get('webcam-settings').querySelector('.webcam-actions')!.before(get('safety-card'));
 get('input-source').closest('.setup-section')!.classList.add('play-source-legacy');
 get('setup-actions').classList.add('play-source-legacy');setup.querySelector('h2')?.classList.add('play-source-legacy');
 // A defend card only picks; the one next button names and does the next step (webcam setup, or keyboard practice / the workout).
 const source=get('input-source') as HTMLSelectElement;
 for(const button of choices.querySelectorAll<HTMLButtonElement>('[data-defend]'))button.addEventListener('click',()=>{if(source.value!==button.dataset.defend){source.value=button.dataset.defend!;source.dispatchEvent(new doc.defaultView!.Event('change'));}sync();});
 // Extras as one row of chips beside More options; each chip keeps its input, so the toggles and e2e hooks are unchanged.
 const chips=doc.createElement('div');chips.className='play-chip-row';more.before(chips);if(extras)chips.append(extras);chips.append(more);
 const explained=doc.createElement('dl');explained.className='extras-explained';explained.innerHTML='<dt>What the extras do</dt>';
 for(const tile of doc.querySelectorAll<HTMLElement>('.stream-extras .extra-tile')){const item=doc.createElement('dd');const name=doc.createElement('strong');name.textContent=tile.querySelector('.extra-title')?.firstChild?.textContent??'';item.append(name,` ${tile.querySelector('.extra-meaning')?.textContent??''} ${tile.dataset.detail??''}`);explained.append(item);}
 more.append(explained);
 const next=doc.createElement('button');next.type='button';next.id='play-next';next.className='play-next';chips.after(next);
 next.addEventListener('click',()=>{if(source.value==='pose')get('open-webcam').click();else get('start-fight').click();});
 // How to play sits under the choices: the defence cards plus PUNCH for Boss Fight, the four Crowd Trainer moves when that mode is picked.
 const how=get('how-to-play'),rows=get('attack-rows');next.after(how);
 const title=doc.createElement('p');title.className='play-how-title';title.innerHTML='HOW TO PLAY · <span data-how="boss">BOSS FIGHT</span><span data-how="trainer">CROWD TRAINER · CHAT TYPES !12 · !12s · !faster</span>';how.prepend(title);
 const moves=doc.createElement('div');moves.className='play-moves';rows.before(moves);
 const punch=doc.createElement('div');punch.innerHTML=moveCard('J','Punch','After a clean block: COUNTER · PUNCH NOW. Bonus damage.',figure(FIG.punch,'Punch'),' data-defence="punch"');moves.append(rows,punch.firstElementChild!);
 const trainerMoves=doc.createElement('div');trainerMoves.className='play-moves play-trainer-moves';trainerMoves.innerHTML=moveCard('1','Lead punch','A jab with your front hand.',figure(FIG.punch,'Lead punch'))+moveCard('2','Cross','A straight punch with your rear hand.',figure(FIG.punch,'Rear punch',true))+moveCard('S','Slip','Lean either way, away from the punch.',figure(FIG.lean,'Slip'))+moveCard('G','Guard','Fists up to your face and hold.',figure(FIG.guard,'Guard'));moves.after(trainerMoves);
 const keyboardCaps:[HTMLElement,string,string][]=[[moves.querySelector<HTMLElement>('[data-defence=punch] kbd')!,'J','Punch'],...[...trainerMoves.querySelectorAll<HTMLElement>('kbd')].map((cap,index)=>[cap,cap.textContent!,['Jab','Punch','Lean','Fists up'][index]!] as [HTMLElement,string,string])];
 function sync(){const pose=source.value==='pose',trainer=doc.body.classList.contains('trainer-mode');
  for(const button of choices.querySelectorAll<HTMLButtonElement>('[data-defend]')){const on=button.dataset.defend===source.value;button.classList.toggle('selected',on);button.setAttribute('aria-pressed',String(on));}
  next.textContent=pose?'SET UP MY WEBCAM →':trainer?'START WORKOUT →':'START PRACTICE →';
  for(const [cap,key,move] of keyboardCaps){cap.textContent=pose?move:key;cap.classList.toggle('pose-cue',pose);}
  (moves.querySelector<HTMLElement>('[data-defence=punch]')!).hidden=(get('no-punch') as HTMLInputElement).checked;}
 for(const id of ['input-source','no-punch'])get(id).addEventListener('change',sync);
 for(const button of doc.querySelectorAll<HTMLButtonElement>('[data-trainer-mode]'))button.addEventListener('click',sync);
 const hint=doc.createElement('p');hint.id='no-body-tips';hint.hidden=true;hint.textContent='Step back, put light in front of you, and keep both wrists in view.';get('webcam-preview').after(hint);
 // The preview's label and a full-size button sit outside #stage, so they never go on stream.
 const preview=doc.createElement('aside');preview.id='stage-preview';preview.className='stage-preview';preview.innerHTML='<p class="stage-preview-label"><span data-preview="before">WHAT VIEWERS WILL SEE</span><span data-preview="live">● ON STREAM NOW</span></p><div class="stage-preview-frame" aria-hidden="true"></div><p class="stage-preview-note">Viewers see this card until your fight starts.</p><button type="button" id="stage-preview-open" class="text-button">See it full size</button>';get('stage').before(preview);
 let latest:PlayFlow={connected:false,live:false,obs:false,skipped:false};
 function update(state:PlayFlow){latest=state;const step=playStep(state);doc.body.dataset.playStep=step;doc.body.dataset.broadcastPreparing=String(!!state.preparing);
  for(const item of doc.querySelectorAll<HTMLElement>('[data-play-step]')){const order=['twitch','live','fight'];const position=order.indexOf(item.dataset.playStep!);const current=order.indexOf(step);item.dataset.state=position<current?'done':position===current?'current':'future';if(position===current)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');}
  get('connect-step').hidden=step!=='twitch';get('go-live-step').hidden=step!=='live';get('fight-setup').hidden=step!=='fight';get('broadcast-bar').hidden=!state.live;
  for(const id of ['fight-screen-heading','how-to-play'])get(id).hidden=step!=='fight';get('stage').hidden=step==='twitch';sync();
  const header=doc.querySelector<HTMLElement>('.demo-tag')!;header.classList.toggle('broadcast-live',state.live);if(state.live)header.textContent='● LIVE';
  const controls=doc.querySelector('.demo-controls')!;let dot=controls.querySelector<HTMLElement>('.broadcast-dot');if(!dot){dot=doc.createElement('span');dot.className='broadcast-dot';dot.textContent='● LIVE';controls.prepend(dot);}dot.hidden=!state.live;
 }
 update(latest);return {update};
}
