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

Guard uses the lower wrist height perpendicular to the shoulder axis, normalized by shoulder-axis length (`shoulder-normal-v1`). It engages above the calibrated threshold (with a −0.5 activation floor) and releases below threshold minus a measured band of25% of (guard median−relaxed neutral median), with a body-aligned 1.5-width wrist envelope plus the raw anatomical gate: each wrist above its own elbow and above mid-torso. Missing/non-finite anatomy clears guard; finite inferred hips outside the frame remain usable for seated capture. Recalibrate after this metric update. That horizontal margin is an implementation choice to reject outstretched arms; it is not a measured calibration constant. Shoulder width is the absolute raw shoulder x gap. Shoulder/wrist visibility below0.5, missing/non-finite shoulder/wrist landmarks, or a width below0.04 clears held input. Anatomy checks are separate, so lost elbow/hip geometry releases guard without blocking a shoulder lean.

Raw positive shoulder tilt maps to anatomical left; negative tilt maps to right. Lean onset requires 200 ms continuously beyond that side’s saved calibration threshold, with release at half the threshold. Files without side settings default to0.5 on /0.25 off. New calibration measures neutral/resting/guard medians and sets guard70% toward guard from the higher resting baseline; it measures comfortable L/R peaks independently and sets max(0.3,1.5×p95 absolute neutral tilt,60% of each peak). The continuous neutral-phase p95, release band and side settings are saved and reused by replay. Old files with medians derive the band; only files lacking both band and medians use the legacy0.25. All settings are saved with the landmarks. Wrist extension beyond 1.6 horizontal shoulder widths freezes lean changes only when that wrist is raised (body-relative height ≥−0.5); the freeze lasts 300 ms after the last qualifying extension. Hanging arms do not gate a lean; pending dwell is discarded. Lost tracking, backwards timestamps, gaps over 250 ms and explicit reset clear temporal state.

Punches are bonus events: an arm must return below 1.2 shoulder widths before a new extension peak above 1.6 can count. Retraction by 0.1 confirms a peak; a global 200 ms refractory prevents opposite wrists producing duplicate events. The event timestamp records the observed peak, even though it is emitted only after retraction. The server stamps actual arrival time for gameplay authority. These thresholds are simple implementation choices, and the low recall above is why defence remains primary.

## Logitech guard-through-leans regression

The raw landmark recording is copied byte-for-byte into `test/fixtures/`. The **corrected** label intervals are preserved, with `label_source: "cue"` and `onset_verified: false` added after Kash confirmed they came from scripted cue times rather than key presses. No movement boundaries are inferred from classifier output.

Cue lean intervals require at least **one continuous second** detected in the labelled direction and no **new opposite-direction detection** in that interval. Because cues can run back-to-back, a lean carried in from the preceding cue is reported separately and is not treated as a new wrong-direction detection. Missing/invalid samples or gaps above 250 ms break the continuous run. Timing percentages and strict 150 ms scores remain visible diagnostics; they do not fail cue-labelled lean acceptance.

`pose-regressions.json` selects the corrected filename and retains guard state ≥90% on all six steady segments, trimming 500 ms from each end. The Logitech pair passes cue-direction acceptance and has 100% guard-state accuracy across those segments. Key-labelled pairs (including older recorder files whose missing source field uses the original key-recording convention) retain strict ±150 ms matching, even when a steady-state profile is present. New recorder downloads explicitly mark `label_source: "key"`.

See [fixture provenance and results](../fixtures/kash-guard-through-leans-logitech.README.md). Run `npx tsx test/pose/report.ts` for all metrics or pass the two fixture paths for the detailed pair report.

## Adaptive calibration regressions

Unit regressions explicitly cover a previously held guard with old threshold−1.2 dropping to g−1.3 (must release and remain off), noisy waist heights−1.46…−1.09 during both leans, and comfortable asymmetric L/R motion with per-side thresholds. The recorded fixture suite still gates existing guard-through-lean and cue-direction behaviour. A recorder/replay round trip verifies side thresholds are copied at record start and reused by replay, and that omitting them restores the older default rather than estimating calibration from scored labels. Fresh hardware calibration/testing is needed to measure current-user frame percentages; synthetic≥80% tests are not described as new Mac measurements.
