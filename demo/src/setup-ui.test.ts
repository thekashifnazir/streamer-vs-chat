import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';
import {mountFightSetup} from './setup-ui';
import {createCalibration,type CalibrationSnapshot} from '../../capture/src/calibration';
import {DEFAULT_BOSS} from '../../shared/src/boss-def';
import type {Landmark} from '../../capture/src/classifier';
const windows:JSDOM[]=[];
afterEach(()=>{for(const dom of windows)dom.window.close();windows.length=0;vi.unstubAllGlobals();});
function mount(page='index.html'){
 const dom=new JSDOM(readFileSync(new URL(`../${page}`,import.meta.url),'utf8'));windows.push(dom);vi.stubGlobal('Event',dom.window.Event);
 const doc=dom.window.document,onStart=vi.fn(),onWebcamStart=vi.fn(),ui=mountFightSetup(doc,{onStart,onWebcamStart,now:()=>0});
 const byId=<T extends HTMLElement>(id:string)=>doc.getElementById(id) as T;
 const change=(id:string,value:string|boolean)=>{const element=byId<HTMLInputElement|HTMLSelectElement>(id);if(typeof value==='boolean')(element as HTMLInputElement).checked=value;else element.value=value;element.dispatchEvent(new dom.window.Event('change'));};
 const click=(selector:string)=>doc.querySelector<HTMLButtonElement>(selector)!.click();
 return {dom,doc,ui,onStart,onWebcamStart,byId,change,click};
}
it.each(['index.html','play/index.html'])('%s has one safety source gating START FIGHT, no tutorial duplicates',page=>{
 const {doc,byId,change,onStart}=mount(page);const start=byId<HTMLButtonElement>('start-fight');
 expect(doc.querySelectorAll('#clear-space')).toHaveLength(1);expect(doc.querySelectorAll('#start-clear-space,#start-no-punch,[name="judge-posture"]')).toHaveLength(0);
 expect(start.disabled).toBe(true);expect(start.textContent).toBe('Tick “my space is clear” to start');start.click();expect(onStart).not.toHaveBeenCalled();change('clear-space',true);expect(start.textContent).toBe('START FIGHT');start.click();expect(onStart).toHaveBeenCalledOnce();expect(byId('safety-card').classList.contains('confirmed')).toBe(true);change('clear-space',false);expect(start.disabled).toBe(true);
});
it('difficulty, posture and defence-only read their existing controls everywhere',()=>{
 const {doc,byId,click,change,ui}=mount();click('[data-option-for="start-difficulty"][data-value="expert"]');expect(byId<HTMLSelectElement>('start-difficulty').value).toBe('expert');
 click('[data-option-for="posture"][data-value="seated"]');expect(byId<HTMLSelectElement>('posture').value).toBe('seated');expect([...doc.querySelectorAll('[data-option-for="posture"][data-value="seated"]')].every(x=>x.getAttribute('aria-pressed')==='true')).toBe(true);expect(byId('webcam-distance-tip').textContent).toContain('1 m further');
 change('no-punch',true);expect(byId('punch-chance').hidden).toBe(true);ui.commands();expect(byId('attack-rows').textContent).toContain('Tilt right');expect(doc.querySelectorAll('#no-punch')).toHaveLength(1);
});
it('webcam view moves the one preview node and switches back to keyboard',()=>{
 const {byId,click,ui}=mount();const video=byId('camera');click('[data-option-for="input-source"][data-value="pose"]');expect(byId('open-webcam').hidden).toBe(false);click('#open-webcam');expect(byId('webcam-settings').hidden).toBe(false);expect(video.parentElement).toBe(byId('webcam-preview'));click('#close-webcam');expect(byId('webcam-settings').hidden).toBe(true);expect(video.parentElement).toBe(byId('stage'));ui.open();click('#use-keyboard');expect(byId<HTMLSelectElement>('input-source').value).toBe('keyboard');expect(byId('webcam-settings').hidden).toBe(true);
});
it('calibrated webcam start counts down while unframed, waits for framing and keeps safety',()=>{
 const {ui,byId,change,onWebcamStart}=mount(),snapshot=createCalibration().snapshot;
 const start=byId<HTMLButtonElement>('play-webcam'),points=Array.from({length:33},()=>({x:.5,y:.5,visibility:1})) as Landmark[];
 ui.calibration(snapshot);ui.camera(true);ui.frame(points,true);change('clear-space',true);expect(start.disabled).toBe(true);
 ui.calibration({...snapshot,stage:'ready',ready:true,progress:1} as CalibrationSnapshot);expect(start.disabled).toBe(false);ui.frame([],false);expect(start.disabled).toBe(false);ui.frame(points,true);change('clear-space',false);expect(start.disabled).toBe(true);change('clear-space',true);start.click();expect(byId('webcam-countdown').textContent).toBe('Get in position · 5');ui.tick(4999);expect(onWebcamStart).not.toHaveBeenCalled();ui.frame([],false);ui.tick(5000);expect(byId('webcam-countdown').textContent).toBe('Step back until both hands show ✓');expect(onWebcamStart).not.toHaveBeenCalled();ui.frame(points,true);ui.tick(5100);expect(onWebcamStart).toHaveBeenCalledOnce();
 ui.camera(false);expect(start.disabled).toBe(true);expect(byId('camera-start-overlay').hidden).toBe(false);
});
it('checklist and progress display calibration stages and exact help messages',()=>{
 const {ui,byId,doc}=mount(),snapshot=createCalibration().snapshot;ui.camera(true);const points=Array.from({length:33},()=>({x:.5,y:.5,visibility:1})) as Landmark[];ui.frame(points,true);
 ui.calibration({...snapshot,stage:'resting',progress:.6,message:'Rest hands at your waist.'});expect(byId('webcam-step-label').textContent).toBe('STEP 3 OF 5');expect(byId<HTMLProgressElement>('calibration-progress').value).toBe(.6);expect(byId('calibration-status').hidden).toBe(true);expect(byId('webcam-instruction').textContent).toBe('Hands at your waist · hold still 3 s');expect(doc.querySelector('.webcam-step.active strong')!.textContent).toBe('3. Hands at your waist · hold still 3 s');expect(doc.querySelectorAll('.webcam-step.done')).toHaveLength(2);expect(doc.querySelector('.webcam-step.active')?.getAttribute('data-calibration-step')).toBe('2');
 expect(byId('calibration-saved').hidden).toBe(true);ui.restored(true);expect(byId('calibration-saved').hidden).toBe(false);
});
it('three defence cards match reducer mappings and custom bosses keep their own chips',()=>{
 const {ui,byId,doc,change}=mount();const card=(defence:string)=>doc.querySelector(`[data-defence="${defence}"]`)!;
 expect(byId('attack-rows').children).toHaveLength(3);expect(card('guard').textContent).toContain('!jab (!j)!combo (!c)');expect(card('lean_left').textContent).toContain('!right (!r)');expect(card('lean_left').querySelector('kbd')!.textContent).toBe('A');expect(card('lean_right').textContent).toContain('!left (!l)');expect(card('lean_right').querySelector('kbd')!.textContent).toBe('D');expect(byId('bonus-super').textContent).toContain('3 hits');
 change('input-source','pose');expect(byId('start-fight').hidden).toBe(true);expect(byId('open-webcam').hidden).toBe(false);expect(card('guard').querySelector('.pose-cue')!.textContent).toBe('Both fists up');change('input-source','keyboard');expect(byId('start-fight').hidden).toBe(false);expect(byId('open-webcam').hidden).toBe(true);
 ui.commands({...DEFAULT_BOSS,name:'Custom',moves:DEFAULT_BOSS.moves.slice(0,3).map((move,i)=>({...move,command:['!teep','!elbowl','!elbowr'][i]!}))});expect(card('guard').textContent).toContain('!teep');expect(card('lean_right').textContent).toContain('!elbowl');expect(card('lean_left').textContent).toContain('!elbowr');expect(byId('attack-rows').textContent).not.toContain('!left');expect(byId('bonus-super').hidden).toBe(true);
});
it('only hosted setup is step three; fight bar starts hidden and follows the preview',()=>{
 for(const page of ['index.html','play/index.html']){const {doc}=mount(page);expect(doc.querySelectorAll('.setup-step-number')).toHaveLength(page==='index.html'?0:1);expect(doc.querySelector<HTMLElement>('.demo-controls')!.hidden).toBe(true);const sections=[...doc.querySelector('main')!.children];expect(sections.indexOf(doc.getElementById('stage')!)).toBeLessThan(sections.indexOf(doc.getElementById('how-to-play')!));expect(doc.getElementById('tutorial-status')!.textContent).toBe('Press START FIGHT above to begin.');}
});

