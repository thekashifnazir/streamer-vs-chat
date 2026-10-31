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
  expect(getComputedStyle(document.getElementById('camera')!).objectFit).toBe('contain');
  for(const element of document.querySelectorAll('.webcam-header p,.camera-start-overlay p'))expect(parseFloat(getComputedStyle(element).fontSize)).toBeGreaterThanOrEqual(14);
  expect(getComputedStyle(document.getElementById('webcam-settings')!).color).toBe('rgb(232, 227, 238)');setup.close();
  const source=document.querySelector('.source-only')!;
  expect(getComputedStyle(source).position).toBe('absolute');
  expect(getComputedStyle(document.querySelector('#onboarding-row')!).display).toBe(file.includes('/play/')?'block':'grid');
 }finally{dom.window.close();}
});

it('uses readable system body type, dark selected copy and one viewport-derived content width',()=>{
 const dom=new JSDOM('<body><main><section id="onboarding-row"><article class="fight-setup"><div class="option-group"><button aria-pressed="true"><small>On your feet</small></button></div></article></section><section class="fight-screen-heading"></section><section class="demo-stage"></section><section class="how-to-play"></section><section id="more-to-try"></section></main><footer>Footer</footer></body>');
 try{
  const doc=dom.window.document,style=doc.createElement('style');style.textContent=css;doc.head.append(style);
  const computed=dom.window.getComputedStyle;
  expect(computed(doc.body).fontFamily).toContain('system-ui');expect(computed(doc.body).color).toBe('rgb(232, 227, 238)');
  expect(computed(doc.querySelector('button small')!).color).toBe('rgb(42, 34, 56)');
  expect(computed(doc.querySelector('footer')!).fontSize).toBe('16px');
  expect(css).toContain('grid-template-columns:minmax(0,3fr) minmax(0,2fr)');
  for(const selector of ['.demo-stage','#onboarding-row','.fight-screen-heading','.how-to-play','#more-to-try'])expect(css).toContain(selector);
  expect(css).toContain('body>main h3:not(.rails-hud *){font-weight:600}');
  expect(css).toContain('.privacy-disclosure p,.webcam-checklist .webcam-step small{color:#e8e3ee}');
  expect(css).toContain('width:var(--content-width)');expect(css).toContain('calc((100dvh - 108px)*16/9)');
 }finally{dom.window.close();}
});
