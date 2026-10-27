# Capture, calibration and landmark regression

Run `npm run dev:mock` for the local simulated-chat stack, or `npm run dev` for authorized live chat. Open **http://localhost:5173/capture** in a normal Chrome window. Keep OBS pointed at `/overlay`; capture needs browser camera permission, and OBS CEF is not the capture host.

## Keyboard and webcam

Keyboard is selected initially and needs no camera. Confirm that your space is clear, then hold K for guard, A/D for anatomical left/right lean, and press J for a left punch bonus. Simultaneous A+D cancels lean. Repeated keydown does not create repeated punches; release and press J again. Input diagnostics show the server's received state. STOP or Esc latches server inputs off; Resume inputs explicitly rearms them. No-punch mode suppresses outgoing bonus punches for either source.

For webcam input:

1. Start camera. The local MediaPipe Pose Landmarker **lite**, CPU delegate, VIDEO mode, one pose uses `requestVideoFrameCallback`. FPS and inference milliseconds are visible in the preview corner. The richer diagnostics include normalized measurements and frame-to-input processing time; the prep measurements are not presented as new measured results.
2. Choose standing or seated, confirm clear space, and select Calibrate webcam. Keep head, shoulders and both wrists in frame. Seated shoulder width must be at most 20% of frame width; otherwise sit about 1 m further back.
3. Relax hands for three seconds, hold a comfortable guard for three seconds, then lean left and right for at least 200 ms each with hands near your shoulders. The neutral and guard medians determine the threshold midpoint. Tracking gaps reset the current timed hold. Changing posture requires fresh calibration.
4. Select Webcam pose. The video preview alone is mirrored using CSS. Classifier inputs use raw MediaPipe coordinates and anatomical indices: positive shoulder tilt is left, negative is right.

Guard turns on above the calibrated g midpoint and stays on until g falls below midpoint minus 0.25, with both wrists within a conservative 1.5S horizontal envelope around the shoulder midpoint to reject wide arms. Lean engages beyond ±0.5 after 200 ms and releases at ±0.25. A wrist more than 1.6S from its shoulder freezes lean changes until 300 ms after the last extension. Punches are extension peaks confirmed by retraction, rearmed on return, with a 200 ms refractory. See [classifier and fixture details](../test/pose/README.md) for the implementation margins and measured limitations.

The capture source only produces `StreamerInput` messages. The server validates them, preserves capture timestamps separately from server receive times, and owns the current input state. It allows one capture writer, neutralizes input on disconnect or a one-second missing-heartbeat timeout, and ignores gameplay inputs while stopped. Missing landmarks release webcam guard/lean immediately and show “NO POSE: step back into frame” under the preview and in its debug corner. A stalled camera shows the same message and sends neutral webcam input after 500 ms. Keyboard input remains independent of camera tracking. No combat/HP logic runs in capture; the engine still arrives later.

## Record standing and seated fixtures

Complete webcam calibration first, even if Keyboard is the selected input. Enter a unique recording name, then Start recording. Use K/A/D as held ground-truth labels while making the corresponding pose, and J at a punch peak. Physical keys supply labels in either input mode. Typing in the recording-name field does not generate labels. Calibration and posture are locked during a recording so its saved threshold stays consistent.

Stop & download saves two files:

- `<name>.landmarks.json`: per-frame relative `t` in milliseconds plus `lm` tuples `[x,y,z,visibility]`, posture, and guard threshold. Missing tracking is retained as an empty landmark array.
- `<name>.labels.json`: relative guard/lean intervals `{event,start,end}` and J punch times `{event:'left_punch',t}`. J labels anatomical left; there is no keyboard right-punch binding.

Allow both downloads in Chrome if prompted, then move the pair into `test/fixtures/`. No video is recorded or uploaded. Stopping recording closes any held label interval; boundaries outside the observed camera-frame horizon are explicitly reported as unscored.

```sh
npm test
npx tsx test/pose/report.ts
npx tsx test/pose/report.ts test/fixtures/standing.landmarks.json test/fixtures/standing.labels.json
```

The suite discovers new v1 pairs recursively. It uses the same classifier as live capture and reports per-event precision/recall at strict ±150 ms; configured punch gates are enforced when present. No allowance is silently added for the mandatory 200 ms lean dwell. Label timing must be reviewed when a lean transition misses the strict gate; the report preserves the mismatch. Punches without a configured gate are reported without demanding perfect recall.

Existing Kash labels mark spoken instructions, not movement onsets, so their coarse regression does **not** prove ±150 ms timing. New key-labelled standing/seated recordings are needed to establish that acceptance criterion. World-coordinate baseline gates are reported incompatible with this normalized-image classifier. The normalized Pexels punch gates pass, but depth-only punch recall remains poor.

## Runtime assets

`@mediapipe/tasks-vision` is pinned to 0.10.32. Its installed WASM files and the vendored lite model are served locally by Vite; capture does not fetch a CDN at startup. Model provenance and checksum are in [the model README](../capture/public/models/README.md). Browser camera frames stay local, and only input events go to the local server. The MediaPipe [official API source](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/pose_landmarker/pose_landmarker.ts) documents VIDEO inference and timestamps.
