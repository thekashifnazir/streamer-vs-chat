import {JSDOM} from 'jsdom';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {createGame,type GameState,type Resolution} from '../../shared/src/engine';
import {cameraCueBadge,cameraCueRing,cameraCues,mountCameraHit,screenSide} from './camera-hit';
import {BOSS_HIT_LOOK,bossHitAnimations} from './boss-feedback';

function base():GameState{const state=structuredClone(createGame());state.now=5000;state.round.elapsed_ms=5000;return state;}
function resolution(outcome:Resolution['outcome'],defence:Resolution['defence'],lean:Resolution['lean']=null):Resolution{
 return {round:1,beat:1,move:'JAB',at:4900,outcome,dmg:outcome==='HIT'?6:0,counter_dmg:outcome==='HIT'?0:2,guard:defence==='guard',lean,defence,reaction_ms:200,reaction_kind:'reacted',capture_at:null,received_at:null};
}
function after(before:GameState,change:(state:GameState)=>void){const state=structuredClone(before);state.now+=100;state.round.elapsed_ms+=100;change(state);return state;}
const punched=(before:GameState,damage=1.5)=>after(before,state=>{state.log.bossDamage=[...state.log.bossDamage,{round:1,beat:1,at:5050,kind:'punch',damage}];state.boss.hp-=damage;});
const resolved=(before:GameState,result:Resolution,counter=true)=>after(before,state=>{state.log.resolved=[...state.log.resolved,result];if(counter&&result.counter_dmg)state.log.bossDamage=[...state.log.bossDamage,{round:1,beat:1,at:4900,kind:'counter',damage:result.counter_dmg}];});

describe('camera circle feedback: sides and words',()=>{
 it('puts the player\'s own hand on its side of the mirrored circle',()=>{
  expect(screenSide('L')).toBe('left');expect(screenSide('R')).toBe('right');
  // An unmirrored camera shows the player's left hand on screen right.
  expect(screenSide('L',false)).toBe('right');expect(screenSide('R',false)).toBe('left');
  expect(cameraCueBadge({kind:'punch',side:'L',amount:1})).toEqual({spot:'left',text:'L\n−1'});
  expect(cameraCueBadge({kind:'punch',side:'R',amount:1.5})).toEqual({spot:'right',text:'R\n−1.5'});
  expect(cameraCueBadge({kind:'punch',side:'R',amount:2})).toEqual({spot:'right',text:'R\n−2'});
  expect(cameraCueBadge({kind:'punch',side:'R',amount:1.5},false)?.spot).toBe('left');
  // Crowd Trainer: the hand only, no damage.
  expect(cameraCueBadge({kind:'punch',side:'L'})).toEqual({spot:'left',text:'L'});
 });
 it('shows a dodge on the side the player leaned to, a block on top, and a hit taken as a ring only',()=>{
  expect(cameraCueBadge({kind:'dodge',side:'L'})).toEqual({spot:'left',text:'DODGED ←'});
  expect(cameraCueBadge({kind:'dodge',side:'R'})).toEqual({spot:'right',text:'→ DODGED'});
  expect(cameraCueBadge({kind:'dodge',side:'L'},false)).toEqual({spot:'right',text:'→ DODGED'});
  expect(cameraCueBadge({kind:'block'})).toEqual({spot:'top',text:'BLOCKED 🛡'});
  expect(cameraCueBadge({kind:'perfect'})).toEqual({spot:'top',text:'PERFECT 🛡'});
  expect(cameraCueBadge({kind:'perfect',side:'R'})).toEqual({spot:'right',text:'→ PERFECT'});
  expect(cameraCueBadge({kind:'hit'})).toBeNull();
  expect(cameraCueRing({kind:'punch'})).toBe('punch');expect(cameraCueRing({kind:'dodge'})).toBe('defence');expect(cameraCueRing({kind:'block'})).toBe('defence');expect(cameraCueRing({kind:'hit'})).toBe('hit');
 });
});

describe('camera circle feedback: cues from the engine',()=>{
 it('finds a landed punch with its damage, never a defence counter',()=>{
  const before=base();
  expect(cameraCues(before,punched(before,1.5))).toEqual([{kind:'punch',amount:1.5}]);
  expect(cameraCues(before,resolved(before,resolution('BLOCK','guard')))).toEqual([{kind:'block'}]);
 });
 it('names the three outcomes: dodged (with the lean), blocked and hit',()=>{
  const before=base();
  expect(cameraCues(before,resolved(before,resolution('DODGE','lean','L')))).toEqual([{kind:'dodge',side:'L'}]);
  expect(cameraCues(before,resolved(before,resolution('DODGE','lean','R')))).toEqual([{kind:'dodge',side:'R'}]);
  expect(cameraCues(before,resolved(before,resolution('BLOCK','guard')))).toEqual([{kind:'block'}]);
  expect(cameraCues(before,resolved(before,resolution('HIT','none'),false))).toEqual([{kind:'hit'}]);
  expect(cameraCues(before,resolved(before,resolution('PERFECT','guard')))).toEqual([{kind:'perfect'}]);
  expect(cameraCues(before,resolved(before,resolution('PERFECT','lean','L')))).toEqual([{kind:'perfect',side:'L'}]);
  expect(cameraCues(before,resolved(before,resolution('CHIP','guard'),false))).toEqual([]);
 });
 it('replays nothing on the first snapshot, a new round or a rewind',()=>{
  const before=base(),later=punched(before);
  expect(cameraCues(undefined,later)).toEqual([]);
  expect(cameraCues(before,{...later,round:{...later.round,number:2}})).toEqual([]);
  expect(cameraCues(later,{...before,log:{...before.log,bossDamage:[...later.log.bossDamage,{round:1,beat:1,at:5000,kind:'punch',damage:1}]}})).toEqual([]);
 });
});

