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
  expect(dom.window.document.getElementById('tutorial-lean-label')!.textContent).toBe('Tilt left and right');
  const defenceOnly=dom.window.document.getElementById('no-punch') as HTMLInputElement;defenceOnly.checked=true;defenceOnly.dispatchEvent(new dom.window.Event('change'));
  expect(dom.window.document.getElementById('tutorial-last-key')!.textContent).toBe('D');expect(dom.window.document.getElementById('punch-chance')!.hidden).toBe(true);
  defenceOnly.checked=false;defenceOnly.dispatchEvent(new dom.window.Event('change'));
  const inputSource=dom.window.document.getElementById('input-source') as HTMLSelectElement;inputSource.value='pose';inputSource.dispatchEvent(new dom.window.Event('change'));
  expect(dom.window.document.getElementById('webcam-settings')!.hidden).toBe(true);
  // Webcam play never shows key letters: the guide, bonus strip and SUPER/FINISHER help use body moves.
  const doc=dom.window.document;expect(doc.getElementById('key-guide')!.hidden).toBe(true);expect(doc.getElementById('pose-guide')!.hidden).toBe(false);
  expect(doc.getElementById('pose-guide')!.textContent).toBe('Guard up · Tilt left · Tilt right · Punch for bonus');
  expect(doc.querySelectorAll('#finisher-chance kbd,#punch-chance kbd')).toHaveLength(0);expect(doc.querySelector('#finisher-chance .pose-cue')!.textContent).toBe('Guard up');
  expect(doc.getElementById('bonus-super')!.textContent).toContain('Guard up, Tilt left or Tilt right');
  const cameraStop=dom.window.document.getElementById('stop-camera') as HTMLButtonElement;cameraStop.disabled=false;cameraStop.click();
  expect(inputSource.value).toBe('keyboard');expect(dom.window.document.getElementById('key-guide')!.hidden).toBe(false);expect(dom.window.document.getElementById('pose-guide')!.hidden).toBe(true);expect(dom.window.document.querySelector('#finisher-chance kbd')!.textContent).toBe('K');expect(dom.window.document.querySelector('[data-option-for="input-source"][data-value="keyboard"]')!.getAttribute('aria-pressed')).toBe('true');
  expect(dom.window.document.getElementById('open-webcam')!.hidden).toBe(true);
  const level=dom.window.document.getElementById('start-difficulty') as HTMLSelectElement;level.value='hard';level.dispatchEvent(new dom.window.Event('change'));
  dom.window.document.getElementById('play-now')!.click();
  dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'Escape'}));
  dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'KeyK'}));
  expect(dom.window.document.getElementById('pause-screen')!.hidden).toBe(false);expect(dom.window.document.getElementById('tutorial-status')!.textContent).toContain('(1 of 3)');
  dom.window.document.querySelector<HTMLButtonElement>('[data-pause=resume]')!.click();
  for(const code of ['KeyK','KeyA','KeyD','KeyJ'])for(const type of ['keydown','keyup'])dom.window.dispatchEvent(new dom.window.KeyboardEvent(type,{code}));
  const doc2=dom.window.document,crowdSelect=doc2.getElementById('crowd-size') as HTMLSelectElement,crowdLabel=crowdSelect.closest('label')!;
  const last=()=>observed.renders.at(-1) as {round:{over:boolean;number:number};viewers:number};
  await vi.advanceTimersByTimeAsync(1000);
  expect([...doc2.querySelectorAll('.sim-chat li')].some(li=>/^sim_viewer_\d+ !/.test(li.textContent!))).toBe(true);
  // Mid-fight the crowd selector is out of the way; between rounds the demo offers it again.
  expect(crowdLabel.hidden).toBe(true);
  for(let waited=0;waited<90000&&!last().round.over;waited+=250)await vi.advanceTimersByTimeAsync(250);
  expect(last().round.over).toBe(true);
  // SIMULATED chat panel: sampled fake handles, then the line the bot would post; the corner coach button makes no request until clicked.
  const simLines=[...doc2.querySelectorAll('.sim-chat li')].map(li=>li.textContent!);expect(doc2.querySelector<HTMLElement>('.sim-chat-layer')!.hidden).toBe(false);expect(doc2.querySelector('.sim-chat h3')!.textContent).toContain('SIMULATED CHAT');
  expect(simLines.at(-1)).toMatch(/^streamervschatbot BOT · what your bot would post Streamer vs Chat · Round 1: /);expect(doc2.querySelectorAll('#round-results .corner-coach button')).toHaveLength(1);
  expect(crowdLabel.hidden).toBe(false);expect(crowdSelect.disabled).toBe(false);expect(doc2.querySelector('.demo-controls')!.classList.contains('between-rounds')).toBe(true);
  crowdSelect.value='500';crowdSelect.dispatchEvent(new dom.window.Event('change'));
  doc2.getElementById('next-round')!.click();
  expect(last().round.number).toBe(2);expect(last().viewers).toBe(500);expect(crowdLabel.hidden).toBe(true);expect(doc2.querySelector('.demo-controls')!.classList.contains('between-rounds')).toBe(false);
  await vi.advanceTimersByTimeAsync(5000);
  const states=observed.renders as {difficulty:string;log:{rounds:unknown[]};clock:{beat:number}}[];expect(states.at(-1)!.difficulty).toBe('hard');
  expect(states.some(state=>state.clock.beat>0)).toBe(true);
  expect(states.some(state=>state.log.rounds.length>0)).toBe(true);
  const previous=states.at(-1) as unknown as {match:{seed:number}};dom.window.document.querySelector<HTMLButtonElement>('.stream-expand')!.click();
  (dom.window.document.getElementById('start-fight') as HTMLButtonElement).click();
  const restarted=observed.renders.at(-1) as {match:{seed:number};round:{over:boolean}};expect(restarted.match.seed).not.toBe(previous.match.seed);expect(restarted.round.over).toBe(false);
  expect(observed.hostedMount).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
 }finally{
  dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();vi.unstubAllGlobals();vi.useRealTimers();
 }
});
