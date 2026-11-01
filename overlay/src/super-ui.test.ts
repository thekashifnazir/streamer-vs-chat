import {expect,it} from 'vitest';
import {createGame,type GameState} from '../../shared/src/engine';
import {superSequencePresentation,superResultPresentation,renderSuperSteps,superNoticePresentation} from './super-ui';
class Chip {
 hidden=false;textContent='';className='';attributes:Record<string,string>={};children:Chip[]=[];
 ownerDocument={createElement:()=>new Chip()};
 setAttribute(name:string,value:string){this.attributes[name]=value;}
 replaceChildren(...nodes:Chip[]){this.children=nodes;}
}
function sequence():GameState{
 const state=createGame();state.activeAttack={round:1,beat:0,move:'SUPER',at:2400,lands_at:4000,exploit:false,vetoed:false,super_steps:['lean_left','lean_right','guard'],super_results:['DODGE','CHIP'],combo_hit:2} as GameState['activeAttack'];return state;
}
it('shows the full ordered SUPER and the current step with clean/missed marks in actual chip nodes',()=>{
 const state=sequence(),view=superSequencePresentation(state),container=new Chip();
 renderSuperSteps(container as unknown as HTMLElement,view);
 expect(container.hidden).toBe(false);expect(container.children.map(node=>node.textContent)).toEqual(['✓ ← LEAN','✕ LEAN →','GUARD']);
 expect(container.children.map(node=>node.className)).toEqual(['super-step clean','super-step miss','super-step current']);
 expect(container.children[2]!.attributes['aria-label']).toBe('GUARD: current');
});
it('seated SUPER uses player-side TILT cues and hides custom/single-defence moves',()=>{
 const state=sequence();expect(superSequencePresentation(state,true).steps.map(step=>step.label)).toEqual(['← TILT','TILT →','GUARD']);
 state.activeAttack={...state.activeAttack!,super_steps:undefined} as GameState['activeAttack'];expect(superSequencePresentation(state,true).visible).toBe(false);
});
it('readiness lasts3s and denied SUPER lasts1s on an explicit presentation clock even before START',()=>{
 const state=createGame(),notices={readyAt:1000,deniedAt:1500,round:1,beat:0};
 expect(superNoticePresentation(state,notices,1500)).toEqual({ready:true,denied:true});
 expect(superNoticePresentation(state,notices,2500)).toEqual({ready:true,denied:false});expect(superNoticePresentation(state,notices,4000)).toEqual({ready:false,denied:false});
 notices.round=2;expect(superNoticePresentation(state,notices,1500)).toEqual({ready:false,denied:false});
});

import {readFileSync} from 'node:fs';
it('gives locked SUPER a full-width wrapping status line at the36px floor',()=>{
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8'),hud=readFileSync(new URL('./hud.ts',import.meta.url),'utf8');
 expect(css).toContain('.vote-row.super-locked>.super-lock{display:flex;flex-wrap:wrap;');expect(css).toContain('.super-lock>span{white-space:nowrap}');
 expect(hud).toContain('<span>SUPER UNLOCKS</span><span>AT 100% HYPE</span>');expect(hud).toContain('· NOW ${Math.round(current?.hype??0)}%');expect(hud).toContain('EACH VOTE ADDS HYPE<br>MORE VOTERS, FASTER HYPE');
 expect(css).toContain('font:400 36px/1 Anton');
});
it('keeps the SUPER READY / denied banners clear of the telegraph callout and move chip',()=>{
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
 const rule=css.match(/\.super-ready-banner,\.super-denied-banner\{([^}]*)\}/)![1]!;
 expect(rule).toContain('top:auto');const bottom=Number(rule.match(/bottom:(\d+)px/)![1]);
 // Telegraph: top 142 px, 140 px callout at 1.1 line height, move chip and SUPER steps below: ends by ~520 px.
 // Banner: 44 px text + 24 px padding + 8 px border. It must start below that and sit above the finisher window banner (bottom 28 px, ~76 px tall).
 const top=1080-bottom-76;expect(top).toBeGreaterThan(520);expect(bottom).toBeGreaterThanOrEqual(28+76+8);
 expect(css).not.toMatch(/\.super-denied-banner\{top:/);
});
it('names who took a finished SUPER: all three clean is yours, any miss is chat\'s',()=>{
 const done=(results:string[])=>({visible:true,current:-1,steps:results.map(outcome=>({defence:'guard',label:'GUARD',mark:outcome==='HIT'?'✕':'✓',status:outcome==='HIT'?'miss':'clean'}))}) as ReturnType<typeof superSequencePresentation>;
 expect(superResultPresentation(done(['BLOCK','DODGE','BLOCK']))).toEqual({won:true,move:'SUPER BLOCKED',cue:'YOU WIN THIS ONE'});
 expect(superResultPresentation(done(['BLOCK','HIT','BLOCK']))).toEqual({won:false,move:'2 OF 3 BLOCKED',cue:'CHAT WINS THIS ONE'});
 expect(superResultPresentation(done(['HIT','HIT','HIT']))).toEqual({won:false,move:'SUPER LANDED',cue:'CHAT WINS THIS ONE'});
 expect(superResultPresentation({...done(['BLOCK','BLOCK','BLOCK']),current:1})).toBeNull();expect(superResultPresentation({visible:false,current:-1,steps:[]})).toBeNull();
});
