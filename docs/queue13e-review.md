# Queue 13e — ship docs and Nak Muay

## Part A

Pulled twitchprep main first (already current). Applied steps 1–5 of its day7-ship prompt: draft-structured README, preserved development guide, judge tour, supplied cover, short GIF, MIT licence/package metadata and tracked relative-link/heading tests. VIDEO_URL and DEVPOST_URL remain explicit placeholders.

The complete prior README is preserved in DEVELOPMENT.md, with only relative link destinations rebased and an explanatory preface. Its historical timing/count prose is deliberately unchanged; the preface links current difficulty rules.

Measured evidence:

- Current thread ID matches CODEX_THREAD_ID and session metadata: 01a17e04-f4f0-7d12-ac96-ff47bf3cc88f. Git counted 31 commits at the named pre-ship snapshot 4b20fb2; README qualifies that snapshot rather than inventing a live counter. Session rollout and git establish the source without exposing messages/credentials.
- Golden JSON contains 59 vectors. Test total is rechecked after the new documentation/preset regressions; the final README figure refers to the complete pass.
- Hard ordinary/coordinated R1/R2 results use the shared reducer, seed 2026 and 4,000 rounds/cell. Extrema rounded to the sim output’s 0.1 percentage-point precision are checked against the fresh ship sim below; difficulty is labelled so Easy's higher win rate is not conflated with the Hard gate.
- Saved 28 October load report: 1,000 chatters, p95 104 ms, worst drift 12 ms, zero missing votes. Saved soak samples recompute peak growth 6.3182%, below 20%. These are explicitly historical recorded measurements, not newly rerun load/30-minute camera tests.
- Cover copied byte-for-byte from twitchprep docs/video/graphics/devpost-cover.png. GIF uses the supplied 02-block-SIMULATED.mp4: 720×405, 3.54 seconds (53 frames at 15 fps, GIF centisecond quantization), 557,488 bytes, retaining the visible SIMULATED badge. Inspected source frames show HANDS UP! / JAB / GUARD then BLOCKED! and counter damage; this is a HUD-only simulated recording, not live-chat/webcam proof.

Judge wording is checked against the locally built HTML, handlers, HUD cue helpers and UI regression tests: Medium defaults (3.0 s / 1.0 s), exact tutorial/clear-space controls, Crowd, Forge validation/selection, webcam steps and capture Resume. Corrected draft claims about unconditional scouting cards, 0.8-second defaults, network-free installation and offline reload. The Chrome computer-use action was not approved, so no interactive Chrome tour is claimed; it remains under Needs Kash.

Independent subagent review checked preserved development prose, links, MIT metadata, snapshot counts and UI handlers. Fixed findings: explicitly label Hard balance gates, distinguish browser-owned demo/hosted state, describe Crowd changes between fights, and distinguish local test sockets from external network. Local full suite passes 537/537; TypeScript and targeted relative-link/Forge tests pass. Fresh-clone checks are recorded after completion below. No engine, classifier or balance constants changed. No deployment.

## Needs Kash

- Run the five-minute JUDGES tour interactively in Chrome, including optional physical webcam calibration. Computer-use access was unavailable for this pass.
- Replace VIDEO_URL and DEVPOST_URL when published. Deployment remains with Claude.


## Part B — Nak Muay

Added the exact requested data-only fixture and registered it fourth, immediately after Velvet Sentinel. It reuses Chat Golem art and existing announcer lines. No engine, pose classifier or balance constants changed. Tests assert the complete requested definition and the selected telegraph labels TEEP / LEFT ELBOW / RIGHT ELBOW / CLINCH KNEES, with GUARD / LEAN right / LEAN left / GUARD (TILT wording seated).

The existing sim automatically discovers every boss fixture. `validateBoss` accepts Nak Muay and `gateBoss` passes at 4,000 samples per cell, seed 2026; no tuning was needed:

| Player | 0 viewers | 3 | 50 | 500 |
|---|---:|---:|---:|---:|
| Casual | 55.650% | 59.325% | 59.675% | 60.625% |
| No-punch | 42.525% | 44.950% | 44.100% | 45.175% |

Independent subagent review compared the fixture programmatically to the exact user-supplied JSON, checked preset ordering and existing defence/cue mappings, and independently ran all four Forge tests. No findings. README lists the fourth preset and its fighting-style extension. Local full suite: 537/537, TypeScript passes. Final fresh-clone gates follow below.

## Final fresh-clone verification

Both implementation commits were cloned without hardlinks into a new temporary directory; `npm ci` used a fresh cache. Node 22.23.4; no `.env`, Twitch tokens or API keys copied. Every command exited 0:

| Command | Result | Wall time |
|---|---|---:|
| `npm ci` | clean install | 4.63 s |
| `npm test` | 537/537 tests, 79 files | 19.49 s |
| `npx tsc --noEmit` | clean | 3.41 s |
| `npm run build:demo` | offline audit passed; 25.5 MB raw / 15.4 MB gzip | 1.59 s |
| `npm run sim` | all four Hard matrices, all difficulty cells, default + four presets pass | 407.12 s |

Fresh sim reproduces the README's 0.1-point rounded Hard extrema (casual 48.5–65.6%, no-punch 35.9–53.1%) and the Nak Muay table above. No tuning or gate changes. Git now has 33 commits including this pass; README explicitly reports the reproducible pre-ship snapshot of 31. The final amendment only records verification evidence. No deployment or live Twitch traffic.
