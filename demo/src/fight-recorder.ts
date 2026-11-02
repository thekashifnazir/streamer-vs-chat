import type {Landmark,PoseCalibration} from '../../capture/src/classifier';
import {punchThresholdsInUse} from './punch-lab-core';
/**
 * Fight recorder: ?rec=1 on the homepage demo or /play, not linked from the UI. Keeps every webcam pose frame of a real fight in the
 * punch lab's frames.json shape (test/pose replays read it), the calibration the classifier was given, each Boss Fight punch with
 * whether the game took it, guard/lean changes and frame gaps. Read-only: it never feeds a decision. Nothing leaves the browser;
 * the player saves the file with the REC chip's button or Shift+R.
 */
export const FIGHT_REC_MAX_MS=10*60_000;// keep the last 10 minutes of frames
// PoseClassifier resets (punch baseline included) when two frames are more than this apart.
const CLASSIFIER_GAP_MS=250;
type Side='L'|'R';
export type FightPhase='setup'|'fight'|'paused'|'round-over'|'trainer';
export type FightRecEvent={at:number;detector:'boss'|'camera'|'game';kind:'punch'|'guard'|'guard-off'|'lean'|'lean-off'|'gap'|'calibration';side?:Side;
 peakAt?:number;ready?:boolean;taken?:boolean;phase?:FightPhase;gapMs?:number};