it('back to setup keeps a calibrated webcam action and Esc cancels its countdown',()=>{
 const {ui,doc,dom,byId,change,onWebcamStart}=mount();change('input-source','pose');change('clear-space',true);ui.camera(true);ui.calibration({...createCalibration().snapshot,ready:true,stage:'ready'});
 ui.close();expect(byId('open-webcam').textContent).toBe('START WEBCAM FIGHT');byId('open-webcam').click();expect(byId('webcam-countdown').hidden).toBe(false);
 doc.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'Escape'}));ui.frame(Array.from({length:33},()=>({x:.5,y:.5,visibility:1})),true);ui.tick(6000);expect(onWebcamStart).not.toHaveBeenCalled();expect(byId('webcam-countdown').hidden).toBe(true);
 byId('open-webcam').click();change('clear-space',false);ui.tick(6000);expect(onWebcamStart).not.toHaveBeenCalled();expect(byId('webcam-countdown').hidden).toBe(true);
});
it('does not start on a stale framed pose and cancels on changing input mode',()=>{
 const {ui,change,byId,onWebcamStart}=mount();change('clear-space',true);ui.camera(true);ui.calibration({...createCalibration().snapshot,ready:true,stage:'ready'});ui.frame([],false);
 byId('play-webcam').click();ui.tick(5000);expect(onWebcamStart).not.toHaveBeenCalled();change('input-source','pose');ui.frame(Array.from({length:33},()=>({x:.5,y:.5,visibility:1})),true);ui.tick(5100);expect(onWebcamStart).not.toHaveBeenCalled();
});
