import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {createGame,type GameState,type Resolution} from '../../shared/src/engine';
import {STAGE_LANES,counterCall,counterPrompt,createPromptLane,joinCommands,punchPopText,roundHasVotes} from './stage-lanes';
import {createRailsHud} from './hud';
vi.mock('./assets',async importOriginal=>({...await importOriginal<typeof import('./assets')>(),BossSprite:class{draw(){}dispose(){}}}));
const overlayCss=readFileSync(new URL('./style.css',import.meta.url),'utf8'),demoCss=readFileSync(new URL('../../demo/src/style.css',import.meta.url),'utf8'),hudSource=readFileSync(new URL('./hud.ts',import.meta.url),'utf8');
// The last rule for the selector, or the last one that sets `property` (the rule that positions it).
const rule=(css:string,selector:string,property?:string)=>{const found=[...css.matchAll(new RegExp(`(?:^|[}\\n])${selector.replace(/[.*+?^${}()|[\]\\>]/g,'\\$&')}\\{([^}]*)\\}`,'g'))].map(match=>match[1]!).filter(declarations=>!property||new RegExp(`(^|;)${property}:`).test(declarations));expect(found.length,selector).toBeGreaterThan(0);return found.at(-1)!;};
const px=(declarations:string,property:string)=>Number(declarations.match(new RegExp(`(?:^|;)${property}:(-?[0-9.]+)px`))![1]);
const pct=(declarations:string,property:string)=>Number(declarations.match(new RegExp(`(?:^|;)${property}:([0-9.]+)%`))![1]);
type Box={left:number;right:number;top:number;bottom:number};
const intersects=(a:Box,b:Box)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
function counterState(outcome:Resolution['outcome']='BLOCK',defence:Resolution['defence']='guard'):GameState{
 const state=structuredClone(createGame());state.now=5000;state.round.elapsed_ms=5000;state.counter={open:true,closes_at:5600};
 state.log.resolved=[{round:1,beat:1,move:'JAB',at:4900,outcome,dmg:0,counter_dmg:2,guard:true,lean:null,defence,reaction_ms:200,reaction_kind:'reacted',capture_at:null,received_at:null}];
 return state;
}

