import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
const observed=vi.hoisted(()=>({renders:[] as any[]}));
vi.mock('../../overlay/src/hud',()=>({createRailsHud:()=>new Proxy({render:(state:unknown)=>observed.renders.push(state),soundRequested:()=>true},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{}})}));
vi.mock('./forge',()=>({mountDemoForge:()=>({update(){},dispose(){}})}));
const settle=(ms=60)=>new Promise(resolve=>setTimeout(resolve,ms));

// Kash pressed browser Back in the demo and left the site. On `/`, Back now pauses a running round, and a
// second Back (or Back from results or webcam setup) returns to the homepage hero, never leaving the page.
it('offline demo: Back pauses practice and a fight, Back again returns to the hero; Back from webcam setup closes it',async()=>{
 vi.resetModules();observed.renders=[];
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://example.test/?mode=boss'});
 for(const key of ['window','document','location','history','navigator','Event','KeyboardEvent','HTMLElement'] as const)vi.stubGlobal(key,dom.window[key]);
 dom.window.setInterval=globalThis.setInterval as unknown as typeof dom.window.setInterval;dom.window.clearInterval=globalThis.clearInterval as unknown as typeof dom.window.clearInterval;
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('fetch',vi.fn(()=>{throw Error('No network in test');}));
 const unloads=vi.fn();dom.window.addEventListener('beforeunload',unloads);
 try{await import('./main');const doc=dom.window.document,win=dom.window;
  const paused=()=>!doc.getElementById('pause-screen')!.hidden,reason=()=>doc.querySelector('[data-pause-reason]')!.textContent;
  const hero=()=>!doc.body.classList.contains('fight-started')&&!doc.body.classList.contains('webcam-open')&&doc.getElementById('stage')!.hidden&&!doc.getElementById('play-now')!.closest('[hidden]');
  const back=async()=>{win.history.back();await settle();};
  const key=async(code:string)=>{win.dispatchEvent(new win.KeyboardEvent('keydown',{code,key:code.slice(3).toLowerCase()}));await settle(150);win.dispatchEvent(new win.KeyboardEvent('keyup',{code,key:code.slice(3).toLowerCase()}));await settle(150);};
  // No matchMedia here, so the demo starts on keyboard.
  expect(hero()).toBe(true);expect((doc.getElementById('input-source') as HTMLSelectElement).value).toBe('keyboard');const start=win.history.length;
  // Practice: Back pauses, Back again is the hero.
  doc.getElementById('play-now')!.click();await settle();expect(hero()).toBe(false);expect(win.location.hash).toBe('#play');expect(win.location.search).toBe('?mode=boss');expect(win.history.length).toBe(start+1);
  await back();expect(paused()).toBe(true);expect(reason()).toBe('Paused: you pressed Back · Back again goes to the homepage');expect(hero()).toBe(false);
  await back();expect(hero()).toBe(true);expect(paused()).toBe(false);expect(win.location.href).toBe('https://example.test/?mode=boss');
  // A real fight after the K → A → D → J practice.
  doc.getElementById('play-now')!.click();await settle();for(const code of ['KeyK','KeyA','KeyD','KeyJ'])await key(code);
  await settle(300);expect(doc.getElementById('tutorial')!.hidden).toBe(true);expect(observed.renders.at(-1)!.round.over).toBe(false);
  await back();expect(paused()).toBe(true);expect(observed.renders.at(-1)!.paused).toBe(true);
  // A pause from Back can still be resumed in-page; the entry stays, so Back pauses again.
  doc.querySelector<HTMLButtonElement>('[data-pause=resume]')!.click();await settle();expect(paused()).toBe(false);
  await back();expect(paused()).toBe(true);await back();expect(hero()).toBe(true);
  // Quit to setup in-page steps off the entry: the next Back is the browser's own (nothing of ours to undo).
  doc.getElementById('play-now')!.click();await settle();doc.querySelector<HTMLButtonElement>('[data-pause=quit]')!.click();await settle(120);
  expect(hero()).toBe(true);expect(win.history.state).toBeNull();
  // Webcam setup: Back closes it.
  doc.getElementById('demo-webcam')!.click();doc.getElementById('play-now')!.click();await settle();expect(doc.body.classList.contains('webcam-open')).toBe(true);
  await back();expect(hero()).toBe(true);expect(doc.getElementById('webcam-settings')!.hidden).toBe(true);
  expect(unloads).not.toHaveBeenCalled();
 }finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();vi.unstubAllGlobals();}
},20000);
