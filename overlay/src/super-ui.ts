import type {GameState,Outcome} from '../../shared/src/engine';
import type {BossDefence} from '../../shared/src/boss-def';
import {FEEL} from '../../shared/src/feel';
export type SuperNoticesView=import('../../shared/src/super-notices').SuperNotices;
export function superNoticePresentation(state:GameState,notices:SuperNoticesView|null,now:number){
 const sameRound=notices?.round===state.round.number;
 return {ready:!!sameRound&&notices!.readyAt!==null&&now>=notices!.readyAt&&now-notices!.readyAt<FEEL.superNotice.readyMs,
  denied:!!sameRound&&notices!.deniedAt!==null&&now>=notices!.deniedAt&&now-notices!.deniedAt<FEEL.superNotice.deniedMs};
}
export function superSequencePresentation(state:GameState,seated=false){
 const active=state.activeAttack as (NonNullable<GameState['activeAttack']>&{super_steps?:BossDefence[];super_results?:Outcome[]})|null;
 const resolved=state.log.resolved.at(-1) as (GameState['log']['resolved'][number]&{super_steps?:BossDefence[];super_results?:Outcome[]})|undefined;
 const now=state.clock.paused_at??state.now;
 const attack=active?.super_steps?.length?active:!active&&resolved?.round===state.round.number&&resolved.super_steps?.length&&now-resolved.at<600?resolved:null;
 const steps=attack?.super_steps??[],results=attack?.super_results??[],current=active?.super_steps?.length?active.combo_hit??0:-1;
 return {visible:steps.length===3,current,steps:steps.map((defence,index)=>{
  const outcome=results[index],clean=outcome==='BLOCK'||outcome==='DODGE'||outcome==='PERFECT',word=seated?'TILT':'LEAN';
  return {defence,label:defence==='guard'?'GUARD':defence==='lean_left'?`← ${word}`:`${word} →`,mark:outcome?clean?'✓':'✕':'',status:outcome?clean?'clean':'miss':index===current?'current':'pending'};
 })};
}
export function renderSuperSteps(container:HTMLElement,presentation:ReturnType<typeof superSequencePresentation>){
 container.hidden=!presentation.visible;
 if(!presentation.visible){container.replaceChildren();return;}
 const nodes=presentation.steps.map(step=>{const node=container.ownerDocument.createElement('span');node.className=`super-step ${step.status}`;node.textContent=`${step.mark}${step.mark?' ':''}${step.label}`;node.setAttribute('aria-label',`${step.label}: ${step.status}`);return node;});
 container.replaceChildren(...nodes);
}
