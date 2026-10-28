import type { PoseState, PunchEvent } from '@svc/shared';

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
export type PoseCalibration = {guardThreshold:number;leanThresholds?:LeanThresholds;guardReleaseBand?:number;guardMedians?:GuardMedians;neutralSwayP95?:number};
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
    punchExtended: (leftExtension > 1.6 && leftWristHeight >= -0.5) ||
      (rightExtension > 1.6 && rightWristHeight >= -0.5),
  };
}

type PunchTracker = { armed: boolean; peak: number; peakAt: number };
const freshPunch = (): PunchTracker => ({ armed: false, peak: 0, peakAt: 0 });

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
  private lastPunchAt = -Infinity;
  private punches = { L: freshPunch(), R: freshPunch() };
  private punchesEnabled=true;

  constructor(calibration:PoseCalibration) { this.setCalibration(calibration); }
  setCalibration({guardThreshold,leanThresholds={L:.5,R:.5},guardReleaseBand,guardMedians,neutralSwayP95=0}:PoseCalibration) {
    if(!Number.isFinite(guardThreshold))throw new Error('Guard calibration must be finite');
    if(![leanThresholds.L,leanThresholds.R].every(value=>Number.isFinite(value)&&value>=.3)) {
      throw new Error('Lean thresholds must be finite magnitudes of at least0.3');
    }
    const band=guardReleaseBand??(guardMedians?computeGuardReleaseBand(guardMedians):GUARD_HYSTERESIS);
    if(!Number.isFinite(band)||band<=0)throw new Error('Guard release band must be finite and positive');
    if(!Number.isFinite(neutralSwayP95)||neutralSwayP95<0)throw new Error('Neutral sway must be finite and nonnegative');
    const floor=Math.max(.3,1.5*neutralSwayP95);
    // A relaxed/waist pose must never become guard through a low calibration.
    this.guardThreshold=Math.max(GUARD_MIN_ON,guardThreshold);
    this.guardReleaseBand=band;
    this.leanThresholds={L:Math.max(floor,leanThresholds.L),R:Math.max(floor,leanThresholds.R)};
    this.reset();
  }
  setPunchesEnabled(enabled:boolean) {
    if(this.punchesEnabled===enabled)return;
    this.punchesEnabled=enabled;this.punches={L:freshPunch(),R:freshPunch()};this.lastPunchAt=-Infinity;
  }
  setGuardThreshold(value:number) {
    this.setCalibration({guardThreshold:value,leanThresholds:this.leanThresholds,guardReleaseBand:this.guardReleaseBand});
  }
  reset() {
    this.guard = false;
    this.lean = null; this.candidate = null; this.candidateSince = 0;
    this.leanGateUntil = -Infinity; this.lastAt = -Infinity; this.lastPunchAt = -Infinity;
    this.punches = { L: freshPunch(), R: freshPunch() };
  }
  update(landmarks: Landmark[], at: number): { state: PoseState; punches: PunchEvent[]; metrics: PoseMetrics | null } {
    if (!Number.isFinite(at)) throw new Error('Pose timestamp must be finite');
    if (at < this.lastAt || at - this.lastAt > 250) this.reset();
    this.lastAt = at;
    const metrics = measurePose(landmarks);
    const punches: PunchEvent[] = [];
    if (!metrics) {
      // Lost tracking must never leave a defence latched on.
      this.reset(); this.lastAt = at;
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
        if (at - this.candidateSince >= 200) { this.lean = desired; this.candidate = null; }
      } else this.candidate = null;
    }
    if(this.punchesEnabled)for (const side of ['L', 'R'] as const) {
      const extension = side === 'L' ? metrics.leftExtension : metrics.rightExtension;
      const tracker = this.punches[side];
      // Returning near the shoulder rearms the next peak; a held arm never repeats.
      if (tracker.armed && extension > 1.6 && extension > tracker.peak) { tracker.peak = extension; tracker.peakAt = at; }
      if (tracker.armed && tracker.peak > 1.6 && extension < tracker.peak - 0.1) {
        if (at - this.lastPunchAt >= 200) {
          // Capture logs retain the observed peak time; server authority uses receive time.
          punches.push({ kind: 'punch', side, at: tracker.peakAt, source: 'pose' });
          this.lastPunchAt = at;
        }
        tracker.armed = false; tracker.peak = 0;
      }
      if (extension < 1.2) { tracker.armed = true; tracker.peak = 0; }
    }
    // Engage at the calibrated upper threshold; retain a held guard through lean noise.
    // Tracking/framing loss still clears immediately, without a debounce delay.
    this.guard = metrics.wristsNearBody && metrics.guardAnatomy && (this.guard
      ? metrics.g >= this.guardThreshold - this.guardReleaseBand
      : metrics.g > this.guardThreshold);
    return { state: { kind: 'pose', guard: this.guard, lean: this.lean, at, source: 'pose' }, punches, metrics };
  }
}
