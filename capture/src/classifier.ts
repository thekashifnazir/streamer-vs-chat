import type { PoseState, PunchEvent } from '@svc/shared';

export type Landmark = { x: number; y: number; z?: number; visibility?: number };
export type PoseMetrics = {
  g: number;
  tilt: number;
  shoulderWidth: number;
  leftExtension: number;
  rightExtension: number;
  wristsNearBody: boolean;
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
  return {
    shoulderWidth,
    // Conservative horizontal envelope; vertical placement remains calibrated.
    wristsNearBody: [leftWrist, rightWrist].every(wrist => Math.abs(wrist.x - (leftShoulder.x + rightShoulder.x) / 2) <= 1.5 * shoulderWidth),
    g: ((leftShoulder.y + rightShoulder.y) / 2 - Math.max(leftWrist.y, rightWrist.y)) / shoulderWidth,
    tilt: (leftShoulder.y - rightShoulder.y) / shoulderWidth,
    leftExtension: Math.hypot(leftWrist.x - leftShoulder.x, leftWrist.y - leftShoulder.y) / shoulderWidth,
    rightExtension: Math.hypot(rightWrist.x - rightShoulder.x, rightWrist.y - rightShoulder.y) / shoulderWidth,
  };
}

type PunchTracker = { armed: boolean; peak: number; peakAt: number };
const freshPunch = (): PunchTracker => ({ armed: false, peak: 0, peakAt: 0 });

/** Stateful input classifier only; this never owns health, votes, or combat rules. */
export class PoseClassifier {
  private guardThreshold: number;
  private guard = false;
  private lean: PoseState['lean'] = null;
  private candidate: PoseState['lean'] = null;
  private candidateSince = 0;
  private leanGateUntil = -Infinity;
  private lastAt = -Infinity;
  private lastPunchAt = -Infinity;
  private punches = { L: freshPunch(), R: freshPunch() };

  constructor({ guardThreshold }: { guardThreshold: number }) {
    if (!Number.isFinite(guardThreshold)) throw new Error('Guard calibration must be finite');
    this.guardThreshold = guardThreshold;
  }
  setGuardThreshold(value: number) {
    if (!Number.isFinite(value)) throw new Error('Guard calibration must be finite');
    this.guardThreshold = value;
    this.reset();
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
    if (metrics.leftExtension > 1.6 || metrics.rightExtension > 1.6) this.leanGateUntil = at + 300;
    if (at < this.leanGateUntil) {
      // Freeze the held lean, but discard partially accumulated dwell time.
      this.candidate = null;
    } else {
      if ((this.lean === 'L' && metrics.tilt <= 0.25) || (this.lean === 'R' && metrics.tilt >= -0.25)) this.lean = null;
      const desired = metrics.tilt > 0.5 ? 'L' : metrics.tilt < -0.5 ? 'R' : null;
      if (desired !== this.lean && desired !== null) {
        if (this.candidate !== desired) { this.candidate = desired; this.candidateSince = at; }
        if (at - this.candidateSince >= 200) { this.lean = desired; this.candidate = null; }
      } else this.candidate = null;
    }
    for (const side of ['L', 'R'] as const) {
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
    // Engage at the calibrated midpoint; retain a held guard through lean noise.
    // Tracking/framing loss still clears immediately, without a debounce delay.
    this.guard = metrics.wristsNearBody && (this.guard
      ? metrics.g >= this.guardThreshold - 0.25
      : metrics.g > this.guardThreshold);
    return { state: { kind: 'pose', guard: this.guard, lean: this.lean, at, source: 'pose' }, punches, metrics };
  }
}