describe('fight-stage lanes at 1920x1080',()=>{
 // The camera circle: the /play stream bubble's box, shared by the demo's circle (demo/src/style.css).
 const bubble=rule(demoCss,'.hosted-flow .stream-camera-bubble'),circle=rule(demoCss,'.demo-stage>.pose-preview');
 const circleBox:Box={left:1920*pct(circle,'left')/100,right:1920*(pct(circle,'left')+pct(circle,'width'))/100,top:1080*(1-(pct(circle,'bottom')+pct(circle,'height'))/100),bottom:1080*(1-pct(circle,'bottom')/100)};
 const cameraLane:Box={left:STAGE_LANES.centre.left,right:STAGE_LANES.centre.right,top:STAGE_LANES.camera.top,bottom:STAGE_LANES.camera.bottom};
 it('puts the demo circle in the /play bubble box, inside the camera lane',()=>{
  expect(bubble).toContain('inset:auto auto 3% 40%;width:20%;height:28%');
  expect([pct(circle,'left'),pct(circle,'width'),pct(circle,'height'),pct(circle,'bottom')]).toEqual([40,20,28,3]);
  expect(circleBox.top).toBeGreaterThanOrEqual(cameraLane.top);expect(circleBox.left).toBeGreaterThanOrEqual(cameraLane.left);expect(circleBox.right).toBeLessThanOrEqual(cameraLane.right);
  // The demo's full-size camera behind the fight is gone; /play's was already hidden.
  expect(demoCss).toContain('.offline-demo-page .demo-stage>#camera{visibility:hidden}');
 });
 it('keeps every prompt, banner and arrow box out of the camera lane',()=>{
  const lane=rule(overlayCss,'.prompt-lane'),laneTop=px(lane,'top'),laneBox:Box={left:px(lane,'left'),right:1920-px(lane,'right'),top:laneTop,bottom:laneTop+px(lane,'height')};
  expect([laneBox.top,laneBox.bottom]).toEqual([STAGE_LANES.prompt.top,STAGE_LANES.prompt.bottom]);
  // Prompt children never position themselves: they can only sit inside the lane.
  for(const selector of ['.super-ready-banner,.super-denied-banner','.finisher-banner','.finisher-banner.window-active','.counter-prompt']){const declarations=rule(overlayCss,selector);expect(declarations,selector).not.toMatch(/(^|;)(top|bottom|inset):/);expect(declarations,selector).not.toContain('position:absolute');}
  expect(hudSource).toMatch(/<div class="prompt-lane" data-id="prompt-lane"><div class="counter-prompt" data-id="counter-prompt"[^]*data-id="super-ready"[^]*data-id="super-denied"[^]*data-id="finisher-ready" role="status" hidden><\/div><\/div>/);
  // Two wrapped 40 px lines (or the one-line 44 px counter prompt) plus padding and border fit the lane's 120 px.
  const child=rule(overlayCss,'.prompt-lane>*');expect(child).toContain('max-width:680px');expect(child).toContain('font:400 40px/1.1');expect(2*40*1.1+24+8).toBeLessThanOrEqual(laneBox.bottom-laneBox.top);
  // Attack call: 142 px top, 140 px callout at 1.1, the 54 px move chip (1.2 line, 18 px padding, 10 px border), SUPER steps (20 px gap,
  // 44 px text, 36 px padding, 8 px border) and one 36 px note.
  const telegraph=rule(overlayCss,'.telegraph','top');const callBottom=px(telegraph,'top')+140*1.1+54*1.2+18+10+20+44+36+8+8+36*1.1;
  expect(callBottom).toBeLessThanOrEqual(STAGE_LANES.call.bottom);expect(STAGE_LANES.call.bottom).toBeLessThanOrEqual(STAGE_LANES.prompt.top);
  // LEAN arrows at the column edges: 170 px glyph and a 76 px word, both line-height 1.
  const arrow=rule(overlayCss,'.lean-arrow','top');const arrowBox=(left:number):Box=>({left,right:left+120,top:px(arrow,'top'),bottom:px(arrow,'top')+170+76});
  const boxes:Record<string,Box>={prompt:laneBox,call:{left:470,right:1450,top:px(telegraph,'top'),bottom:callBottom},left:arrowBox(px(rule(overlayCss,'.lean-arrow.left','left'),'left')),right:arrowBox(1920-px(rule(overlayCss,'.lean-arrow.right','right'),'right')-120),
   clock:{left:747,right:747+426,top:24,bottom:24+106}};
  for(const [name,box] of Object.entries(boxes)){expect(intersects(box,cameraLane),name).toBe(false);expect(intersects(box,circleBox),name).toBe(false);}
  // Pop, join panel, BLOCKED! and damage numbers live in the rails, outside the centre column.
  expect(hudSource).toMatch(/<aside class="rail boss"[^]*data-id="join-panel"[^]*data-id="punch-pop"[^]*<\/aside>/);expect(hudSource).toMatch(/<aside class="rail streamer"[^]*data-id="blocked"[^]*<\/aside>/);
 });
 it('keeps the 36 px HUD text floor in the new lanes and panels',()=>{
  for(const [selector,property] of [['.prompt-lane>*','font'],['.join-panel','font'],['.join-panel>small','font-size'],['.seated .punch-pop','font-size']] as const){const size=Number(rule(overlayCss,selector).match(new RegExp(`${property}:(?:400 |700 )?([0-9]+)px`))![1]);expect(size,selector).toBeGreaterThanOrEqual(36);}
 });
});

