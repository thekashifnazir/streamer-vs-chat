# Boss Forge / queue 13 review

## Part 1: rail overlap

Scouting/FIXED replaces the generic DEFENCE FIRST tip on the non-memory rail. Explicit grid rows reserve a separate footer for SIMULATED, connectivity and controls; the badge remains fully visible. Memory layouts retain their existing compact budget. Standing and seated geometry assertions cover 1080p and proportional 720p, and the HUD font floor remains unchanged.

Independent review checked row totals, footer reservation, conditional status removal and the widest 100% evidence text. Focused HUD tests pass. `/review` is unavailable, so the independent pass is the AGENTS.md fallback.

## Needs Kash

- Render the reference scouting/FIXED state in Chrome/OBS at 1080p and 720p. The prior computer-use denial prevents an actual rendered bounding-box check here; static layout assertions are not a visual claim.
- Real OpenAI key/API check is deferred as explicitly requested. All AI tests use injected fake clients. No deployment by agents.

## Part 2: implementation and decisions

Shared typed BossDef data now drives commands, labels, defences, per-hit damage, chip, hit count and telegraph timing in the production reducer. The canonical default normalizes to the prior state and every existing golden test remains mandatory. Internal move IDs remain stable transport slots; custom slot five is ordinary. Body-lean scouting is preserved, but a changed definition resets chat-move evidence because old slot meanings cannot earn READ IT.

The deterministic validator checks every requested bound, printable strings, unknown fields, unique ASCII commands, coverage, reserved control/privacy commands, a word filter, and case/punctuation/confusable/one-edit protected names. Only exact canonical Chat Golem may retain reserved !super. Three fictional four-move fixtures and the canonical fixture are included.

The interactive gate compiles seeded damage-independent R1 input trajectories for 4,000 casual/no-punch rounds per viewer cell. Its compact batch evaluator shares hit/counter arithmetic with the reducer; seeded plan replay tests compare actual HP and winner through step. The cache holds at most three shapes. The production four-matrix sim remains unchanged for default rules and additionally gates every fixture. Tuning bisects a single uniform damage/chip factor for eight iterations within 0.2–2.0 and all legal move bounds; it never clips individual moves or weakens balance thresholds. Cold local Node 22 measurements before the final review were gate 3.55 s and tuner 4.00 s; a final isolated measurement is recorded below.

Server generation is injected behind a mocked-client contract: idea moderation, stable top-three endorsements, one strict Responses generation plus at most one validation-error repair, every output string moderated, deterministic gate/tuning, and final validation against current protected names. Broadcaster names must load before generation; recent chatter names are bounded to 100, ephemeral and never logged. A bare !forge +1 targets the most recently admitted idea; +1 1/2/3 targets the visible shortlist rank. One idea per viewer per match is the chosen meaning of bout. No arbitrary text enters speech.

The next round is held during generation. Phase changes, moderator controls, capture STOP and channel rebinding retire outstanding work; veto also discards a queued accepted boss. The server logs only model/operation/token/latency metadata. The exact requested model remains gpt-6-luna; unknown prices remain unavailable. No actual key was created, read by development tools or used. Mock startup never constructs a network client.

The offline demo dynamically mounts a prebaked/JSON editor with a cancellable local worker, before/after table and explicit acceptance. Keyboard play remains available without waiting for simulation. Hosted /play does not enable this no-key editor, and static build/model/WASM vendoring remain credential-free.

## Independent review

The server and HUD lanes were separately implemented. Independent passes checked the validator, default compatibility, multihit/counter behavior, custom command/fifth-slot routing, round holds, veto epochs, source isolation, protected broadcaster lookup, worker cancellation and safe text rendering. Findings fixed include a custom fifth-slot voter telemetry double count, per-move clipping instead of a uniform tuning factor, stale chat-move scouting on boss changes and pending acceptance after veto. Added regressions cover round hold/queued cancellation and production-reducer trajectory equivalence. The reviewing agent reached its usage limit during its final pass; the root completed that pass and rechecked its reported findings before committing. `/review` is unavailable.

Official request shapes were checked against [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) and [Moderation](https://developers.openai.com/api/docs/guides/moderation). Model account availability and real pricing remain unverified; the requested name is preserved without substitution.

## Final verification

- Node 22.23.4: **499/499 tests**, 72 files; TypeScript and diff checks pass. A fresh source snapshot with a cold npm cache passes npm ci, all 499 tests and TypeScript. No test called real Twitch or OpenAI.
- The full npm run sim completed successfully: all four ordinary/coordinated R1/R2 production matrices, scouting/brace coverage and default plus all three custom fixture gates pass. Production values are unchanged: casual 48.5-65.6%, no-punch 35.9-53.1%.
- Forge default casual rates at 0/3/50/500: 55.65/55.275/49.625/50.425%; no-punch: 42.525/40.975/35.4/36.25%. Each custom prebaked fixture: casual 55.65/59.325/59.675/60.625%, no-punch 42.525/44.95/44.1/45.175%.
- Final isolated cold tuner measurement: **2,430 ms**, including compilation, before gate, eight uniform-factor iterations and acceptance. Double-damage fixture casual 10.1-10.6% becomes 47.3-51.65% at factor **0.54938616**; no-punch becomes 33.8-36.825%. This is a measured local Node result, not an API latency claim. A concurrent run under multiple heavy checks took 6.4 s and timed out functional tests; tests now have a separate 20-second contention budget, while the isolated <5-second performance target was checked explicitly and passed.
- Performance refinement samples 16 independent uniform four-move choices from each 32-bit RNG word, preserving exact 1/4 probabilities. It changes only Forge's deterministic sample sequence, not the production sim, gates or player probabilities.
- Isolated CLI/shim/server recovery passes: reload 20.2 ms, pending attack and vote preserved, new chat received after reconnection, zero unhandled errors.
- Offline build passes its audit at 25.2 MB raw / 15.2 MB gzip. Pose model/WASM vendoring is unchanged. No deployment performed.
