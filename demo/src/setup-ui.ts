import {DEFAULT_BOSS,isDefaultBoss,type BossDef} from '../../shared/src/boss-def';
import type {CalibrationSnapshot} from '../../capture/src/calibration';
import type {Landmark} from '../../capture/src/classifier';
/** Presentation adapter: the original form controls remain the only settings state. */
export function mountFightSetup(root:Document,options:{onStart:()=>void;onWebcamStart:()=>void}){
 const get=<T extends HTMLElement>(id:string)=>root.getElementById(id) as T;
 const select=(id:string)=>get<HTMLSelectElement>(id);
 const space=get<HTMLInputElement>('clear-space'),noPunch=get<HTMLInputElement>('no-punch');
 const webcam=get('webcam-settings'),stage=get('stage'),video=get('camera'),preview=get('webcam-preview');
 let camera=false,ready=false,framed=false,restored=false;
 let commandKey='',latestCalibration:CalibrationSnapshot|null=null;
 const groups=()=>{for(const button of root.querySelectorAll<HTMLButtonElement>('[data-option-for]')){const selected=select(button.dataset.optionFor!).value===button.dataset.value;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));}};
 const sync=()=>{
  groups();const pose=select('input-source').value==='pose';get('open-webcam').hidden=!pose;get('start-fight').hidden=pose;get('punch-chance').hidden=noPunch.checked;
  get('safety-card').classList.toggle('confirmed',space.checked);get('clear-space-label').textContent=space.checked?'✓ My space is clear':'Tap to confirm my space is clear';
  const start=get<HTMLButtonElement>('start-fight');start.disabled=!space.checked;start.textContent=space.checked?'START FIGHT':'Tick “my space is clear” to start';
  const webcamStart=get<HTMLButtonElement>('play-webcam');webcamStart.disabled=!(space.checked&&camera&&ready&&framed);webcamStart.textContent=webcamStart.disabled?'Finish the 5 steps to start':'START WEBCAM FIGHT';
  get('webcam-distance-tip').textContent=select('posture').value==='seated'?'Seated: sit about 1 m further back than feels natural.':'Standing: give yourself room to raise your guard and lean to either side.';
  get('calibration-saved').hidden=!restored;
 };
 function open(){webcam.hidden=false;preview.prepend(video);root.body.classList.add('webcam-open');webcam.scrollIntoView?.({block:'start',behavior:'smooth'});}
 function close(){webcam.hidden=true;stage.prepend(video);root.body.classList.remove('webcam-open');get('fight-setup').scrollIntoView?.({block:'start',behavior:'smooth'});}
 for(const button of root.querySelectorAll<HTMLButtonElement>('[data-option-for]'))button.addEventListener('click',()=>{const target=select(button.dataset.optionFor!);if(target.value===button.dataset.value)return;target.value=button.dataset.value!;target.dispatchEvent(new Event('change'));sync();});
 for(const id of ['start-difficulty','input-source','posture','clear-space','no-punch'])get(id).addEventListener('change',()=>{sync();if(id==='input-source'||id==='posture')commands();});
 get('open-webcam').addEventListener('click',open);get('close-webcam').addEventListener('click',close);
 get('use-keyboard').addEventListener('click',()=>{select('input-source').value='keyboard';select('input-source').dispatchEvent(new Event('change'));close();});
 get('start-fight').addEventListener('click',()=>{if(!space.checked)return;if(select('input-source').value==='pose'){if(camera&&ready&&framed){close();options.onWebcamStart();}else open();return;}options.onStart();});
 get('play-webcam').addEventListener('click',()=>{if(space.checked&&camera&&ready&&framed){close();options.onWebcamStart();}});
 function commands(boss?:BossDef|null){
  const mode=select('input-source').value,posture=select('posture').value;
  const key=JSON.stringify([boss??DEFAULT_BOSS,posture,mode]);if(commandKey===key)return;commandKey=key;
  const standard=!boss||isDefaultBoss(boss),moves=(boss??DEFAULT_BOSS).moves,rows=get('attack-rows');rows.replaceChildren();
  const seated=posture==='seated',lean=seated?'Tilt':'Lean';
  const defs=[{defence:'guard',title:'Guard',key:'K',pose:'Both fists up',body:'Straight punches and flurries. Hands up.'},{defence:'lean_left',title:`${lean} left`,key:'A',pose:`${lean} left`,body:`Hook from your right. ${lean} away from it.`},{defence:'lean_right',title:`${lean} right`,key:'D',pose:`${lean} right`,body:`Hook from your left. ${lean} away from it.`}] as const;
  function chip(command:string,alias?:string){const item=root.createElement('span');item.className='chat-chip command-chip';item.append(command);if(alias){const small=root.createElement('small');small.textContent=` (${alias})`;item.append(small);}return item;}
  for(const definition of defs){
   const card=root.createElement('article');card.className='defence-card';card.dataset.defence=definition.defence;
   const picture=root.createElement('div');picture.className='defence-picture';
   const left=definition.defence==='lean_left',guard=definition.defence==='guard',rotation=left?-18:18;
   const figure=guard?'<path d="M120 57v40m0-31-23 15 5-31m18 16 23 15-5-31M120 97l-23 30m23-30 23 30"/>':`<g transform="rotate(${rotation} 120 100)"><circle cx="120" cy="40" r="15"/><path d="M120 57v40m0-31-23 15m23-15 23 15M120 97l-23 30m23-30 23 30"/></g>`;
   const incoming=guard?'<path d="M27 46h49m-13-10 13 10-13 10M213 46h-49m13-10-13 10 13 10"/>':left?'<path d="M210 34q-26-16-65 9m11-13-11 13 17 2"/>':'<path d="M30 34q26-16 65 9M84 30l11 13-17 2"/>';
   picture.innerHTML=`<svg viewBox="0 0 240 150" role="img" aria-label="${definition.pose}"><g fill="none" stroke="#ffdc43" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${guard?'<path d="m120 13 36 14v28c0 23-36 39-36 39S84 78 84 55V27z" fill="#ffdc43" fill-opacity=".12" stroke-width="2"/><circle cx="120" cy="40" r="15"/>':'<circle cx="120" cy="40" r="15" stroke="#938a9f" stroke-dasharray="5 5" stroke-width="2"/>'}${figure}</g><g fill="none" stroke="#ff268a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${incoming}</g></svg>`;
   const title=root.createElement('div');title.className='defence-title';const keycap=root.createElement(mode==='pose'?'span':'kbd');keycap.className=mode==='pose'?'pose-cue':'';keycap.textContent=mode==='pose'?definition.pose:definition.key;const heading=root.createElement('h3');heading.textContent=definition.title;title.append(keycap,heading);
   const when=root.createElement('p');when.className='when-chat';when.textContent='When chat types';const chips=root.createElement('div');chips.className='chat-chips command-chips';
   moves.forEach((move,index)=>{if(move.defence!==definition.defence||(standard&&index===4))return;const names=['!jab','!left','!right','!combo'],aliases=['!j','!l','!r','!c'];chips.append(chip(standard?names[index]!:move.command,standard?aliases[index]:undefined));});
   if(!chips.children.length){const empty=root.createElement('span');empty.textContent='No matching move for this boss';chips.append(empty);}
   const body=root.createElement('p');body.textContent=standard?definition.body:definition.defence==='guard'?'Raise your guard for these attacks.':`${definition.title} for these attacks.`;
   card.append(picture,title,when,chips,body);rows.append(card);
  }
  const superItem=get('bonus-super');superItem.replaceChildren();const anyMoves=moves.filter((move,index)=>standard?index===4:move.defence==='lean_any');superItem.hidden=anyMoves.length===0;
  for(const move of anyMoves){superItem.append(chip(standard?'!super':move.command,standard?'!s':undefined),standard?' Super when hype is full: 3 hits, follow the steps on screen.':` ${move.label}: ${lean.toLowerCase()} either way.`);}
 }
 function calibration(snapshot:CalibrationSnapshot){latestCalibration=snapshot;ready=snapshot.ready;const index= !snapshot.ready&&!framed?0:snapshot.stage==='idle'?0:snapshot.stage==='neutral'?1:snapshot.stage==='resting'?2:snapshot.stage==='guard'?3:4;
  const titles=['Get in frame','Arms relaxed — hold still','Hands at your waist','Guard up, fists at face height',snapshot.stage==='lean-right'?'Lean right':'Lean left, then right'];
  get('webcam-step-label').textContent=`STEP ${index+1} OF 5`;get('webcam-instruction').textContent=snapshot.ready?'Ready to fight':titles[index]!;get('calibration-status').textContent=snapshot.message;get<HTMLProgressElement>('calibration-progress').value=snapshot.progress;
  for(const item of root.querySelectorAll<HTMLElement>('[data-calibration-step]')){const n=Number(item.dataset.calibrationStep);item.classList.toggle('done',snapshot.ready||n<index);item.classList.toggle('active',!snapshot.ready&&n===index);}
  sync();
 }
 function frame(landmarks:Landmark[],isFramed:boolean){framed=isFramed;const chips=get('framing-chips');chips.hidden=!camera;chips.replaceChildren();for(const [label,indices]of [['Head',[0]],['Shoulders',[11,12]],['Left hand',[15]],['Right hand',[16]]] as const){const valid=indices.every(i=>{const p=landmarks[i];return p&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&(p.visibility??1)>=.5;});const chip=root.createElement('span');chip.className=valid?'framed':'missing';chip.textContent=`${valid?'✓':'✕'} ${label}`;chips.append(chip);}if(latestCalibration)calibration(latestCalibration);sync();}
 sync();commands();
 return {sync,open,close,commands,calibration,frame,camera(running:boolean){camera=running;if(!running)framed=false;get('camera-start-overlay').hidden=running;get('framing-chips').hidden=!running;sync();},restored(value:boolean){restored=value;sync();}};
}