describe('prompt lane, counter and pop words',()=>{
 it('shows COUNTER · PUNCH NOW only in the counter window, adding J for keyboard and nothing in defence-only',()=>{
  const open=counterState();expect(counterPrompt(open,{keyboard:true}).text).toBe('COUNTER · PUNCH NOW · J');expect(counterPrompt(open,{}).text).toBe('COUNTER · PUNCH NOW');
  expect(counterPrompt(open,{noPunch:true}).visible).toBe(false);expect(counterPrompt({...open,counter:{open:false,closes_at:5600}}).visible).toBe(false);
  expect(counterCall(open)).toEqual({banner:'BLOCKED!',move:'JAB',cue:'GUARD ✓'});expect(counterCall(counterState('DODGE','lean'),true)).toEqual({banner:'DODGED!',move:'JAB',cue:'TILT ✓'});
 });
 it('shows one prompt at a time: the newest wins, and an older one returns when the newer ends',()=>{
  const lane=createPromptLane();expect(lane.pick([{kind:'finisher',key:'f'}],0)).toBe('finisher');
  expect(lane.pick([{kind:'finisher',key:'f'},{kind:'counter',key:'c1'}],10)).toBe('counter');expect(lane.pick([{kind:'finisher',key:'f'}],800)).toBe('finisher');
  expect(lane.pick([{kind:'counter',key:'c2'},{kind:'super-ready',key:'s'}],900)).toBe('counter');expect(lane.pick([],1000)).toBeNull();
 });
 it('names each boss hit in the pop',()=>{
  expect(punchPopText({kind:'punch',amount:1,brace:false})).toBe('PUNCH!\n−1');expect(punchPopText({kind:'punch',amount:1.5,brace:false})).toBe('PUNCH!\n−1.5');
  expect(punchPopText({kind:'counter',amount:2.5,brace:true})).toBe('READ IT!\n−2.5');expect(punchPopText({kind:'finisher',amount:4,brace:false})).toBe('FINISHER!\n−4');
  // The automatic counter after a clean defence names that defence, never PUNCH (Kash, 1 Nov: "COUNTER!" after a dodge read as a punch).
  expect(punchPopText({kind:'counter',amount:2,brace:false,defence:'guard'})).toBe('BLOCK HIT\n−2');expect(punchPopText({kind:'counter',amount:2,brace:false,defence:'lean'})).toBe('DODGE HIT\n−2');
  expect(punchPopText({kind:'counter',amount:2,brace:false})).toBe('DEFENCE HIT\n−2');
 });
 it('lists the boss\'s own commands for the join panel and spots the round\'s first vote',()=>{
  const state=createGame();expect(joinCommands(state)).toBe('!jab · !left · !right · !combo');expect(roundHasVotes(state)).toBe(false);
  expect(roundHasVotes({...state,voters:1})).toBe(true);expect(roundHasVotes({...state,tally:{...state.tally,JAB:1}})).toBe(true);
 });
});

