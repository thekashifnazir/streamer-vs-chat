import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
const observed=vi.hoisted(()=>({renders:[] as any[],frame:null as any,options:null as any,names:[] as string[]}));
vi.mock('../../overlay/src/hud',()=>({createRailsHud:()=>new Proxy({render:(state:unknown)=>observed.renders.push(state),setPlayerName:(name:string)=>observed.names.push(name)},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{}})}));
vi.mock('../../capture/src/camera',()=>({PoseCamera:class{constructor(_video:unknown,frame:unknown){observed.frame=frame;}async start(){return true;}stop(){}}}));
vi.mock('../../capture/src/calibration',()=>({createCalibration:()=>{const snapshot={ready:true,stage:'ready',progress:1,message:'Ready',guardThreshold:0,mode:'standing',leanPeaks:{L:1,R:1}};return{snapshot,update:()=>snapshot,restore:()=>false,reset(){},start(){}};}}));
vi.mock('./play',()=>({mountHostedPlay:(options:unknown)=>{observed.options=options;return new Proxy({ready:true,hasToken:true,login:'teststreamer',forgeBusy:false,publicSummary:(s:unknown)=>s},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{}});}}));
it('countdown starts a framed live fight without pausing; transport loss is visible and Resume/Esc unstick it',async()=>{
 vi.resetModules();vi.useFakeTimers();observed.renders=[];const epoch=Date.now();vi.stubGlobal('performance',{now:()=>Date.now()-epoch});
 const dom=new JSDOM(readFileSync(new URL('../play/index.html',import.meta.url),'utf8'),{url:'https://example.test/play'});
 for(const key of ['window','document','location','history','navigator','Event','KeyboardEvent','HTMLElement'] as const)vi.stubGlobal(key,dom.window[key]);
 dom.window.setInterval=globalThis.setInterval as unknown as typeof dom.window.setInterval;dom.window.clearInterval=globalThis.clearInterval as unknown as typeof dom.window.clearInterval;
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('fetch',vi.fn(()=>{throw Error('No network in test');}));Object.defineProperty(dom.window.performance,'now',{value:()=>performance.now()});
 try{await import('./main');const doc=dom.window.document;
 const source=doc.getElementById('input-source') as HTMLSelectElement;source.value='pose';source.dispatchEvent(new dom.window.Event('change'));
 const space=doc.getElementById('clear-space') as HTMLInputElement;space.checked=true;space.dispatchEvent(new dom.window.Event('change'));doc.getElementById('start-camera')!.click();await Promise.resolve();await Promise.resolve();
 const landmarks=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:1}));landmarks[11]!.x=.4;landmarks[12]!.x=.6;
 const frames=setInterval(()=>observed.frame({landmarks,at:performance.now(),fps:30,inferenceMs:12}),33);
 await vi.advanceTimersByTimeAsync(100);expect(dom.window.performance.now()).toBe(performance.now());doc.getElementById('play-webcam')!.click();expect(doc.getElementById('webcam-countdown')!.textContent).toContain('Get in position');
 // Webcam defaults to Easy (3.6 s beat), so the first attack is telegraphed ~3.6 s into the fight.
 await vi.advanceTimersByTimeAsync(9000);const game=observed.renders.at(-1)!;expect(game.difficulty).toBe('easy');expect(game.clock.beat).toBeGreaterThanOrEqual(1);expect(game.paused).toBe(false);expect(doc.getElementById('pause-screen')!.hidden).toBe(true);expect(game.activeAttack).not.toBeNull();await vi.advanceTimersByTimeAsync(1000);expect(observed.renders.at(-1)!.log.resolved.length).toBeGreaterThan(0);expect(observed.renders.at(-1)!.paused).toBe(false);
 observed.options.onDisconnect('Twitch chat disconnected — reconnect, then resume');expect(observed.renders.at(-1)!.paused).toBe(true);expect(doc.getElementById('pause-screen')!.hidden).toBe(false);expect(doc.querySelector('[data-pause-reason]')!.textContent).toContain('Twitch chat disconnected');expect(doc.querySelector<HTMLElement>('[data-guard-resume]')!.hidden).toBe(false);
 doc.querySelector<HTMLButtonElement>('[data-pause=resume]')!.click();expect(observed.renders.at(-1)!.paused).toBe(false);
 // The broadcast HUD names the connected streamer, not the default local-server name.
 expect(observed.names.at(-1)).toBe('TESTSTREAMER');expect(observed.names).not.toContain('KASH');
 dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'Escape'}));expect(observed.renders.at(-1)!.paused).toBe(true);expect(doc.querySelector('[data-pause-reason]')!.textContent).toBe('Paused: Esc');dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'Escape'}));expect(observed.renders.at(-1)!.paused).toBe(false);
 // Raised wrists produce a real classifier guard; paused input still reaches the hold detector.
 landmarks[15]!.y=.3;landmarks[16]!.y=.3;landmarks[13]!.y=.6;landmarks[14]!.y=.6;landmarks[23]!.y=.8;landmarks[24]!.y=.8;
 observed.options.onDisconnect('stream ended');await vi.advanceTimersByTimeAsync(1100);expect(observed.renders.at(-1)!.paused).toBe(false);clearInterval(frames);
 }finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();vi.unstubAllGlobals();vi.useRealTimers();}
});
