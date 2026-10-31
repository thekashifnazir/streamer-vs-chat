import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';
import {mountFightSetup} from './setup-ui';
import {mountDemoLanding} from './demo-landing';
import {mountHostedFlow} from './hosted-flow';
import {difficultyLabel} from './difficulty-choice';
const windows:JSDOM[]=[];
afterEach(()=>{for(const dom of windows)dom.window.close();windows.length=0;vi.unstubAllGlobals();});
function mount(page:'index.html'|'play/index.html'){
 const dom=new JSDOM(readFileSync(new URL(`../${page}`,import.meta.url),'utf8'));windows.push(dom);vi.stubGlobal('Event',dom.window.Event);
 const doc=dom.window.document;
 if(page==='index.html')mountDemoLanding(doc);else mountHostedFlow(doc);
 mountFightSetup(doc,{onStart:vi.fn(),onWebcamStart:vi.fn(),now:()=>0,simplifiedCalibration:page!=='index.html'});
 const difficulty=doc.getElementById('start-difficulty') as HTMLSelectElement;
 const click=(selector:string)=>doc.querySelector<HTMLButtonElement>(selector)!.click();
 const source=(value:'pose'|'keyboard')=>{const select=doc.getElementById('input-source') as HTMLSelectElement;select.value=value;select.dispatchEvent(new dom.window.Event('change'));};
 const hint=()=>doc.querySelector<HTMLElement>('[data-option-for=start-difficulty][data-value=easy] .webcam-recommended')!;
 return {doc,difficulty,click,source,hint};
}
it('labels Easy as the webcam recommendation only for webcam players',()=>{
 expect(difficultyLabel('easy',true)).toBe('Easy · recommended for webcam');
 expect(difficultyLabel('easy',false)).toBe('Easy');expect(difficultyLabel('medium',true)).toBe('Medium');
});
it('the demo "Use my webcam instead" preselects Easy and says why; keyboard keeps Medium',()=>{
 const {doc,difficulty,click,hint}=mount('index.html');
 expect(difficulty.value).toBe('medium');expect(hint().hidden).toBe(true);
 click('#demo-webcam');
 expect(difficulty.value).toBe('easy');expect(hint().hidden).toBe(false);expect(hint().textContent).toBe('Recommended for webcam');
 expect(doc.getElementById('webcam-difficulty-note')!.textContent).toContain('Easy · recommended for webcam');
 expect(doc.querySelector('[data-option-for=start-difficulty][data-value=easy]')!.getAttribute('aria-pressed')).toBe('true');
 click('[data-option-for=input-source][data-value=keyboard]');
 expect(difficulty.value).toBe('medium');expect(hint().hidden).toBe(true);
});
it.each(['index.html','play/index.html'] as const)('%s keeps a level picked by hand when switching to webcam',page=>{
 const {difficulty,click,source}=mount(page);
 click('[data-option-for=start-difficulty][data-value=hard]');expect(difficulty.value).toBe('hard');
 source('pose');expect(difficulty.value).toBe('hard');
 source('keyboard');expect(difficulty.value).toBe('hard');
});
it('re-confirming the default Medium by hand also counts as a choice',()=>{
 const {difficulty,click,source}=mount('index.html');
 click('[data-option-for=start-difficulty][data-value=medium]');source('pose');expect(difficulty.value).toBe('medium');
});
it('hosted /play WEBCAM card preselects Easy; the KEYBOARD card keeps Medium',()=>{
 const {doc,difficulty,click,hint}=mount('play/index.html');
 expect(difficulty.value).toBe('medium');
 click('[data-defend=pose]');expect(difficulty.value).toBe('easy');expect(hint().hidden).toBe(false);
 expect(doc.getElementById('webcam-difficulty-note')!.textContent).toContain('Easy · recommended for webcam');
 click('[data-defend=keyboard]');expect(difficulty.value).toBe('medium');
});
