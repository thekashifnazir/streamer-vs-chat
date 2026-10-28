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

## Logitech shoulder-alignment follow-up — initial acceptance investigation

The newly supplied Logitech landmarks and corrected labels were copied byte-for-byte into test/fixtures. Guard now uses the shoulder-normal metric shared with calibration, and the lean punch gate requires a raised extension rather than hanging arms. New recording metadata identifies the guard metric; fresh calibration is required.

Current replay gives 100% correct guard state in every steady lean segment (held guard and relaxed/no guard). Existing regressions and normalized punch gates still pass. The unchanged requested steady lean gate remains red for three segments: 79.87%, 38.33%, 65.55% against ≥80%, after trimming 500 ms. Raw ±0.5 tilt crossings occur later than the scheduled labels, particularly 52.081 s versus the no-guard L label at 49.334 s and 56.010 s versus R at 54.339 s. Those crossings do not independently establish physical movement onset. Label timing confirmation was requested; no labels, trims, accuracy thresholds or lean dwell rules were changed to hide the failure.

Validation is 66 passing tests and one failing new acceptance test; TypeScript and diff checks pass. Independent review found no new code defect and explicitly recommended retaining the failing gate pending independent timing confirmation. Work remains uncommitted while that acceptance issue is unresolved; this follow-up is not marked complete.

### Resolved cue-label acceptance and final pre-commit review

Kash confirmed that this Logitech pair used scripted on-screen cues, not key presses: reaction delay was 1.7–2.7 s on the no-guard leans, and L/R cues were back-to-back. The corrected intervals/events remain unchanged; labels now declare `label_source: "cue"` and `onset_verified: false`. Raw landmarks remain byte-identical. No motion boundaries were derived from classifier output and no classifier thresholds were tuned to cue times.

Cue acceptance now requires at least one continuous second in the requested direction with no new opposite-direction detections within the interval. All six cues pass, with runs of 4.47/4.75/4.75/4.49/2.03/3.10 s. The final R cue carries approximately 0.81 s of the preceding L state; that carry-in is explicitly reported and is not counted as a new wrong-direction detection. Timing percentages and strict scores remain visible diagnostics. Guard remains scored on all six trimmed steady segments, with 100% correct state in each.

New recorder labels explicitly declare `label_source: "key"`; key-labelled pairs retain strict ±150 ms acceptance even if a steady-state profile is present. Regression tests cover late cue reactions, insufficient/fragmented runs, wrong-direction detections, carry-in, and key-source timing enforcement. Final validation is **75/75 tests passing on Node 22**, TypeScript and diff checks passing, and the full fixture report exiting successfully. Independent pre-commit review found no remaining code issues. This resolves the earlier acceptance-pending note; the shoulder-aligned guard and raised-only punch gate are ready for commit and push.

## Resting-hand guard and asymmetric comfortable leans

Kash's live re-check confirmed guard-through-leans stability but found an overly low guard threshold (−1.20) admitting waist-resting hands, plus weaker left lean amplitude. Calibration now samples neutral, waist rest and face-height guard for three seconds each. Guard activation is 70% from the higher resting median toward guard, clamped to an upper-chest floor of −0.5; runtime applies that floor to legacy thresholds too. Guard releases 0.25 below activation. Calibration rejects overlap unless the guard median clears activation and release clears the higher resting median by at least 0.05 each.

Each comfortable lean is measured for 1.5 seconds past signed magnitude 0.30. The actual per-side peak is stored; activation is max(0.30, 60% of that peak), release is half activation, and runtime still requires 200 ms dwell. Completed calibration feeds the classifier once and snapshots medians, peaks and thresholds into recordings. Replay uses those saved side settings, with 0.5 defaults only for older files.

Validation: 85 tests pass on Node 22; TypeScript, full fixture report and diff checks pass. Regressions cover g −1.3 with old threshold −1.2 even after guard was latched, waist-height noise through both leans, asymmetric thresholds, comfortable weak-L/strong-R accuracy ≥80% on synthetic landmarks, independent seated resets, and a recorder/replay round trip. Existing guard-through-lean and cue-labelled fixture acceptance stays passing. No new hardware accuracy percentage is claimed.

Independent pre-commit review caught a close-median edge case (neutral −1.6, resting −0.6, guard −0.3) whose release threshold would retain guard at rest. The added release-clearance check rejects that case; the reviewer rechecked code and all 85 tests with no remaining actionable findings. Fresh hardware calibration is required; a small movement below its calibrated trigger is not guaranteed to initiate a lean merely because it retains an already-held one. No camera or live Twitch access was used by the tests/review.

## Relative guard band, anatomy and neutral-sway floor

Guard release now uses 25% of the measured face-guard minus relaxed-neutral median spread. Calibration checks release clearance against resting hands with that measured band. The classifier receives and recordings save the band; replay uses the saved band or derives it from saved medians. The old 0.25 is retained only as a compatibility fallback for recordings without either source of spread data.

Guard additionally requires each raw, unmirrored wrist above its own elbow and above mid-torso, halfway between mean shoulders and mean hips. Missing/non-finite anatomy releases guard immediately, while shoulder lean remains available. Finite inferred hips may be outside the image or have low visibility in seated/waist-up captures; they are used for the raw geometric gate without adding a new in-frame-hips requirement. Synthetic test skeletons now include meaningful elbows/hips; recorded landmark data and labels were not altered.

The continuous relaxed phase records nearest-rank p95 of absolute raw shoulder tilt. Both side floors become max(0.3, 1.5×that p95); final side triggers remain the greater of that floor and 60% of the comfortable side peak. Interrupted neutral holds and posture resets discard stale sway samples. Runtime also enforces the saved sway floor, and recordings/replay preserve the measured sway, band and side thresholds. Diagnostics display the effective guard release, lean floor and anatomical readiness.

Final validation: 93/93 tests pass on Node 22, TypeScript passes, full fixture report exits successfully, and diff checks pass. New regressions exercise wide/narrow calibration bands, each anatomical condition independently, missing anatomy with preserved lean, standing-still excursions below the sway floor, sway percentile/outlier/reset handling, and saved calibration replay. The independent pre-commit review found no remaining actionable issues. Fresh hardware calibration is required; no new hardware accuracy measurements are claimed.
