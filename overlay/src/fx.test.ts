import {expect,it} from 'vitest';
import {createGame,step,type GameState} from '../../shared/src/engine';
import {FEEL} from '../../shared/src/feel';
import {createFxScheduler,perlin,type FxCue} from './fx';
const advance=(state:GameState,at:number)=>step(state,{kind:'advance'},at);
const pose=(state:GameState,at:number,guard:boolean,lean:'L'|'R'|null=null)=>step(state,{kind:'pose',guard,lean,source:'keyboard',at},at);
it('a: JAB hitstop changes only animation: identical Resolved times, HP, and immutable engine state',()=>{
 const before=createGame({moves:['JAB','HOOK_L']}),fx=createFxScheduler();fx.observe(before,0);
 const without=advance(before,3200),withFx=advance(before,3200),snapshot=JSON.stringify(withFx);
 const cues=fx.observe(withFx,3200);expect(cues[0]).toMatchObject({kind:'hit',hitstopMs:120,trauma:.4,at:3200});
 const start=fx.update(3200);const stopped=fx.update(3319);expect(stopped.streamer.animationTime).toBe(start.streamer.animationTime);expect(stopped.boss.animationTime).toBe(start.boss.animationTime);expect(fx.update(3321).streamer.animationTime).toBe(start.streamer.animationTime+1);
 expect(withFx.log.resolved).toEqual(without.log.resolved);expect(withFx.log.resolved[0]?.at).toBe(3200);expect(JSON.stringify(withFx)).toBe(snapshot);
});
it('b: FX never delays a telegraph or beat clock: consecutive tells stay exactly2400ms apart',()=>{
 let state=createGame({moves:['JAB','HOOK_L']}),fx=createFxScheduler();fx.observe(state,0);
 state=advance(state,3200);fx.observe(state,3200);fx.update(3250);state=advance(state,4800);fx.observe(state,4800);
 expect(state.log.telegraphs.map(t=>t.at)).toEqual([2400,4800]);expect(state.log.telegraphs[1]!.at-state.log.telegraphs[0]!.at).toBe(2400);
});
it('c: calm SUPER damage keeps both rail transforms identity while retaining hitstop and150ms fades',()=>{
 let state=createGame({moves:['SUPER']}),fx=createFxScheduler({calm:true});fx.observe(state,0);state=advance(state,3200);const cues=fx.observe(state,3200);
 expect(cues[0]).toMatchObject({hitstopMs:220,trauma:0});for(const at of [3200,3250,3419,3421,3800]){const frame=fx.update(at);for(const rail of [frame.streamer,frame.boss])expect([rail.x,rail.y,rail.rotation,rail.trauma]).toEqual([0,0,0,0]);expect(frame.slam).toEqual({kind:'fade',durationMs:150});}
});
it('d: worst-case COMBO, PERFECT, counter, SUPER and KO sequences never exceed3large flashes in any1s window',()=>{
 const fx=createFxScheduler();let state=createGame({moves:['COMBO','JAB','SUPER']});fx.observe(state,0);const cues:FxCue[]=[];
 state=advance(state,3200);cues.push(...fx.observe(state,3200));state=advance(state,3500);cues.push(...fx.observe(state,3500));state=pose(state,5300,true);state=advance(state,5600);cues.push(...fx.observe(state,5600));state=pose(state,6000,false);state=advance(state,8000);cues.push(...fx.observe(state,8000));state={...state,boss:{...state.boss,hp:1}};state=step(state,{kind:'punch',side:'L',source:'keyboard',at:8100},8100);cues.push(...fx.observe(state,8100));
 const flashes=cues.filter(cue=>cue.flash);expect(flashes.length).toBeGreaterThanOrEqual(5);
 for(const cue of flashes){expect(cue.flash!.areaPx).toBeLessThan(57500);expect(cue.flash!.color).not.toBe('#ff0000');expect(flashes.filter(item=>item.observedAt>=cue.observedAt&&item.observedAt<cue.observedAt+1000&&item.flash!.areaPx>57500).length).toBeLessThanOrEqual(3);}
});
it('detects each COMBO hit once before final resolution and preserves the exact90ms stops',()=>{
 let state=createGame({moves:['COMBO']}),fx=createFxScheduler();fx.observe(state,0);state=advance(state,3200);
 expect(fx.observe(state,3200)).toMatchObject([{id:'1:0:first',hitstopMs:90,trauma:.35}]);expect(fx.observe(state,3250)).toEqual([]);
 state=advance(state,3500);expect(fx.observe(state,3500)).toMatchObject([{id:'1:0:second',hitstopMs:90,trauma:.35}]);expect(fx.observe(state,3501)).toEqual([]);
});
it('uses resolution time when a missed partial COMBO snapshot cannot identify which hit landed',()=>{
 let state=createGame({moves:['COMBO']}),fx=createFxScheduler();fx.observe(state,0);state=advance(state,3200);state=pose(state,3300,true);state=advance(state,3500);
 expect(fx.observe(state,3500)).toMatchObject([{id:'1:0:impact',at:3500}]);
});
it('uses zero defence trauma, boss-only counter shake, and exact defence stop durations',()=>{
 for(const [kind,guardAt,lean,stop]of [['BLOCK',0,null,80],['PERFECT',2900,null,160],['DODGE',2900,'R',60]] as const){
  let state=createGame({moves:[kind==='DODGE'?'HOOK_L':'JAB']}),fx=createFxScheduler();fx.observe(state,0);state=pose(state,guardAt,kind!=='DODGE',lean);state=advance(state,3200);
  expect(fx.observe(state,3200)).toMatchObject([{hitstopMs:stop,trauma:0},{kind:'counter',rail:'boss',hitstopMs:120,trauma:.3}]);const frame=fx.update(3215);expect(frame.streamer.trauma).toBe(0);expect(frame.boss.trauma).toBeGreaterThan(0);
 }
});
it('KO freezes both animation clocks400ms then runs0.5x for exactly600ms',()=>{
 let state=createGame(),fx=createFxScheduler();fx.observe(state,0);state={...state,boss:{...state.boss,hp:1}};state=step(state,{kind:'punch',side:'L',source:'keyboard',at:100},100);fx.observe(state,100);
 const at=fx.update(100).boss.animationTime;expect(fx.update(499).boss.animationTime).toBe(at);expect(fx.update(500).slowMo).toBe(true);expect(fx.update(1100).boss.animationTime).toBe(at+300);expect(fx.update(1100).slowMo).toBe(false);expect(fx.update(1200).boss.animationTime).toBe(at+400);
});
it('holds trails500ms and freezes clocks, trauma and trail timing while paused',()=>{
 let state=createGame({moves:['SUPER']}),fx=createFxScheduler();fx.observe(state,0);state=advance(state,3200);fx.observe(state,3200);state=step(state,{kind:'control',action:'pause',by:'mod'},3300);fx.observe(state,3300);
 const paused=fx.update(3300);expect(fx.update(10000)).toEqual(paused);state=step(state,{kind:'control',action:'resume',by:'mod'},10000);fx.observe(state,10000);
 expect(fx.update(10399).streamer.trail).toBe(true);expect(fx.update(10400).streamer.trail).toBe(false);
});
it('uses bounded continuous deterministic Perlin noise and decays trauma linearly at1.5/s',()=>{
 for(let i=-100;i<100;i++){const t=i*.137;expect(Math.abs(perlin(t,42))).toBeLessThanOrEqual(1);expect(perlin(t,42)).toBe(perlin(t,42));}expect(Math.abs(perlin(1-1e-6,42)-perlin(1+1e-6,42))).toBeLessThan(.00001);
 let state=createGame({moves:['SUPER']}),fx=createFxScheduler();fx.observe(state,0);state=advance(state,3200);fx.observe(state,3200);expect(fx.update(3400).streamer.trauma).toBeCloseTo(.5);expect(fx.update(3800).streamer.trauma).toBe(0);
});
it('primes reconnect history, resets a restarted seed, and never shakes the untouched rail',()=>{
 let state=advance(createGame({moves:['JAB']}),3200),fx=createFxScheduler();expect(fx.observe(state,3200)).toEqual([]);state=step(state,{kind:'restart',seed:2},4000);fx.observe(state,4000);state={...state,moves:['JAB']};state=advance(state,7200);expect(fx.observe(state,7200)[0]?.kind).toBe('hit');const frame=fx.update(7217);expect([frame.boss.x,frame.boss.y,frame.boss.rotation]).toEqual([0,0,0]);expect(Math.abs(frame.streamer.x)).toBeLessThanOrEqual(FEEL.shake.offsetPx);
});

it('identifies a broken COMBO second hit even when guard is raised again before it lands',()=>{
 let state=pose(createGame({moves:['COMBO']}),0,true),fx=createFxScheduler();fx.observe(state,0);state=advance(state,3200);expect(fx.observe(state,3200)).toEqual([]);state=pose(state,3300,false);state=pose(state,3400,true);state=advance(state,3500);expect(state.log.resolved[0]).toMatchObject({guard:true,dmg:7});expect(fx.observe(state,3500)).toMatchObject([{id:'1:0:second',at:3500}]);
});
