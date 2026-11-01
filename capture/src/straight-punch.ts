import type {Landmark} from './classifier';
/**
 * Boss Fight bonus punch from a front webcam. A straight punch at the camera barely lengthens the arm in 2D,
 * so the old 1.6-width shoulder-to-wrist gate only fired when the whole body turned (Kash, 1 Nov playtest).
 * Here a punch is a quick excursion of one wrist away from where it has been resting, in the torso's own frame
 * (so a lean does not move it) and in units of the recent unrotated shoulder length (a turning punch narrows the
 * live shoulders). Swept on Kash's recorded landmarks (test/pose/straight-punch.test.ts): 36 of 44 punches across
 * the 1 Nov drill clip and the 27 Oct straight jabs, against 13 for the old gate, and 3 false punches over all the
 * recorded guard, lean and slip footage, against 30. Raw, unmirrored MediaPipe indices: L is the player's own left.
 * A fist driven straight at the camera also foreshortens the forearm (elbow to wrist shrinks in 2D), so that shrink
 * counts towards the excursion (forearm weight 1): 42 of 44 against 36, false punches 4 against 3; one-twos 9/10
 * against 5/10. Wrist z from the lite model was too noisy to help (no extra catch before false punches rose to 12).
 */
export const STRAIGHT_PUNCH={
 baselineMs:2000,widthMs:3000,widthPercentile:.8,maxGapMs:500,
 // on: excursion in shoulder lengths; dominance: the other hand must move this much less (a guard raise moves both).
 on:.7,off:.3,fall:.12,dominance:.25,refractoryMs:200,minGapMs:250,
 // Not a punch: a hand dropping (guard falling), a hand resting at the bottom edge of the frame (tracking flips
 // there), or a torso that is tilting (a lean or slip carries the hands with it).
 down:.3,edgeY:.85,tiltGate:.5,
 // Forearm foreshortening (elbow-wrist shrink, shoulder lengths) added to the excursion; 0.9-1.2 all catch 40-42 of 44.
 forearm:1,
 // Punch setup step: threshold = fraction of the player's own measured punch, clamped. A setup punch is a big deliberate
 // one (Kash's first punches reach 1.8-2.6), so the old 0.9 cap tuned fight punches out (26 of 44 at 0.9, one-twos 1/10):
 // the step may lower the threshold for a short punch, never raise it above the default.
 calibration:{probe:.45,fraction:.5,min:.6,max:.7,minReach:1},
} as const;
export type PunchThresholds={L:number;R:number};
/** Per-side threshold from the player's measured punch reach; a side whose punch was too small keeps the default. */
export function punchThresholdsFromReach(reach:PunchThresholds):PunchThresholds{
 const {fraction,min,max,minReach}=STRAIGHT_PUNCH.calibration,side=(value:number)=>value<minReach?STRAIGHT_PUNCH.on:Math.min(max,Math.max(min,fraction*value));
 return {L:side(reach.L),R:side(reach.R)};
}
type Sample={at:number;l:[number,number];r:[number,number];lf:number;rf:number;ly:number;ry:number;tilt:number};
type Tracker={armed:boolean;peak:number;peakAt:number;dominant:boolean;last:number};
const fresh=():Tracker=>({armed:true,peak:0,peakAt:0,dominant:false,last:-Infinity});
const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[sorted.length>>1]!;};
const usable=(p:Landmark|undefined)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>=.5;
export class StraightPunchDetector {
 private history:Sample[]=[];
 private lengths:{at:number;w:number}[]=[];
 private trackers={L:fresh(),R:fresh()};
 private lastPunch=-Infinity;
 private lastAt=-Infinity;
 reset(){this.history=[];this.lengths=[];this.trackers={L:fresh(),R:fresh()};this.lastPunch=-Infinity;this.lastAt=-Infinity;}
 /** Emits a punch at its observed peak, once the wrist starts back; the peak is the excursion in shoulder lengths. */
 update(landmarks:Landmark[],at:number,thresholds:PunchThresholds={L:STRAIGHT_PUNCH.on,R:STRAIGHT_PUNCH.on}):{side:'L'|'R';at:number;peak:number}[]{
  const out:{side:'L'|'R';at:number;peak:number}[]=[];
  const [ls,rs,lw,rw]=[landmarks[11],landmarks[12],landmarks[15],landmarks[16]];
  if(at<this.lastAt||at-this.lastAt>STRAIGHT_PUNCH.maxGapMs){this.history=[];this.lengths=[];}
  // A frame lost mid-punch (the shoulders turn edge-on) is skipped rather than resetting the peak.
  if(!usable(ls)||!usable(rs)||!usable(lw)||!usable(rw))return out;
  this.lastAt=at;
  const dx=ls!.x-rs!.x,dy=ls!.y-rs!.y,length=Math.hypot(dx,dy);
  this.lengths.push({at,w:length});while(this.lengths[0]!.at<at-STRAIGHT_PUNCH.widthMs)this.lengths.shift();
  const sorted=this.lengths.map(item=>item.w).sort((a,b)=>a-b),width=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*STRAIGHT_PUNCH.widthPercentile))]!;
  if(width<.04||length<.02)return out;
  // Torso frame: u along the shoulders, v down the body's own normal, both in recent shoulder lengths.
  const ux=Math.sign(dx)*dx/length,uy=Math.sign(dx)*dy/length,mx=(ls!.x+rs!.x)/2,my=(ls!.y+rs!.y)/2;
  const frame=(w:Landmark):[number,number]=>{const ax=w.x-mx,ay=w.y-my;return [(ax*ux+ay*uy)/width,(ay*ux-ax*uy)/width];};
  // Forearm length in the same units; NaN when an elbow is not tracked (then it adds nothing).
  const forearm=(elbow:Landmark|undefined,wrist:Landmark)=>usable(elbow)?Math.hypot(wrist.x-elbow!.x,wrist.y-elbow!.y)/width:NaN;
  const sample:Sample={at,l:frame(lw!),r:frame(rw!),lf:forearm(landmarks[13],lw!),rf:forearm(landmarks[14],rw!),ly:lw!.y,ry:rw!.y,tilt:dy/width};
  const past=this.history.filter(item=>item.at>=at-STRAIGHT_PUNCH.baselineMs);
  this.history=[...past,sample];
  if(past.length<5)return out;
  const base={l:[median(past.map(p=>p.l[0])),median(past.map(p=>p.l[1]))],r:[median(past.map(p=>p.r[0])),median(past.map(p=>p.r[1]))]};
  const shrink=(now:number,rest:number)=>STRAIGHT_PUNCH.forearm*(Math.max(0,rest-now)||0);
  const fore={L:shrink(sample.lf,median(past.map(p=>p.lf))),R:shrink(sample.rf,median(past.map(p=>p.rf)))};
  const excursion={L:Math.hypot(sample.l[0]-base.l[0]!,sample.l[1]-base.l[1]!,fore.L),R:Math.hypot(sample.r[0]-base.r[0]!,sample.r[1]-base.r[1]!,fore.R)};
  const drop={L:sample.l[1]-base.l[1]!,R:sample.r[1]-base.r[1]!},restY={L:median(past.map(p=>p.ly)),R:median(past.map(p=>p.ry))};
  const tilting=Math.abs(sample.tilt-median(past.map(p=>p.tilt)))>STRAIGHT_PUNCH.tiltGate;
  for(const side of ['L','R'] as const){
   const tracker=this.trackers[side],value=excursion[side],other=excursion[side==='L'?'R':'L'];
   const blocked=tilting||drop[side]>STRAIGHT_PUNCH.down||restY[side]>STRAIGHT_PUNCH.edgeY;
   if(tracker.armed&&!blocked&&value>=thresholds[side]&&value>tracker.peak){tracker.peak=value;tracker.peakAt=at;tracker.dominant=value-other>=STRAIGHT_PUNCH.dominance;}
   if(tracker.armed&&tracker.peak>0&&value<tracker.peak-STRAIGHT_PUNCH.fall){
    if(tracker.dominant&&tracker.peakAt-tracker.last>=STRAIGHT_PUNCH.minGapMs&&tracker.peakAt-this.lastPunch>=STRAIGHT_PUNCH.refractoryMs){out.push({side,at:tracker.peakAt,peak:tracker.peak});tracker.last=tracker.peakAt;this.lastPunch=tracker.peakAt;}
    tracker.armed=false;tracker.peak=0;
   }
   if(!tracker.armed&&value<STRAIGHT_PUNCH.off){tracker.armed=true;tracker.peak=0;}
  }
  return out;
 }
}
