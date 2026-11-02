import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
import {mountFightSetup,WEBCAM_START_WAIT} from './setup-ui';
import {mountHostedFlow} from './hosted-flow';
// Kash, 2 Nov: the webcam calibration screen is the same on / and /play; only the privacy/stream sentence may differ.
function render(page:'index.html'|'play/index.html'){
 const dom=new JSDOM(readFileSync(new URL(`../${page}`,import.meta.url),'utf8'),{url:`https://game.example/${page==='index.html'?'':'play'}`}),doc=dom.window.document;vi.stubGlobal('Event',dom.window.Event);
 mountFightSetup(doc,{onStart:()=>{},onWebcamStart:()=>{},keyboardRequiresClearSpace:false,simplifiedCalibration:page!=='index.html'});if(page!=='index.html')mountHostedFlow(doc);
 const webcam=doc.getElementById('webcam-settings')!,text=(node:Element|null)=>node?.textContent?.replace(/\s+/g,' ').trim()??'';
 const steps=[...webcam.querySelectorAll('.webcam-checklist [data-calibration-group]')].map(step=>({title:text(step.querySelector('strong')),subs:[...step.querySelectorAll('[data-calibration-step]')].map(sub=>`${(sub as HTMLElement).dataset.calibrationStep}:${text(sub)}`),figure:!!step.querySelector('svg')}));
 const view={steps,lists:webcam.querySelectorAll('ol').length,button:text(doc.getElementById('play-webcam')),moves:[...webcam.querySelectorAll('.play-webcam-moves h3')].map(text),movesUnderCamera:doc.getElementById('webcam-preview')!.parentElement!.querySelector('.play-webcam-moves')!==null,handsRule:text(doc.getElementById('hands-rule')),handsRuleInSteps:!!webcam.querySelector('.webcam-instructions #hands-rule'),intro:text(webcam.querySelector('.webcam-header p')),header:[...webcam.querySelector('.webcam-header')!.children].filter(child=>!child.classList.contains('source-only')).map(child=>child.tagName)};
 dom.window.close();vi.unstubAllGlobals();return view;
}
it('renders one step list, start wording, how-to-play strip and wrists line on / and /play',()=>{
 const home=render('index.html'),play=render('play/index.html');
 expect(home.steps).toHaveLength(5);expect(home.steps.flatMap(step=>step.subs)).toHaveLength(7);expect(home.steps.every(step=>step.figure)).toBe(true);
 expect(play.steps).toEqual(home.steps);expect(play.lists).toBe(home.lists);
 expect(home.button).toBe(WEBCAM_START_WAIT);expect(play.button).toBe(home.button);
 expect(home.moves).toEqual(['Guard','Lean','Punch','Hands in view']);expect(play.moves).toEqual(home.moves);expect(home.movesUnderCamera&&play.movesUnderCamera).toBe(true);
 expect(home.handsRule).toContain('both wrists show ✓');expect(play.handsRule).toBe(home.handsRule);expect(home.handsRuleInSteps&&play.handsRuleInSteps).toBe(true);
 expect(play.header).toEqual(home.header);
 // Only the privacy/stream sentence after "About 30 seconds." differs.
 expect(home.intro).toBe('About 30 seconds. Your video never leaves this browser.');expect(play.intro).toBe('About 30 seconds. Your camera is only on stream if you turn it on.');
});
