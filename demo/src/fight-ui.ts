import type {GameState} from '../../shared/src/engine';
import {safeClipHref} from '../../overlay/src/summary';
import {summarizeGame} from '../../shared/src/highlights';
import {workoutStats,workoutText} from './workout';
/** Round ends name the round; the match end names the match and its round score, winner first. */
export function resultTitle(state:GameState,ended:boolean,roundWinner:string|null|undefined){
 const champion=state.match.winner;
 if(champion){const wins=state.match.round_wins;return `${champion==='streamer'?'YOU':'CHAT'} WON THE MATCH ${wins[champion]}–${wins[champion==='streamer'?'boss':'streamer']}`;}
 if(ended&&!state.round.over)return 'Fight ended';
 return `${roundWinner==='streamer'?'You won':'Chat won'} Round ${state.round.number}`;
}
/** Presentation/input controls only; all combat changes use existing caller actions. */
export function mountFightUi(doc:Document,options:{offline:boolean;resume:()=>void;restart:()=>void;quit:()=>void;end:()=>void;next:()=>void;now?:()=>number}){
 const stage=doc.getElementById('stage')!,now=options.now??(()=>performance.now());
 const pause=doc.createElement('section');pause.id='pause-screen';pause.className='fight-dialog';pause.hidden=true;pause.setAttribute('role','dialog');pause.setAttribute('aria-label','Paused');pause.setAttribute('aria-modal','true');pause.innerHTML='<h2>PAUSED</h2><p data-pause-reason hidden></p><p data-guard-resume hidden>Hold guard for 1 s to resume.</p><p>Chat can’t vote while you’re paused.</p><button data-pause="resume" class="primary">Resume</button><button data-pause="restart">Restart</button><button data-pause="quit">Quit to setup</button>';stage.append(pause);
 for(const action of ['resume','restart','quit'] as const)pause.querySelector(`[data-pause=${action}]`)!.addEventListener('click',options[action]);
 // aria-modal: keep Tab focus inside the pause dialog.
 doc.addEventListener('keydown',event=>{if(pause.hidden||event.key!=='Tab')return;const buttons=[...pause.querySelectorAll<HTMLButtonElement>('button')].filter(button=>!button.hidden&&!button.disabled);if(!buttons.length)return;const first=buttons[0]!,last=buttons[buttons.length-1]!;if(!pause.contains(doc.activeElement)){event.preventDefault();(event.shiftKey?last:first).focus();}else if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}});
 const results=doc.createElement('section');results.id='round-results';results.className='fight-dialog round-results';results.hidden=true;// Scoreboard card: eyebrow, headline (CSS uppercases it), round score, big-number tiles, then one clear action column.
 results.innerHTML='<p class="result-eyebrow" data-result-eyebrow></p><h2 data-result-title></h2><p class="result-score" data-result-score aria-label="Round score"><span>YOU</span><b data-score-you>0</b><i>–</i><b data-score-chat>0</b><span>CHAT</span></p><div class="result-tiles"><div class="plain-stats"></div></div><div class="result-actions"><button data-result-next class="primary">NEXT ROUND</button><p data-result-countdown></p><button data-result-quit class="result-quit">End fight</button></div><div data-result-extras></div>';stage.append(results);
 // Match end only: a compact Workout row under the stat tiles.
 const workout=doc.createElement('p');workout.className='workout-row';workout.hidden=true;results.querySelector('.plain-stats')!.after(workout);
 // Chat MVP tile beside the stats: simulated in the offline demo, the real chat name on /play.
 const simBox=doc.createElement('div');simBox.dataset.resultSim='';simBox.hidden=true;workout.after(simBox);
 results.querySelector('[data-result-next]')!.addEventListener('click',()=>{if(matchDone)options.restart();else options.next();});results.querySelector('[data-result-quit]')!.addEventListener('click',options.quit);
 if(options.offline){for(const element of doc.querySelectorAll('#friend-tools .share-stats-row,#playtest-output')){results.querySelector('[data-result-extras]')!.append(element);if(element.classList.contains('share-stats-row'))(element as HTMLElement).hidden=false;}}
 function mvpTile(name:string,label:string){const tile=doc.createElement('p');tile.className='sim-mvp result-tile tile-white';const value=doc.createElement('b');value.textContent=name;value.title=name;const caption=doc.createElement('span');caption.textContent=label;tile.append(value,' ',caption);return tile;}
 let pausedAt:number|null=null;
 let extraKey='',simKey='',paused=false,key='',due:number|null=null,matchDone=false,heldAt:number|null=null;
 function setPaused(value:boolean,reason?:string,handsFree=false){const why=pause.querySelector<HTMLElement>('[data-pause-reason]')!;why.hidden=!reason;why.textContent=reason?`Paused: ${reason}`:'';pause.querySelector<HTMLElement>('[data-guard-resume]')!.hidden=!handsFree;if(value&&!paused)pausedAt=now();if(!value&&paused&&due!==null&&pausedAt!==null)due+=now()-pausedAt;if(!value)pausedAt=null;paused=value;pause.hidden=!value;stage.classList.toggle('fight-paused',value);if(value)pause.querySelector<HTMLButtonElement>('button')!.focus();}
 function reset(){key='';extraKey='';simKey='';due=null;heldAt=null;results.hidden=true;setPaused(false);}
 // Corner coach (/play): the countdown hook stays, but rounds no longer auto-advance (NEXT ROUND only).
 function hold(value:boolean){if(value&&heldAt===null){heldAt=now();if(due!==null)results.querySelector('[data-result-countdown]')!.textContent='Next round when your corner talk ends';}else if(!value&&heldAt!==null){if(due!==null)due+=now()-heldAt;heldAt=null;tick();}}
 function render(state:GameState|null,ended=false,extras:{mvp?:string;clips?:{label:string;url:string}[];sim?:{mvp?:string}}={}){
  if(!state||!state.round.over&&!ended){results.hidden=true;key='';due=null;return;}
  // Offline demo: the simulated Chat MVP, labelled SIMULATED (the bot's line is in the SIMULATED CHAT panel beside it).
  if(options.offline&&simKey!==JSON.stringify(extras.sim??null)){simKey=JSON.stringify(extras.sim??null);const sim=simBox;sim.replaceChildren();
   if(extras.sim?.mvp)sim.append(mvpTile(extras.sim.mvp,'Chat MVP · SIMULATED'));
   sim.hidden=!sim.childElementCount;}
  if(!options.offline&&extraKey!==JSON.stringify(extras)){extraKey=JSON.stringify(extras);const extra=results.querySelector('[data-result-extras]')!;extra.replaceChildren();simBox.replaceChildren();if(extras.mvp)simBox.append(mvpTile(extras.mvp,'Chat MVP'));simBox.hidden=!simBox.childElementCount;// Confirmed Twitch clips as one row of tiles under the stats ("▶ KO clip"), each opening in a new tab.
   const row=doc.createElement('div');row.className='result-clips';row.setAttribute('aria-label','Twitch clips');for(const clip of extras.clips??[]){const href=safeClipHref(clip.url);if(href){const link=doc.createElement('a');link.className='result-clip';link.href=href;link.target='_blank';link.rel='noopener noreferrer';const play=doc.createElement('span');play.setAttribute('aria-hidden','true');play.textContent='▶';link.append(play,` ${clip.label} clip`);row.append(link);}}if(row.childElementCount)extra.append(row);}
  results.hidden=false;const id=`${state.match.seed}:${state.round.number}:${ended}`;if(key===id)return;key=id;
  const summary=summarizeGame(state,state.round.number);matchDone=!!state.match.winner||ended;
  results.querySelector('[data-result-title]')!.textContent=resultTitle(state,ended,summary.winner);
  const winner=state.match.winner??(ended&&!state.round.over?null:summary.winner);results.dataset.resultWinner=winner??'none';
  results.querySelector('[data-result-eyebrow]')!.textContent=state.match.winner?'Match over':ended&&!state.round.over?'Fight over':`Round ${state.round.number} of 3`;
  results.querySelector('[data-score-you]')!.textContent=String(state.match.round_wins.streamer);results.querySelector('[data-score-chat]')!.textContent=String(state.match.round_wins.boss);
  // Each tile's text still reads "3 defences" (tests and e2e read it); the number is the big part.
  const stats=results.querySelector('.plain-stats')!;stats.replaceChildren();
  for(const [value,label,tone] of [[summary.stats.defended,'defences','cyan'],[Math.round(summary.stats.damageDealt),'damage dealt','yellow'],[Math.round(summary.stats.damageTaken),'damage taken','pink']] as const){const item=doc.createElement('p');item.className=`result-tile tile-${tone}`;const number=doc.createElement('b');number.textContent=String(value);const name=doc.createElement('span');name.textContent=label;item.append(number,' ',name);stats.append(item);}
  workout.hidden=!matchDone;workout.replaceChildren();if(matchDone){const label=doc.createElement('strong');label.textContent='Workout';workout.append(label,' ');workoutText(workoutStats(state)).split(' · ').forEach((part,index)=>{const item=doc.createElement('span');item.textContent=part;workout.append(...(index?[' · ',item]:[item]));});}
  results.querySelector('[data-result-next]')!.textContent=matchDone?'NEW MATCH':'NEXT ROUND';// The streamer decides when the next round starts: no auto-advance.
  results.querySelector('[data-result-countdown]')!.textContent=matchDone?'':'Next round starts when you press NEXT ROUND';due=null;
 }
 function tick(){if(due===null||paused||heldAt!==null)return;const remaining=Math.max(0,Math.ceil((due-now())/1000));results.querySelector('[data-result-countdown]')!.textContent=`Next round in ${remaining} s`;if(!remaining){due=null;options.next();}}
 const pads=doc.createElement('section');pads.className='tap-pads';pads.setAttribute('aria-label','Touch keyboard controls');pads.innerHTML='<p>Best on a laptop with a webcam.</p><div>'+[['K','Guard'],['A','Lean left'],['D','Lean right'],['J','Punch']].map(([key,label])=>`<button type="button" data-tap="${key}"><kbd>${key}</kbd> ${label}</button>`).join('')+'</div>';doc.querySelector('.demo-controls')!.after(pads);
 const down=new Set<string>();
 function keyEvent(key:string,type:'keydown'|'keyup'){doc.defaultView!.dispatchEvent(new doc.defaultView!.KeyboardEvent(type,{code:`Key${key}`,key:key.toLowerCase(),bubbles:true,cancelable:true}));}
 for(const button of pads.querySelectorAll<HTMLButtonElement>('[data-tap]')){const key=button.dataset.tap!;button.addEventListener('pointerdown',event=>{if(paused||pads.hidden)return;event.preventDefault();down.add(key);button.setPointerCapture?.(event.pointerId);keyEvent(key,'keydown');});for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>{if(down.delete(key))keyEvent(key,'keyup');});}
 for(const item of doc.querySelectorAll<HTMLElement>('[data-step]')){const action=doc.createElement('button');action.type='button';action.className='practice-tap';while(item.firstChild)action.append(item.firstChild);item.append(action);action.addEventListener('click',()=>{if(paused)return;for(const kbd of action.querySelectorAll('kbd')){if(kbd.hidden)continue;const key=kbd.textContent!.trim();keyEvent(key,'keydown');keyEvent(key,'keyup');}});}
 return {get paused(){return paused;},setPaused,reset,render,tick,hold,modes(keyboard:boolean,noPunch:boolean){pads.hidden=!keyboard;pads.querySelector<HTMLElement>('[data-tap=J]')!.hidden=noPunch;},showStage(){doc.body.classList.add('fight-started');stage.hidden=false;doc.getElementById('tutorial')!.hidden=false;},hideStage(){doc.body.classList.remove('fight-started');if(options.offline)stage.hidden=true;},
  /** Bottom-bar End fight: with a results card up (round end, match end, or paused between rounds) it does what the card's End fight does; mid-round it stops the fight and shows the Fight ended card. */
  end:()=>{if(results.hidden)options.end();else options.quit();}};
}
