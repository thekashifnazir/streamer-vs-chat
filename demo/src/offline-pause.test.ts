import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
const observed=vi.hoisted(()=>({renders:[] as any[],frame:null as any}));
vi.mock('../../overlay/src/hud',()=>({createRailsHud:()=>new Proxy({render:(state:unknown)=>observed.renders.push(state)},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{}})}));
vi.mock('../../capture/src/camera',()=>({PoseCamera:class{constructor(_video:unknown,frame:unknown){observed.frame=frame;}async start(){return true;}stop(){}}}));
vi.mock('../../capture/src/calibration',()=>({createCalibration:()=>{const snapshot={ready:true,stage:'ready',progress:1,message:'Ready',guardThreshold:0,mode:'standing',leanPeaks:{L:1,R:1}};return{snapshot,update:()=>snapshot,restore:()=>false,reset(){},start(){}};}}));
vi.mock('./forge',()=>({mountDemoForge:()=>({update(){},dispose(){}})}));

// The offline demo `/` shows the same pause reason line as hosted /play, and a webcam player can
// hold guard for 1 s to resume. No reason mentions Twitch, the stream or chat.
it('offline pauses say why, and a calibrated framed guard hold resumes a webcam fight',async()=>{
 vi.resetModules();vi.useFakeTimers();observed.renders=[];const epoch=Date.now();vi.stubGlobal('performance',{now:()=>Date.now()-epoch});
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://example.test/'});
 for(const key of ['window','document','location','history','navigator','Event','KeyboardEvent','HTMLElement'] as const)vi.stubGlobal(key,dom.window[key]);
 dom.window.setInterval=globalThis.setInterval as unknown as typeof dom.window.setInterval;dom.window.clearInterval=globalThis.clearInterval as unknown as typeof dom.window.clearInterval;
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('fetch',vi.fn(()=>{throw Error('No network in test');}));Object.defineProperty(dom.window.performance,'now',{value:()=>performance.now()});
 let frames:ReturnType<typeof setInterval>|undefined;
 try{await import('./main');const doc=dom.window.document;
  const reason=()=>doc.querySelector<HTMLElement>('[data-pause-reason]')!,hint=()=>doc.querySelector<HTMLElement>('[data-guard-resume]')!,paused=()=>!doc.getElementById('pause-screen')!.hidden;
  const esc=()=>dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'Escape'}));
  const reasons:string[]=[];const seen=()=>{if(!reason().hidden)reasons.push(reason().textContent!);};
  // Keyboard practice: the reason line shows, the guard hint does not.
  doc.getElementById('play-now')!.click();esc();expect(paused()).toBe(true);expect(reason().hidden).toBe(false);expect(reason().textContent).toBe('Paused: Esc');expect(hint().hidden).toBe(true);seen();
  doc.querySelector<HTMLButtonElement>('[data-pause=resume]')!.click();expect(paused()).toBe(false);
  doc.querySelector<HTMLButtonElement>('[data-pause=quit]')?.click();
  // Webcam fight.
  doc.getElementById('demo-webcam')!.click();
  const space=doc.getElementById('clear-space') as HTMLInputElement;space.checked=true;space.dispatchEvent(new dom.window.Event('change'));doc.getElementById('start-camera')!.click();await Promise.resolve();await Promise.resolve();
  const landmarks=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:1}));landmarks[11]!.x=.4;landmarks[12]!.x=.6;
  frames=setInterval(()=>observed.frame({landmarks,at:performance.now(),fps:30,inferenceMs:12}),33);
  await vi.advanceTimersByTimeAsync(100);doc.getElementById('play-webcam')!.click();
  await vi.advanceTimersByTimeAsync(9000);expect(observed.renders.at(-1)!.paused).toBe(false);expect(observed.renders.at(-1)!.clock.beat).toBeGreaterThanOrEqual(1);
  esc();expect(observed.renders.at(-1)!.paused).toBe(true);expect(reason().textContent).toBe('Paused: Esc');expect(hint().hidden).toBe(false);seen();
  // No guard: stays paused.
  await vi.advanceTimersByTimeAsync(1500);expect(observed.renders.at(-1)!.paused).toBe(true);
  // Raised wrists give a real classifier guard; 1 s later the fight resumes hands-free.
  landmarks[15]!.y=.3;landmarks[16]!.y=.3;landmarks[13]!.y=.6;landmarks[14]!.y=.6;landmarks[23]!.y=.8;landmarks[24]!.y=.8;
  await vi.advanceTimersByTimeAsync(500);expect(observed.renders.at(-1)!.paused).toBe(true);
  await vi.advanceTimersByTimeAsync(700);expect(observed.renders.at(-1)!.paused).toBe(false);expect(paused()).toBe(false);
  // Clear space unticked: says so, and a held guard cannot resume until it is ticked again.
  space.checked=false;space.dispatchEvent(new dom.window.Event('change'));expect(paused()).toBe(true);expect(reason().textContent).toBe('Paused: confirm your clear space');seen();
  await vi.advanceTimersByTimeAsync(2000);expect(paused()).toBe(true);
  space.checked=true;space.dispatchEvent(new dom.window.Event('change'));await vi.advanceTimersByTimeAsync(1200);expect(paused()).toBe(false);expect(observed.renders.at(-1)!.paused).toBe(false);
  // Camera loses the player: Resume explains why it cannot resume, and guard cannot resume either.
  esc();clearInterval(frames);await vi.advanceTimersByTimeAsync(700);
  doc.querySelector<HTMLButtonElement>('[data-pause=resume]')!.click();expect(paused()).toBe(true);expect(reason().textContent).toMatch(/^Paused: camera can't see you/);seen();
  expect(reasons.every(text=>!/twitch|stream|chat/i.test(text))).toBe(true);
 }finally{if(frames)clearInterval(frames);dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();vi.unstubAllGlobals();vi.useRealTimers();}
});