let dom:JSDOM;
afterEach(()=>{dom?.window.close();vi.unstubAllGlobals();});
function mount(options:{calm?:boolean;circle?:boolean}={}){
 dom=new JSDOM('<div id=stage><canvas class="pose-preview"></canvas></div>');
 const stage=dom.window.document.getElementById('stage')!,circle=stage.querySelector('canvas')!;circle.hidden=!(options.circle??true);
 const calls:{node:HTMLElement;frames:Keyframe[];duration:number}[]=[];
 Object.defineProperty(dom.window.Element.prototype,'animate',{configurable:true,value(this:HTMLElement,frames:Keyframe[],timing:KeyframeAnimationOptions){calls.push({node:this,frames,duration:Number(timing.duration)});return {cancel(){}};}});
 const hit=mountCameraHit(stage,{calm:()=>!!options.calm});
 const ring=()=>stage.querySelector<HTMLElement>('.camera-hit-ring')!,badge=(spot:string)=>stage.querySelector<HTMLElement>(`.camera-hit-badge[data-spot=${spot}]`);
 return {stage,hit,calls,ring,badge};
}
describe('camera circle feedback layer',()=>{
 it('flashes the ring yellow and pops the hand badge on a landed punch',()=>{
  const {hit,calls,ring,badge,stage}=mount(),before=base();hit.observe(before);hit.notePunch('R');hit.observe(punched(before,1.5));
  expect(stage.querySelector<HTMLElement>('.camera-hit')!.hidden).toBe(false);
  expect(ring().dataset.kind).toBe('punch');expect(ring().style.getPropertyValue('--hit-color')).toBe('#ffdc43');
  expect(calls.find(call=>call.node===ring())!.duration).toBe(250);
  expect(badge('right')!.textContent).toBe('R−1.5');expect(badge('left')).toBeNull();
 });
 it('flashes the ring cyan, not yellow, for a clean defence and its counter',()=>{
  const {hit,ring,badge}=mount(),before=base();hit.observe(before);hit.notePunch('L');hit.observe(resolved(before,resolution('DODGE','lean','L')));
  expect(ring().dataset.kind).toBe('defence');expect(ring().style.getPropertyValue('--hit-color')).toBe('#2ef2ff');
  expect(badge('left')!.textContent).toBe('DODGED ←');
  const next=resolved(before,resolution('BLOCK','guard'));hit.observe(before);hit.observe(next);expect(badge('top')!.textContent).toBe('BLOCKED 🛡');expect(ring().dataset.kind).toBe('defence');
 });
 it('gives a hit taken a short red ring and no badge',()=>{
  const {hit,calls,ring,stage}=mount(),before=base();hit.observe(before);hit.observe(resolved(before,resolution('HIT','none'),false));
  expect(ring().dataset.kind).toBe('hit');expect(ring().style.getPropertyValue('--hit-color')).toBe('#ff3b30');expect(calls.find(call=>call.node===ring())!.duration).toBe(200);
  expect(stage.querySelector('.camera-hit-badge')).toBeNull();
 });
 it('only fades in calm FX (reduced motion)',()=>{
  const {hit,calls}=mount({calm:true}),before=base();hit.observe(before);hit.notePunch('L');hit.observe(punched(before));
  expect(calls.length).toBe(2);for(const call of calls)for(const frame of call.frames){expect(frame.transform,'no scale on the ring').toBeUndefined();expect(frame.scale,'no pop on the badge').toBeUndefined();}
 });
 it('shows nothing without a camera circle on screen (keyboard play), but still reads the cue',()=>{
  const {hit,calls,stage}=mount({circle:false}),before=base();hit.observe(before);expect(hit.observe(punched(before))).toEqual([{kind:'punch',amount:1.5}]);
  expect(calls).toEqual([]);expect(stage.querySelector<HTMLElement>('.camera-hit')!.hidden).toBe(true);
 });
 it('shows a Crowd Trainer punch with the hand only',()=>{
  const {hit,badge}=mount();hit.trainerPunch('L');expect(badge('left')!.textContent).toBe('L');
 });
});

describe('boss hit look',()=>{
 it('makes a punch a white-yellow flash, a 22 px 200 ms shake, a 700 ms pop and a white HP chunk',()=>{
  const look=bossHitAnimations('punch',false);
  expect(look.tint).toEqual(BOSS_HIT_LOOK.punch);expect(look.popMs).toBe(700);expect(look.shakeMs).toBe(200);expect(look.shake![1]!.translate).toBe('22px -4px');
  expect(look.pop[0]!.transform).toContain('scale(.4)');expect(look.barFlash).not.toBeNull();
 });
 it('keeps defence counters cyan with no white HP chunk, so they never read as a punch',()=>{
  const look=bossHitAnimations('counter',false);expect(look.tint.tint).toBe('#2ef2ff');expect(look.barFlash).toBeNull();expect(BOSS_HIT_LOOK.punch.tint).not.toBe(look.tint.tint);
 });
 it('fades only in calm FX: no shake, no scale',()=>{
  for(const kind of ['punch','counter','finisher'] as const){const look=bossHitAnimations(kind,true);expect(look.shake).toBeNull();for(const frame of look.pop)expect(frame.transform).toBeUndefined();}
 });
});
