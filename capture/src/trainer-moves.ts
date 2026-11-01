import type {Landmark} from './classifier';
import {STRAIGHT_PUNCH} from './straight-punch';
/**
 * Crowd Trainer only: punch side and slip from a front webcam. Boss Fight keeps PoseClassifier unchanged.
 * Straight punches at the camera barely lengthen the arm in 2D and the shoulders narrow as the body
 * turns, so PoseClassifier's 1.6-width extension gate missed most of Kash's recorded punches
 * (test/pose/trainer-moves.test.ts). Here a punch is a quick excursion of one wrist away from where it
 * has been resting, relative to the shoulder midpoint and in units of the recent (unrotated) shoulder
 * width; a slip is a quick sideways shift of the head that the shoulders follow, while no hand is out. Raw, unmirrored MediaPipe indices: L is the
 * player's own left hand, and a head moving to image right is a lean to the player's left.
 */
export const TRAINER_MOVES={
 // Baselines are medians over the recent past, so a brief punch or slip does not drag them along.
 baselineMs:2000,shoulderWindowMs:3000,
 // down/edgeY/tiltGate (1 Nov playtest fix, shared with Boss Fight's straight-punch.ts): a dropping hand, a hand resting at the
 // bottom edge of the frame (tracking flips there) or a tilting torso is not a punch. Recorded false punches 32 -> 9, catches 41 -> 40.
 punch:{on:.6,off:.3,fall:.12,dominance:.35,minGapMs:250,down:.3,edgeY:.85,tiltGate:.5},
 slip:{on:.55,off:.3,minGapMs:400,shoulders:.25,afterPunchMs:300},
} as const;
type Sample={at:number;lx:number;ly:number;rx:number;ry:number;nx:number;sx:number;rawL:number;rawR:number;tilt:number};
type Peak={armed:boolean;peak:number;peakAt:number;dominant:boolean;last:number};
const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[sorted.length>>1]!;};
const usable=(p:Landmark|undefined)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>=.5;
export class TrainerMoveDetector {
 private history:Sample[]=[];
 private widths:{at:number;w:number}[]=[];
 private punch:{L:Peak;R:Peak}={L:fresh(),R:fresh()};
 private slip={armed:true,last:-Infinity};
 private thresholds:{L:number;R:number}|null=null;
 /** Per-player thresholds from the punch setup step (Boss Fight units); null keeps the tuned default. This detector measures
  * in shoulder widths with its own default, so it takes the same ratio to its default, not the raw value (a raw 0.7-0.9 cut
  * Kash's recorded catches from 40 to 34 of 44). */
 setPunchThresholds(value:{L:number;R:number}|null){this.thresholds=value?{L:value.L,R:value.R}:null;}
 reset(){this.history=[];this.widths=[];this.punch={L:fresh(),R:fresh()};this.slip={armed:true,last:-Infinity};}
 update(landmarks:Landmark[],at:number):{punches:{side:'L'|'R';at:number}[];slips:{side:'L'|'R';at:number}[]}{
  const out={punches:[] as {side:'L'|'R';at:number}[],slips:[] as {side:'L'|'R';at:number}[]};
  const [nose,ls,rs,lw,rw]=[landmarks[0],landmarks[11],landmarks[12],landmarks[15],landmarks[16]];
  if(!usable(nose)||!usable(ls)||!usable(rs)||!usable(lw)||!usable(rw)){this.reset();return out;}
  const last=this.history.at(-1);if(last&&(at<last.at||at-last.at>500))this.reset();
  this.widths.push({at,w:Math.abs(ls!.x-rs!.x)});while(this.widths[0]!.at<at-TRAINER_MOVES.shoulderWindowMs)this.widths.shift();
  // The upper end of recent widths: a punch turns the shoulders and shrinks the live width.
  const sorted=this.widths.map(item=>item.w).sort((a,b)=>a-b),width=sorted[Math.floor(sorted.length*.8)]!;
  if(width<.04)return out;
  const mx=(ls!.x+rs!.x)/2,my=(ls!.y+rs!.y)/2;
  const sample:Sample={at,lx:(lw!.x-mx)/width,ly:(lw!.y-my)/width,rx:(rw!.x-mx)/width,ry:(rw!.y-my)/width,nx:nose!.x/width,sx:mx/width,rawL:lw!.y,rawR:rw!.y,tilt:(ls!.y-rs!.y)/width};
  const past=this.history.filter(item=>item.at>=at-TRAINER_MOVES.baselineMs);
  this.history=[...past,sample];
  if(past.length<5)return out;
  const base=(key:keyof Omit<Sample,'at'>)=>median(past.map(item=>item[key]));
  const e={L:Math.hypot(sample.lx-base('lx'),sample.ly-base('ly')),R:Math.hypot(sample.rx-base('rx'),sample.ry-base('ry'))};
  const shift=sample.nx-base('nx'),body=sample.sx-base('sx');
  const {punch,slip}=TRAINER_MOVES;
  const tilting=Math.abs(sample.tilt-base('tilt'))>punch.tiltGate;
  for(const side of ['L','R'] as const){
   const tracker=this.punch[side],other=e[side==='L'?'R':'L'],value=e[side];
   const blocked=tilting||(side==='L'?sample.ly-base('ly'):sample.ry-base('ry'))>punch.down||base(side==='L'?'rawL':'rawR')>punch.edgeY;
   if(tracker.armed&&!blocked&&value>=(this.thresholds?punch.on*this.thresholds[side]/STRAIGHT_PUNCH.on:punch.on)&&value>tracker.peak){tracker.peak=value;tracker.peakAt=at;tracker.dominant=value-other>=punch.dominance;}
   if(tracker.armed&&tracker.peak>0&&value<tracker.peak-punch.fall){
    if(tracker.dominant&&tracker.peakAt-tracker.last>=punch.minGapMs){out.punches.push({side,at:tracker.peakAt});tracker.last=tracker.peakAt;}
    tracker.armed=false;tracker.peak=0;
   }
   if(!tracker.armed&&value<punch.off){tracker.armed=true;tracker.peak=0;}
  }
  // The shoulders must travel with the head: a punch turns the head but barely moves the shoulder midpoint.
  if(this.slip.armed&&Math.abs(shift)>=slip.on&&Math.sign(body)===Math.sign(shift)&&Math.abs(body)>=slip.shoulders&&Math.max(e.L,e.R)<punch.on&&at-Math.max(this.punch.L.last,this.punch.R.last)>=slip.afterPunchMs&&at-this.slip.last>=slip.minGapMs){out.slips.push({side:shift>0?'L':'R',at});this.slip={armed:false,last:at};}
  else if(!this.slip.armed&&Math.abs(shift)<slip.off)this.slip.armed=true;
  return out;
 }
}
function fresh():Peak{return {armed:true,peak:0,peakAt:0,dominant:false,last:-Infinity};}
