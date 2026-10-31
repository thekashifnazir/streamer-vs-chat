import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';
import {fightHelp,finisherHelp,poseGuide,superHelp} from './defence-copy';
import {mountFightSetup} from './setup-ui';
// A key letter on its own (K, A, D, J) or the word keyboard means a webcam player is told to use keys.
const KEY_WORDING=/\b[KADJ]\b|keyboard|\bkeys?\b|press/i;
const windows:JSDOM[]=[];
afterEach(()=>{for(const dom of windows)dom.window.close();windows.length=0;vi.unstubAllGlobals();});
it('webcam SUPER, FINISHER and fight help name body moves, never keys, standing and seated',()=>{
 for(const seated of [false,true])for(const noPunch of [false,true]){
  const verb=seated?'Tilt':'Lean',mode={pose:true,seated,noPunch};
  for(const text of [fightHelp(mode),fightHelp(mode,'Toaster Titan'),superHelp(mode),poseGuide(mode),finisherHelp(true)])expect(text).not.toMatch(KEY_WORDING);
  expect(superHelp(mode)).toBe(` Super when hype is full: 3 hits. Follow each step on screen: Guard up, ${verb} left or ${verb} right.`);
  expect(fightHelp(mode)).toContain(`SUPER → follow all three steps: guard up, ${verb.toLowerCase()} left or ${verb.toLowerCase()} right`);
  expect(fightHelp(mode)).toContain(`HOOK LEFT → ${verb.toLowerCase()} right · HOOK RIGHT → ${verb.toLowerCase()} left`);
  expect(poseGuide(mode)).toBe(`Guard up · ${verb} left · ${verb} right${noPunch?'':' · Punch for bonus'}`);
 }
 expect(finisherHelp(true)).toBe('FINISHER READY: hold your guard up for 1 s; no punches required.');
});
it('keyboard play keeps its existing key prompts unchanged',()=>{
 expect(fightHelp({pose:false,seated:false,noPunch:false})).toBe('Straight attacks → K guard · HOOK LEFT → D lean · HOOK RIGHT → A lean · SUPER → follow all three GUARD / LEAN steps');
 expect(fightHelp({pose:false,seated:true,noPunch:true},'Boss')).toBe('Boss · Follow each move’s defence cue. K guard · A/D tilt');
 expect(finisherHelp(false)).toBe('FINISHER READY: hold K (guard) for 1 s; no punches required.');
 expect(superHelp({pose:false,seated:false})).toBe(' Super when hype is full: 3 hits, follow the steps on screen.');
});
it.each(['index.html','play/index.html'])('%s bonus strip swaps key caps for pose cues in webcam mode and back',page=>{
 const dom=new JSDOM(readFileSync(new URL(`../${page}`,import.meta.url),'utf8'));windows.push(dom);vi.stubGlobal('Event',dom.window.Event);
 const doc=dom.window.document,ui=mountFightSetup(doc,{onStart:()=>{},onWebcamStart:()=>{},now:()=>0});
 const source=doc.getElementById('input-source') as HTMLSelectElement,posture=doc.getElementById('posture') as HTMLSelectElement;
 const strip=()=>doc.querySelector('.bonus-moments')!;
 source.value='keyboard';ui.commands();expect(doc.querySelector('#finisher-chance kbd')!.textContent).toBe('K');expect(doc.querySelector('#punch-chance kbd')!.textContent).toBe('J');
 source.value='pose';ui.commands();
 expect(strip().querySelectorAll('kbd')).toHaveLength(0);expect(strip().textContent).not.toMatch(KEY_WORDING);
 expect(doc.querySelector('#finisher-chance .pose-cue')!.textContent).toBe('Guard up');expect(doc.querySelector('#punch-chance .pose-cue')!.textContent).toBe('Punch');
 expect(doc.getElementById('bonus-super')!.textContent).toContain('Guard up, Lean left or Lean right');
 posture.value='seated';ui.commands();expect(doc.getElementById('bonus-super')!.textContent).toContain('Guard up, Tilt left or Tilt right');expect(strip().textContent).not.toMatch(KEY_WORDING);
 source.value='keyboard';ui.commands();expect(doc.querySelector('#finisher-chance kbd')!.textContent).toBe('K');expect(doc.querySelectorAll('#finisher-chance .pose-cue')).toHaveLength(0);
});
