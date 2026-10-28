# Day 5: judges, highlights and accessibility

Primary demo: https://streamervschat.kashifnazir.com · fallback: https://streamer-vs-chat.kash-553.workers.dev

The URLs are supplied by Kash/Claude. This change prepares the static build; it does not deploy it. The browser tool could not fetch either hosted URL, so this review makes no new availability claim.

## Behaviour

- KO, PERFECT and comeback candidates come from authoritative reducer transitions. A comeback is a streamer win after reaching strictly below30 HP that round. Simultaneous candidates share one clip request, preferring KO, comeback, PERFECT. Highlight IDs include server-session and match identity.
- Live clipping uses the broadcaster's `clips:edit` context. Get Streams supplies stream age: no Create Clip in its first60 seconds. Get Clips must return the matching ID and URL within15 seconds; Create acceptance alone is not confirmation. Offline/create failure gives a stats-only card. Timeout requests the capture browser's local replay, otherwise stats-only. Mock mode performs no clip HTTP calls.
- The clip queue is bounded to three pending requests, including active work. Creation is spaced30 seconds apart; queued moments that are too old use their saved local replay rather than falsely label later footage. Confirmed IDs and metadata are atomically stored in owner-only, gitignored `highlights.json`. This file records the current server session; it is not a cross-restart media library.
- Opt-in MediaRecorder replay stores camera-only segments locally. Capture snapshots each moment before Twitch polling begins. Only a boolean availability acknowledgement goes to the server; media and blob URLs stay local. Downloads are manual. Retention is six clips /32 MB; segments rotate every90 seconds. A moment immediately after rotation may have a short lead-in. Closing the page clears downloads. Unsupported/failed recording falls back to stats.
- End session / show card freezes the engine and shows session totals, the top three confirmed clips and Chat MVP. Match completion also shows the card. Actual HP loss is logged at each hit, including partial COMBO damage before veto/KO. Credit splits equally among the counted voters for the selected move; autopilot earns none. Ties use stable user-ID order. Names render as text. Clip links allow only Twitch HTTPS clip URLs.
- Standing/seated and no-punch are start-screen choices. Seated calibration stays separate; the HUD uses TILT cues and300px rails fading at their inner edge. No-punch disables detection, outgoing bonus input and punch prompts; automatic defence counter damage is unchanged. Guard/lean classifier mathematics are unchanged, verified against the accepted Logitech recording.
- Historical attribution remains server-side. Routine WS updates run at10 Hz; safety/control actions flush immediately. Summaries are cached against authoritative evidence. The server retains full attribution for session stats and MVP.

## Verification

-282 unit, golden-vector, pose-fixture, transport, replay and accessibility tests pass on Node22; TypeScript passes; offline static build and runtime-asset audit pass (25.1 MB raw /15.1 MB gzip).
- SPEC15a tests:20-second stream skips creation; accepted clip absent for15 seconds requests replay; matching clip appearing at7.3 seconds confirms; wrong ID never confirms. Replay encoder errors, consent withdrawal and bounded URL retention are covered.
- Full mock-stack WS check passed: injected JAB1 SIMULATED, seated/no-punch preferences, automatic guard counter, projected telemetry, frozen session card, and both trailing-slash redirects.
- Twitch CLI optional-event integration passed locally through shim8081 with registered session/subscription IDs. Cheer, raid, subscription and injected chat passed; no live Twitch calls or scripted live chat.
- No camera/OBS or rendered browser visual check was possible in this agent environment. Kash should check camera recording/download and seated framing on the Mac. API tests use mocked responses, not live clip creation.
- `/review` is unavailable as a tool here. Independent subagent review covered reducer attribution, clip coordinator/Twitch context, HUD/demo accessibility, capture replay/server ownership, and final wire optimisation. Findings fixed: partial-COMBO attribution loss, queue cap, stale queued footage, and excessive large-crowd wire payloads.

## Balance

4000 rounds per cell, with the same reducer. R2 cells include real R1 warmups. Casual remains within30–70%; no-punch stays above30%. No combat numbers changed.

| Model | R1:0 | R1:3 | R1:50 | R1:500 | R2:0 | R2:3 | R2:50 | R2:500 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Casual |55.6%|55.0%|49.9%|48.5%|56.7%|56.0%|48.4%|49.3%|
| Good |99.2%|98.9%|98.5%|98.6%|99.5%|99.0%|98.5%|98.5%|
| Seated |71.4%|71.7%|66.4%|65.9%|70.2%|71.0%|65.7%|65.7%|
| No punch |41.1%|42.1%|35.9%|36.0%|41.4%|40.7%|36.1%|36.1%|
| Keyboard |96.0%|95.8%|94.5%|93.1%|95.8%|94.7%|93.8%|93.2%|

Scouting exercised1326 cards,1316 exploits and335 fixes. All balance gates passed.
