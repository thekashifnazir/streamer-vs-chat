import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
import {cameraErrorMessage,showCameraError} from './camera-feedback';
import {mountFightSetup} from './setup-ui';

it.each([
 ['NotAllowedError',"Camera blocked. Allow it in your browser's site settings, or use the keyboard."],
 ...['NotFoundError','NotSupportedError','OverconstrainedError'].map(name=>[name,'No camera found. Use the keyboard instead.']),
 ['NotReadableError','Camera unavailable. Use the keyboard instead.']
])('maps %s without exposing browser errors', (name,message)=>{
 expect(cameraErrorMessage({name,message:'Private driver details..'})).toBe(message);
 expect(cameraErrorMessage('Use Chrome. Private failure..')).toBe('Camera unavailable. Use the keyboard instead.');
});
it.each(['index.html','play/index.html'])('%s keeps camera safety and error feedback adjacent to the button',page=>{
 const dom=new JSDOM(readFileSync(new URL(`../${page}`,import.meta.url),'utf8'));
 try{
 const doc=dom.window.document,ui=mountFightSetup(doc,{onStart:()=>{},onWebcamStart:()=>{}}),button=doc.getElementById('start-camera') as HTMLButtonElement;
 ui.open();expect(button.disabled).toBe(true);const reason=doc.getElementById('camera-start-reason')!;expect(reason.hidden).toBe(false);expect(reason.parentElement).toBe(button.parentElement);expect(doc.getElementById('close-webcam')).not.toBeNull();
 const space=doc.getElementById('clear-space') as HTMLInputElement;space.checked=true;space.dispatchEvent(new dom.window.Event('change'));expect(button.disabled).toBe(false);expect(reason.hidden).toBe(true);expect(doc.querySelectorAll('#clear-space')).toHaveLength(1);
 expect(doc.body.textContent).toContain('Works best in Chrome.');
 const feedback=doc.getElementById('camera-feedback')!,scroll=vi.fn();feedback.scrollIntoView=scroll;showCameraError(doc,{name:'NotAllowedError',message:'raw exception'});expect(feedback.hidden).toBe(false);expect(feedback.textContent).toBe(cameraErrorMessage({name:'NotAllowedError'}));expect(feedback.parentElement).toBe(button.parentElement);expect(doc.getElementById('camera-status')!.textContent).toBe(feedback.textContent);expect(scroll).toHaveBeenCalledOnce();
 expect(button.getAttribute('aria-describedby')).toContain(feedback.id);
 }finally{dom.window.close();}
});
it('camera caption is outside preview hit-testing at narrow widths',()=>{
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
 for(const page of ['index.html','play/index.html']){
  const dom=new JSDOM(readFileSync(new URL(`../${page}`,import.meta.url),'utf8'));
  try{const doc=dom.window.document,style=doc.createElement('style');style.textContent=css;doc.head.append(style);const caption=doc.querySelector('.webcam-instructions')!;expect(doc.getElementById('webcam-preview')!.contains(caption)).toBe(false);expect(dom.window.getComputedStyle(caption).position).toBe('static');expect(dom.window.getComputedStyle(caption).pointerEvents).toBe('none');expect(dom.window.getComputedStyle(doc.getElementById('camera-start-overlay')!).zIndex).toBe('2');}finally{dom.window.close();}
 }
 expect(css).toContain('@media(max-width:480px)');
});
