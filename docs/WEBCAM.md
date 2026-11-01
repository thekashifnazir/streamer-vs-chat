# What the webcam can and can't see

**Principle:** anyone should be able to play with what they already have. One ordinary webcam in Chrome is enough. A keyboard is enough too.

Numbers are marked **MEASURED** (from a recorded clip, a test or a replay) or **INFERRED** (a judgement, not measured). Short version in the [README](../README.md#what-the-webcam-can-and-cant-see).

## What it uses

- **One ordinary webcam in Chrome.** The capture code asks for one 1280×720 user-facing camera with no audio ([camera.ts](../capture/src/camera.ts)).
- **Pose runs in the browser.** MediaPipe Pose Landmarker **lite**, one person, CPU by default ([camera.ts](../capture/src/camera.ts); the demo and `/play` call `camera.start()` with no delegate, so CPU, in [main.ts](../demo/src/main.ts)). The model and WebAssembly files are served by the site itself (`/assets/pose/…`), not fetched from a CDN.
- **Video frames are not uploaded for pose.** Each frame goes only to `detectForVideo` in the page; the game uses the landmarks it returns. Checked in the code (1 November, at `ee1a6e2`):
  - the page's Content Security Policy allows connections only to the site itself, Twitch (sign-in, Helix, EventSub, and on `/play` the WHIP ingest) and ElevenLabs. ElevenLabs is there only for the voice corner coach, which is switched off for the submission and would send microphone audio, never video ([COACH.md](COACH.md)) ([demo/index.html](../demo/index.html), [demo/play/index.html](../demo/play/index.html));
  - the only code that sends video anywhere is **Go live** ([go-live.ts](../demo/src/go-live.ts)), which streams the tab to Twitch when the streamer chooses to go live;
  - the local `/capture` page sends pose **events** (guard, lean, punch) to the local server over a WebSocket, not frames; its optional replay recorder keeps clips in the page ([replay.ts](../capture/src/replay.ts)).
- **Nothing else.** No gloves, wrist trackers, heart-rate straps, VR headset, Kinect or depth camera.
- **No camera, or no punching, is fine.** Keyboard (K guard, A/D lean, J punch), seated mode (separate calibration, TILT cues) and no-punch mode (automatic defence counters keep their damage) are start-screen choices.

## What it reads reliably

| Input | How | Evidence |
|---|---|---|
| **Guard** | Lower wrist height relative to the shoulders, against the player's own calibrated neutral and guard; both wrists above their elbows and mid-torso; hysteresis so it holds through leans | **MEASURED** on Kash's webcam (prep spike, 27 Oct): guard read in 100% of held frames standing and seated, 0% of neutral frames, and 100% while leaning. Logitech recording: 100% guard-state accuracy across six steady segments ([recorded-clip tests](../test/pose/replay.test.ts), [fixture notes](../test/fixtures/kash-guard-through-leans-logitech.README.md)) |
| **Lean left / right** | Shoulder tilt beyond **48%** of each side's calibrated peak, held **170 ms**, releasing at half; ignored for 300 ms while a raised wrist is extended (a punch twist is not a lean) | **MEASURED** by replaying Kash's recorded calibration clip (31 Oct): shallow leans 3/6 → **6/6**, fight-speed leans **16/16**, **0** false leans while relaxed or guarding, no lean from their recorded jabs ([shallow-lean test](../test/pose/shallow-lean.test.ts), [deep-lean gate test](../test/pose/deep-lean-gate.test.ts)). Prep spike: 12/12 lean cues |
| **Straight punches, which hand** | One wrist moves at least 0.7 recent shoulder lengths away from where it rested, in the torso's own frame, with the forearm's shortening in 2D (a fist driven at the camera) added to that movement; then a retraction. Side is the player's own hand ([straight-punch.ts](../capture/src/straight-punch.ts)) | **MEASURED** on Kash's recorded webcam footage (1 November): **42 of 44** punches caught, **4** false punches over guard, lean and slip footage. The old rule (arm longer than 1.6 shoulder widths) caught 13 with 30 false ([straight-punch test](../test/pose/straight-punch.test.ts)). Crowd Trainer's own detector: 40 of 44, at most 9 false. The optional punch setup step can only lower the threshold |

Rules: [SPEC §3](../SPEC.md#3-inputs-pose-and-keyboard-are-equal). Classifier details: [test/pose/README.md](../test/pose/README.md).

## What it can't read reliably, and why

- **Punch type.** A jab, a hook and an uppercut can end at a similar place in a 2D picture. A front camera can't see depth, so it can't tell how the fist travelled toward it.
- **Punch force and speed.** Landmarks give position, not force. Speed from frame-to-frame movement is noisy at webcam frame rates (INFERRED); it is not used.
- **Punches on people it hasn't seen.** Recall was **0.33–0.55** on unseen people in the prep pose spikes (**MEASURED**). The in-repo replay ([test/pose/README.md](../test/pose/README.md#current-evidence-and-limits)), at `ee1a6e2`: **17/21** on a Pexels clip where most punches extend toward the camera (recall 0.81, precision 0.49), but only **2/11** on a side-on clip of hooks and rapid combos (recall 0.18).
- **Footwork, kicks and legs.** A desk webcam usually frames the waist up; legs are out of frame.
- **Low light.** Tracking gets less certain; lost tracking releases held inputs rather than guessing.
- **People outside the frame.** It tracks one person (`numPoses: 1`), and only while head, shoulders and both wrists are in frame.
- **Lean speed.** A webcam lean takes about 0.4 s to register, so webcam players start on Easy (1.2 s warning).

**What follows from this.** Guard and lean decide every hit in Boss Fight; punches are bonus damage, and no-punch mode stays viable (balance gate: no-punch wins at least 30%). Crowd Trainer scores leniently: partial combos count, there is an "any hand counts" option, and it reads only which hand, slip (lean) and guard. It never scores punch type, force or speed.

## What's next with better hardware or more data

A roadmap, not a claim. None of this is built.

- **Punch speed → damage**, if a higher frame-rate camera makes speed measurable.
- **Head vs body** shots, from wrist height at the punch peak.
- **Duck**, from head height against calibration.
- **Real punch types** (jab, hook, uppercut), only after collecting and labelling clips of many people.
