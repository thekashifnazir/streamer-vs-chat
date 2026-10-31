# Queue 13w — hosted live-run recovery

31 October 2026. No reducer, engine, damage, timing, classifier, balance or
fixture changes. No deployment. Subagent review skipped as requested; Claude
checks the fresh clone and real stream.

## Pause diagnosis and fix

The countdown already creates a fresh, unpaused match at completion. Framing and
pose freshness release held inputs; they did not stop the game. The concrete
stuck path was hosted `onDisconnect`: it sent STOP directly into the reducer,
without opening the pause dialog. The HUD froze, but the compact fight controls
hide the legacy Resume button. This is now routed through the visible dialog.

Two transport paths could cause an unnecessary freeze: a planned EventSub
handoff emitted `reconnecting` while its old, healthy socket was still reading
chat; and its keepalive watchdog expired at exactly the advertised deadline,
with no allowance for scheduling/network jitter. Healthy handoffs now retain
connected status, and the watchdog allows five seconds of grace. Genuine loss
still freezes gameplay until connectivity and explicit resume are available.
There is no saved transport trace from Kash's run, so which of these fired in
that particular run is unverified, rather than claimed as measured.

Hosted pauses show a large reason (Esc, chat request, stream ended or chat loss).
Resume and a second Esc resume when safety/readiness checks pass. In webcam mode,
one second of continuous guard also resumes, only while calibrated, framed,
fresh, connected and clear-space confirmed. Invalid or missing samples reset the
hold. A refused webcam Resume explains the framing blocker on the dialog.

The mounted /play regression uses the real reducer, setup countdown and classifier
with fake camera frames and hosted transport. It verifies countdown → first tell
→ resolved attack stays unpaused, then transport loss → visible reason → Resume,
Esc and guard recovery. No camera or Twitch is used by tests.

## Bubble and callback

The bubble keeps the same srcObject across polls; a pending pose camera does not
start another bubble getUserMedia request. Existing stream ownership/late-grant
cleanup tests remain. The root document has a dark inline loading shell before
page CSS loads; callback consumption changes it to “Connecting to Twitch…” and
keeps the demo hidden until full navigation to /play. Normal demo bootstrap
removes the shell; no inline script was added.

## Checks

- `npx vitest run`: 995 tests passed across 130 files.
- `npx tsc --noEmit`: passed.
- `npm run build:demo`: passed.
- `npm run sim`: all gates passed (554.44 s); output byte-identical to 0be805d,
  3,652 bytes, SHA-256
  `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`.
- `git diff --check`: passed.
- No golden changes relative to 0be805d; shared/capture/server code untouched.

Real-camera,
Element Capture and live-channel verification remain Claude/Kash checks.
