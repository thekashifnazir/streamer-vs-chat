# Raw landmark replay

Run `npx tsx test/pose/report.ts` for a JSON report of all eight Pexels clips plus Kash's recorded standing/seated cues. The report includes punch precision/recall, each labelled guard interval's held-frame counts, and every supplied punch gate. `npm test` enforces the normalized-image gates without network or a camera. It also recursively discovers v1 `*.landmarks.json` recordings anywhere in `test/fixtures/`, reads their matching `*.labels.json`, and enforces defence labels at ±150 ms. A punch gate is applied when the recording filename stem has an entry in `test/fixtures/gates.json`.

For a new capture recording, save both downloads and run:

```sh
npx tsx test/pose/report.ts /absolute/path/session.landmarks.json /absolute/path/session.labels.json
```

The new-recording harness uses the saved calibration threshold, matches guard and anatomical lean transitions and punches one-to-one within **150 ms**, reports per-event precision/recall, and exits nonzero if a scored defence label has no matching event or a configured punch gate fails. Unmatched bonus punches are reported through `allLabelsMatched` and precision/recall; without a configured punch gate they do not fail a recording. It accepts tuple landmarks `[x,y,z,visibility]` and the recorder's v1 interval/event schema. Label transitions at actual movement onset and release, rather than at a spoken instruction. Each prediction can satisfy only one label. Defence interval boundaries before the first observed camera frame or after the last are listed in `notScored`: stopping a recording closes a held key interval after its final frame, which cannot establish a physical release. Boundaries inside the observed horizon retain the strict ±150 ms comparison.

The required 200 ms lean dwell can itself produce a label mismatch if a key is pressed at the very start of physical tilt. The harness reports that failure without shifting the labels, widening the tolerance, or disguising the delay; key intervals remain the actual recorded times.

## Current evidence and limits

- Pexels 6296644: 6/11 punch labels matched, 10 predictions; recall **0.545**, precision **0.600** at ±150 ms. Its existing normalized-image gate (0.45/0.55) passes.
- Pexels 5752495: 1/21 punch labels matched, 1 prediction; recall **0.048**, precision **1.000**. This clip's existing normalized-image gate is 0/0. Most punches extend in depth. Passing that permissive gate does not establish useful punch detection.
- Two `:world` gates are explicitly **INCOMPATIBLE**, because they describe world-landmark baselines and this runtime uses normalized image landmarks. Their values are retained and reported; no world result is claimed.
- Six Pexels clips have landmarks but no labels. They are replayed for robustness and reported as unlabelled, without invented precision/recall.
- Kash's 14 standing/seated guard and lean cues are each observed within three seconds of their spoken instruction. The source explicitly says timestamps are speech, not movement onset. This is a coarse recorded-clip regression, **not proof of the ±150 ms guard/lean acceptance criterion**. New, precisely labelled raw recordings are needed for that criterion.
- Legacy Pexels punch sides are image-relative, so those scores test punch detection without side. New recordings use anatomical `left_punch`/`right_punch` labels and score side strictly.

## Classifier details

Guard engages above the calibrated midpoint and releases only below midpoint minus 0.25 (hysteresis) for `(shoulder midpoint y - lower wrist y) / shoulder width`, plus a conservative horizontal envelope: both wrists must be within 1.5 shoulder widths of the shoulder midpoint. That horizontal margin is an implementation choice to reject outstretched arms; it is not a measured calibration constant. Shoulder width is the absolute raw shoulder x gap. Visibility below 0.5, missing/non-finite landmarks, or a width below 0.04 clears held input.

Raw positive shoulder tilt maps to anatomical left; negative tilt maps to right. Lean onset requires continuous time beyond ±0.5 for 200 ms, with release at ±0.25. Wrist extension beyond 1.6 shoulder widths freezes lean changes until 300 ms after it ceases; pending dwell is discarded. Lost tracking, backwards timestamps, gaps over 250 ms and explicit reset clear temporal state.

Punches are bonus events: an arm must return below 1.2 shoulder widths before a new extension peak above 1.6 can count. Retraction by 0.1 confirms a peak; a global 200 ms refractory prevents opposite wrists producing duplicate events. The event timestamp records the observed peak, even though it is emitted only after retraction. The server stamps actual arrival time for gameplay authority. These thresholds are simple implementation choices, and the low recall above is why defence remains primary.
