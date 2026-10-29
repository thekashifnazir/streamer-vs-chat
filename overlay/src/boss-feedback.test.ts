import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {createGame,step} from '../../shared/src/engine';
import {FEEL} from '../../shared/src/feel';
import {createBossFeedback} from './boss-feedback';
import {createFxScheduler} from './fx';
it('shows exact punch and counter loss, including a same-snapshot bonus',()=>{
 let state=createGame({moves:['JAB']});const feedback=createBossFeedback();feedback.observe(state,0);
 state=step(state,{kind:'punch',side:'L',source:'keyboard',at:100},100);
 expect(feedback.observe(state,100)).toMatchObject([{kind:'punch',amount:1}]);
 expect(feedback.observe(state,101)).toEqual([]);
 state=step(state,{kind:'pose',guard:true,lean:null,source:'keyboard',at:200},200);
 feedback.observe(state,200);state=step(state,{kind:'advance'},3200);state=step(state,{kind:'punch',side:'L',source:'keyboard',at:3300},3300);
 expect(feedback.observe(state,3300)).toMatchObject([{kind:'counter',amount:8},{kind:'punch',amount:1.5}]);
 expect(feedback.frame(3300).numbers.at(-1)?.text).toBe('−1.5');
 expect(feedback.frame(3300).numbers[0]?.lane).not.toBe(feedback.frame(3300).numbers[1]?.lane);
});
it('preserves braced counter amounts and clips overkill to actual boss HP lost',()=>{
 let state=createGame({roundNumber:2,moves:['JAB']});
 state=step(state,{kind:'pose',guard:true,lean:null,source:'keyboard',at:0},0);
 state.chatScouting.card='JAB';state.chatScouting.history=Array(12).fill('JAB');
 const feedback=createBossFeedback();feedback.observe(state,0);state=step(state,{kind:'advance'},3200);
 expect(feedback.observe(state,3200)).toMatchObject([{kind:'counter',amount:10,brace:true}]);
 let low=createGame({moves:['JAB']});low.boss.hp=.5;const last=createBossFeedback();last.observe(low,0);
 low=step(low,{kind:'punch',side:'L',source:'keyboard',at:100},100);
 expect(last.observe(low,100)).toMatchObject([{amount:.5}]);
});
it('numbers rise and expire at600ms; Calm keeps numbers with150ms fades and identity knockback',()=>{
 const feedback=createBossFeedback();feedback.present({id:'future',kind:'finisher',amount:12,brace:false},0);
 expect(feedback.frame(0).flash).toMatchObject({areaPx:30000,color:'#ffffff'});
 expect(feedback.frame(79).flash).not.toBeNull();expect(feedback.frame(80).flash).toBeNull();
 const normal=feedback.frame(300);expect(normal.numbers[0]?.y).toBe(-36);expect(normal.numbers[0]?.opacity).toBe(.5);
 const calm=feedback.frame(500,true);expect(calm.knockback).toBe(0);expect(calm.numbers[0]?.y).toBe(0);expect(calm.numbers[0]?.opacity).toBeCloseTo(100/150);
 expect(feedback.frame(600).numbers).toEqual([]);
});
it('primes reconnects and resets history on new rounds without replaying old damage',()=>{
 let state=createGame();state=step(state,{kind:'punch',side:'L',source:'keyboard',at:100},100);
 const feedback=createBossFeedback();expect(feedback.observe(state,100)).toEqual([]);
 const next=createGame({roundNumber:2});expect(feedback.observe(next,200)).toEqual([]);expect(feedback.frame(200).numbers).toEqual([]);
});
it('keeps transforms and flash constrained to the boss rail/sprite, within the flash-area budget',()=>{
 const hud=readFileSync(new URL('./hud.ts',import.meta.url),'utf8'),sprite=readFileSync(new URL('./assets.ts',import.meta.url),'utf8');
 expect(hud).toContain("name==='boss'?bossHit.knockback:0");
 expect(hud).toContain("host.querySelector<HTMLElement>(`.rail.${name}`)");
 expect(sprite).toContain("ctx.globalCompositeOperation='source-atop'");
 expect(FEEL.bossHit.flashWidth*FEEL.bossHit.flashHeight+FEEL.flash.areaPx).toBeLessThan(FEEL.flash.largeAreaPx);
 expect(hud).toContain("'COUNTER HIT!'");expect(hud).toContain('FEEL.bossHit.trailMs');
});

