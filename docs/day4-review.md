# Day 4 verification and review

## Scouting core

The production reducer, server and offline demo share the scouting rule. Cards begin in round 2 only, with share ≥65%, n ≥12 and Wilson lower bound ≥0.60 (z=1.645). Successful hook/SUPER dodge leans supply the habit sample; a fixed habit uses the card's dominant side over the last eight dodge leans (≤62.5%), heals up to 10 HP and resets eligibility to require twelve fresh samples. An exploit changes the label/vote guidance, not damage, and suppresses further exploits for three full beats.

Attack, defence and input-transition logs carry round identity across the match. The server retains capture timestamps as diagnostic metadata while receive time remains authoritative for defence and the game clock. Pre-held defence is distinguishable from an actual reaction; failed defence attempts are represented too.

The left rail shows the observed percentage/sample count, the matching hook vote glows only when its exploit is available, and an exploit telegraph names the side it attacks. A short FIXED stamp shows the actual capped heal. This pass adds no feel effects or pose classifier changes.

The required 4,000 single-round simulations per player/crowd cell remain the balance gate. Additional scouting-enabled coverage exercises round-2 carry, exploits and fixes without changing the SPEC player or crowd parameters.

## Review workflow

`/review` is unavailable in this tool session. Independent agents review the engine/sim, presentation, and server/transport changes before each commit; any findings and final validation results are recorded here and in commit messages. The core review cleared round-tagged logs, receive/capture timing, exact thresholds, fix/cooldown behavior, sim models and HUD projections. AGENTS.md was updated after that review. No scripted chat or optional event is sent to a live Twitch channel. No Wrangler login/deploy is performed.

The offline build and TypeScript checks pass. Scouting HUD tests exercise the view helpers used by the actual renderer. A temporary SIMULATED preview was prepared, but browser verification could not run: no browser automation surface was available, and native Chrome access was not approved. No visual check or screenshot is claimed; the temporary preview was removed.

## Core validation

208 tests pass, including all 50 golden vectors; TypeScript and the offline build pass. The full seeded run uses 4,000 samples per player/crowd cell. Baseline R1 rates remain unchanged from Day 3. The additional R2 run carries genuine R1 evidence, enforces the same balance gates, and exercised 1,326 cards, 1,316 exploits and 335 fixes.

| Player | R1: 0 | 3 | 50 | 500 | R2: 0 | 3 | 50 | 500 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| casual | 55.6% | 55.0% | 49.9% | 48.5% | 56.7% | 56.0% | 48.4% | 49.3% |
| good | 99.2% | 98.9% | 98.5% | 98.6% | 99.5% | 99.0% | 98.5% | 98.5% |
| seated | 71.4% | 71.7% | 66.4% | 65.9% | 70.2% | 71.0% | 65.7% | 65.7% |
| nopunch | 41.1% | 42.1% | 35.9% | 36.0% | 41.4% | 40.7% | 36.1% | 36.1% |
| keyboard | 96.0% | 95.8% | 94.5% | 93.1% | 95.8% | 94.7% | 93.8% | 93.2% |

## Optional event rules

Cheer adds one hype per bit, capped at 25 per event and 100 total. `channel.subscribe` heals eight HP, capped at 100. Only an active, unpaused round accepts combat buffs; stopped/paused or finished rounds do not accumulate them.

A raid starts a 15-second Phase 2. The game clock freezes its remaining duration on pause; the server's session admission window is separately measured in wall time. A chatter is inferred to be a raider only if their first message of any kind this server session arrives in `[raid received, raid received + 120 s)`, and at most the raid's viewer count are admitted. Ordinary non-vote messages count for this heuristic. A new raid replaces the previous cohort, while the session's already-seen chatter set persists across rounds and match restarts. No raider flag is taken from chat or capture clients.

Phase 2 applies 2× weight to those voters, uniformly scaled when necessary so their combined weight is at most the regular voters' combined weight (50% of the draw). With no regular votes, raider influence is zero and the draw uses autopilot. Counts/voter totals remain one person per vote; HUD bars show the effective draw shares. Hype still uses the unweighted distinct-voter count. Expiry returns everyone to ordinary weight, and continuous weighted draws preserve fractional shares without quantization bias.

New broadcaster authorization requests `bits:read` and `channel:read:subscriptions`; existing baseline tokens keep chat available and receive a reauthorization hint instead of breaking startup. Live cheer/sub listeners are registered only for scopes actually present. Raid subscribes to the destination broadcaster. These subscriptions and field requirements were checked against [Twitch's EventSub subscription reference](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/).

## Optional integration and final review

The isolated CLI test ran actual Twitch CLI 1.1.24 → shim8081 → real Twurple → GameSession using the generated --session/-u subscription IDs. Cheer35 adds exactly25 hype, subscribe heals82→90, raid activates exactly15 seconds, and injected !jab still gives JAB1. Exactly three optional callbacks are required. Temporary CLI configuration and SQLite event cache stay outside the user's normal configuration; HOME is unchanged. SIGTERM during registration exits143 and releases8080/8081/44747.

The integration uncovered missing mock rate-limit headers (Twurple stalled subscription creation) and CLI broadcasts reaching both account sockets (duplicated cheers). The shim now preserves/supplies mock rate headers and routes proxied notifications by their registered subscription owner. Regression tests cover duplicate routing; ownership migrates on reconnect and is removed on deletion/disconnect. The runner also gained idempotent signal cleanup after independent review identified an orphan-process risk.

Independent final reviews cleared optional engine weighting/timing, server mode/admission logic, scope migration, broadcaster context, HUD projections, and transport/runner cleanup. AGENTS.md was updated after those reviews. The final balance rerun reproduces both tables above, including all1,326 cards/1,316 exploits/335 fixes, and the offline build still passes. Optional events were exercised only against local mocks; live receipt on Kash's channel is not claimed.

Final checks: **235 tests pass on Node 22**, TypeScript passes on Node 22, `npm run test:mock-events` passes, both complete balance matrices pass, the offline build passes, and the diff has no whitespace errors. The primary agent reran the opt-in npm command successfully after the isolated CLI runner and shim fixes.
