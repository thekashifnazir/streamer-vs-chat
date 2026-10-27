# Capture, calibration and landmark regression

Run `npm run dev:mock` for the local simulated-chat stack, or `npm run dev` for authorized live chat. Open **http://localhost:5173/capture** in a normal Chrome window. Keep OBS pointed at `/overlay`; capture needs browser camera permission, and OBS CEF is not the capture host.

## Keyboard and webcam

Keyboard is selected initially and needs no camera. Confirm that your space is clear, then hold K for guard, A/D for anatomical left/right lean, and press J for a left punch bonus. Simultaneous A+D cancels lean. Repeated keydown does not create repeated punches; release and press J again. Input diagnostics show the server's received state. STOP or Esc latches server inputs off; Resume inputs explicitly rearms them. No-punch mode suppresses outgoing bonus punches for either source.

For webcam input:

1. Start camera. The local MediaPipe Pose Landmarker **lite**, CPU delegate, VIDEO mode, one pose uses `requestVideoFrameCallback`. FPS and inference milliseconds are visible in the preview corner. The richer diagnostics include normalized measurements and frame-to-input processing time; the prep measurements are not presented as new measured results.
2. Choose standing or seated, confirm clear space, and select Calibrate webcam. Keep head, shoulders and both wrists in frame. Seated shoulder width must be at most 20% of frame width; otherwise sit about 1 m further back.
3. Relax arms at your sides for three seconds, rest your hands at your waist for three seconds, then hold a comfortable face-height guard for three seconds. Guard engages at 70% of the way from the higher neutral/resting median toward the guard median, with a minimum upper-chest threshold of −0.5. Calibration requires the guard median to clear activation by at least0.05 and release to clear the higher resting median by at least0.05; overlapping samples are rejected so resting hands cannot stay latched after a guard. Then hold each comfortable lean for 1.5 seconds: calibration records each side’s peak independently, requiring tilt magnitude at least 0.30, and sets its trigger to max(0.30, 60% of that peak). Use the comfortable movement you intend during play, rather than forcing a maximum. Tracking gaps reset the current timed hold. Changing posture requires fresh calibration.
4. Select Webcam pose. The video preview alone is mirrored using CSS. Classifier inputs use raw MediaPipe coordinates and anatomical indices: positive shoulder tilt is left, negative is right.

Guard height is measured perpendicular to the shoulder line, normalized by shoulder-axis length, with both wrists inside a body-aligned 1.5-width envelope. It turns on above the calibrated guard threshold and releases below that threshold minus 0.25. The runtime also enforces the −0.5 activation floor for old low thresholds, so waist-resting hands cannot stay latched in guard. Recalibrate after this metric update; new recordings store `guardMetric: shoulder-normal-v1`. Lean engages beyond its independently calibrated L/R threshold after 200 ms, and releases at half that side’s threshold. Recordings without lean settings retain the legacy ±0.5 activation / ±0.25 release values. A wrist more than 1.6 horizontal shoulder widths from its shoulder freezes lean changes only when it is also raised (shoulder-normal height ≥−0.5). The freeze lasts until 300 ms after the last qualifying extension; relaxed hanging arms do not gate a lean. Calibration applies the same qualification. Punches are extension peaks confirmed by retraction, rearmed on return, with a 200 ms refractory. See [classifier and fixture details](../test/pose/README.md) for the implementation margins and measured limitations.

The capture source only produces `StreamerInput` messages. The server validates them, preserves capture timestamps separately from server receive times, and owns the current input state. It allows one capture writer, neutralizes input on disconnect or a one-second missing-heartbeat timeout, and ignores gameplay inputs while stopped. Missing landmarks release webcam guard/lean immediately and show “NO POSE: step back into frame” under the preview and in its debug corner. A stalled camera shows the same message and sends neutral webcam input after 500 ms. Keyboard input remains independent of camera tracking. No combat/HP logic runs in capture; the engine still arrives later.

## Record standing and seated fixtures

Complete webcam calibration first, even if Keyboard is the selected input. Enter a unique recording name, then Start recording. Use K/A/D as held ground-truth labels while making the corresponding pose, and J at a punch peak. Physical keys supply labels in either input mode. Typing in the recording-name field does not generate labels. Calibration and posture are locked during a recording so its saved threshold stays consistent.

Stop & download saves two files:

- `<name>.landmarks.json`: per-frame relative `t` in milliseconds plus `lm` tuples `[x,y,z,visibility]`, posture, guard threshold/metric, all three guard medians, and per-side lean peaks/thresholds. Replay uses those saved thresholds. Missing tracking is retained as an empty landmark array.
- `<name>.labels.json`: relative guard/lean intervals `{event,start,end}` and J punch times `{event:'left_punch',t}`. J labels anatomical left; there is no keyboard right-punch binding.

Allow both downloads in Chrome if prompted, then move the pair into `test/fixtures/`. No video is recorded or uploaded. Stopping recording closes any held label interval; boundaries outside the observed camera-frame horizon are explicitly reported as unscored.

```sh
npm test
npx tsx test/pose/report.ts
npx tsx test/pose/report.ts test/fixtures/standing.landmarks.json test/fixtures/standing.labels.json
```

The suite discovers new v1 pairs recursively. New recorder labels declare `label_source: "key"`; those pairs keep strict ±150 ms matching. A separately identified cue-labelled pair (`label_source: "cue"`, onset unverified) gates lean direction by a continuous one-second detection with no new opposite-direction detection, and retains timing percentages as diagnostics. Carry-in from a preceding back-to-back cue is reported separately. Its guard accuracy remains scored across all six steady segments. It uses the same classifier as live capture and reports per-event precision/recall at strict ±150 ms; configured punch gates are enforced when present. No allowance is silently added for the mandatory 200 ms lean dwell. Label timing must be reviewed when a lean transition misses the strict gate; the report preserves the mismatch. Punches without a configured gate are reported without demanding perfect recall.

Existing Kash labels mark spoken instructions, not movement onsets, so their coarse regression does **not** prove ±150 ms timing. New key-labelled standing/seated recordings are needed to establish that acceptance criterion. World-coordinate baseline gates are reported incompatible with this normalized-image classifier. The normalized Pexels punch gates pass, but depth-only punch recall remains poor.

## Runtime assets

`@mediapipe/tasks-vision` is pinned to 0.10.32. Its installed WASM files and the vendored lite model are served locally by Vite; capture does not fetch a CDN at startup. Model provenance and checksum are in [the model README](../capture/public/models/README.md). Browser camera frames stay local, and only input events go to the local server. The MediaPipe [official API source](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/pose_landmarker/pose_landmarker.ts) documents VIDEO inference and timestamps.

## Waist-resting hands and asymmetric leans

Recalibrate after updating. Standing and seated calibrations remain separate. The new waist-rest sample distinguishes hands resting between attacks from a raised guard; the runtime floor also protects recordings made with an old, overly low threshold. A waist height of g≈−1.3 remains off even if a saved threshold is −1.2 and guard was previously on.

Per-side calibration accommodates a weaker comfortable left lean without lowering the right threshold equally. For measured peaks L=0.57 and R=0.88, activation becomes 0.342 and 0.528, with release at 0.171 and 0.264. A 0.31 left lean would retain an already engaged lean but would not start one at 0.342. Calibrating a genuinely comfortable smaller movement can yield the 0.30 minimum; movement below that minimum is not guaranteed to trigger. These are implementation settings, not new hardware success measurements.
