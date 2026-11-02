import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
import {mountHostedFlow,playStep} from './hosted-flow';
import {mountFightSetup} from './setup-ui';
it('advances only after connect and live, OBS done or explicit skip',()=>{
 const state={connected:false,live:false,obs:false,skipped:false};expect(playStep(state)).toBe('twitch');expect(playStep({...state,connected:true})).toBe('live');for(const key of ['live','obs','skipped'])expect(playStep({...state,connected:true,[key]:true})).toBe('fight');expect(playStep({...state,live:true})).toBe('twitch');
});
it('moves the original options/safety/posture once, leaves one primary path and shows live feedback',()=>{
 const dom=new JSDOM(readFileSync(new URL('../play/index.html',import.meta.url),'utf8'),{url:'https://game.example/play'}),doc=dom.window.document;
 const flow=mountHostedFlow(doc);const get=(id:string)=>doc.getElementById(id)!;
 expect(get('fight-setup').hidden).toBe(true);expect(get('go-live-step').hidden).toBe(true);expect(get('stage').hidden).toBe(true);expect(doc.querySelectorAll('#clear-space')).toHaveLength(1);expect(get('clear-space').closest('#webcam-settings')).not.toBeNull();expect(get('posture').closest('#webcam-settings')).not.toBeNull();expect(get('start-difficulty').closest('#play-more-options')).not.toBeNull();
 flow.update({connected:true,live:false,obs:false,skipped:false});expect(get('go-live-step').hidden).toBe(false);expect(get('fight-setup').hidden).toBe(true);
 // Step 2 already shows the stage (as the small WHAT VIEWERS WILL SEE preview); step 3 is named for what the streamer does.
 expect(get('stage').hidden).toBe(false);expect(doc.querySelector('.play-step-bar [data-play-step=fight]')!.textContent).toBe('3 · Set up your fight');expect(get('stage-preview').nextElementSibling).toBe(get('stage'));expect(get('stage-preview').contains(get('stage'))).toBe(false);
 flow.update({connected:true,live:false,obs:false,skipped:false,preparing:true});expect(get('stage').hidden).toBe(false);
 flow.update({connected:true,live:true,obs:false,skipped:false});expect(get('fight-setup').hidden).toBe(false);expect(get('go-live-step').hidden).toBe(true);expect(get('broadcast-bar').hidden).toBe(false);expect(doc.querySelector('.demo-tag')!.textContent).toBe('● LIVE');expect(doc.querySelector<HTMLElement>('.broadcast-dot')!.hidden).toBe(false);
 flow.update({connected:true,live:false,obs:false,skipped:false});expect(get('go-live-step').hidden).toBe(false);dom.window.close();
});
it('a defend card only picks; the named next button starts keyboard without the webcam safety checkbox; webcam retains it and all calibration stages',()=>{
 const dom=new JSDOM(readFileSync(new URL('../play/index.html',import.meta.url),'utf8'),{url:'https://game.example/play'}),doc=dom.window.document;vi.stubGlobal('Event',dom.window.Event);
 const onStart=vi.fn(),onWebcamStart=vi.fn();mountFightSetup(doc,{onStart,onWebcamStart,keyboardRequiresClearSpace:false,simplifiedCalibration:true});mountHostedFlow(doc);
 const next=doc.getElementById('play-next')!,card=(value:string)=>doc.querySelector<HTMLButtonElement>(`[data-defend=${value}]`)!;
 card('keyboard').click();expect(onStart).not.toHaveBeenCalled();expect(card('keyboard').getAttribute('aria-pressed')).toBe('true');expect(next.textContent).toBe('START PRACTICE →');
 doc.body.classList.add('trainer-mode');doc.querySelector<HTMLButtonElement>('[data-defend=keyboard]')!.click();expect(next.textContent).toBe('START WORKOUT →');doc.body.classList.remove('trainer-mode');
 next.click();expect(onStart).toHaveBeenCalledOnce();expect((doc.getElementById('clear-space') as HTMLInputElement).checked).toBe(false);
 card('pose').click();expect(doc.getElementById('webcam-settings')!.hidden).toBe(true);expect(next.textContent).toBe('SET UP MY WEBCAM →');expect(card('pose').getAttribute('aria-pressed')).toBe('true');
 next.click();expect(doc.getElementById('webcam-settings')!.hidden).toBe(false);expect((doc.getElementById('play-webcam') as HTMLButtonElement).disabled).toBe(true);expect(doc.querySelectorAll('[data-calibration-group]')).toHaveLength(5);expect(doc.querySelectorAll('[data-calibration-step]')).toHaveLength(7);dom.window.close();vi.unstubAllGlobals();
});
it('step 3 reads mode, defence, then a visible extras row; PLAIN becomes Steady bars in More options and mirrors the HUD switch',()=>{
 const dom=new JSDOM(readFileSync(new URL('../play/index.html',import.meta.url),'utf8'),{url:'https://game.example/play'}),doc=dom.window.document;
 const get=(id:string)=>doc.getElementById(id)!;get('game-hud').innerHTML='<footer><div class="hud-options"><label><input data-id="plain" type="checkbox"> PLAIN</label></div></footer>';
 const mode=doc.createElement('div');mode.className='setup-section trainer-mode-choice';mode.innerHTML='<h3>GAME MODE</h3>';get('fight-setup').querySelector('h2')!.after(mode);
 mountHostedFlow(doc);const setup=get('fight-setup'),order=['.trainer-mode-choice','#defend-choice','.stream-extras','#play-more-options'].map(selector=>setup.querySelector(selector)!);
 for(let i=1;i<order.length;i++)expect(order[i-1]!.compareDocumentPosition(order[i]!)&dom.window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(mode.querySelector('h3')!.textContent).toBe('CHOOSE YOUR FIGHT');expect(doc.querySelector('.stream-extras')!.closest('#play-more-options')).toBeNull();expect(doc.querySelector('.privacy-disclosure')!.closest('#play-more-options')).not.toBeNull();
 const hud=doc.querySelector<HTMLInputElement>('[data-id=plain]')!,steady=get('steady-bars') as HTMLInputElement;let changes=0;hud.addEventListener('change',()=>changes++);
 expect(steady.closest('#play-more-options')).not.toBeNull();expect(hud.closest('label')!.hidden).toBe(false);expect(doc.body.classList.contains('play-plain-moved')).toBe(true);
 steady.checked=true;steady.dispatchEvent(new dom.window.Event('change'));expect(hud.checked).toBe(true);expect(changes).toBe(1);
 hud.checked=false;hud.dispatchEvent(new dom.window.Event('change'));expect(steady.checked).toBe(false);dom.window.close();
});
it('step 3 puts extras chips, one next button and how to play (Boss Fight plus PUNCH, Crowd Trainer moves) under the choices',()=>{
 const dom=new JSDOM(readFileSync(new URL('../play/index.html',import.meta.url),'utf8'),{url:'https://game.example/play'}),doc=dom.window.document;
 mountHostedFlow(doc);const get=(id:string)=>doc.getElementById(id)!,setup=get('fight-setup'),row=setup.querySelector('.play-chip-row')!;
 expect([...row.querySelectorAll('.extra-title')].map(title=>title.firstChild!.textContent)).toEqual(['Results in chat','KO clips','Boss Forge','Remember viewers']);
 for(const id of ['bot-results','hosted-clips','hosted-forge','hosted-memory']){expect(row.querySelector(`#${id}-toggle`)).not.toBeNull();expect(row.querySelector(`#${id}-pill`)).not.toBeNull();expect(get(`${id}-toggle`).closest('label')!.title.length).toBeGreaterThan(10);}
 expect(row.lastElementChild!.id).toBe('play-more-options');expect(get('play-more-options').querySelector('.extras-explained')!.textContent).toContain('As streamervschatbot.');
 expect(row.nextElementSibling!.id).toBe('play-next');expect(get('play-next').nextElementSibling!.id).toBe('how-to-play');
 expect(get('how-to-play').querySelector('.play-moves #attack-rows')).not.toBeNull();expect(get('how-to-play').querySelector('[data-defence=punch] h3')!.textContent).toBe('Punch');
 expect([...get('how-to-play').querySelectorAll('.play-trainer-moves h3')].map(h=>h.textContent)).toEqual(['Lead punch','Cross','Slip','Guard']);
 const noPunch=get('no-punch') as HTMLInputElement;noPunch.checked=true;noPunch.dispatchEvent(new dom.window.Event('change'));expect(get('how-to-play').querySelector<HTMLElement>('[data-defence=punch]')!.hidden).toBe(true);
 dom.window.close();
});
