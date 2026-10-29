import {expect,it} from 'vitest';
import {createGame,type GameState} from '../../shared/src/engine';
import {superSequencePresentation,renderSuperSteps,superNoticePresentation} from './super-ui';
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
 expect(hud).toContain('· HYPE ${Math.round(current?.hype??0)}%');expect(hud).toContain('CHAT VOTES FILL HYPE<br>MORE VOTERS = FASTER');
 expect(css).toContain('font:400 36px/1 Anton');
});
