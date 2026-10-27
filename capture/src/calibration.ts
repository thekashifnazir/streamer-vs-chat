import { measurePose, type Landmark } from './classifier.js';

export type CalibrationMode = 'standing' | 'seated';
export type CalibrationStage = 'idle' | 'neutral' | 'guard' | 'lean-left' | 'lean-right' | 'ready';
export type CalibrationSnapshot = {
  stage: CalibrationStage; ready: boolean; guardThreshold: number | null;
  mode: CalibrationMode; message: string; progress: number;
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
  let snapshot: CalibrationSnapshot = { stage: 'idle', ready: false, guardThreshold: null, mode: 'standing', message: 'Check your space, then calibrate your webcam.', progress: 0 };
  let since: number | null = null;
  let lastAt: number | null = null;
  let samples: number[] = [];
  let neutral = 0;
  const publish = (change: Partial<CalibrationSnapshot>) => {
    snapshot = { ...snapshot, ...change };
    options.onChange?.({ ...snapshot });
  };
  const next = (stage: CalibrationStage, message: string) => {
    since = null; samples = [];
    publish({ stage, message, progress: 0 });
  };
  function reset() {
    since = null; lastAt = null; samples = [];
    publish({ stage: 'idle', ready: false, guardThreshold: null, progress: 0, message: 'Check your space, then calibrate your webcam.' });
  }
  return {
    get snapshot() { return { ...snapshot }; },
    start(mode: CalibrationMode, at: number) {
      reset();
      lastAt = at;
      publish({ mode });
      next('neutral', mode === 'seated' ? 'Sit with hands relaxed for 3 seconds. Sit ~1 m further back than feels natural.' : 'Stand with hands relaxed for 3 seconds.');
    },
    reset,
    update(landmarks: Landmark[], at: number) {
      if (snapshot.stage === 'idle' || snapshot.ready) return { ...snapshot };
      const metrics = measurePose(landmarks);
      const gap = lastAt !== null && (at - lastAt > 250 || at < lastAt);
      lastAt = at;
      const framed = [0, 11, 12, 15, 16].every((index) => visible(landmarks[index]));
      if (!metrics || !framed || (snapshot.mode === 'seated' && metrics.shoulderWidth > 0.20)) {
        since = null; samples = [];
        publish({ progress: 0, message: snapshot.mode === 'seated' && metrics && metrics.shoulderWidth > 0.20
          ? 'Move further back: seated shoulder width must be ≤20% of the frame. Keep your head, shoulders and wrists visible.'
          : 'Keep your head, shoulders and both wrists clearly inside the camera frame.' });
        return { ...snapshot };
      }
      if (gap) { since = null; samples = []; }
      if (snapshot.stage === 'neutral' || snapshot.stage === 'guard') {
        if (snapshot.stage === 'guard' && !metrics.wristsNearBody) {
          since = null; samples = [];
          publish({ progress: 0, message: 'Keep both wrists near your body in a comfortable guard, then hold for 3 seconds.' });
          return { ...snapshot };
        }
        since ??= at;
        samples.push(metrics.g);
        const stage = snapshot.stage;
        publish({ progress: Math.min(1, (at - since) / 3000), message: stage === 'neutral' ? 'Hands relaxed — hold still for 3 seconds.' : 'Hands up in a comfortable guard — hold for 3 seconds.' });
        if (at - since >= 3000) {
          if (stage === 'neutral') {
            neutral = median(samples);
            next('guard', 'Raise both hands into your guard and hold for 3 seconds.');
          } else {
            const guard = median(samples);
            if (guard <= neutral) {
              next('guard', 'Guard was not above neutral. Raise both wrists and hold for 3 seconds again.');
            } else {
              publish({ guardThreshold: (neutral + guard) / 2 });
              next('lean-left', 'Lean LEFT (A) and hold. Keep your hands comfortable.');
            }
          }
        }
      } else {
        const left = snapshot.stage === 'lean-left';
        const extended = metrics.punchExtended;
        const correct = left ? metrics.tilt >= 0.5 : metrics.tilt <= -0.5;
        if (!correct || extended) since = null;
        else since ??= at;
        publish({ progress: since === null ? 0 : Math.min(1, (at - since) / 200), message: extended ? 'Finish the raised arm extension, then lean.' : `Lean ${left ? 'LEFT (A)' : 'RIGHT (D)'} and hold for 200 ms.` });
        if (since !== null && at - since >= 200) {
          if (left) next('lean-right', 'Lean RIGHT (D) and hold. Keep your hands comfortable.');
          else publish({ stage: 'ready', ready: true, progress: 1, message: `${snapshot.mode === 'seated' ? 'Seated' : 'Standing'} calibration ready. Guard and both leans confirmed.` });
        }
      }
      return { ...snapshot };
    },
  };
}
