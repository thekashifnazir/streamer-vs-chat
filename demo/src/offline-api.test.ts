import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
const observed=vi.hoisted(()=>({renders:[] as unknown[],hostedMount:vi.fn()}));
// Keep the actual page/bootstrap, keyboard, tutorial, crowd and reducer. Browser-only
// camera, rendering and Forge worker boundaries are replaced; none may hit a network.
vi.mock('../../overlay/src/hud',()=>({createRailsHud:()=>new Proxy({render:(state:unknown)=>observed.renders.push(state)},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{}})}));
vi.mock('../../capture/src/camera',()=>({PoseCamera:class{async start(){return false;}stop(){}}}));
vi.mock('./forge',()=>({mountDemoForge:()=>({update(){},dispose(){}})}));
vi.mock('./viewer-memory',()=>({createDemoViewerMemory:()=>null}));
vi.mock('./play',()=>({mountHostedPlay:observed.hostedMount}));
it.each(['','?scout=fast'])('mounted no-login demo %s plays a real reducer round without fetching hosted APIs',async query=>{
 vi.resetModules();observed.renders=[];observed.hostedMount.mockClear();
 vi.useFakeTimers();
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:`https://offline.example/${query}`});
 const fetch=vi.fn(async()=>{throw new Error('The offline demo attempted a network request');});
 for(const key of ['window','document','location','history','navigator','Event','KeyboardEvent','HTMLElement'] as const)vi.stubGlobal(key,dom.window[key]);
 vi.stubGlobal('fetch',fetch);vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
 try{
  await import('./main');
  const posture=dom.window.document.querySelector<HTMLButtonElement>('[data-option-for="posture"][data-value="seated"]')!;posture.click();
  expect((dom.window.document.getElementById('posture') as HTMLSelectElement).value).toBe('seated');
  expect(dom.window.document.getElementById('tutorial-lean-label')!.textContent).toBe('Tilt left');
  const defenceOnly=dom.window.document.getElementById('no-punch') as HTMLInputElement;defenceOnly.checked=true;defenceOnly.dispatchEvent(new dom.window.Event('change'));
  expect(dom.window.document.getElementById('tutorial-last-key')!.textContent).toBe('D');expect(dom.window.document.getElementById('punch-chance')!.hidden).toBe(true);
  defenceOnly.checked=false;defenceOnly.dispatchEvent(new dom.window.Event('change'));
  const inputSource=dom.window.document.getElementById('input-source') as HTMLSelectElement;inputSource.value='pose';inputSource.dispatchEvent(new dom.window.Event('change'));
  expect(dom.window.document.getElementById('webcam-settings')!.hidden).toBe(true);
  const cameraStop=dom.window.document.getElementById('stop-camera') as HTMLButtonElement;cameraStop.disabled=false;cameraStop.click();
  expect(inputSource.value).toBe('keyboard');expect(dom.window.document.querySelector('[data-option-for="input-source"][data-value="keyboard"]')!.getAttribute('aria-pressed')).toBe('true');
  expect(dom.window.document.getElementById('open-webcam')!.hidden).toBe(true);
  const clear=dom.window.document.getElementById('clear-space') as HTMLInputElement;clear.checked=true;clear.dispatchEvent(new dom.window.Event('change'));
  for(const code of ['KeyK','KeyA','KeyJ'])dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code}));
  await vi.advanceTimersByTimeAsync(80000);
  const states=observed.renders as {log:{rounds:unknown[]};clock:{beat:number}}[];
  expect(states.some(state=>state.clock.beat>0)).toBe(true);
  expect(states.some(state=>state.log.rounds.length>0)).toBe(true);
  const previous=states.at(-1) as unknown as {match:{seed:number}};dom.window.document.querySelector<HTMLButtonElement>('.stream-expand')!.click();
  (dom.window.document.getElementById('start-fight') as HTMLButtonElement).click();
  const restarted=observed.renders.at(-1) as {match:{seed:number};round:{over:boolean}};expect(restarted.match.seed).not.toBe(previous.match.seed);expect(restarted.round.over).toBe(false);
  expect(observed.hostedMount).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
 }finally{
  dom.window.dispatchEvent(new dom.window.Event('beforeunload'));dom.window.close();vi.unstubAllGlobals();vi.useRealTimers();
 }
});
