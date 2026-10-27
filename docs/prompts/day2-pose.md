# Wed 28: pose

```
Today: the capture page and the pose classifier for SPEC.md §3 (the guard formula and thresholds are in the §3 table). Facts (MEASURED in prep): MediaPipe tasks-vision PoseLandmarker *lite* on the CPU delegate takes ~20 ms/frame and frame→event p50 is 28 ms; the *full* model missed 42% of punches. On Kash's own webcam (1280x720, 2 m back standing, plus seated) landmarks were found in 100% of frames, guard read 100% of held time, and all 12 called leans were read in the right direction (6 standing, 6 seated). Right jabs twist the shoulders and read as lean-right unless a punch gate is applied. Rule-based punch recall on unseen people was only 0.33-0.55, so guard + lean decide the round and punches are bonus damage.

Build capture/ (opens in a normal Chrome window, not an OBS Browser Source, because OBS's CEF denies camera permission):
1. getUserMedia → PoseLandmarker lite, runningMode VIDEO, numPoses 1. Use requestVideoFrameCallback timing and show fps / inference ms in a debug corner.
2. Classify on the raw (unmirrored) landmarks; mirror the <video> with CSS only (scaleX(-1)). MediaPipe's left/right are the player's own. Normalise by shoulder width S.
   - GUARD (held boolean): both wrists at or above upper chest and near the face, g = (shoulder-midpoint y − lower wrist y) / S, on above the midpoint of calibrated neutral and guard g.
   - LEAN L/R (held): tilt = (leftShoulder.y − rightShoulder.y) / S; on beyond ±0.5 held ≥ 200 ms, off at ±0.25 (hysteresis). Positive = the player's left.
   - PUNCH GATE: ignore lean changes for 300 ms after either wrist is more than 1.6 S from its shoulder.
   - left_punch / right_punch (event, bonus only): wrist-extension peak, re-arm when the wrist returns, 200 ms refractory.
3. Calibration flow: "stand in your guard" (3 s) → per-user guard thresholds; "lean left, lean right" → confirm tilt sign and magnitude; seated mode calibrates separately (its guard margin was smaller). Clear-space check: head, shoulders and both wrists in frame; in seated mode warn if S > 0.20 of frame width ("sit about 1 m further back").
4. Keyboard input (J jab, hold K guard, hold A/D lean) behind the same StreamerInput interface, equal to pose, not just a fallback.
5. Send events to the server over ws with capture timestamps. The server stays authoritative.
6. Fixture recorder: a "record" toggle on the capture page that saves `<name>.landmarks.json` (per frame: t ms + 33 landmarks) and `<name>.labels.json` (intervals `{event: guard|lean_L|lean_R, start, end}` and punch times from the keys I hold while recording: K guard, A/D lean, J punch). I'll record standing and seated clips into test/fixtures/.
7. Tests: a fixture harness that replays landmark JSON through the same classifier and compares events with the labels within ±150 ms; report precision/recall per event type (SPEC.md test 16), plus unit tests for the lean hysteresis and the punch gate on synthetic landmarks.
Use subagents for (a) classifier + fixture harness and (b) calibration UI + keyboard input. /review before committing.
```
