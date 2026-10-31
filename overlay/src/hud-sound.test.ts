import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';
import {createRailsHud} from './hud';
import {createGame} from '../../shared/src/engine';
vi.mock('./assets',async importOriginal=>({...await importOriginal<typeof import('./assets')>(),BossSprite:class{draw(){}dispose(){}}}));
class Context{
 state:AudioContextState='running';currentTime=0;destination={};starts:unknown[]=[];
 resume=vi.fn(async()=>{});close=vi.fn(async()=>{});decodeAudioData=vi.fn(async()=>({duration:1}));
 createGain(){return{gain:{value:0,setValueAtTime(){},cancelScheduledValues(){}},connect(){}};}
 createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect(){}};}
 createBufferSource(){const source={buffer:null,loop:false,connect(){},start:()=>{this.starts.push(source.buffer);},stop(){}};return source;}
}
let dom:JSDOM;
afterEach(()=>{vi.unstubAllGlobals();dom?.window.close();});
function setup(live:boolean,obs=false){
 dom=new JSDOM('<div id=host></div><input id=sound type=checkbox>',{url:'http://localhost/play/'});
 const contexts:Context[]=[];
 vi.stubGlobal('window',dom.window);vi.stubGlobal('document',dom.window.document);vi.stubGlobal('location',dom.window.location);
 vi.stubGlobal('Element',dom.window.Element);vi.stubGlobal('CustomEvent',dom.window.CustomEvent);
 let animation:FrameRequestCallback=()=>{};vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{animation=callback;return 1;});vi.stubGlobal('cancelAnimationFrame',()=>{});
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:false,addEventListener(){},removeEventListener(){}})});
 vi.stubGlobal('AudioContext',class extends Context{constructor(){super();contexts.push(this);}});
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(new Uint8Array([1]))));
 const host=dom.window.document.getElementById('host')!,input=dom.window.document.getElementById('sound') as HTMLInputElement;
 const idleCallbacks:IdleRequestCallback[]=[];const cancelIdle=vi.fn();
 Object.defineProperty(dom.window,'requestIdleCallback',{value:(callback:IdleRequestCallback)=>{idleCallbacks.push(callback);return 7;}});
 Object.defineProperty(dom.window,'cancelIdleCallback',{value:cancelIdle});
 const hud=createRailsHud(host,obs?{}:{simulated:!live,soundDefault:live,deferSoundUntilStart:live});
 const sync=()=>{input.checked=hud.soundRequested();};host.addEventListener('rails-sound-change',sync);sync();
 input.addEventListener('change',()=>{void hud.setSoundRequested(input.checked);});
 return{hud,host,input,contexts,idleCallbacks,cancelIdle,frame:()=>animation(0)};
}
it('keeps demo sound off and hosted sound requested on without unlocking before START',async()=>{
 const{hud,input,contexts}=setup(true);expect(input.checked).toBe(true);
 dom.window.dispatchEvent(new dom.window.Event('pointerdown'));dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'KeyK'}));
 expect(contexts).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();await hud.activateSound();expect(contexts[0]!.resume).toHaveBeenCalled();hud.dispose();
 const demo=setup(false);expect(demo.hud.soundRequested()).toBe(false);expect(demo.input.checked).toBe(false);await demo.hud.activateSound();expect(demo.contexts).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();demo.hud.dispose();
});
it('keeps the setup switch, M and HUD button synchronized to requested sound, including before START',async()=>{
 const{hud,host,input,contexts}=setup(true);
 dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'KeyM'}));expect(input.checked).toBe(false);expect(contexts).toHaveLength(0);
 input.checked=true;input.dispatchEvent(new dom.window.Event('change'));expect(hud.soundRequested()).toBe(true);expect(contexts).toHaveLength(0);
 host.querySelector<HTMLButtonElement>('[data-id=sound]')!.click();expect(input.checked).toBe(false);
 await hud.activateSound();expect(contexts).toHaveLength(0);
 input.checked=true;input.dispatchEvent(new dom.window.Event('change'));await Promise.resolve();expect(contexts[0]!.resume).toHaveBeenCalled();
 dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'KeyM'}));expect(input.checked).toBe(false);expect(hud.soundRequested()).toBe(false);hud.dispose();
});

it('exposes current HP units and custom maximums through progressbar semantics',()=>{
 const {hud,host}=setup(false);
 for(const id of ['streamer','boss']){const bar=host.querySelector(`[data-id=${id}-bar]`)!;expect(bar.getAttribute('role')).toBe('progressbar');expect(bar.getAttribute('aria-valuemin')).toBe('0');}
 const state=createGame();state.streamer.hp=77.5;state.boss.max_hp=180;state.boss.hp=101;hud.render(state);
 const player=host.querySelector('[data-id=streamer-bar]')!,boss=host.querySelector('[data-id=boss-bar]')!;
 expect(player.getAttribute('aria-valuenow')).toBe('77.5');expect(player.getAttribute('aria-valuemax')).toBe('100');
 expect(boss.getAttribute('aria-valuenow')).toBe('101');expect(boss.getAttribute('aria-valuemax')).toBe('180');
 state.boss.hp=-5;hud.render(state);expect(boss.getAttribute('aria-valuenow')).toBe('0');hud.dispose();
});

it.each([200,900])('retries a delayed first warning only inside the telegraph (delay %i ms)',async delay=>{
 const {hud,contexts,frame}=setup(true);let elapsed=0;vi.stubGlobal('performance',{now:()=>elapsed});
 Object.defineProperty(dom.window.Element.prototype,'animate',{configurable:true,value:()=>({})});
 const pending:Array<()=>void>=[];
 vi.stubGlobal('fetch',vi.fn((url:unknown)=>new Promise<Response>(resolve=>{if(/(?:hands-up)/.test(String(url)))pending.push(()=>resolve(new Response(new Uint8Array([1]))));})));
 expect(fetch).not.toHaveBeenCalled();const before=createGame();hud.render(before);const unlocking=hud.activateSound();expect(pending).toHaveLength(2);
 const telling=structuredClone(before);telling.now=2600;telling.round.elapsed_ms=2600;telling.activeAttack={round:1,beat:1,move:'JAB',at:2400,lands_at:3200,exploit:false,vetoed:false};hud.render(telling);
 expect(contexts[0]!.starts).toHaveLength(0);elapsed=delay;pending.forEach(resolve=>resolve());await unlocking;frame();
 expect(contexts[0]!.starts).toHaveLength(delay===200?2:0);frame();expect(contexts[0]!.starts).toHaveLength(delay===200?2:0);hud.dispose();
});

it('defers standalone OBS autoplay until idle and cancels priming on disposal',async()=>{
 const obs=setup(true,true);expect(fetch).not.toHaveBeenCalled();expect(obs.contexts).toHaveLength(0);
 expect(obs.idleCallbacks).toHaveLength(1);obs.idleCallbacks[0]!({} as IdleDeadline);
 await vi.waitFor(()=>expect(obs.contexts[0]?.resume).toHaveBeenCalled());obs.hud.dispose();expect(obs.cancelIdle).toHaveBeenCalledWith(7);
 const cancelled=setup(true,true);cancelled.hud.dispose();cancelled.idleCallbacks[0]!({} as IdleDeadline);
 expect(fetch).not.toHaveBeenCalled();expect(cancelled.contexts).toHaveLength(0);
});
