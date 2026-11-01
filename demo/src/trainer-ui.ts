import {COMBOS,comboDef,createTrainer,formatWorkoutSummary,trainerStep,trainerSummary,type ComboResult,type Token,type TrainerCue,type TrainerEvent,type TrainerState} from '../../shared/src/trainer';
import {isTrainerStop,parseTrainerCommand} from '../../shared/src/trainer-commands';
import type {Difficulty} from '../../shared/src/tempo';
import type {Sound} from '../../overlay/src/sound';
import type {StreamerInput} from '@svc/shared';
import {createTrainerCrowd} from './trainer-sim';
export type GameMode='boss'|'trainer';
const listeners=new Set<(cue:TrainerCue)=>void>();
/** Audio hook: recorded coach lines can subscribe to the cue ids without touching the game. */
export function onTrainerCue(listener:(cue:TrainerCue)=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}
export function initialMode(search:string):GameMode{return new URLSearchParams(search).get('mode')==='trainer'?'trainer':'boss';}
/** Default cue sounds reuse the existing effects; a combo call uses the hands-up tell. */
export function defaultCueSound(cue:TrainerCue):Sound{
 const map:Partial<Record<TrainerCue,Sound>>={'round-start':'fight',rest:'ko',time:'ko','workout-done':'ko','ten-seconds':'vote',clean:'perfect',partial:'block',missed:'dodge',faster:'vote',slower:'vote'};
 return map[cue]??'telegraph';
}
const RESULT_TEXT:Record<ComboResult,string>={clean:'CLEAN!',partial:'PARTIAL · nice work',missed:'MISSED · keep moving'};
const clock=(ms:number)=>{const s=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
function isTextEntry(target:EventTarget|null){const element=target as {tagName?:string;type?:string;isContentEditable?:boolean}|null;if(element?.tagName==='INPUT'&&['checkbox','radio','button'].includes(element.type??''))return false;return !!element?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(element?.tagName??'');}
/** Crowd Trainer view and controller. The pure reducer owns all rules; this file only feeds and paints it. */
export function mountTrainer(doc:Document,options:{live:boolean;stage:HTMLElement;difficulty:()=>Difficulty;keyboard:()=>boolean;viewers:()=>number;liveTokenLoaded:()=>boolean;onCue?:(cue:TrainerCue)=>void;onAgain:()=>void;onExit:()=>void;onModeChange?:(mode:GameMode)=>void;onDone?:(state:TrainerState)=>void;now?:()=>number;search?:string}){
 const win=doc.defaultView!,now=options.now??(()=>win.performance.now());
 let mode=initialMode(options.search??win.location.search),state:TrainerState|null=null,crowd:ReturnType<typeof createTrainerCrowd>|null=null,lastTick=0,seed=20261101,southpaw=false,anyHand=false,renderKey='';
 // Mode choice: the offline landing shows it above PLAY NOW; /play shows it at the top of step 3.
 const choice=doc.createElement('div');choice.className='setup-section trainer-mode-choice';
 choice.innerHTML='<h3>GAME MODE</h3><div class="option-group" role="group" aria-label="Game mode"><button type="button" data-trainer-mode="boss">Boss Fight<br><small>Chat votes attacks · you defend</small></button><button type="button" data-trainer-mode="trainer">Crowd Trainer<br><small>Chat calls combos · you throw them</small></button></div><div class="trainer-options" hidden><label><input type="checkbox" data-trainer-option="southpaw" role="switch"><span><strong>Southpaw</strong><br>Right hand leads, so 1 is your right.</span></label><label><input type="checkbox" data-trainer-option="any-hand" role="switch"><span><strong>Any hand counts</strong><br>Easier: the camera ignores which hand.</span></label></div>';
 const intro=doc.getElementById('demo-intro'),playNow=doc.getElementById('play-now');
 if(!options.live&&intro&&playNow)playNow.before(choice);else{const setup=doc.getElementById('fight-setup');setup?.querySelector('h2')?.after(choice);}
 const copy=intro?{h1:intro.querySelector('h1')?.textContent??'',p:intro.querySelector('h1+p')?.textContent??'',play:playNow?.textContent??''}:null;
 const southpawBox=choice.querySelector<HTMLInputElement>('[data-trainer-option=southpaw]')!,anyHandBox=choice.querySelector<HTMLInputElement>('[data-trainer-option=any-hand]')!;
 southpawBox.addEventListener('change',()=>{southpaw=southpawBox.checked;southpawBox.blur();});anyHandBox.addEventListener('change',()=>{anyHand=anyHandBox.checked;anyHandBox.blur();});
 function syncMode(){
  for(const button of choice.querySelectorAll<HTMLButtonElement>('[data-trainer-mode]')){const on=button.dataset.trainerMode===mode;button.classList.toggle('selected',on);button.setAttribute('aria-pressed',String(on));}
  choice.querySelector<HTMLElement>('.trainer-options')!.hidden=mode!=='trainer';doc.body.classList.toggle('trainer-mode',mode==='trainer');
  if(copy&&intro){const trainer=mode==='trainer',h1=intro.querySelector('h1'),p=intro.querySelector('h1+p');if(h1)h1.textContent=trainer?'Chat calls the combo. You throw it.':copy.h1;if(p)p.textContent=trainer?'Crowd Trainer: a boxing class run by chat. This demo fakes the chat. No login.':copy.p;if(playNow)playNow.textContent=trainer?'START WORKOUT · KEYBOARD':copy.play;}
 }
 for(const button of choice.querySelectorAll<HTMLButtonElement>('[data-trainer-mode]'))button.addEventListener('click',()=>{const next=button.dataset.trainerMode as GameMode;if(next===mode||state&&state.phase!=='done')return;mode=next;syncMode();options.onModeChange?.(mode);});
 syncMode();
 // Stage overlay, sized by container units so it reads at 1920×1080 and on a phone.
 const view=doc.createElement('section');view.className='trainer-stage';view.hidden=true;view.setAttribute('aria-label','Crowd Trainer');
 view.innerHTML=`<header class="trainer-top"><div class="trainer-round"><small>CROWD TRAINER</small><strong data-t="round"></strong></div><div class="trainer-clock" data-t="clock"></div><div class="trainer-badges"><span class="trainer-badge" data-t="badge"></span><span class="trainer-pace" data-t="pace"></span></div></header>
<section class="trainer-call" aria-live="polite"><p class="trainer-call-name" data-t="name"></p><div class="trainer-chips" data-t="chips"></div><div class="trainer-window"><i data-t="window"></i></div><p class="trainer-result" data-t="result"></p></section>
<aside class="trainer-votes"><h3>CHAT CALLS NEXT</h3><ol data-t="votes"></ol><p class="trainer-legend">${COMBOS.map(combo=>`<span>${combo.command}</span>`).join('')}<span>!faster</span><span>!slower</span></p></aside>
<aside class="trainer-stats" data-t="stats"></aside><p class="trainer-keys" data-t="keys"><kbd>F</kbd> 1 · <kbd>J</kbd> 2 · <kbd>A</kbd>/<kbd>D</kbd> slip · <kbd>K</kbd> guard · <kbd>Esc</kbd> pause</p>
<section class="trainer-rest" data-t="rest" hidden><p class="trainer-eyebrow">REST</p><strong data-t="rest-clock"></strong><p data-t="rest-next"></p><p>Chat: vote the first combo now.</p><p class="trainer-rest-stats" data-t="rest-stats"></p></section>
<section class="trainer-summary" data-t="summary" hidden role="dialog" aria-label="Workout summary"><p class="trainer-eyebrow">CROWD TRAINER</p><h2>WORKOUT DONE</h2><dl data-t="summary-grid"></dl><p class="trainer-note" data-t="summary-note"></p><div class="trainer-actions"><button type="button" class="primary" data-t="again">GO AGAIN</button><button type="button" data-t="exit">Back to setup</button><button type="button" data-t="copy">Copy chat line</button></div></section>`;
 options.stage.append(view);
 const part=<T extends HTMLElement=HTMLElement>(name:string)=>view.querySelector<T>(`[data-t="${name}"]`)!;
 part('again').addEventListener('click',()=>options.onAgain());
 // No bot post for workouts yet: the streamer can paste this counts-only line into chat.
 part('copy').addEventListener('click',async()=>{if(!state)return;const line=formatWorkoutSummary(trainerSummary(state)),button=part('copy');try{await win.navigator.clipboard.writeText(line);button.textContent='Copied';}catch{button.textContent=line;}});part('exit').addEventListener('click',()=>options.onExit());
 const tokenLabel=(token:Token)=>token==='S'?'SLIP':token==='G'?'GUARD':anyHand?'ANY':(token==='1')!==southpaw?'LEFT':'RIGHT';
 function emit(cues:readonly TrainerCue[]){for(const cue of cues){try{options.onCue?.(cue);}catch{/* Audio never blocks training. */}for(const listener of listeners){try{listener(cue);}catch{/* A listener failure is not a game failure. */}}}}
 function step(event:TrainerEvent,at=now()){
  if(!state)return;const before=state.phase;state=trainerStep(state,event,Math.max(at,state.now));emit(state.cues);
  if(state.phase==='done'&&before!=='done'){crowd=null;options.onDone?.(state);}
  render();
 }
 function render(){
  if(!state){view.hidden=true;return;}
  const s=state,at=s.paused?s.pausedAt!:s.now;view.hidden=false;
  part('round').textContent=`ROUND ${s.round}/3`;
  part('clock').textContent=clock(s.phase==='done'?0:s.phaseEndsAt-at);part('clock').classList.toggle('trainer-last-ten',s.phase==='work'&&s.phaseEndsAt-at<=10_000);
  part('badge').textContent=options.live?'LIVE · YOUR TWITCH CHAT':'SIMULATED CHAT';
  part('pace').textContent=`PACE · ${(s.gapMs/1000).toFixed(1)} s between combos`;
  const combo=s.combo,shown=combo??(s.last?{id:s.last.id,tokens:comboDef(s.last.id).tokens,marks:s.last.marks,index:-1}:null);
  part('name').textContent=combo?`${comboDef(combo.id).name}${combo.voted?'':' · autopilot'}`:s.phase==='work'?(s.last?'Chat is calling the next combo…':'Get ready · chat is voting the first combo'):'';
  const key=shown?`${shown.id}:${combo?.calledAt??s.last?.at}:${shown.marks.join()}:${combo?.index}:${southpaw}:${anyHand}`:'';
  if(key!==renderKey){renderKey=key;const chips=part('chips');chips.replaceChildren();
   if(shown)shown.tokens.forEach((token,i)=>{const chip=doc.createElement('span');chip.className='trainer-chip';chip.dataset.token=token;chip.dataset.mark=shown.marks[i]??(combo&&i===combo.index?'next':'');const b=doc.createElement('b');b.textContent=token;const small=doc.createElement('small');small.textContent=tokenLabel(token);chip.append(b,small);chips.append(chip);});
   chips.classList.toggle('trainer-chips-done',!combo);
  }
  part('window').style.width=combo?`${Math.max(0,Math.min(100,(combo.endsAt-at)/(combo.endsAt-combo.calledAt)*100))}%`:'0%';
  const result=part('result'),fresh=!combo&&s.last&&at-s.last.at<1600;result.textContent=fresh?RESULT_TEXT[s.last!.result]:'';result.dataset.result=fresh?s.last!.result:'';
  const ranked=COMBOS.map(c=>({c,n:s.tally[c.id]})).filter(row=>row.n>0).sort((a,b)=>b.n-a.n).slice(0,4),total=ranked.reduce((sum,row)=>sum+row.n,0),votes=part('votes');
  const voteKey=ranked.map(row=>`${row.c.id}${row.n}`).join();if(votes.dataset.key!==voteKey){votes.dataset.key=voteKey;votes.replaceChildren();
   if(!ranked.length){const li=doc.createElement('li');li.className='trainer-vote-empty';li.textContent='No votes yet · autopilot picks';votes.append(li);}
   for(const row of ranked){const li=doc.createElement('li');li.style.setProperty('--share',`${Math.round(row.n/total*100)}%`);const name=doc.createElement('span');name.textContent=`${row.c.command} ${row.c.name}`;const n=doc.createElement('b');n.textContent=String(row.n);li.append(name,n);votes.append(li);}
  }
  const sum=trainerSummary(s),stats=part('stats'),statsKey=`${sum.clean}:${sum.partial}:${sum.missed}:${sum.punchesL}:${sum.punchesR}`;
  if(stats.dataset.key!==statsKey){stats.dataset.key=statsKey;stats.textContent='';
  for(const [label,value,cls] of [['CLEAN',sum.clean,'clean'],['PARTIAL',sum.partial,'partial'],['MISSED',sum.missed,'missed'],['PUNCHES',`L ${sum.punchesL} · R ${sum.punchesR}`,'punches']] as const){const row=doc.createElement('p');row.className=`trainer-stat-${cls}`;const b=doc.createElement('b');b.textContent=String(value);row.append(label+' ',b);stats.append(row);}}
  part('keys').hidden=!options.keyboard();
  const rest=part('rest');rest.hidden=s.phase!=='rest';
  if(s.phase==='rest'){part('rest-clock').textContent=clock(s.phaseEndsAt-at);part('rest-next').textContent=`Round ${s.round+1} of 3 next`;part('rest-stats').textContent=`So far: ${sum.clean} clean · ${sum.partial} partial · ${sum.punches} punches`;}
  view.dataset.phase=s.phase;
  const card=part('summary');card.hidden=s.phase!=='done';
  if(s.phase==='done'&&card.dataset.key!==String(s.now)){card.dataset.key=String(s.now);part('copy').textContent='Copy chat line';const grid=part('summary-grid');grid.replaceChildren();
   for(const [term,value] of [['Clean combos',sum.clean],['Partial combos',sum.partial],['Missed combos',sum.missed],['Punches thrown',`${sum.punches} (L ${sum.punchesL} · R ${sum.punchesR})`],['Slips',sum.slips],['Guards held',sum.guards],['Active minutes',sum.activeMinutes.toFixed(1)],['Chat’s favourite',sum.favourite?`${sum.favourite.name} (${sum.favourite.command})`:'Autopilot'],['Chatters who voted',sum.voters]] as const){const item=doc.createElement('div');const dt=doc.createElement('dt');dt.textContent=term;const dd=doc.createElement('dd');dd.textContent=String(value);item.append(dt,dd);grid.append(item);}
   part('summary-note').textContent=`${options.live?'Live chat votes.':'SIMULATED chat.'} Counts from your ${options.keyboard()?'keys':'webcam'}. The webcam can miss punches.`;
  }
 }
 // Touch pads: Trainer adds an F (left) pad and names J the right hand; Boss Fight keeps its own labels.
 let padF:HTMLButtonElement|null=null,padJLabel:string|null=null;
 function pads(on:boolean){
  const row=doc.querySelector('.tap-pads > div'),j=doc.querySelector<HTMLButtonElement>('.tap-pads [data-tap=J]');if(!row||!j)return;
  if(on){if(!padF){padF=doc.createElement('button');padF.type='button';padF.dataset.trainerTap='F';padF.innerHTML='<kbd>F</kbd> Left (1)';padF.addEventListener('pointerdown',event=>{event.preventDefault();// The reducer ignores punches while paused.
   if(state&&state.phase!=='done')step({kind:'punch',side:'L'});});}row.prepend(padF);padJLabel??=j.innerHTML;j.innerHTML='<kbd>J</kbd> Right (2)';}
  else{padF?.remove();if(padJLabel!==null){j.innerHTML=padJLabel;padJLabel=null;}}
 }
 win.addEventListener('keydown',event=>{
  if(!state||state.phase==='done'||!options.keyboard()||(event.code!=='KeyF'&&event.code!=='KeyJ')||isTextEntry(event.target))return;
  event.preventDefault();if(event.repeat)return;step({kind:'punch',side:event.code==='KeyF'?'L':'R'});
 });
 return {
  get mode(){return mode;},get selected(){return mode==='trainer';},
  /** Shown on stage: a workout runs or its summary is up. */
  get active(){return state!==null;},
  get running(){return state!==null&&state.phase!=='done';},
  get paused(){return !!state?.paused;},
  get state(){return state;},
  start(at=now()){
   crowd=null;
   if(!options.live)try{crowd=createTrainerCrowd({viewers:options.viewers(),seed:seed+7,liveTokenLoaded:options.liveTokenLoaded()});}catch{crowd=null;}
   state=createTrainer({difficulty:options.difficulty(),southpaw,anyHand,seed:seed++},at);lastTick=at;renderKey='';doc.body.classList.add('trainer-running');pads(true);emit(state.cues);render();
  },
  input(event:StreamerInput,at=now()){
   if(!state||state.phase==='done')return;
   if(event.kind==='control'){step(event.action==='resume'?{kind:'resume'}:{kind:'pause'},at);return;}
   if(event.kind==='pose'){step({kind:'pose',guard:event.guard,lean:event.lean},at);return;}
   // Punches come from F/J (keyboard) or the Trainer webcam detector via move(); the Boss Fight punch path is ignored.
  },
  /** Webcam punches and slips from capture/src/trainer-moves.ts. */
  move(event:{kind:'punch'|'slip';side:'L'|'R'},at=now()){if(state&&state.phase!=='done')step(event,at);},
  chat(message:{userId:string;text:string;isMod?:boolean;isBroadcaster?:boolean},at=now()){
   if(mode!=='trainer'||!state||state.phase==='done')return;
   if(isTrainerStop(message.text,!!message.isMod||!!message.isBroadcaster)){step({kind:'stop'},at);return;}
   const vote=parseTrainerCommand(message.text);if(vote)step({kind:'vote',user:message.userId,vote},at);
  },
  tick(at=now()){
   if(!state||state.phase==='done')return;
   if(crowd&&!state.paused)for(const message of crowd.messages(at-lastTick)){const vote=parseTrainerCommand(message.text);if(vote)state=trainerStep(state,{kind:'vote',user:message.user,vote},Math.max(at,state.now));}
   lastTick=at;step({kind:'advance'},at);
  },
  stop(at=now()){if(state&&state.phase!=='done')step({kind:'stop'},at);},
  exit(){state=null;crowd=null;renderKey='';doc.body.classList.remove('trainer-running');pads(false);render();},
  setMode(next:GameMode){if(state&&state.phase!=='done')return;mode=next;syncMode();},
 };
}
