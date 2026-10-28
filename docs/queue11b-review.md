# Queue 11b: hardening review

Scope: local Twitch CLI mock, injected simulated chat, fake transports and recorded landmarks only. No live Twitch traffic, scripted live chat, login or deployment was used. Measurements below are filled from completed runs; an interrupted earlier soak is not evidence.

## Choices and recovery

The local server continues its authoritative clock through EventSub transport loss. Already accepted votes and a pending telegraph remain valid; subsequent empty voting windows use SPEC autopilot. The overlay shows RECONNECTING until the chat subscription is active again. Twurple's installed persistent connection supplies reconnect/backoff; we do not add a competing retry loop. Tests exercise its immediate reconnect and Fibonacci retry delays with a fake network socket.

A new overlay WebSocket receives the current authoritative state immediately. A real ephemeral WebSocket test compares round, HP, clock and tally on reconnect; a DOM test exercises the view's replacement and retry handling. Browser-to-server retries back off independently from one to thirty seconds.

Capture offers explicit Save/Forget calibration controls. Only validated calibration numbers, posture and model/classifier versions are stored locally; frames, recordings and credentials are excluded. Standing and seated profiles are separate. Restore never opens the camera or resumes inputs automatically: the page reconnects stopped, then requires clear space, a fresh framed pose, an open server socket and explicit Resume. This interprets “without recalibration” as restoring accepted thresholds while retaining the existing safety checks. Corrupt or incompatible profiles require calibration again. Classifier formulas are unchanged; a recorded fixture proves restored thresholds produce identical events.

Completed matches are compacted into session aggregates instead of retaining full game states. Counts, weighted reaction totals, exact damage credit/MVP and top clips retain their prior meaning. A 100-match reference test checks equivalence. Identity credit remains proportional to distinct session participants because exact MVP attribution requires it; the zero-chatter soak measures retained match state, not a bound on unlimited unique viewers.

## Fresh-clone teardown diagnosis

Reproduced the reported failure with Node 22, a fresh clone under `/private/tmp`, a cold npm cache and `npm ci`: all ten route tests passed, then the suite hit the 10-second afterAll timeout. A close-phase probe showed HTTP closed and the dependency optimizer closed, while Vite's client plugin container was still waiting on one pending client pretransform.

The route-only test now disables dependency discovery and client pretransform, which it never uses, and creates an empty temporary Vite cache on every run. HTTP sockets close explicitly. Named bounded teardown helpers allow 200 ms for HTTP and 750 ms for Vite; a regression test verifies the labelled timeout rather than waiting for Vitest's generic hook timeout. Runtime Vite configuration is unchanged.

## Measurement design

`load` and `soak` require explicit mock/hardening flags, reject occupied service ports and start an isolated CLI → shim → server chain. Child environments use a small platform allowlist, a temporary CLI configuration/cache, dummy local identity and no dotenv/token loading. Diagnostic endpoints are available only with both mock and hardening enabled and bind to loopback. Normal live mode cannot expose them. Both runners clean up children and temporary data.

Latency measures server vote-ingest timestamp to receipt of the corresponding HUD WebSocket update, not browser paint. Vote receipts are audited against unique injected message IDs, authoritative tally snapshots and an independent latest-per-viewer map. Beat drift compares actual observation with nominal 2,400 ms beat deadlines. Load results and precise traffic semantics are in [LOAD.md](LOAD.md).

The soak uses real wall time and real server GC heap measurements after a 60-second warm-up, sampling every 15 seconds. It gates peak post-warm-up growth below 20%, zero unhandled errors, valid best-of-three results for every started match, and a local-shim result-message count equal to completed rounds. Existing session tests cover one result per actual round; queue tests cover spacing and bounded backlog. It drains the final started match before judging results. CI installs a checksum-pinned official Twitch CLI and runs the two-minute variant; this does not replace the local 30-minute run.

## Review and verification

The `/review` command is unavailable in this session, so independent agent review covered server recovery/archives, capture persistence, test teardown and CI, and the benchmark gates. Findings fixed before commit included offline Resume arming inputs and a stale capture reconnect callback. Final commands and measured reports are recorded after completion below.

## Needs Kash

- Confirm the reconnect badge and authoritative recovery visually in an actual OBS Browser Source on the Mac; automated tests use browser DOM fakes and local WebSockets.
- Confirm explicit saved standing/seated calibration restore with the physical webcam. Automated checks use the accepted recorded Logitech fixture; no new camera measurements are claimed.
- No deployment was performed. Claude owns deployment.