import {vi} from 'vitest';
import {createBossImpactLedger} from '../../shared/src/boss-impact';
import {playBossImpactSounds} from './boss-feedback';
it('renders and sounds every accepted punch when two arrive between HUD snapshots',()=>{
 const ledger=createBossImpactLedger('test'),feedback=createBossFeedback(),sound=vi.fn();
 let state=createGame();feedback.setReceipts(ledger.snapshot());feedback.observe(state,0);
 for(const at of [100,550]){const next=step(state,{kind:'punch',side:'L',source:'keyboard',at},at);ledger.observe(state,next);state=next;}
 feedback.setReceipts(ledger.snapshot());const impacts=feedback.observe(state,600);playBossImpactSounds(impacts,sound);
 expect(impacts.map(item=>item.amount)).toEqual([1,1]);expect(feedback.frame(600).numbers.map(item=>item.text)).toEqual(['−1','−1']);expect(sound).toHaveBeenCalledTimes(2);
 expect(feedback.observe(state,601)).toEqual([]);
 const reconnect=createBossFeedback();reconnect.setReceipts(ledger.snapshot(),true);expect(reconnect.observe(state,602)).toEqual([]);expect(reconnect.frame(602).numbers).toEqual([]);
});
it('keeps a counter and two bonus punches distinct in one received snapshot',()=>{
 const ledger=createBossImpactLedger('mixed'),feedback=createBossFeedback(),sound=vi.fn();
 let state=step(createGame({moves:['JAB']}),{kind:'pose',guard:true,lean:null,source:'keyboard',at:0},0);
 feedback.setReceipts(ledger.snapshot());feedback.observe(state,0);
 for(const at of [3300,3750]){const next=step(state,{kind:'punch',side:'L',source:'keyboard',at},at);ledger.observe(state,next);state=next;}
 feedback.setReceipts(ledger.snapshot());const impacts=feedback.observe(state,3800);playBossImpactSounds(impacts,sound);
 expect(impacts.map(item=>[item.kind,item.amount])).toEqual([['counter',8],['punch',1.5],['punch',1.5]]);expect(sound).toHaveBeenCalledTimes(2);
 expect(new Set(feedback.frame(3800).numbers.map(item=>item.lane)).size).toBe(3);
});
it('holds the boss damage trail400ms before draining and keeps all counters bounded',()=>{
 let state=createGame();const fx=createFxScheduler();fx.observe(state,0);state=step(state,{kind:'punch',side:'L',source:'keyboard',at:100},100);fx.observe(state,100);
 expect(fx.update(499).boss.trail).toBe(true);expect(fx.update(500).boss.trail).toBe(false);expect(FEEL.bossHit.trailMs).toBe(400);
 const ledger=createBossImpactLedger('bounded');for(let at=550;at<35000;at+=450){const next=step(state,{kind:'punch',side:'L',source:'keyboard',at},at);ledger.observe(state,next);state=next;}
 expect(ledger.snapshot().entries).toHaveLength(48);
});


import {renderBossDamageNumbers,impactStamp} from './boss-feedback';
class DamageNode {
 textContent='';className='';dataset:Record<string,string>={};style={bottom:'',transform:'',opacity:''};children:DamageNode[]=[];parent:DamageNode|null=null;
 ownerDocument={createElement:()=>new DamageNode()};
 append(node:DamageNode){this.children.push(node);node.parent=this;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);}
}
it('actual HUD number nodes render exact punches/counters/brace values and calm fades without movement',()=>{
 const container=new DamageNode(),nodes=new Map<string,HTMLElement>(),feedback=createBossFeedback();
 for(const [id,amount,kind,brace]of [['one',1,'punch',false],['bonus',1.5,'punch',false],['counter',8,'counter',false],['brace',10,'counter',true]] as const)feedback.present({id,amount,kind,brace},0);
 renderBossDamageNumbers(container as unknown as HTMLElement,nodes,feedback.frame(100).numbers);
 expect(container.children.map(node=>node.children[0]!.textContent)).toEqual(['−1','−1.5','−8','−10']);
 expect(container.children.every(node=>node.className==='boss-damage-number')).toBe(true);
 expect(container.children.map(node=>[node.dataset.kind,node.dataset.braced])).toEqual([['punch','false'],['punch','false'],['counter','false'],['counter','true']]);
 expect(container.children[0]!.style.transform).toBe('translateY(-12px)');
 renderBossDamageNumbers(container as unknown as HTMLElement,nodes,feedback.frame(500,true).numbers);
 expect(container.children.every(node=>node.style.transform==='translateY(0px)')).toBe(true);
 expect(Number(container.children[0]!.style.opacity)).toBeCloseTo(100/150);
 renderBossDamageNumbers(container as unknown as HTMLElement,nodes,feedback.frame(600,true).numbers);
 expect(container.children).toHaveLength(0);expect(nodes.size).toBe(0);
});

it('the presentation API reuses number rendering for future FINISHER without combat changes',()=>{
 expect(impactStamp('punch')).toBeNull();expect(impactStamp('counter')).toBe('COUNTER HIT!');expect(impactStamp('counter',true)).toBe('READ IT!');expect(impactStamp('finisher')).toBe('FINISHER!');
 const feedback=createBossFeedback(),container=new DamageNode(),nodes=new Map<string,HTMLElement>();feedback.present({id:'future',kind:'finisher',amount:12,brace:false},0);
 renderBossDamageNumbers(container as unknown as HTMLElement,nodes,feedback.frame(0).numbers);
 expect(container.children[0]!.children[0]!.textContent).toBe('−12');expect(container.children[0]!.dataset.kind).toBe('finisher');expect(container.children[0]!.children[1]!.textContent).toBe('FINISHER!');expect(container.children[0]!.children[1]!.className).toBe('boss-damage-label');
});
