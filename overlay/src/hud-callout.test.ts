import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';
import {createRailsHud,telegraphBanner} from './hud';
import {createGame,type GameState} from '../../shared/src/engine';
import type {Move} from '@svc/shared';
vi.mock('./assets',async importOriginal=>({...await importOriginal<typeof import('./assets')>(),BossSprite:class{draw(){}dispose(){}}}));
// Each decoded buffer remembers its URL so a test can tell the sting from the voice.
class Context{
 state:AudioContextState='running';currentTime=0;destination={};starts:string[]=[];
 resume=vi.fn(async()=>{});close=vi.fn(async()=>{});decodeAudioData=vi.fn(async(data:ArrayBuffer)=>({duration:.5,name:new TextDecoder().decode(data)}));
 createGain(){return{gain:{value:0,setValueAtTime(){},cancelScheduledValues(){}},connect(){}};}
 createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect(){}};}
 createBufferSource(){const source={buffer:null as null|{name:string},loop:false,connect(){},start:()=>{this.starts.push(source.buffer?.name??'');},stop(){}};return source;}
}
let dom:JSDOM;
afterEach(()=>{vi.unstubAllGlobals();dom?.window.close();});
function setup(){
 dom=new JSDOM('<div id=host></div>',{url:'http://localhost/play/'});const contexts:Context[]=[];
 vi.stubGlobal('window',dom.window);vi.stubGlobal('document',dom.window.document);vi.stubGlobal('location',dom.window.location);
 vi.stubGlobal('Element',dom.window.Element);vi.stubGlobal('CustomEvent',dom.window.CustomEvent);
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:false,addEventListener(){},removeEventListener(){}})});
 Object.defineProperty(dom.window.Element.prototype,'animate',{configurable:true,value:()=>({})});
 vi.stubGlobal('AudioContext',class extends Context{constructor(){super();contexts.push(this);}});
 vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>new Response(new TextEncoder().encode(String(url)))));
 const host=dom.window.document.getElementById('host')!;
 const hud=createRailsHud(host,{soundDefault:true,deferSoundUntilStart:true});
 const banner=()=>host.querySelector('[data-id=banner]')!.textContent;
 const chip=()=>host.querySelector('[data-id=cue]')!.textContent;
 // Sounds started since the last call, as 'sting' (short telegraph SFX) and 'voice' (spoken hands-up line).
 let seen=0;const heard=()=>{const starts=contexts[0]?.starts??[],fresh=starts.slice(seen);seen=starts.length;
  return fresh.flatMap(name=>/voice\/ready\/hands-up/.test(name)?['voice']:/sfx-ready\/hands-up/.test(name)?['sting']:[]);};
 return {hud,host,banner,chip,heard};
}
function telling(base:GameState,beat:number,move:Move,round=1,extra:Partial<NonNullable<GameState['activeAttack']>>={}):GameState{
 const state=structuredClone(base);state.round.number=round;state.now=beat*2400+200;state.round.elapsed_ms=state.now;
 state.activeAttack={round,beat,move,at:beat*2400,lands_at:beat*2400+800,exploit:false,vetoed:false,...extra};return state;
}

it('names the defence in the big callout, player-side like the move chip, with TILT when seated',()=>{
 expect(telegraphBanner('guard')).toBe('GUARD!');expect(telegraphBanner('lean_left')).toBe('LEAN LEFT!');expect(telegraphBanner('lean_right')).toBe('LEAN RIGHT!');expect(telegraphBanner('lean_any')).toBe('LEAN ANY WAY!');
 expect(telegraphBanner('lean_left',true)).toBe('TILT LEFT!');expect(telegraphBanner('lean_right',true)).toBe('TILT RIGHT!');expect(telegraphBanner('guard',true)).toBe('GUARD!');
 const {hud,banner,chip}=setup(),base=createGame();hud.render(base);
 const expected:[Move,string,string][]=[['JAB','GUARD!','GUARD'],['COMBO','GUARD!','GUARD'],['HOOK_L','LEAN RIGHT!','LEAN →'],['HOOK_R','LEAN LEFT!','← LEAN']];
 expected.forEach(([move,word,cue],index)=>{hud.render(telling(base,index+1,move));expect(banner()).toBe(word);expect(chip()).toBe(cue);expect(banner()).not.toContain('HANDS UP');});
 hud.setModes({seated:true,noPunch:true});
 hud.render(telling(base,5,'HOOK_L'));expect(banner()).toBe('TILT RIGHT!');expect(chip()).toBe('TILT →');
 hud.render(telling(base,6,'HOOK_R'));expect(banner()).toBe('TILT LEFT!');expect(chip()).toBe('← TILT');
 hud.render(telling(base,7,'JAB'));expect(banner()).toBe('GUARD!');
 hud.render(telling(base,8,'SUPER',1,{lands_at:8*2400+1600,super_steps:['guard','lean_left','lean_right'],super_results:[]} as Partial<NonNullable<GameState['activeAttack']>>));expect(banner()).toBe('SUPER!');
 hud.dispose();
});

it('plays the short sting on every telegraph but the hands-up voice only once per round, on a guard move',async()=>{
 const {hud,heard}=setup(),base=createGame();hud.render(base);await hud.activateSound();heard();
 hud.render(telling(base,1,'HOOK_L'));expect(heard()).toEqual(['sting']);
 hud.render(telling(base,2,'JAB'));expect(heard()).toEqual(['sting','voice']);
 hud.render(telling(base,2,'JAB'));expect(heard()).toEqual([]);
 hud.render(telling(base,3,'COMBO'));expect(heard()).toEqual(['sting']);
 hud.render(telling(base,4,'JAB'));expect(heard()).toEqual(['sting']);
 hud.render(telling(base,5,'HOOK_R'));expect(heard()).toEqual(['sting']);
 hud.render(telling(base,1,'JAB',2));expect(heard()).toEqual(['sting','voice']);
 hud.render(telling(base,2,'JAB',2));expect(heard()).toEqual(['sting']);
 hud.render(telling(base,3,'SUPER',3,{lands_at:3*2400+1600,super_steps:['guard','lean_left','guard'],super_results:[]} as Partial<NonNullable<GameState['activeAttack']>>));expect(heard()).toEqual(['sting']);
 hud.render(telling(base,4,'JAB',3));expect(heard()).toEqual(['sting','voice']);
 hud.dispose();
});

it('keeps sound off and mute silent for every telegraph',async()=>{
 const {hud,heard}=setup(),base=createGame();hud.render(base);await hud.activateSound();heard();
 await hud.setSoundRequested(false);
 hud.render(telling(base,1,'JAB'));hud.render(telling(base,2,'HOOK_L'));expect(heard()).toEqual([]);
 await hud.setSoundRequested(true);hud.render(telling(base,3,'JAB'));expect(heard()).toEqual(['sting','voice']);
 hud.dispose();
});

it('does not repeat the voice after a mid-round reconnect that already had a guard telegraph',async()=>{
 const {hud,heard}=setup(),base=createGame(),earlier=telling(base,1,'JAB');
 const resumed=telling(base,2,'JAB');resumed.log.telegraphs=[earlier.activeAttack!];
 await hud.activateSound();heard();hud.render(resumed);expect(heard()).toEqual(['sting']);
 hud.dispose();
});