let dom:JSDOM;
afterEach(()=>{vi.unstubAllGlobals();dom?.window.close();});
function mount(){
 dom=new JSDOM('<div id=host></div>',{url:'http://localhost/play/'});
 vi.stubGlobal('window',dom.window);vi.stubGlobal('document',dom.window.document);vi.stubGlobal('location',dom.window.location);vi.stubGlobal('Element',dom.window.Element);vi.stubGlobal('CustomEvent',dom.window.CustomEvent);
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:false,addEventListener(){},removeEventListener(){}})});
 Object.defineProperty(dom.window.Element.prototype,'animate',{configurable:true,value:()=>({})});
 vi.stubGlobal('AudioContext',class{state='running';currentTime=0;destination={};resume=async()=>{};close=async()=>{};decodeAudioData=async()=>({duration:.5});createGain(){return{gain:{value:0,setValueAtTime(){},cancelScheduledValues(){}},connect(){}};}createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect(){}};}createBufferSource(){return{connect(){},start(){},stop(){}};}});
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(new ArrayBuffer(4))));
 const host=dom.window.document.getElementById('host')!;return {host,hud:createRailsHud(host,{simulated:false}),q:(id:string)=>host.querySelector<HTMLElement>(`[data-id="${id}"]`)!};
}
describe('HUD wiring',()=>{
 it('shows STEP BACK · KEEP BOTH HANDS IN VIEW in the prompt lane only while no other prompt is up',()=>{
  const {hud,q}=mount(),state=createGame();state.round.elapsed_ms=1000;hud.render(state);expect(q('hands-prompt').hidden).toBe(true);
  hud.setHandsOut(true);hud.render(state);expect(q('hands-prompt').hidden).toBe(false);expect(q('hands-prompt').textContent).toBe('STEP BACK · KEEP BOTH HANDS IN VIEW');
  hud.render(counterState());expect(q('counter-prompt').hidden).toBe(false);expect(q('hands-prompt').hidden,'below the counter prompt').toBe(true);
  hud.setHandsOut(false);hud.render(state);expect(q('hands-prompt').hidden).toBe(true);
 });
 it('pops BLOCK HIT for the counter after a clean block, PUNCH! only for a thrown punch',()=>{
  const {hud,q}=mount(),before=counterState();before.log.resolved=[];before.counter={open:false,closes_at:0};hud.render(before);
  const after=counterState();after.boss.hp=before.boss.hp-2;hud.render(after);expect(q('punch-pop').textContent).toBe('BLOCK HIT\n−2');expect(q('punch-pop').dataset.kind).toBe('counter');
 });
 it('gives a landed punch the big look: a PUNCH! pop, the lost HP chunk flashing and the boss shaking',()=>{
  const {hud,q}=mount(),animated:Element[]=[];Object.defineProperty(dom.window.Element.prototype,'animate',{configurable:true,value(this:Element){animated.push(this);return {};}});
  const before=counterState();before.counter={open:false,closes_at:0};hud.render(before);
  const after=structuredClone(before);after.now+=100;after.round.elapsed_ms+=100;after.boss.hp-=1;hud.render(after);
  expect(q('punch-pop').textContent).toBe('PUNCH!\n−1');expect(q('punch-pop').dataset.kind).toBe('punch');
  expect(animated.includes(q('boss-bar').querySelector('i')!),'the lost HP chunk flashes').toBe(true);expect(animated.includes(q('boss-sprite')),'the boss shakes').toBe(true);
 });
 it('says BLOCKED! in the call lane and COUNTER · PUNCH NOW in the prompt lane, with the body move for webcam',()=>{
  const {hud,q}=mount();hud.setModes({keyboard:false});hud.render(counterState());
  expect(q('banner').textContent).toBe('BLOCKED!');expect(q('move').textContent).toBe('JAB');expect(q('cue').textContent).toBe('GUARD ✓');
  expect(q('counter-prompt').hidden).toBe(false);expect(q('counter-prompt').textContent).toBe('COUNTER · PUNCH NOW');expect(q('finisher-ready').hidden).toBe(true);
  hud.setModes({keyboard:true});expect(q('counter-prompt').textContent).toBe('COUNTER · PUNCH NOW · J');expect(q('cue').textContent).not.toBe('J');
 });
 it('swaps the vote table for the join panel until the round\'s first vote',()=>{
  const {hud,q}=mount(),state=createGame();hud.render(state);
  expect(q('join-panel').hidden).toBe(false);expect(q('votes').hidden).toBe(true);expect(q('join-panel').textContent).toContain('CHAT, PICK THE NEXT HIT');expect(q('join-commands').textContent).toBe('!jab · !left · !right · !combo');
  hud.render({...state,voters:1,tally:{...state.tally,HOOK_L:1}});expect(q('join-panel').hidden).toBe(true);expect(q('votes').hidden).toBe(false);
  hud.render(state);expect(q('join-panel').hidden,'stays a tally once the round has had a vote').toBe(true);
 });
});
