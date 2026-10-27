# Day 2 verification and pre-commit review

27 October 2026

- Implemented local lite CPU camera inference, raw-landmark classification, separate standing/seated calibration, equal keyboard input, safety stop/resume, and downloadable key-labelled fixtures. The server validates events, preserves capture time separately, and stamps authoritative receive times.
- Independent implementation lanes handled classifier/replay and calibration/keyboard. /review is unavailable in this tool session; an independent subagent inspected the final Day 2 diff and reran checks before commit.
- Review found unhandled WebSocket client errors and recording before calibration. Both were fixed: oversized frames are contained to a client and release ownership; recording requires completed calibration and locks its posture/threshold. An actual local WebSocket regression exercises malformed payload recovery.
- Final validation: 55 tests pass on Node 22, TypeScript passes, and git diff --check passes. Camera tests verify lite/CPU/VIDEO/one-pose settings, video-frame callback processing, resource cleanup and late-permission cancellation without using a real camera. Local WASM/model requests return 200.
- Browser UI verification against the mock stack: keyboard J produced a server-confirmed bonus punch; Esc produced SERVER STOPPED with neutral held inputs. The preview/UI fit was checked visually. Hardware camera permission, live inference FPS and new real-person movement timing are not claimed as tested here.
- Recorded regression: normalized Pexels 6296644 punch recall 0.545 / precision 0.600 at 150 ms passes its 0.45/0.55 gate. Depth-only 5752495 remains recall 0.048 / precision 1.000; its permissive normalized gate is 0/0. World baselines are explicitly incompatible, not claimed as passing. Kash's 14 spoken guard/lean cues pass a coarse three-second diagnostic, not the 150 ms movement-onset gate.
- New v1 fixture pairs under test/fixtures are discovered automatically. Precise standing/seated key-labelled recordings remain necessary for real-person timing acceptance. The strict report does not hide the mandatory 200 ms lean dwell or silently widen its 150 ms matching window.
- No real Twitch requests or camera access occur in the test suite. No scripted chat is sent to a live channel. Tokens and environment files remain ignored.

## Mac verification and guard stability follow-up

Kash verified 5cd540f with a real Logitech webcam while OBS also held it: 24–48 capture FPS, 12–14 ms inference, OBS at 60 FPS with zero skipped frames, successful standing calibration and correct guard/left/right lean readings. The remaining issue was guard noise around threshold −0.44 during a lean.

Guard now engages above its calibrated midpoint and releases only below midpoint minus 0.25. Tracking loss, a camera gap, recalibration or wrists leaving the guard envelope still clears held state immediately. Regressions cover the reported g sequence and an unchanged ten-second segment of Kash's existing raw webcam fixture (29–39 s). The recorded regression uses an explicitly chosen 0.30 stress threshold and confirms one server guard edge while g crosses that midpoint; it does not claim a new hardware recording or measured calibration.

Missing landmarks display “NO POSE: step back into frame” under the camera, in the debug corner and in detailed diagnostics, with immediate neutral webcam input. Missing callbacks for 500 ms show the same warning in either input mode; keyboard controls remain independent.

Final follow-up validation: 59 tests, TypeScript and diff checks pass. Independent pre-commit review found that the stalled-camera warning initially only ran in pose mode; it was moved outside the source branch and re-reviewed with no remaining findings. /review remains unavailable, so this documents the independent review fallback. No hardware camera or live Twitch was used for these automated regressions.
