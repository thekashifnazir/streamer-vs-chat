import { GUARD_HYSTERESIS, GUARD_MIN_ON, measurePose, type Landmark } from './classifier.js';

export type CalibrationMode = 'standing' | 'seated';
export type CalibrationStage = 'idle' | 'neutral' | 'resting' | 'guard' | 'lean-left' | 'lean-right' | 'ready';
export type CalibrationSnapshot = {
  stage: CalibrationStage; ready: boolean; guardThreshold: number | null;
  mode: CalibrationMode; message: string; progress: number;
  leanThresholds: {L:number;R:number} | null;
  leanPeaks: {L:number;R:number} | null;
  guardMedians: {neutral:number;resting:number;guard:number} | null;
};
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};
const visible = (landmark: Landmark | undefined) => landmark && Number.isFinite(landmark.x) && Number.isFinite(landmark.y)
  && landmark.x >= 0 && landmark.x <= 1 && landmark.y >= 0 && landmark.y <= 1 && (landmark.visibility ?? 1) >= 0.5;

/** Calibrates each posture from the current camera, without writing game state. */
export function createCalibration(options: { onChange?: (snapshot: CalibrationSnapshot) => void } = {}) {
  let snapshot: CalibrationSnapshot = { stage: 'idle', ready: false, guardThreshold: null, mode: 'standing', message: 'Check your space, then calibrate your webcam.', progress: 0, leanThresholds:null, leanPeaks:null, guardMedians:null };
  let since: number | null = null;
  let lastAt: number | null = null;
  let samples: number[] = [];
  let neutral = 0;
  let resting = 0;
  let leftPeak = 0;
  const copy = ():CalibrationSnapshot => ({...snapshot,
    leanThresholds:snapshot.leanThresholds?{...snapshot.leanThresholds}:null,
    leanPeaks:snapshot.leanPeaks?{...snapshot.leanPeaks}:null,
    guardMedians:snapshot.guardMedians?{...snapshot.guardMedians}:null,
  });
  const publish = (change: Partial<CalibrationSnapshot>) => {
    snapshot = { ...snapshot, ...change };
    options.onChange?.(copy());
  };
  const next = (stage: CalibrationStage, message: string) => {
    since = null; samples = [];
    publish({ stage, message, progress: 0 });
  };
  function reset() {
    since = null; lastAt = null; samples = []; neutral = 0; resting = 0; leftPeak = 0;
    publish({ stage: 'idle', ready: false, guardThreshold: null, leanThresholds:null, leanPeaks:null, guardMedians:null, progress: 0, message: 'Check your space, then calibrate your webcam.' });
  }
  return {
    get snapshot() { return copy(); },
    start(mode: CalibrationMode, at: number) {
      reset();
      lastAt = at;
      publish({ mode });
      next('neutral', mode === 'seated' ? 'Sit with hands relaxed for 3 seconds. Sit ~1 m further back than feels natural.' : 'Stand with hands relaxed for 3 seconds.');
    },
    reset,
    update(landmarks: Landmark[], at: number) {
      if (snapshot.stage === 'idle' || snapshot.ready) return copy();
      const metrics = measurePose(landmarks);
      const gap = lastAt !== null && (at - lastAt > 250 || at < lastAt);
      lastAt = at;
      const framed = [0, 11, 12, 15, 16].every((index) => visible(landmarks[index]));
      if (!metrics || !framed || (snapshot.mode === 'seated' && metrics.shoulderWidth > 0.20)) {
        since = null; samples = [];
        publish({ progress: 0, message: snapshot.mode === 'seated' && metrics && metrics.shoulderWidth > 0.20
          ? 'Move further back: seated shoulder width must be ≤20% of the frame. Keep your head, shoulders and wrists visible.'
          : 'Keep your head, shoulders and both wrists clearly inside the camera frame.' });
        return copy();
      }
      if (gap) { since = null; samples = []; }
      if (snapshot.stage === 'neutral' || snapshot.stage === 'resting' || snapshot.stage === 'guard') {
        if (snapshot.stage === 'guard' && !metrics.wristsNearBody) {
          since = null; samples = [];
          publish({ progress: 0, message: 'Keep both wrists near your body in a comfortable guard, then hold for 3 seconds.' });
          return copy();
        }
        since ??= at;
        samples.push(metrics.g);
        const stage = snapshot.stage;
        publish({ progress: Math.min(1, (at - since) / 3000), message: stage === 'neutral' ? 'Arms relaxed at your sides — hold still for 3 seconds.' : stage === 'resting' ? 'Rest your hands at your waist — hold still for 3 seconds.' : 'Both hands near your face in a comfortable guard — hold for 3 seconds.' });
        if (at - since >= 3000) {
          if (stage === 'neutral') {
            neutral = median(samples);
            next('resting', 'Rest your hands at your waist, as between attacks. Hold for 3 seconds.');
          } else if (stage === 'resting') {
            resting = median(samples);
            next('guard', 'Raise both hands near your face into a comfortable guard and hold for 3 seconds.');
          } else {
            const guard = median(samples);
            const baseline = Math.max(neutral, resting);
            const threshold = Math.max(GUARD_MIN_ON, baseline + 0.7 * (guard - baseline));
            publish({guardMedians:{neutral,resting,guard}});
            // Both sides of the hysteresis band need clearance: resting hands must
            // release a previously held guard, as well as avoid engaging a new one.
            const releaseClearance = (threshold - GUARD_HYSTERESIS) - baseline;
            if (guard <= baseline || guard - threshold < 0.05 || releaseClearance < 0.05) {
              next('guard', 'Guard was too low or too close to resting hands. Raise both wrists near your face and hold for 3 seconds again. If your resting sample was too high, restart calibration with your hands naturally at your waist.');
            } else {
              publish({ guardThreshold: threshold });
              next('lean-left', 'Lean comfortably LEFT (A), as you will during play. Hold for 1.5 seconds without forcing your maximum reach.');
            }
          }
        }
      } else {
        const left = snapshot.stage === 'lean-left';
        const extended = metrics.punchExtended;
        const magnitude = left ? metrics.tilt : -metrics.tilt;
        const correct = magnitude >= 0.3;
        if (!correct || extended) { since = null; samples = []; }
        else { since ??= at; samples.push(magnitude); }
        publish({ progress: since === null ? 0 : Math.min(1, (at - since) / 1500), message: extended ? 'Finish the raised arm extension, then lean.' : `Lean comfortably ${left ? 'LEFT (A)' : 'RIGHT (D)'} and hold for 1.5 seconds.` });
        if (since !== null && at - since >= 1500) {
          const peak = Math.max(...samples);
          if (left) {
            leftPeak = peak;
            next('lean-right', 'Lean comfortably RIGHT (D), as you will during play. Hold for 1.5 seconds.');
          } else {
            const leanPeaks = {L:leftPeak,R:peak};
            publish({ stage: 'ready', ready: true, progress: 1, leanPeaks,
              leanThresholds:{L:Math.max(0.3,0.6*leanPeaks.L),R:Math.max(0.3,0.6*leanPeaks.R)},
              message: `${snapshot.mode === 'seated' ? 'Seated' : 'Standing'} calibration ready. Face-height guard and both comfortable leans confirmed.` });
          }
        }
      }
      return copy();
    },
  };
}
