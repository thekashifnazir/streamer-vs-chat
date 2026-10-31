import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
const observed=vi.hoisted(()=>({renders:[] as any[],frame:null as any}));
vi.mock('../../overlay/src/hud',()=>({createRailsHud:()=>new Proxy({render:(state:unknown)=>observed.renders.push(state)},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{}})}));
vi.mock('../../capture/src/camera',()=>({PoseCamera:class{constructor(_video:unknown,frame:unknown){observed.frame=frame;}async start(){return true;}stop(){}}}));
vi.mock('../../capture/src/calibration',()=>({createCalibration:()=>{const snapshot={ready:true,stage:'ready',progress:1,message:'Ready',guardThreshold:0,mode:'standing',leanPeaks:{L:1,R:1}};return{snapshot,update:()=>snapshot,restore:()=>false,reset(){},start(){}};}}));

// A real clock moves between the 100 ms timer's reading and startFight's own reading. The timer
// used to step the new game with its older reading, throwing "Engine time must be finite and
// monotonic" once at the end of every webcam countdown.
it('the webcam countdown starts the fight without stepping the new game back in time',async()=>{
 vi.resetModules();vi.useFakeTimers();observed.renders=[];const epoch=Date.now();let calls=0;
 vi.stubGlobal('performance',{now:()=>Date.now()-epoch+(++calls)*.001});
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://example.test/'});
 for(const key of ['window','document','location','history','navigator','Event','KeyboardEvent','HTMLElement'] as const)vi.stubGlobal(key,dom.window[key]);
 dom.window.setInterval=globalThis.setInterval as unknown as typeof dom.window.setInterval;dom.window.clearInterval=globalThis.clearInterval as unknown as typeof dom.window.clearInterval;
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('fetch',vi.fn(()=>{throw Error('No network in test');}));Object.defineProperty(dom.window.performance,'now',{value:()=>performance.now()});
 const errors:unknown[]=[];
 try{await import('./main');const doc=dom.window.document;
  doc.getElementById('demo-webcam')!.click();
  const space=doc.getElementById('clear-space') as HTMLInputElement;space.checked=true;space.dispatchEvent(new dom.window.Event('change'));doc.getElementById('start-camera')!.click();await Promise.resolve();await Promise.resolve();
  const landmarks=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:1}));landmarks[11]!.x=.4;landmarks[12]!.x=.6;
  const frames=setInterval(()=>observed.frame({landmarks,at:performance.now(),fps:30,inferenceMs:12}),33);
  await vi.advanceTimersByTimeAsync(100);doc.getElementById('play-webcam')!.click();
  expect(doc.getElementById('webcam-countdown')!.textContent).toContain('Get in position');
  for(let ms=0;ms<8000;ms+=100){try{await vi.advanceTimersByTimeAsync(100);}catch(error){errors.push(error);}}
  clearInterval(frames);
  expect(errors).toEqual([]);
  const game=observed.renders.at(-1)!;expect(game.paused).toBe(false);expect(game.clock.beat).toBeGreaterThanOrEqual(1);
 }finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();vi.unstubAllGlobals();vi.useRealTimers();}
});
