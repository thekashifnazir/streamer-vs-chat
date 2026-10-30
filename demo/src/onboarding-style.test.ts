import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it} from 'vitest';
import {hostedOnboardingMarkup} from './hosted-onboarding';
import {mountFightSetup} from './setup-ui';

const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
it.each(['../index.html','../play/index.html'])('keeps onboarding controls readable and touch sized in %s',file=>{
 const dom=new JSDOM(readFileSync(new URL(file,import.meta.url),'utf8'));
 try{
  const {document,getComputedStyle}=dom.window;
  const style=document.createElement('style');style.textContent=css;document.head.append(style);
  const panel=document.createElement('section');panel.className='hosted-panel';panel.innerHTML=hostedOnboardingMarkup();document.querySelector('main')!.prepend(panel);
  for(const selector of ['#start-fight','#start-camera','#play-webcam','[data-option-for="posture"]','#twitch-connect','#twitch-reconnect','.demo-link']){
   for(const element of document.querySelectorAll(selector)){
    const computed=getComputedStyle(element);
    expect(parseFloat(computed.minHeight),`${selector} touch target`).toBeGreaterThanOrEqual(44);
    expect(parseFloat(computed.fontSize),`${selector} text`).toBeGreaterThanOrEqual(14);
   }
  }
  const toggle=document.getElementById('green-background') as HTMLInputElement;
  expect(getComputedStyle(toggle).width).toBe('44px');expect(getComputedStyle(toggle).height).toBe('26px');
  expect(getComputedStyle(toggle).appearance).toBe('none');
  toggle.checked=true;expect(toggle.matches(':checked')).toBe(true);
  expect(css).toContain('[role=switch]:checked{background:var(--cyan);border-color:var(--cyan)}');
  expect(css).toContain('transform:translateX(18px)');
  const setup=mountFightSetup(document,{onStart:()=>{},onWebcamStart:()=>{}});setup.open();
  expect(getComputedStyle(document.getElementById('camera')!).objectFit).toBe('contain');setup.close();
  const source=document.querySelector('.source-only')!;
  expect(getComputedStyle(source).position).toBe('absolute');
  expect(getComputedStyle(document.querySelector('.fight-onboarding')!).display).toBe('grid');
 }finally{dom.window.close();}
});
