import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';
import {createRailsHud} from './hud';
vi.mock('./assets',async importOriginal=>({...await importOriginal<typeof import('./assets')>(),BossSprite:class{draw(){}dispose(){}}}));
class Context{
 state:AudioContextState='running';currentTime=0;destination={};
 resume=vi.fn(async()=>{});close=vi.fn(async()=>{});decodeAudioData=vi.fn(async()=>({duration:1}));
 createGain(){return{gain:{value:0,setValueAtTime(){},cancelScheduledValues(){}},connect(){}};}
 createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect(){}};}
 createBufferSource(){return{buffer:null,loop:false,connect(){},start(){},stop(){}};}
}
let dom:JSDOM;
afterEach(()=>{vi.unstubAllGlobals();dom?.window.close();});
function setup(live:boolean){
 dom=new JSDOM('<div id=host></div><input id=sound type=checkbox>',{url:'http://localhost/play/'});
 const contexts:Context[]=[];
 vi.stubGlobal('window',dom.window);vi.stubGlobal('document',dom.window.document);vi.stubGlobal('location',dom.window.location);
 vi.stubGlobal('Element',dom.window.Element);vi.stubGlobal('CustomEvent',dom.window.CustomEvent);
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:false,addEventListener(){},removeEventListener(){}})});
 vi.stubGlobal('AudioContext',class extends Context{constructor(){super();contexts.push(this);}});
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(new Uint8Array([1]))));
 const host=dom.window.document.getElementById('host')!,input=dom.window.document.getElementById('sound') as HTMLInputElement;
 const hud=createRailsHud(host,{simulated:!live,soundDefault:live,deferSoundUntilStart:live});
 const sync=()=>{input.checked=hud.soundRequested();};host.addEventListener('rails-sound-change',sync);sync();
 input.addEventListener('change',()=>{void hud.setSoundRequested(input.checked);});
 return{hud,host,input,contexts};
}
it('keeps demo sound off and hosted sound requested on without unlocking before START',async()=>{
 const{hud,input,contexts}=setup(true);expect(input.checked).toBe(true);
 dom.window.dispatchEvent(new dom.window.Event('pointerdown'));dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'KeyK'}));
 expect(contexts[0]!.resume).not.toHaveBeenCalled();await hud.activateSound();expect(contexts[0]!.resume).toHaveBeenCalled();hud.dispose();
 const demo=setup(false);expect(demo.hud.soundRequested()).toBe(false);expect(demo.input.checked).toBe(false);demo.hud.dispose();
});
it('keeps the setup switch, M and HUD button synchronized to requested sound, including before START',async()=>{
 const{hud,host,input,contexts}=setup(true);
 dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'KeyM'}));expect(input.checked).toBe(false);expect(contexts[0]!.resume).not.toHaveBeenCalled();
 input.checked=true;input.dispatchEvent(new dom.window.Event('change'));expect(hud.soundRequested()).toBe(true);expect(contexts[0]!.resume).not.toHaveBeenCalled();
 host.querySelector<HTMLButtonElement>('[data-id=sound]')!.click();expect(input.checked).toBe(false);
 await hud.activateSound();expect(contexts[0]!.resume).not.toHaveBeenCalled();
 input.checked=true;input.dispatchEvent(new dom.window.Event('change'));await Promise.resolve();expect(contexts[0]!.resume).toHaveBeenCalled();
 dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'KeyM'}));expect(input.checked).toBe(false);expect(hud.soundRequested()).toBe(false);hud.dispose();
});