## Balance results

Seed 2026, 4,000 rounds per cell; columns are 0 / 3 / 50 / 500 viewers. No reducer, damage, player-model or balance-gate changes were made for hardening. Percentages:

| Profile | Ordinary R1 | Ordinary R2 | Coordinated R1 | Coordinated R2 |
| --- | --- | --- | --- | --- |
| casual | 55.6 / 55.0 / 49.9 / 48.5 | 56.7 / 62.5 / 49.3 / 50.2 | 55.6 / 55.0 / 55.2 / 54.4 | 56.7 / 62.5 / 65.6 / 65.5 |
| good | 99.2 / 98.9 / 98.5 / 98.6 | 99.5 / 99.0 / 98.6 / 98.6 | 99.2 / 98.9 / 98.9 / 99.1 | 99.5 / 99.0 / 99.2 / 99.1 |
| seated | 71.4 / 71.7 / 66.4 / 65.9 | 70.2 / 75.9 / 66.4 / 66.5 | 71.4 / 71.7 / 72.2 / 71.8 | 70.2 / 75.9 / 78.8 / 79.6 |
| no-punch | 41.1 / 42.1 / 35.9 / 36.0 | 41.4 / 48.6 / 37.6 / 37.0 | 41.1 / 42.1 / 39.4 / 41.9 | 41.4 / 48.6 / 52.3 / 53.1 |
| keyboard | 96.0 / 95.8 / 94.5 / 93.1 | 95.8 / 95.5 / 94.0 / 93.3 | 96.0 / 95.8 / 96.0 / 96.2 | 95.8 / 95.5 / 97.5 / 97.2 |

All four matrices meet casual 30–70% and no-punch ≥30%. Ordinary R2 produced 1,304 cards, 1,309 exploits, 335 fixes and 23,465 braces; coordinated R2 produced 787 cards, 748 exploits, 197 fixes and 73,805 braces.

## Completed local measurements

Mac arm64, Node 22.23.4, Twitch CLI 1.1.24. Mock only.

- **30-minute soak PASS:** started 2026-10-28 02:02:32.180 UTC; 30.4908 minutes including final-match drain. All 33 started matches completed validly; 66 rounds and 66 result messages; zero invalid matches and zero driver/server unhandled errors. Baseline GC heap 20,506,840 bytes; final 21,766,600; peak growth **6.3182%**, final growth 6.1431%, below 20%. 118 post-warm-up samples. [Raw counts and heap samples](hardening/soak-30m.json).

- **Two-minute CI variant PASS locally:** started 02:33:04.612 UTC, 2.0779 minutes including drain; 2/2 valid matches, 4 rounds/results, zero errors, peak/final heap growth 1.6488%. [Report](hardening/soak-2m.json).
- **Load PASS:** 1,000 simulated chatters for 30 seconds; 13,119 injected = accepted = audited votes, zero failures/missing/ignored/terminal events, 285 HUD snapshots, 12 beats; p50/p95/p99 61/104/107 ms; maximum drift 12 ms; exact latest-per-viewer/tally/weight agreement. [Report](hardening/load.json).
- The initial unbounded driver failed with 211 missing HTTP requests; a diagnostic reproduced 210 connection resets among 211 failures. A reviewed/tested FIFO queue caps HTTP concurrency at 32 while retaining all scheduled votes; no retries, thresholds or game rules changed. [Failed run](hardening/load-initial-failed.json), [diagnostic](hardening/load-unbounded-diagnostic.json). File-descriptor exhaustion was an early hypothesis, not an established cause.

- **Actual CLI recovery PASS:** terminated/restarted only the isolated CLI while shim/server stayed up. RECONNECTING was observed, a fresh overlay snapshot arrived in 19.8 ms, the pending attack resolved normally, a previously accepted next-beat vote survived, and a new injected vote arrived after subscription recovery. Zero unhandled errors. [Report](hardening/recovery.json). Reproduce with `npm run test:recovery`.
- **Final static checks:** Node 22 full Vitest suite, TypeScript, cold-clone route teardown, all four SPEC §5 balance matrices and offline demo build pass. Independent review covered server/archives, capture restore, overlay reconnects, benchmark conservation, report arithmetic and CI. The CLI archive SHA-256 and its enclosing directory were checked against the downloaded official release before configuring CI extraction.
