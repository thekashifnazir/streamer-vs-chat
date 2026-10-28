# Day 3 verification and pre-commit review

27 October 2026. No Wrangler login or deployment was run.

## Engine and transport

Acceptance tests 1–14 and the golden adapter were written before the engine, and result-queue acceptance 15 before the queue implementation. All 50 vectors from every golden JSON file execute the real reducer/draw procedure. The server, balance sim and static demo share the same pure `step(state,event,now)` implementation. The accepted pose classifier and calibration files are unchanged.

The production server owns match state and receive-time inputs, broadcasts ticks at 10 Hz, and replaces the cumulative preview tally with per-beat latest-per-viewer votes once START MATCH is pressed. The preview accepts input before START without advancing rounds or generating unattended chat results. Viewer count is refreshed every 60 seconds. Results use the bot's user context in live mode; simulated results go only to local shim `/results`. The bounded queue sends at most one result every 10 seconds and retains the newest three pending messages. Mod/broadcaster role validation, mode separation and result routing have network-free tests.

Mock end-to-end verification passed: CLI → shim → Twurple → server → WebSocket, preview JAB 1, beat tally reset, HOOK_L telegraph, received right lean → DODGE and boss −9, moderator pause with a frozen clock and resume. The local shim subsequently recorded the two real engine round results, including the best-of-three match outcome. No live Twitch connection or scripted live chat was used.

Independent reviews found one P2 bug: disconnecting capture while paused could preserve stale defence after moderator resume. Fixed by caching received pose state during pause and restoring only fresh input on resume, otherwise neutral. Disconnect/expiry neutral updates reach the cache. Unit tests and a combined local WebSocket regression cover the reproduction. The static demo refreshes physical/fresh input immediately at resume too. Re-review cleared the fix.

## Balance gate

Seed 2026, 4,000 single rounds per cell (80,000 total), unchanged SPEC player/crowd numbers and production reducer:

| Player | 0 viewers | 3 viewers | 50 viewers | 500 viewers |
|---|---:|---:|---:|---:|
| casual | 55.6% | 55.0% | 49.9% | 48.5% |
| good | 99.2% | 98.9% | 98.5% | 98.6% |
| seated | 71.4% | 71.7% | 66.4% | 65.9% |
| nopunch | 41.1% | 42.1% | 35.9% | 36.0% |
| keyboard | 96.0% | 95.8% | 94.5% | 93.1% |

PASS: casual 30–70% and no-punch ≥30% at every crowd size. The single-round sim starts at round 1, so the round-2 scouting gate remains respected. The specified miss model is authoritative: hook mistakes are wrong-side/HIT or 30% CHIP; the lean-side bias chooses a side where either direction is valid (SUPER). All random sources are seeded and distinct from reducer draw RNG.

## Static demo and assets

`npm run build:demo` succeeds with the existing ignored token store present: neither builder nor static preview loads it or `.env`. The output contains one SIMD WASM binary and the local lite model, selected boss atlas, Anton/Barlow fonts, audio and licence/provenance notices. Runtime URLs are local. The build audit rejects credential files, extra WASM binaries, missing assets (including unquoted CSS URLs), external script/link dependencies and missing same-origin CSP. Approximate size: 25 MB raw / 15.2 MB gzip total; pose-only assets 8.4 MB gzip.

Browser smoke test: clear-space confirmation then K → A → J started the shared-engine fight immediately, with SIMULATED CHAT, a live crowd tally and SOUND OFF. Esc paused gameplay. Basic local boss sprite, rails and controls were checked visually; no camera permission or hardware pose run was performed for this pass. Optional webcam reuses the accepted classifier and full calibration settings. Audio remains opt-in; no day-6 feel effects were added.

Wrangler configuration matches the requested custom domain, workers.dev fallback and SPA assets shape, with routes above the first table header. Fields were checked against the installed Wrangler 4.154.0 schema and official documentation. The zone/account and actual workers.dev suffix remain to be verified by Kash/Claude on the Mac. Hosted-connect redirect registrations are documented separately from the current local two-account callback; the static demo needs no login.

## Validation and review

After a clean `npm ci`, all 189 tests pass on Node 22, TypeScript passes, and the final check includes the full balance sim, offline build, and diff/secret-exclusion checks. A local WebSocket reconnect regression also confirms the CLI reconnect URL stays behind the shim and injected chat keeps its registered subscription ID. Independent subagents reviewed engine/goldens/sim, server/moderation/result delivery, and demo/offline build separately from their own implementation lanes. The review also caught an audit gap for unquoted CSS asset URLs; that is fixed and tested. A final independent pass cleared the shim reconnect fix, offline audit, and packaged licences for both logical commits. `/review` is unavailable in this tool session, so these independent reviews provide the documented pre-commit review fallback. All remaining work is deployment and the user's hardware/live integration checks, not required code changes.
