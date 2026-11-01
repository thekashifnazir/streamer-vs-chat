import type { PoseState, PunchEvent } from '@svc/shared';
import {StraightPunchDetector,STRAIGHT_PUNCH,type PunchThresholds} from './straight-punch';

export type Landmark = { x: number; y: number; z?: number; visibility?: number };
export const GUARD_METRIC = 'shoulder-normal-v1' as const;
export const GUARD_MIN_ON = -0.5;
/** Compatibility only for old recordings without calibration spread. */
export const GUARD_HYSTERESIS = 0.25;
export const GUARD_BAND_FRACTION = 0.25;
export type GuardMedians = {neutral:number;resting:number;guard:number};
export function computeGuardReleaseBand(medians:Pick<GuardMedians,'neutral'|'guard'>):number {
  const spread=medians.guard-medians.neutral;
  if(!Number.isFinite(medians.guard)||!Number.isFinite(medians.neutral)||spread<=0) {
    throw new Error('Guard calibration spread must be finite and positive');
  }
  return GUARD_BAND_FRACTION*spread;
}
export type LeanThresholds = {L:number;R:number};
/**
 * Lean activation as a fraction of each side's calibrated comfortable peak. Swept on the
 * owner's recorded landmarks (31 Oct, two replays): 0.60 caught 9/18 shallow leans; 0.48 catches 18/18,
 * while 0.46 and below let one of Kash's recorded jabs (27 Oct webcam) register as a lean.
 */
export const LEAN_THRESHOLD_FRACTION = 0.48;
/**
 * Continuous time beyond the threshold before a lean registers. 170 rather than 200 keeps six
 * 30 fps frames but lets ~15 fps capture (live streams measured 16 FPS) register after three
 * intervals instead of four. 150 ms and below let brief torso twists during recorded punches
 * (Pexels fixtures) register as leans, so the dwell stays above that.
 */
export const LEAN_DWELL_MS = 170;
/**
 * Upper bound on a calibrated lean threshold. The 5-step setup asks for a held lean to each side, which many players
 * make deeper than their fight leans: on the 31 Oct shallow-lean replay, setup peaks 25% deeper than recorded drop 3 of
 * 6 leans to nothing and 50% deeper drop 5 of 6. 0.66 is the highest threshold validated there (18/18 shallow leans);
 * the recorded jab that turned into a lean reached about 0.53, so the cap keeps a margin above it.
 */
export const LEAN_THRESHOLD_CAP = 0.66;
/** Per-side activation from calibrated peaks, capped (above); release stays at half of each. */
export function leanThresholdsFromPeaks(peaks:LeanThresholds, floor:number):LeanThresholds {
  const side=(peak:number)=>Math.max(floor,Math.min(LEAN_THRESHOLD_CAP,LEAN_THRESHOLD_FRACTION*peak));
  return {L:side(peaks.L),R:side(peaks.R)};
}
export type PoseCalibration = {guardThreshold:number;leanThresholds?:LeanThresholds;guardReleaseBand?:number;guardMedians?:GuardMedians;neutralSwayP95?:number;punchThresholds?:PunchThresholds|null};
export type PoseMetrics = {
  g: number;
  tilt: number;
  shoulderWidth: number;
  leftExtension: number;
  rightExtension: number;
  leftWristHeight: number;
  rightWristHeight: number;
  punchExtended: boolean;
  wristsNearBody: boolean;
  guardAnatomy: boolean;
};

