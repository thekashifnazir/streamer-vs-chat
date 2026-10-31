# Queue 13r — hosted setup fixes

31 October 2026. Setup/UI only. No engine, reducer, balance, classifier, calibration arithmetic or golden-vector changes. No dependencies added; no deployment.

## Changes

1. OAuth callbacks consume and persist the validated tab token, then use full-document `location.replace('/play')`. The root demo document is never mounted for a callback. Rejected callbacks navigate to `/play?oauthError=1`, where the Connect card keeps the failure visible. Existing tab-token validation/restore remains unchanged.
2. A calibrated webcam with the camera running and clear space confirmed can start while temporarily unframed. Clicking either webcam start action activates sound in the click gesture, closes setup and shows a large stage countdown, “Get in position · 5”. After five seconds, setup waits with “Step back until both hands show ✓” until the existing framing result and fresh-frame check pass. Esc/STOP/Back to setup cancel; changing posture/input/safety cancels. The engine does not run a new fight during the countdown. Existing gameplay start checks remain authoritative.
3. Returning from calibration keeps the main pose action labelled START WEBCAM FIGHT; it enters the same countdown. Uncalibrated pose selection still opens setup.
4. Camera instructions and checklist use matching short stage text, including hold durations. Long calibration paragraphs below that instruction are hidden; calibration calculations and progress are untouched.
5. Keyboard says “No camera · quick test”; Webcam says “Recommended · your real guard and lean”. The default is unchanged.
6. OBS steps are inline, with Mac/Windows buttons. Mac names OBS 33’s separate video and application-audio sources. Windows uses Window Capture with Capture Audio. Both name the stable window title. The sound check uses START FIGHT; M is described only as mute/unmute. Explicit “Done, it's in OBS” completion is stored in this tab's sessionStorage, independently of green background. `OBS_VIDEO_URL` is empty and no video link is shown.
7. Viewer memory deliberately remains unchecked after page reload. “Turn on each session” is visible on its card and in its tooltip; the opt-in storage behaviour is unchanged.
8. Static and runtime hosted titles both read “Streamer vs Chat · Twitch play”. Static onboarding markup matches the runtime markup to retain reserved layout space.

## Validation

- `npx vitest run`: 957/957 tests across 122 files, exit 0 (28.43 s). `npx tsc --noEmit`: exit 0 (4.64 s). `npm run build:demo`: exit 0 (2.60 s), including offline build audits.
- `npm run sim`: exit 0 (565.44 s). All production/scouting/difficulty and five Forge fixture gates passed. Complete output is byte-identical to the 0be805d reference (3,652 bytes; SHA-256 `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`). No golden changes.
- Independent subagent review: one short read-only diff pass, as requested. No actionable findings. Reviewed navigation/error continuity, countdown/framing/cancellation, calibration/OBS copy, tab completion, privacy wording and stable title. No expensive checks delegated.
- Tests cover callback navigation ordering, failure visibility on the new document, stable title, calibrated-unframed start, countdown boundary/waiting/framing, Esc and settings cancellation, calibrated Back action, matching instructions, platform switching and tab-local OBS completion. Existing offline demo isolation tests remain in the full suite.

## Needs Kash

Physical webcam movement, distance readability and OBS 33 video/audio capture remain explicit Mac checks. No live Twitch, camera, or OBS playtest was performed here; all transport tests use fakes. After Claude deploys, verify login without manually reloading, calibrate then walk back during the five-second countdown, cancel with Esc, and check announcer audio on the separate Mac application-audio source.