export type FightRecFrame={ready:boolean;framed:boolean;calibrated:boolean;fps:number;inferenceMs:number;score:{L:number;R:number}|null;guard:boolean;lean:Side|null};
export type FightRecMeta={startedAt:string;page:string;mode:string;difficulty:string;posture:string;noPunch:boolean;camera?:{width:number;height:number}};
export function fightRecEnabled(search:string):boolean{return new URLSearchParams(search).get('rec')==='1';}
export function createFightRecorder(options:{maxMs?:number}={}){
 const maxMs=options.maxMs??FIGHT_REC_MAX_MS;
 let frames:{at:number;lm:number[];info:FightRecFrame}[]=[],events:FightRecEvent[]=[];
 let firstAt:number|null=null,lastAt:number|null=null,pose={guard:false,lean:null as Side|null};
 let calibration:{source:'saved'|'setup';settings:PoseCalibration}|null=null;
 const trim=(now:number)=>{
  const keepFrom=now-maxMs;if(!frames.length||frames[0]!.at>=keepFrom)return;
  frames=frames.filter(f=>f.at>=keepFrom);events=events.filter(e=>e.kind==='calibration'||e.at>=keepFrom);
 };
 return {
  get frameCount(){return frames.length;},
  get seconds(){return frames.length?(frames.at(-1)!.at-frames[0]!.at)/1000:0;},
  calibration(settings:PoseCalibration,source:'saved'|'setup',at:number){calibration={source,settings};events.push({at,detector:'game',kind:'calibration'});},
  frame(landmarks:Landmark[],at:number,info:FightRecFrame){
   firstAt??=at;
   if(lastAt!==null&&at-lastAt>CLASSIFIER_GAP_MS)events.push({at,detector:'camera',kind:'gap',gapMs:Math.round(at-lastAt)});
   lastAt=at;
   frames.push({at,lm:landmarks.flatMap(p=>[p.x,p.y,p.z??0,p.visibility??1]),info});
   if(info.guard!==pose.guard)events.push({at,detector:'boss',kind:info.guard?'guard':'guard-off'});
   if(info.lean!==pose.lean)events.push(info.lean?{at,detector:'boss',kind:'lean',side:info.lean}:{at,detector:'boss',kind:'lean-off'});
   pose={guard:info.guard,lean:info.lean};
   trim(at);
  },
  /** One Boss Fight punch from the classifier: `ready` = the page passed it to the game, `taken` = the game counted it (450 ms throttle). */
  punch(side:Side,at:number,peakAt:number,ready:boolean,taken:boolean,phase:FightPhase){events.push({at,detector:'boss',kind:'punch',side,peakAt,ready,taken,phase});},
  recording(meta:FightRecMeta){
   const t0=frames[0]?.at??firstAt??0,ms=(at:number)=>Math.round((at-t0)*10)/10,r3=(v:number)=>Math.round(v*1000)/1000,r2=(v:number)=>Math.round(v*100)/100;
   return {
    provenance:`Fight recording (?rec=1), ${meta.startedAt}, page ${meta.page}, ${meta.mode}, difficulty ${meta.difficulty}, ${meta.posture}${meta.noPunch?', no-punch mode':''}. Raw unmirrored MediaPipe pose_landmarker_lite landmarks [x,y,z,visibility] (3 dp) with capture timestamps in ms from the first kept frame (the last ${maxMs/60000} minutes are kept)${meta.camera?`; camera ${meta.camera.width}x${meta.camera.height}`:''}. Recorded in the browser and saved by the player; nothing was sent anywhere.`,
    script:'A real fight: no drill script.',
    labels:'No labels. Events are what the game saw live (at = emit time; punch peakAt = the detector’s peak time; ready = passed to the game; taken = the game counted it). Each frame also has ready (calibrated, framed, clear space), fps, inference ms and the Boss Fight punch score per wrist.',
    calibration:calibration?.settings??null,calibrationSource:calibration?.source??null,
    thresholds:punchThresholdsInUse(calibration?.settings.punchThresholds??null),
    sections:[],prompts:[],results:[],
    events:events.map(e=>({...e,at:ms(e.at),...(e.peakAt!==undefined?{peakAt:ms(e.peakAt)}:{})})),
    frames:frames.map(f=>{const landmarks:number[][]=[];for(let i=0;i<f.lm.length;i+=4)landmarks.push([r3(f.lm[i]!),r3(f.lm[i+1]!),r3(f.lm[i+2]!),r3(f.lm[i+3]!)]);
     const {info}=f;return {at:ms(f.at),landmarks,ready:info.ready,framed:info.framed,calibrated:info.calibrated,fps:r2(info.fps),inferenceMs:r2(info.inferenceMs),score:info.score?{L:r2(info.score.L),R:r2(info.score.R)}:null};}),
   };
  },
 };
}
export type FightRecorder=ReturnType<typeof createFightRecorder>;
const stamp=(d:Date)=>{const p=(n:number)=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}-${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;};
/** The REC chip (top-left page corner, outside the stage) with a download button, and Shift+R to save at any time. Null without ?rec=1. */
export function mountFightRecorder(doc:Document,search:string,meta:()=>Omit<FightRecMeta,'startedAt'>,clock:()=>Date=()=>new Date()){
 if(!fightRecEnabled(search))return null;
 const win=doc.defaultView!,recorder=createFightRecorder(),started=clock();
 const chip=doc.createElement('aside');chip.className='fight-rec';
 chip.innerHTML='<b>● REC</b><span data-rec="info">0 frames</span><button type="button" data-rec="save">Download fight recording</button><small>Shift+R</small>';doc.body.append(chip);
 const info=chip.querySelector<HTMLElement>('[data-rec="info"]')!;
 const save=()=>{
  const json=recorder.recording({startedAt:started.toISOString(),...meta()});
  const url=win.URL.createObjectURL(new Blob([JSON.stringify(json)],{type:'application/json'})),link=doc.createElement('a');
  link.href=url;link.download=`fight-rec-${stamp(clock())}.frames.json`;doc.body.append(link);link.click();link.remove();win.setTimeout(()=>win.URL.revokeObjectURL(url),10_000);
 };
 chip.querySelector('[data-rec="save"]')!.addEventListener('click',save);
 doc.addEventListener('keydown',event=>{
  if(!event.shiftKey||event.code!=='KeyR'||event.repeat)return;
  const target=event.target as HTMLElement|null;if(target&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))return;
  event.preventDefault();save();
 });
 win.setInterval(()=>{info.textContent=`${recorder.frameCount} frames · ${Math.round(recorder.seconds)} s`;},1000);
 return Object.assign(recorder,{save});
}
