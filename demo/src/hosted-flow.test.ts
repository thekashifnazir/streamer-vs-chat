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
 expect(get('fight-setup').hidden).toBe(true);expect(get('go-live-step').hidden).toBe(true);expect(doc.querySelectorAll('#clear-space')).toHaveLength(1);expect(get('clear-space').closest('#webcam-settings')).not.toBeNull();expect(get('posture').closest('#webcam-settings')).not.toBeNull();expect(get('start-difficulty').closest('#play-more-options')).not.toBeNull();
 flow.update({connected:true,live:false,obs:false,skipped:false});expect(get('go-live-step').hidden).toBe(false);expect(get('fight-setup').hidden).toBe(true);
 flow.update({connected:true,live:false,obs:false,skipped:false,preparing:true});expect(get('stage').hidden).toBe(false);
 flow.update({connected:true,live:true,obs:false,skipped:false});expect(get('fight-setup').hidden).toBe(false);expect(get('go-live-step').hidden).toBe(true);expect(get('broadcast-bar').hidden).toBe(false);expect(doc.querySelector('.demo-tag')!.textContent).toBe('● LIVE');expect(doc.querySelector<HTMLElement>('.broadcast-dot')!.hidden).toBe(false);
 flow.update({connected:true,live:false,obs:false,skipped:false});expect(get('go-live-step').hidden).toBe(false);dom.window.close();
});
it('keyboard starts without the webcam safety checkbox; webcam retains it and all calibration stages',()=>{
 const dom=new JSDOM(readFileSync(new URL('../play/index.html',import.meta.url),'utf8'),{url:'https://game.example/play'}),doc=dom.window.document;vi.stubGlobal('Event',dom.window.Event);
 const onStart=vi.fn(),onWebcamStart=vi.fn();mountFightSetup(doc,{onStart,onWebcamStart,keyboardRequiresClearSpace:false,simplifiedCalibration:true});mountHostedFlow(doc);
 doc.querySelector<HTMLButtonElement>('[data-defend=keyboard]')!.click();expect(onStart).toHaveBeenCalledOnce();expect((doc.getElementById('clear-space') as HTMLInputElement).checked).toBe(false);
 doc.querySelector<HTMLButtonElement>('[data-defend=pose]')!.click();expect(doc.getElementById('webcam-settings')!.hidden).toBe(false);expect((doc.getElementById('play-webcam') as HTMLButtonElement).disabled).toBe(true);expect(doc.querySelectorAll('[data-calibration-group]')).toHaveLength(3);expect(doc.querySelectorAll('[data-calibration-step]')).toHaveLength(5);dom.window.close();vi.unstubAllGlobals();
});
