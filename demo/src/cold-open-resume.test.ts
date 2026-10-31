import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
const observed=vi.hoisted(()=>({renders:[] as any[]}));
vi.mock('../../overlay/src/hud',()=>({createRailsHud:()=>new Proxy({render:(state:unknown)=>observed.renders.push(state)},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{}})}));
vi.mock('../../capture/src/camera',()=>({PoseCamera:class{async start(){return false;}stop(){}}}));
vi.mock('./forge',()=>({mountDemoForge:()=>({update(){},dispose(){}})}));

// Resume on the pause dialog during a "Rehearse now" take used to do nothing (coldOpenAt blocked it).
it('Resume mid-rehearsal resumes the take; Resume after the take returns to the landing page',async()=>{
 vi.resetModules();vi.useFakeTimers();observed.renders=[];const epoch=Date.now();vi.stubGlobal('performance',{now:()=>Date.now()-epoch});
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://example.test/'});
 for(const key of ['window','document','location','history','navigator','Event','KeyboardEvent','HTMLElement'] as const)vi.stubGlobal(key,dom.window[key]);
 dom.window.setInterval=globalThis.setInterval as unknown as typeof dom.window.setInterval;dom.window.clearInterval=globalThis.clearInterval as unknown as typeof dom.window.clearInterval;
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('fetch',vi.fn(()=>{throw Error('No network in test');}));Object.defineProperty(dom.window.performance,'now',{value:()=>performance.now()});
 try{await import('./main');const doc=dom.window.document;
  const key=(type:'keydown'|'keyup',code:string)=>dom.window.dispatchEvent(new dom.window.KeyboardEvent(type,{code}));
  const paused=()=>!doc.getElementById('pause-screen')!.hidden,status=()=>doc.getElementById('cold-open-status')!.textContent!,resume=()=>doc.querySelector<HTMLButtonElement>('[data-pause=resume]')!.click();
  // 1. Pause straight away: the 5-second take freezes while paused, then Resume continues it.
  doc.getElementById('cold-open')!.click();expect(doc.body.classList.contains('fight-started')).toBe(true);
  key('keydown','Escape');expect(paused()).toBe(true);
  await vi.advanceTimersByTimeAsync(8000);expect(status()).toMatch(/GUARD!/);expect(observed.renders.at(-1)!.log.resolved).toHaveLength(0);
  resume();expect(paused()).toBe(false);expect(observed.renders.at(-1)!.paused).toBe(false);
  key('keydown','KeyK');await vi.advanceTimersByTimeAsync(6000);key('keyup','KeyK');
  expect(observed.renders.at(-1)!.log.resolved).toHaveLength(1);expect(status()).toMatch(/complete/);
  // 2. After the take: Esc then Resume leaves the rehearsal for the landing page, result line kept.
  key('keydown','Escape');expect(paused()).toBe(true);resume();
  expect(paused()).toBe(false);expect(doc.body.classList.contains('fight-started')).toBe(false);expect(doc.getElementById('stage')!.hidden).toBe(true);expect(doc.querySelector<HTMLElement>('.demo-controls')!.hidden).toBe(true);expect(doc.getElementById('stage')!.classList.contains('cold-open-tally')).toBe(false);
  expect(status()).toMatch(/complete/);
  // 3. A missed take behaves the same, and Rehearse now works again afterwards.
  doc.getElementById('cold-open')!.click();await vi.advanceTimersByTimeAsync(6000);expect(status()).toMatch(/No clean block/);
  key('keydown','Escape');resume();expect(paused()).toBe(false);expect(doc.body.classList.contains('fight-started')).toBe(false);
  doc.getElementById('cold-open')!.click();expect(doc.body.classList.contains('fight-started')).toBe(true);await vi.advanceTimersByTimeAsync(200);expect(status()).toMatch(/GUARD!/);
 }finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();vi.unstubAllGlobals();vi.useRealTimers();}
});
