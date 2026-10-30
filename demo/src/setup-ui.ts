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
  groups();get('open-webcam').hidden=select('input-source').value!=='pose';get('punch-chance').hidden=noPunch.checked;
  get('safety-card').classList.toggle('confirmed',space.checked);get('clear-space-label').textContent=space.checked?'✓ My space is clear':'Tap to confirm my space is clear';
  const start=get<HTMLButtonElement>('start-fight');start.disabled=!space.checked;start.textContent=space.checked?'START FIGHT':'Start fight · locked until safety check';
  const webcamStart=get<HTMLButtonElement>('play-webcam');webcamStart.disabled=!(space.checked&&camera&&ready&&framed);webcamStart.textContent=webcamStart.disabled?'Start webcam fight · locked until all 5 steps':'START WEBCAM FIGHT';
  get('webcam-distance-tip').textContent=select('posture').value==='seated'?'Seated: sit about 1 m further back than feels natural.':'Standing: give yourself room to raise your guard and lean to either side.';
  get('calibration-saved').hidden=!restored;
 };
 function open(){webcam.hidden=false;preview.prepend(video);root.body.classList.add('webcam-open');webcam.scrollIntoView?.({block:'start',behavior:'smooth'});}
 function close(){webcam.hidden=true;stage.prepend(video);root.body.classList.remove('webcam-open');get('fight-setup').scrollIntoView?.({block:'start',behavior:'smooth'});}
 for(const button of root.querySelectorAll<HTMLButtonElement>('[data-option-for]'))button.addEventListener('click',()=>{const target=select(button.dataset.optionFor!);if(target.value===button.dataset.value)return;target.value=button.dataset.value!;target.dispatchEvent(new Event('change'));sync();});
 for(const id of ['start-difficulty','input-source','posture','clear-space','no-punch'])get(id).addEventListener('change',sync);
 get('open-webcam').addEventListener('click',open);get('close-webcam').addEventListener('click',close);
 get('use-keyboard').addEventListener('click',()=>{select('input-source').value='keyboard';select('input-source').dispatchEvent(new Event('change'));close();});
 get('start-fight').addEventListener('click',()=>{if(!space.checked)return;if(select('input-source').value==='pose'){if(camera&&ready&&framed){close();options.onWebcamStart();}else open();return;}options.onStart();});
 get('play-webcam').addEventListener('click',()=>{if(space.checked&&camera&&ready&&framed){close();options.onWebcamStart();}});
 function commands(boss?:BossDef|null){
  const key=JSON.stringify([boss??DEFAULT_BOSS,select('posture').value]);if(commandKey===key)return;commandKey=key;
  const standard=!boss||isDefaultBoss(boss),moves=(boss??DEFAULT_BOSS).moves,rows=get('attack-rows');rows.replaceChildren();
  const names=['!jab (!j)','!left (!l)','!right (!r)','!combo (!c)','!super (!s)'];
  const descriptions=['Straight punch','Hook from your left','Hook from your right','Flurry of punches','3-hit super (full hype)'];
  moves.forEach((move,index)=>{const row=root.createElement('div');row.className='attack-row';const attack=root.createElement('div');attack.className='attack-command';const strong=root.createElement('strong');strong.textContent=standard?names[index]!:move.command;const body=root.createElement('span');body.textContent=standard?descriptions[index]!:move.label;attack.append(strong,body);const arrow=root.createElement('span');arrow.className='attack-arrow';arrow.textContent='→';arrow.setAttribute('aria-hidden','true');const defence=root.createElement('div');defence.className='defend-command';const seated=select('posture').value==='seated',lean=seated?'Tilt':'Lean';const key=root.createElement('kbd');key.textContent=move.defence==='guard'?'K':move.defence==='lean_right'?'D':move.defence==='lean_left'?'A':'A / D';const cue=root.createElement('span');cue.textContent=standard&&index===4?'Follow the 3 steps':move.defence==='guard'?'♢ Guard':move.defence==='lean_right'?`→ ${lean} right`:move.defence==='lean_left'?`← ${lean} left`:`↔ ${lean} either way`;if(!(standard&&index===4))defence.append(key);defence.append(cue);row.append(attack,arrow,defence);rows.append(row);});
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
