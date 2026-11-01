import {PoseCamera} from '../../capture/src/camera';
import {createCalibrationProfiles} from '../../capture/src/calibration-profile';
import {cameraErrorMessage} from './camera-feedback';
import type {Landmark} from '../../capture/src/classifier';
import type {PunchDebug} from '../../capture/src/straight-punch';
import {createPunchLab,DRILL,drillRow,type LabEvent,type LabFrame} from './punch-lab-core';
import './punch-lab.css';
/**
 * Punch lab: /?lab=punch on the offline demo, not linked from the UI. One click starts the same camera and MediaPipe pipeline as a
 * webcam fight (PoseCamera, local lite model); the saved calibration is used if there is one, else a 3 s guard hold. Shows both
 * punch detectors' counts and live per-wrist scores, a guided drill with a results table, and saves the session as JSON.
 * Nothing is sent anywhere.
 */
const BONES=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[15,17],[15,19],[16,18],[16,20]] as const;
const PEAK_HOLD_MS=1500;
const SIDES=[['L','LEFT'],['R','RIGHT']] as const;
const DETECTORS=[['boss','BOSS FIGHT','straight-punch.ts'],['trainer','CROWD TRAINER','trainer-moves.ts']] as const;
export function mountPunchLab(doc:Document){
 const win=doc.defaultView!;
 doc.title='Punch lab · Streamer vs Chat';doc.body.className='punch-lab-page';
 const root=doc.createElement('main');root.className='lab';
 const bars=(detector:string)=>SIDES.map(([side,name])=>`<div class="lab-bar-row" data-bar="${detector}-${side}"><span class="lab-bar-name">${name}</span><span class="lab-bar"><i class="lab-bar-fill"></i><i class="lab-bar-peak"></i><i class="lab-bar-on"></i></span><span class="lab-bar-value">—</span><small class="lab-bar-why"></small></div>`).join('');
 root.innerHTML=`<header class="lab-top"><div><h1>PUNCH LAB</h1><p>Hidden tuning page. The camera stays in this browser and nothing is sent anywhere.</p></div>
  <div class="lab-actions"><button type="button" data-lab="camera" class="lab-primary">Start camera</button><button type="button" data-lab="drill" disabled>Start drill</button><button type="button" data-lab="reset" disabled>Reset counters</button><button type="button" data-lab="baseline" disabled>Redo 3 s baseline</button><button type="button" data-lab="download" disabled>Download recording</button></div></header>
  <p class="lab-status" data-lab="status" role="status">Start the camera, then stand back so your head, shoulders and both wrists are in view.</p>
  <section class="lab-body"><div class="lab-view"><video muted playsinline aria-hidden="true"></video><canvas aria-label="Mirrored camera with tracked skeleton"></canvas>
   <div class="lab-wrists" data-lab="wrists" role="alert" hidden>WRISTS OUT OF FRAME</div><div class="lab-prompt" data-lab="prompt" hidden><strong></strong><span></span><i><b></b></i></div></div>
   <aside class="lab-side">${DETECTORS.map(([id,name,file])=>`<section class="lab-counter" data-detector="${id}"><h2>${name} <small>${file}</small></h2><div class="lab-counts">${SIDES.map(([side,label])=>`<p data-count="${id}-${side}"><b>0</b><span>${label}</span></p>`).join('')}</div></section>`).join('')}
    <section class="lab-readout"><h2>LIVE PUNCH SCORE <small>bar = score · white line = threshold · tick = peak in the last 1.5 s</small></h2><h3>Boss Fight · wrist excursion + forearm shrink, shoulder lengths</h3>${bars('boss')}<h3>Crowd Trainer · wrist excursion, shoulder widths</h3>${bars('trainer')}</section>
    <section class="lab-states"><h2>DEFENCE</h2><div class="lab-chips"><span data-chip="guard">GUARD</span><span data-chip="lean-L">LEAN L</span><span data-chip="lean-R">LEAN R</span><span data-chip="slip-L">SLIP L</span><span data-chip="slip-R">SLIP R</span></div>
     <div class="lab-bar-row lab-tilt" data-bar="tilt"><span class="lab-bar-name">TILT</span><span class="lab-bar lab-bar-centre"><i class="lab-bar-fill"></i><i class="lab-bar-on" data-on="L"></i><i class="lab-bar-on" data-on="R"></i></span><span class="lab-bar-value">—</span></div></section>
    <section class="lab-log"><h2>LAST EVENTS</h2><ol data-lab="log"></ol></section></aside></section>
  <section class="lab-results" data-lab="results" hidden><h2>DRILL RESULTS</h2><table><thead><tr><th>Step</th><th>Asked</th><th>Boss Fight caught</th><th>Crowd Trainer caught</th><th>Notes</th></tr></thead><tbody></tbody></table>
   <p>Caught: punches on the asked side, up to the number asked. Extra: more than asked, or the other hand. In the dodge step every punch is a false punch.</p></section>
  <p class="lab-keys"><kbd>Space</kbd> ends the current drill step now · <kbd>Esc</kbd> stops the drill. Counters are mirrored like the camera: LEFT is your own left hand.</p>`;
 doc.body.replaceChildren(root);
 const q=<T extends HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const button=(name:string)=>q<HTMLButtonElement>(`[data-lab="${name}"]`);
 const video=q<HTMLVideoElement>('.lab-view video'),canvas=q<HTMLCanvasElement>('.lab-view canvas'),status=q('[data-lab=status]');
 const profiles=createCalibrationProfiles(()=>win.localStorage),saved=profiles.load(profiles.mode());
 const lab=createPunchLab({saved}),startedAt=new Date().toISOString();let running=false,context:CanvasRenderingContext2D|null=null;
 const peaks=new Map<string,{value:number;at:number}[]>(),chipUntil=new Map<string,number>();
 function flash(el:Element,name='lab-flash'){el.classList.remove(name);void (el as HTMLElement).offsetWidth;el.classList.add(name);}
 function setText(el:Element,text:string){if(el.textContent!==text)el.textContent=text;}
 function draw(landmarks:Landmark[]){
  const width=video.videoWidth,height=video.videoHeight;if(!width||!height)return;
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;context=null;}
  context??=canvas.getContext('2d');if(!context)return;
  const c=context,seen=(p:Landmark|undefined)=>!!p&&(p.visibility??1)>=.5,point=(p:Landmark)=>[p.x*width,p.y*height] as const;
  c.save();c.setTransform(-1,0,0,1,width,0);c.drawImage(video,0,0,width,height);
  c.lineWidth=Math.max(3,width/240);c.lineCap='round';c.strokeStyle='rgba(87,240,255,.85)';c.beginPath();
  for(const [a,b] of BONES){const p=landmarks[a],r=landmarks[b];if(!seen(p)||!seen(r))continue;const [x1,y1]=point(p!),[x2,y2]=point(r!);c.moveTo(x1,y1);c.lineTo(x2,y2);}
  c.stroke();
  for(const index of [15,16]){const p=landmarks[index];if(!p)continue;const ok=seen(p)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;const [x,y]=point(p);c.fillStyle=ok?'rgba(255,220,67,.95)':'rgba(255,38,90,.95)';c.beginPath();c.arc(x,y,Math.max(8,width/90),0,Math.PI*2);c.fill();}
  c.restore();
 }
 function bar(key:string,value:number|null,threshold:number|null,at:number,why:string){
  const row=q(`[data-bar="${key}"]`),fill=row.querySelector<HTMLElement>('.lab-bar-fill')!,peak=row.querySelector<HTMLElement>('.lab-bar-peak')!,on=row.querySelector<HTMLElement>('.lab-bar-on')!;
  const hold=(peaks.get(key)??[]).filter(item=>at-item.at<=PEAK_HOLD_MS);if(value!==null)hold.push({value,at});peaks.set(key,hold);
  const best=hold.reduce((max,item)=>Math.max(max,item.value),0);
  if(value===null||threshold===null){fill.style.width='0%';peak.hidden=true;setText(row.querySelector('.lab-bar-value')!,'—');setText(row.querySelector('.lab-bar-why')!,why);return;}
  // Full scale is twice the threshold, so the threshold line sits in the middle.
  const scale=(v:number)=>`${Math.min(100,v/(2*threshold)*100)}%`;
  fill.style.width=scale(value);fill.classList.toggle('over',value>=threshold);peak.hidden=false;peak.style.left=scale(best);on.style.left='50%';
  setText(row.querySelector('.lab-bar-value')!,`${value.toFixed(2)} / ${threshold.toFixed(2)} · peak ${best.toFixed(2)}`);setText(row.querySelector('.lab-bar-why')!,why);
 }
 function readout(detector:'boss'|'trainer',debug:PunchDebug|null,at:number,wrists:{L:boolean;R:boolean}){
  for(const [side] of SIDES){
   const why=!wrists[side]?'wrist not tracked':!debug?'warming up':[debug.blocked[side]?{tilt:'held back: torso tilting',drop:'held back: hand dropping',edge:'held back: hand at bottom edge'}[debug.blocked[side]!]:'',debug.armed[side]?'':'waiting for the hand to come back'].filter(Boolean).join(' · ');
   bar(`${detector}-${side}`,debug?debug.excursion[side]:null,debug?debug.threshold[side]:null,at,why);
  }
 }
 function tilt(value:number|null){
  const row=q('[data-bar=tilt]'),fill=row.querySelector<HTMLElement>('.lab-bar-fill')!,t=lab.leanThresholds(),scale=2*Math.max(t.L,t.R);
  // Centre bar: positive tilt (a lean to the player's left) grows to the left, like the mirrored camera.
  for(const side of ['L','R'] as const)row.querySelector<HTMLElement>(`[data-on="${side}"]`)!.style.left=`${50+(side==='L'?-1:1)*t[side]/scale*50}%`;
  if(value===null){fill.style.width='0%';setText(row.querySelector('.lab-bar-value')!,'—');return;}
  const size=Math.min(50,Math.abs(value)/scale*50);fill.style.width=`${size}%`;fill.style.left=value>0?`${50-size}%`:'50%';
  setText(row.querySelector('.lab-bar-value')!,`${value.toFixed(2)} · lean at L ${t.L.toFixed(2)} / R ${t.R.toFixed(2)}`);
 }
 function logEvent(event:LabEvent){
  const list=q('[data-lab=log]'),li=doc.createElement('li'),name=event.detector==='camera'?event.kind==='wrists-out'?`${event.side==='L'?'LEFT':'RIGHT'} WRIST LOST`:`${event.side==='L'?'LEFT':'RIGHT'} WRIST BACK`:`${event.detector==='boss'?'Boss Fight':'Crowd Trainer'} · ${event.kind.toUpperCase()}${event.side?` ${event.side}`:''}`;
  li.textContent=name;li.dataset.kind=event.kind;list.prepend(li);while(list.children.length>8)list.lastElementChild!.remove();
 }
 function drillView(view:LabFrame['drill']){
  const box=q('[data-lab=prompt]');box.hidden=!view;if(!view)return;
  const step=view.step,c=view.counts,seconds=Math.ceil(view.remainingMs/1000);
  setText(box.querySelector('strong')!,view.phase==='ready'?`GET READY · ${seconds}`:step.prompt);
  setText(box.querySelector('span')!,view.phase==='ready'?`Next: ${step.prompt}`:`Step ${view.index+1} of ${DRILL.length} · ${seconds} s · Boss Fight L ${c.boss.L} R ${c.boss.R} · Crowd Trainer L ${c.trainer.L} R ${c.trainer.R}${step.dodges?` · leans ${c.leans.L+c.leans.R}`:''}`);
  box.dataset.phase=view.phase;box.querySelector<HTMLElement>('i b')!.style.width=`${view.phase==='go'?view.remainingMs/(step.seconds*1000)*100:0}%`;
 }
 function results(){
  const box=q('[data-lab=results]'),rows=lab.results;box.hidden=!rows.length;const body=box.querySelector('tbody')!;body.replaceChildren();
  for(const result of rows){
   const row=drillRow(result),tr=doc.createElement('tr'),c=result.counts;
   const cell=(score:{caught:number;extra:number},got:{L:number;R:number})=>row.dodge?`${score.extra} false punch${score.extra===1?'':'es'}`:`${score.caught} / ${row.expected}${score.extra?` · ${score.extra} extra`:''} (L ${got.L} · R ${got.R})`;
   const cells=[result.step.prompt,row.dodge?`${row.dodges} dodges, 0 punches`:`L ${result.step.expected.L} · R ${result.step.expected.R}`,cell(row.boss,c.boss),cell(row.trainer,c.trainer),row.dodge?`Boss Fight leans ${row.leans} / ${row.dodges} · Crowd Trainer slips ${row.slips}`:`${((result.to-result.from)/1000).toFixed(0)} s`];
   for(const [i,text] of cells.entries()){const td=doc.createElement('td');td.textContent=text;if((i===2||i===3)&&(row.dodge?(i===2?row.boss:row.trainer).extra>0:(i===2?row.boss:row.trainer).caught<row.expected))td.className='lab-miss';tr.append(td);}
   body.append(tr);
  }
 }
 function onFrame(landmarks:Landmark[],at:number,fps:number){
  const view=lab.frame(landmarks,at);draw(landmarks);
  const wristsOut=!view.wrists.L||!view.wrists.R,warn=q('[data-lab=wrists]');warn.hidden=!wristsOut;
  if(wristsOut)setText(warn,`WRISTS OUT OF FRAME · ${!view.wrists.L&&!view.wrists.R?'BOTH HANDS':!view.wrists.L?'LEFT HAND':'RIGHT HAND'}`);
  if(view.phase==='baseline')setText(status,`Stand in your guard and hold still · ${Math.round(view.baselineProgress*100)}% of 3 s (no saved calibration in this browser)`);
  else setText(status,`Live · ${fps.toFixed(0)} FPS · calibration: ${lab.calibrationSource==='saved'?'saved in this browser':'3 s guard baseline'} · recording ${lab.frameCount} frames${lab.full?' (full: 20 min)':''}`);
  readout('boss',view.boss,at,view.wrists);readout('trainer',view.trainer,at,view.wrists);tilt(view.tilt);
  const now=win.performance.now();
  for(const event of view.events){
   logEvent(event);
   if(event.kind==='punch'&&event.side){const box=q(`[data-count="${event.detector}-${event.side}"]`);flash(box);}
   if(event.kind==='slip'&&event.side)chipUntil.set(`slip-${event.side}`,now+600);
  }
  for(const [detector] of DETECTORS)for(const [side] of SIDES)setText(q(`[data-count="${detector}-${side}"] b`),String(lab.totals[detector][side]));
  const chips:Record<string,boolean>={guard:view.guard,'lean-L':view.lean==='L','lean-R':view.lean==='R','slip-L':(chipUntil.get('slip-L')??0)>now,'slip-R':(chipUntil.get('slip-R')??0)>now};
  for(const [name,on] of Object.entries(chips))q(`[data-chip="${name}"]`).classList.toggle('on',on);
  const wasDrilling=button('drill').dataset.running==='1';drillView(view.drill);
  if(wasDrilling!==lab.drilling){button('drill').dataset.running=lab.drilling?'1':'';setText(button('drill'),lab.drilling?'Stop drill':'Start drill');results();}
  button('drill').disabled=view.phase!=='live';
 }
 const camera=new PoseCamera(video,sample=>onFrame(sample.landmarks,sample.at,sample.fps),message=>{running=false;setText(status,message);setText(button('camera'),'Start camera');},{wasmLoaderPath:'/assets/pose/vision_wasm_internal.js',wasmBinaryPath:'/assets/pose/vision_wasm_internal.wasm',modelAssetPath:'/assets/pose/pose_landmarker_lite.task'});
 button('camera').addEventListener('click',async()=>{
  if(running){camera.stop();running=false;setText(button('camera'),'Start camera');setText(status,'Camera off. The recording so far is kept: Download recording saves it.');return;}
  button('camera').disabled=true;setText(status,'Opening camera and loading the local lite model…');
  try{running=await camera.start();if(running){setText(button('camera'),'Stop camera');setText(status,saved?'Camera on. Using the calibration saved in this browser.':'Camera on. Stand in your guard and hold still for 3 s.');for(const name of ['reset','baseline','download'])button(name).disabled=false;}}
  catch(error){setText(status,cameraErrorMessage(error));}
  finally{button('camera').disabled=false;}
 });
 button('drill').addEventListener('click',()=>{if(lab.drilling)lab.stopDrill();else{lab.startDrill();q('[data-lab=results]').hidden=true;}button('drill').blur();});
 button('reset').addEventListener('click',()=>{lab.resetCounts();for(const [detector] of DETECTORS)for(const [side] of SIDES)setText(q(`[data-count="${detector}-${side}"] b`),'0');});
 button('baseline').addEventListener('click',()=>{lab.rebaseline();setText(status,'Stand in your guard and hold still for 3 s.');});
 button('download').addEventListener('click',()=>{
  const json=lab.recording({startedAt,...(video.videoWidth?{camera:{width:video.videoWidth,height:video.videoHeight}}:{})});
  const url=URL.createObjectURL(new Blob([JSON.stringify(json)],{type:'application/json'})),link=doc.createElement('a');
  link.href=url;link.download=`punch-lab-${startedAt.slice(0,19).replace(/[:T]/g,'-')}.frames.json`;doc.body.append(link);link.click();link.remove();
  win.setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 win.addEventListener('keydown',event=>{
  if(event.code==='Space'&&lab.drilling){event.preventDefault();lab.nextStep();}
  else if(event.code==='Escape'&&lab.drilling)lab.stopDrill();
 });
 win.addEventListener('pagehide',()=>camera.stop());
 return {get session(){return lab;}};
}