/** Uses raw, unmirrored MediaPipe indices. Mirroring belongs to presentation only. */
export function measurePose(landmarks: Landmark[]): PoseMetrics | null {
  const points = [landmarks[11], landmarks[12], landmarks[15], landmarks[16]];
  if (points.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) ||
      (p.visibility !== undefined && (!Number.isFinite(p.visibility) || p.visibility < 0.5)))) return null;
  const [leftShoulder, rightShoulder, leftWrist, rightWrist] = points as [Landmark, Landmark, Landmark, Landmark];
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
  // A near-profile/collapsed estimate cannot provide a stable normalization.
  if (shoulderWidth < 0.04) return null;
  const dx = leftShoulder.x - rightShoulder.x;
  const dy = leftShoulder.y - rightShoulder.y;
  const shoulderLength = Math.hypot(dx, dy);
  // Project each wrist against its own shoulder onto the torso's upward normal.
  // Dividing by shoulder-axis length makes this invariant under a rigid lean.
  const height = (wrist: Landmark, shoulder: Landmark) => (
    dy * Math.sign(dx) * (wrist.x - shoulder.x) - Math.abs(dx) * (wrist.y - shoulder.y)
  ) / (shoulderLength * shoulderLength);
  const leftWristHeight = height(leftWrist, leftShoulder);
  const rightWristHeight = height(rightWrist, rightShoulder);
  const leftExtension = Math.hypot(leftWrist.x - leftShoulder.x, leftWrist.y - leftShoulder.y) / shoulderWidth;
  const rightExtension = Math.hypot(rightWrist.x - rightShoulder.x, rightWrist.y - rightShoulder.y) / shoulderWidth;
  const along = (wrist: Landmark) => (
    dx * (wrist.x - (leftShoulder.x + rightShoulder.x) / 2) +
    dy * (wrist.y - (leftShoulder.y + rightShoulder.y) / 2)
  ) / (shoulderLength * shoulderLength);
  // Raw unmirrored image anatomy: y increases downwards. Hips may be inferred
  // below the image in seated/waist-up framing; require finite coordinates, not
  // in-frame hips. Missing anatomy fails guard without disabling shoulder lean.
  const anatomy=[landmarks[13],landmarks[14],landmarks[23],landmarks[24]];
  const anatomyKnown=anatomy.every(point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y));
  const midTorso=anatomyKnown?((leftShoulder.y+rightShoulder.y)/2+(landmarks[23]!.y+landmarks[24]!.y)/2)/2:NaN;
  const guardAnatomy=anatomyKnown&&leftWrist.y<landmarks[13]!.y&&rightWrist.y<landmarks[14]!.y&&
    leftWrist.y<midTorso&&rightWrist.y<midTorso;
  return {
    shoulderWidth,guardAnatomy,
    // The same body-relative envelope rejects wide arms without penalizing lean.
    wristsNearBody: [leftWrist, rightWrist].every(wrist => Math.abs(along(wrist)) <= 1.5),
    g: Math.min(leftWristHeight, rightWristHeight),
    tilt: dy / shoulderWidth,
    leftExtension, rightExtension, leftWristHeight, rightWristHeight,
    // A hanging wrist can be >1.6S from its shoulder for an entire lean. Only a
    // raised extension can be a punch-like interruption of held lean input.
    // Gate on shoulder-axis lengths: the horizontal gap shrinks as the body tilts, so a
    // guard wrist read as >1.6 widths in a deep lean and froze the lean it should allow
    // (recorded: test/pose/deep-lean-gate.test.ts). Upright, the two measures are equal.
    punchExtended: (leftExtension * shoulderWidth / shoulderLength > 1.6 && leftWristHeight >= -0.5) ||
      (rightExtension * shoulderWidth / shoulderLength > 1.6 && rightWristHeight >= -0.5),
  };
}

/** Stateful input classifier only; this never owns health, votes, or combat rules. */
export class PoseClassifier {
  private guardThreshold = GUARD_MIN_ON;
  private guardReleaseBand = GUARD_HYSTERESIS;
  private leanThresholds:LeanThresholds = {L:.5,R:.5};
  private guard = false;
  private lean: PoseState['lean'] = null;
  private candidate: PoseState['lean'] = null;
  private candidateSince = 0;
  private leanGateUntil = -Infinity;
  private lastAt = -Infinity;
  // Bonus punches: see straight-punch.ts. The per-player thresholds come from the optional punch setup step.
  private punch = new StraightPunchDetector();
  private punchThresholds:PunchThresholds = {L:STRAIGHT_PUNCH.on,R:STRAIGHT_PUNCH.on};
  private punchesEnabled=true;

