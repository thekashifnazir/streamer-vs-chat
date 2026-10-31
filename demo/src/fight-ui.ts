import type {GameState} from '../../shared/src/engine';
import {safeClipHref} from '../../overlay/src/summary';
import {summarizeGame} from '../../shared/src/highlights';
/** Presentation/input controls only; all combat changes use existing caller actions. */
export function mountFightUi(doc:Document,options:{offline:boolean;resume:()=>void;restart:()=>void;quit:()=>void;end:()=>void;next:()=>void;now?:()=>number}){
 const stage=doc.getElementById('stage')!,now=options.now??(()=>performance.now());
 const pause=doc.createElement('section');pause.id='pause-screen';pause.className='fight-dialog';pause.hidden=true;pause.setAttribute('role','dialog');pause.setAttribute('aria-label','Paused');pause.setAttribute('aria-modal','true');pause.innerHTML='<h2>PAUSED</h2><p>Chat can’t vote while you’re paused.</p><button data-pause="resume" class="primary">Resume</button><button data-pause="restart">Restart</button><button data-pause="quit">Quit to setup</button>';stage.append(pause);
 for(const action of ['resume','restart','quit'] as const)pause.querySelector(`[data-pause=${action}]`)!.addEventListener('click',options[action]);
 const results=doc.createElement('section');results.id='round-results';results.className='fight-dialog round-results';results.hidden=true;results.innerHTML='<h2 data-result-title></h2><div class="plain-stats"></div><button data-result-next class="primary">NEXT ROUND</button><p data-result-countdown></p><button data-result-quit>End fight</button><div data-result-extras></div>';stage.append(results);
 results.querySelector('[data-result-next]')!.addEventListener('click',()=>{if(matchDone)options.restart();else options.next();});results.querySelector('[data-result-quit]')!.addEventListener('click',options.quit);
 if(options.offline){for(const element of doc.querySelectorAll('#friend-tools .share-stats-row,#playtest-output')){results.querySelector('[data-result-extras]')!.append(element);if(element.classList.contains('share-stats-row'))(element as HTMLElement).hidden=false;}}
 let pausedAt:number|null=null;
 let extraKey='',paused=false,key='',due:number|null=null,matchDone=false;
 function setPaused(value:boolean){if(value&&!paused)pausedAt=now();if(!value&&paused&&due!==null&&pausedAt!==null)due+=now()-pausedAt;if(!value)pausedAt=null;paused=value;pause.hidden=!value;stage.classList.toggle('fight-paused',value);if(value)pause.querySelector<HTMLButtonElement>('button')!.focus();}
 function reset(){key='';extraKey='';due=null;results.hidden=true;setPaused(false);}
 function render(state:GameState|null,ended=false,extras:{mvp?:string;clips?:{label:string;url:string}[]}={}){
  if(!state||!state.round.over&&!ended){results.hidden=true;key='';due=null;return;}
  if(!options.offline&&extraKey!==JSON.stringify(extras)){extraKey=JSON.stringify(extras);const extra=results.querySelector('[data-result-extras]')!;extra.replaceChildren();if(extras.mvp){const mvp=doc.createElement('p');mvp.textContent=`Chat MVP: ${extras.mvp}`;extra.append(mvp);}for(const clip of extras.clips??[]){const href=safeClipHref(clip.url);if(href){const link=doc.createElement('a');link.href=href;link.textContent=clip.label;link.target='_blank';link.rel='noopener noreferrer';extra.append(link);}}}
  results.hidden=false;const id=`${state.match.seed}:${state.round.number}:${ended}`;if(key===id)return;key=id;
  const summary=summarizeGame(state,state.round.number);matchDone=!!state.match.winner||ended;
  results.querySelector('[data-result-title]')!.textContent=ended&&!state.round.over?'Fight ended':`${summary.winner==='streamer'?'You won':'Chat won'} Round ${state.round.number}`;
  const stats=results.querySelector('.plain-stats')!;stats.replaceChildren();
  for(const text of [`${summary.stats.defended} defences`,`${Math.round(summary.stats.damageDealt)} damage dealt`,`${Math.round(summary.stats.damageTaken)} damage taken`]){const item=doc.createElement('p');item.textContent=text;stats.append(item);}
  results.querySelector('[data-result-next]')!.textContent=matchDone?'NEW MATCH':'NEXT ROUND';due=matchDone?null:now()+5000;tick();
 }
 function tick(){if(due===null||paused)return;const remaining=Math.max(0,Math.ceil((due-now())/1000));results.querySelector('[data-result-countdown]')!.textContent=`Next round in ${remaining} s`;if(!remaining){due=null;options.next();}}
 const pads=doc.createElement('section');pads.className='tap-pads';pads.setAttribute('aria-label','Touch keyboard controls');pads.innerHTML='<p>Best on a laptop with a webcam.</p><div>'+[['K','Guard'],['A','Lean left'],['D','Lean right'],['J','Punch']].map(([key,label])=>`<button type="button" data-tap="${key}"><kbd>${key}</kbd> ${label}</button>`).join('')+'</div>';doc.querySelector('.demo-controls')!.after(pads);
 const down=new Set<string>();
 function keyEvent(key:string,type:'keydown'|'keyup'){doc.defaultView!.dispatchEvent(new doc.defaultView!.KeyboardEvent(type,{code:`Key${key}`,key:key.toLowerCase(),bubbles:true,cancelable:true}));}
 for(const button of pads.querySelectorAll<HTMLButtonElement>('[data-tap]')){const key=button.dataset.tap!;button.addEventListener('pointerdown',event=>{if(paused||pads.hidden)return;event.preventDefault();down.add(key);button.setPointerCapture?.(event.pointerId);keyEvent(key,'keydown');});for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>{if(down.delete(key))keyEvent(key,'keyup');});}
 for(const item of doc.querySelectorAll<HTMLElement>('[data-step]')){const action=doc.createElement('button');action.type='button';action.className='practice-tap';while(item.firstChild)action.append(item.firstChild);item.append(action);action.addEventListener('click',()=>{if(paused)return;const key=action.querySelector('kbd')!.textContent!.trim();keyEvent(key,'keydown');keyEvent(key,'keyup');});}
 return {get paused(){return paused;},setPaused,reset,render,tick,modes(keyboard:boolean,noPunch:boolean){pads.hidden=!keyboard;pads.querySelector<HTMLElement>('[data-tap=J]')!.hidden=noPunch;},showStage(){doc.body.classList.add('fight-started');stage.hidden=false;doc.getElementById('tutorial')!.hidden=false;},hideStage(){doc.body.classList.remove('fight-started');if(options.offline)stage.hidden=true;},end:options.end};
}