  constructor(calibration:PoseCalibration) { this.setCalibration(calibration); }
  setCalibration({guardThreshold,leanThresholds={L:.5,R:.5},guardReleaseBand,guardMedians,neutralSwayP95=0,punchThresholds}:PoseCalibration) {
    if(!Number.isFinite(guardThreshold))throw new Error('Guard calibration must be finite');
    if(![leanThresholds.L,leanThresholds.R].every(value=>Number.isFinite(value)&&value>=.3)) {
      throw new Error('Lean thresholds must be finite magnitudes of at least0.3');
    }
    const band=guardReleaseBand??(guardMedians?computeGuardReleaseBand(guardMedians):GUARD_HYSTERESIS);
    if(!Number.isFinite(band)||band<=0)throw new Error('Guard release band must be finite and positive');
    if(!Number.isFinite(neutralSwayP95)||neutralSwayP95<0)throw new Error('Neutral sway must be finite and nonnegative');
    if(punchThresholds&&![punchThresholds.L,punchThresholds.R].every(value=>Number.isFinite(value)&&value>=.3))throw new Error('Punch thresholds must be finite magnitudes of at least0.3');
    this.punchThresholds=punchThresholds?{L:punchThresholds.L,R:punchThresholds.R}:{L:STRAIGHT_PUNCH.on,R:STRAIGHT_PUNCH.on};
    const floor=Math.max(.3,1.5*neutralSwayP95);
    // A relaxed/waist pose must never become guard through a low calibration.
    this.guardThreshold=Math.max(GUARD_MIN_ON,guardThreshold);
    this.guardReleaseBand=band;
    this.leanThresholds={L:Math.max(floor,leanThresholds.L),R:Math.max(floor,leanThresholds.R)};
    this.reset();
  }
  setPunchesEnabled(enabled:boolean) {
    if(this.punchesEnabled===enabled)return;
    this.punchesEnabled=enabled;this.punch.reset();
  }
  setGuardThreshold(value:number) {
    this.setCalibration({guardThreshold:value,leanThresholds:this.leanThresholds,guardReleaseBand:this.guardReleaseBand,punchThresholds:this.punchThresholds});
  }
  reset() { this.resetDefence(); this.punch.reset(); }
  private resetDefence() {
    this.guard = false;
    this.lean = null; this.candidate = null; this.candidateSince = 0;
    this.leanGateUntil = -Infinity; this.lastAt = -Infinity;
  }
  update(landmarks: Landmark[], at: number): { state: PoseState; punches: PunchEvent[]; metrics: PoseMetrics | null } {
    if (!Number.isFinite(at)) throw new Error('Pose timestamp must be finite');
    if (at < this.lastAt || at - this.lastAt > 250) this.reset();
    this.lastAt = at;
    const metrics = measurePose(landmarks);
    const punches: PunchEvent[] = [];
    // Capture logs retain the observed peak time; server authority uses receive time.
    if(this.punchesEnabled)for(const punch of this.punch.update(landmarks,at,this.punchThresholds))punches.push({ kind: 'punch', side: punch.side, at: punch.at, source: 'pose' });
    if (!metrics) {
      // Lost tracking must never leave a defence latched on. A punch that turns the shoulders edge-on keeps its peak.
      this.resetDefence(); this.lastAt = at;
      return { state: { kind: 'pose', guard: false, lean: null, at, source: 'pose' }, punches, metrics };
    }
    if (metrics.punchExtended) this.leanGateUntil = at + 300;
    if (at < this.leanGateUntil) {
      // Freeze the held lean, but discard partially accumulated dwell time.
      this.candidate = null;
    } else {
      if ((this.lean === 'L' && metrics.tilt <= this.leanThresholds.L/2) || (this.lean === 'R' && metrics.tilt >= -this.leanThresholds.R/2)) this.lean = null;
      const desired = metrics.tilt > this.leanThresholds.L ? 'L' : metrics.tilt < -this.leanThresholds.R ? 'R' : null;
      if (desired !== this.lean && desired !== null) {
        if (this.candidate !== desired) { this.candidate = desired; this.candidateSince = at; }
        if (at - this.candidateSince >= LEAN_DWELL_MS) { this.lean = desired; this.candidate = null; }
      } else this.candidate = null;
    }
    // Engage at the calibrated upper threshold; retain a held guard through lean noise.
    // Tracking/framing loss still clears immediately, without a debounce delay.
    this.guard = metrics.wristsNearBody && metrics.guardAnatomy && (this.guard
      ? metrics.g >= this.guardThreshold - this.guardReleaseBand
      : metrics.g > this.guardThreshold);
    return { state: { kind: 'pose', guard: this.guard, lean: this.lean, at, source: 'pose' }, punches, metrics };
  }
}
