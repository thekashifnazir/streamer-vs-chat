# Streamer vs Chat
Twitch chat is the boss's brain; the streamer's body is the defence (guard blocks, lean dodges, punches are bonus).

## Commands
- dev (mock Twitch): npm run dev:mock   # twitch CLI mock + chat shim + server + overlay
- dev (live Twitch): npm run dev
- test: npm test   # unit, golden-vector, transport and recorded-landmark regression tests
- optional-event integration: npm run test:mock-events   # installed Twitch CLI; own isolated mock, ports 8080/8081/44747 must be free
- balance: npm run sim   # 4000 single R1 rounds/cell plus 4000 scouting-enabled R2 rounds/cell after real R1 warmups; all four ordinary/coordinated R1/R2 matrices fail if casual leaves 30-70% or no-punch drops below 30% at 0/3/50/500 viewers

## Rules
- Server owns game state; overlay/capture are views/inputs over ws.
- Never call real Twitch in tests; never send scripted chat to a live channel.
- Pose classifier changes need a recorded-clip test. Game-critical inputs are guard and lean; punches never decide a round.
- Bot posts at most ~1 chat message per 10 s.
- Safety: clear-space check at start; "stop" freezes the game; seated and no-punch modes stay working.

## Implementation constraints
- Scope: Codex x TwitchCon Hackathon; deadline 2 November 2026, 14:00 PT.
- SPEC.md is the source of truth for rules, numbers, event types and acceptance tests. docs/HUD.md Recommended layout (B) and docs/hud-rails.png define the Rails HUD.
- Node 22 + TypeScript, npm workspaces: server/, overlay/, capture/, shared/. Server/auth/WebSocket port 3000; Vite port 5173 serves /overlay and /capture.
- All game state belongs on the server. Overlay is a view; capture provides inputs. Pose and keyboard are equal inputs; punches are bonus damage. The engine is a pure step(state,event,now) reducer, with no internal clock calls.
- Current scope includes the Day 3 pure shared reducer, server loop, result queue, golden-vector tests, balance sim, offline demo and basic asset wiring. Keep the accepted pose classifier unchanged for engine work. Day 4 scouting and optional cheer/sub/raid events are implemented. Day 5 clips, session cards and seated/no-punch judge controls are implemented. Day 6 presentation feel/mix, cold-open rehearsal, local play-test export and capture benchmark tooling are implemented; physical recording/listening and GPU/CPU comparison remain Mac checks.
- demo: npm run demo (4173); static build: npm run build:demo -> dist-demo/. No runtime CDN or credential loading. Do not run wrangler login/deploy: Kash/Claude handle those on the Mac.
- Two server-held Twitch tokens: bot user:read:chat user:write:chat user:bot; broadcaster channel:bot clips:edit. New broadcaster login also requests bits:read/channel:read:subscriptions. Older baseline tokens keep chat working with a reauthorization hint; optional cheer/sub listeners require their actual scopes. Raid subscribes TO the broadcaster.
- Secrets belong in .env and gitignored tokens.json. Never commit tokens or print credentials.
- Tests must never call real Twitch. Mock CLI listens on 8080, injection shim on 8081. Listener URL ws://127.0.0.1:8081/ws and TWURPLE_MOCK_API_PORT=8081; never connect directly to 8080. Other mock event triggers must use the session and subscription IDs from getCliTestCommand().
- Never send scripted chat to a live channel. Label simulated input SIMULATED on screen. Mock startup must not load live tokens.
- Do not copy prep-repo spike code. Existing fixture data and reference docs may be reused.
- Use subagents for independent lanes where useful. Perform and document an independent subagent review before each commit.

## Scouting evidence
- Scouting logs carry across rounds with round/beat identity; retain receive and raw capture timestamps. Receive time decides gameplay; a held defence is not a zero-ms reaction. Log meaningful transitions rather than every heartbeat.
- Cards/fixes are server-owned. Only successful hook/SUPER dodge leans count; after a fix require twelve fresh samples. The HUD consumes authoritative evidence, cooldown and fix/heal metadata.

## Optional Twitch events
- Cheers add min(bits,25) hype, total cap 100; channel.subscribe heals 8, cap 100. Combat buffs are ignored before START, while frozen, or after round end.
- A raid starts 15 seconds of Phase 2 (game-clock time). Infer membership from each chatter's first message of any kind this server session, within the raid's 120-second wall-clock window, capped at its viewers. New raids replace the cohort; already-seen identities persist across rounds/restarts. Never accept a client-supplied raider flag.
- During Phase 2 raiders count 2x, uniformly scaled so their aggregate weight is at most 50% of the draw. With only raider votes, zero influence means autopilot. Keep raw vote counts/voters separate from effective weighted bars; hype uses unweighted voters.
- The installed CLI can broadcast optional notifications to both account sockets. The shim routes by registered subscription ownership, preserves mock rate-limit headers and migrates ownership on reconnect. Use getCliTestCommand() exact session/-u IDs.
- test:mock-events uses temporary config/cache without loading tokens or changing HOME. Signal cleanup must stop its listener, shim, CLI and auxiliary RPC port 44747. No scripted chat or events go to live Twitch.

## Highlights and judge controls
- Clip creation uses broadcaster context, requires a stream at least60 seconds old, and confirms the matching Get Clips result within15 seconds. Create acceptance alone never produces a clip link. Confirmed IDs are stored in gitignored, owner-only highlights.json.
- Clip requests are bounded to three pending including active, prioritised KO/comeback/PERFECT, with30-second creation spacing. Moments older than10 seconds use saved local replay rather than mislabel later footage. Offline/create failure stays stats-only.
- Opt-in camera replay snapshots moments before polling. Media and blob URLs stay in capture; only availability acknowledgements go to the server. Keep replay retention bounded and release object URLs.
- Chat MVP uses the actual-damage ledger, including interrupted COMBO hits. Split credit equally among counted supporters of the selected move; autopilot earns none. Historical attribution stays server-side; routine wire updates run at10 Hz with immediate control/safety updates.
- Seated and no-punch are start-screen choices. Seated has separate calibration and TILT cues. No-punch disables detection and prompts while automatic defence counters keep their damage. Guard/lean classifier math remains accepted; punch-gating changes retain the recorded-fixture equivalence test.
- End session / show card freezes play and shows session stats/top confirmed clips/MVP; START creates a new match without clearing session totals.

## Hosted channel mode
- /play is the authorised no-server exception: the browser owns this mode's state and calls the same shared reducer. The no-login landing remains offline and simulated; local Node/OBS Browser Source paths remain supported.
- OAuth implicit requests user:read:chat, channel:bot and clips:edit; validation still requires only user:read:chat for older grants. Keep tokens in memory and this tab’s sessionStorage only (including the CSRF nonce); strip callback hashes immediately, validate before restoring on /play and hourly, and check random state. Clear tab credentials on Disconnect, every 401 and validation failure. Never use localStorage/cookies, token URLs/logs, client secrets or an analytics service.
- Build/dev read only explicit public VITE_TWITCH_CLIENT_ID, never .env/server tokens. Redirect origins are primarydomain root and localhost:5173 root; other previews direct users to a registered origin. No deployment by agents.
- Live credential state must gate simulated source creation even if a caller incorrectly passes false. LIVE transport loss freezes play until connected and explicitly resumed. /play never sends chat with the streamer's token; only the Worker's bot sends server-formatted results.
- Metrics export only counts/rates. Salted SHA-256 identities and fresh session salt stay in memory, never persisted/exported; never retain/export chat text or usernames. Baseline is up to10 observed minutes before the first round; each round is a fight.

## Presentation feel and proof
- shared/src/feel.ts is the single FX constants table. FX never mutate the reducer clock, vote timing, input or damage; only presentation animation clocks hit-stop. Shake/glow only the damaged rail, never webcam or page.
- Calm FX (?fx=calm or reduced-motion) keeps trauma zero and uses150ms fades; hit-stop and audio remain. Keep the36px HUD font floor,40px scouting n and small-area flash metadata/tests.
- No-login cold-open rehearsal is SIMULATED and requires actual player guard. It deliberately pauses one resolved attack; do not present it as live-chat proof.
- Friends' stats export is opt-in, local and counts-only; withdrawal clears records and pending exports. Keep simulated metrics distinguished from hosted real-chat metrics.
- Capture CPU/GPU comparison must use real camera frames; do not invent measurements. Default CPU until a completed bounded comparison chooses a measured delegate. No classifier formula changes.

## Two-way scouting (Queue11a)
- Chat habit history retains the last 12 selected moves with positive counted-vote support across rounds; autopilot is not evidence. Track round/veto opening metadata separately. From R2 require the full 12, share≥55% and WilsonLB(z1.645)≥.40; retain the card at 50%, clear below 50%. Cards never constrain votes.
- Brace snapshots a matching already-visible card and correct pre-held defence at the tell. Only successful BLOCK/PERFECT/DODGE earns automatic counter ×1.25 and READ IT; punches/window unchanged. New cards cannot retroactively qualify their own draw.
- CHAT SYNC is intentionally removed entirely. Attempt 1 (35% brace) failed ordinary R1 no-punch at 500 viewers (28.5%); attempt 2 (50% brace) cannot change R1 and also failed coordinated R2. No damage/gate/timing thresholds were weakened to save it. See docs/queue11a-review.md. Eight early votes have normal damage, with golden/unit regressions.
- Final sim uses 35% pre-brace attempts / 85% hold (inferred) and a 35% persistent JAB coordinated group only if it has ≥8 members; 0/3 viewers retain ordinary personas. §5 player models/gates unchanged; all four 4,000-sample matrices must pass and successful braces must occur.

## Hardening (Queue 11b)
- `npm run load` and `npm run soak -- --minutes 30` use isolated local CLI/shim/server processes only. Stop other mock stacks first; ports 3000/8080/8081/44747 must be free. CI runs the two-minute soak after tests/sim/build with a checksum-pinned Twitch CLI.
- Hardening telemetry/endpoints require mock mode and `--hardening`; never expose them in live mode. Benchmark child environments must not load dotenv, live tokens or the user's CLI credentials. Report real completed measurements, never an interrupted run or accelerated wall time.
- EventSub outages retain accepted votes/pending attacks; future empty beats use normal autopilot. Twurple owns chat reconnect/backoff; the overlay shows RECONNECTING. Every overlay connection receives immediate authoritative state.
- Explicit local Save/Forget restores validated standing/seated calibration without opening the camera. Restore stays stopped until a fresh framed pose, clear space, connected server and explicit Resume. Do not persist frames, credentials or incompatible calibration versions.
- Keep historical matches compacted into exact session aggregates; do not retain every completed GameState. Preserve MVP damage credit, weighted reaction stats and top clips.
- Route-only middleware tests use a fresh empty Vite cache with unused pretransform/dependency warmups disabled. Bound and name HTTP/Vite teardown phases so fresh-clone hangs fail promptly. Production Vite settings are unchanged.
- Load injection uses a FIFO queue of at most 32 concurrent local HTTP requests; preserve every scheduled message, never retry to hide losses. Unbounded fanout reproduced connection resets. Keep strict sent=accepted=audited conservation and record failed runs honestly.


## Viewer memory (Queue 13)
- Memory is an observer outside the reducer. `server/memory.ts` persists versioned per-channel data in gitignored `data/viewers.json` with owner-only atomic writes; never persist chat text. Source sim/booth adapters do not touch that file, and the chat boundary also rejects those source tags.
- Retention removes stale (>90 days) records on load and rewrites the cleaned allowlist before serving. Permanent per-channel opt-out IDs survive retention; `!forgetme` immediately removes the record and acknowledges only after durable deletion, through the existing shared bot queue. Do not recreate opted-out viewers or expose their public MVP identity.
- Votes count once per current beat; replacements refresh activity, and viewer streams count once per server session with an accepted fight vote. Receive-ordered current-beat dedup remains bounded. KO voters come from the exact lethal damage-ledger entry and matching selected attack, including a first-hit COMBO KO; autopilot earns no attribution.
- MVP is finalized once per server session on explicit End session or shutdown; ordinary cards preview without another award. Favourite move means favourite credited KO move. Channel streams count sessions with a completed round; KO totals exclude timeouts.
- The offline demo uses its own simulated-only IndexedDB store, seeded once with three fictional streams. Storage failure leaves the keyboard demo playable with seeded in-memory data. Hosted `/play` never opens this simulated store; its metrics remain counts-only, separate from explicitly opted-in hosted viewer memory.
- Channel rebinding is serialized; retire old callbacks/viewer polls and finish old-channel persistence before replacing context. Keep highlight IDs unique across channel/game epochs. No visual layout claims without an actual rendered check; Chrome/OBS verification remains a Mac check when computer-use access is unavailable.

## Boss Forge (Queue 13b)
- Shared BossDef data drives combat; the canonical default normalizes to the original engine behavior. Custom commands map to internal slots, and a fifth custom slot is not SUPER. Only accepted definitions may be queued between rounds; cancel queued proposals on veto.
- `validateBoss` is pure and authoritative; strict schema and moderation supplement it. Reserve built-in control commands and protect broadcaster/recent chatter names, including near matches. Ideas/generated text never enter TTS or logs.
- Forge uses injected AI clients in tests, never real keys/network. Live server may read OPENAI_API_KEY from .env; mock/static paths never construct a real client. Preserve exact requested model gpt-6-luna, low reasoning, one repair, output moderation and token/latency telemetry. Unknown costs remain unavailable.
- Fast R1 Forge gates use 4,000 samples/cell and shared combat arithmetic with production-reducer replay regressions; uniform tuning has eight bounded steps. Keep all four existing production balance matrices and every fixture gate in CI. Offline editing/simulation runs in a cancellable worker and never blocks keyboard play or needs a key.

## Hosted backend (Queue 13i)
- Worker `/api` authenticates user tokens against this app; hash-only identity caches expire within five minutes. Route the ChannelHub by validated user ID, never a submitted channel. The no-login demo never calls `/api`.
- Results accept bounded structured fields only and use shared pure formatters. Durable queues keep at most three pending messages, dropping oldest, with at least ten seconds between attempts; alarms flush them. App-token sends use the configured bot and source-only delivery. Keep only safe drop codes for status.
- Public health flags gate each hosted feature; all flags stay off in committed config. New `/play` grants request chat read, channel:bot and clips:edit; older read-only tokens remain accepted. Backend failures never freeze gameplay.
- Worker secrets are provisioned with wrangler secret by Claude; never load server .env for Worker builds/checks. Use deploy --dry-run only. Regenerate isolated bindings with npm run types:worker.

## Hosted clips (Queue 13j)
- The unchanged highlight coordinator/ClipTransport live in shared/src/clips.ts; server/src/clips.ts re-exports them. Preserve first-minute guard, 15-second confirmation, three pending including active, priority, 30-second spacing and 10-second stale-moment limit. Hosted mode has no replay callback: stale/unconfirmed moments stay stats-only.
- /play clips require health.clips and clips:edit on the in-memory user token. Bind stream/create/confirmation to the current authenticated account; only confirmed matching clips become session-card links. No-login demo never initializes hosted clips or calls /api.
- Clip bot posts accept only a bounded clip ID. The Worker obtains Get Clips with its private app token and verifies matching ID/broadcaster before generating a canonical Twitch link and entering the existing ten-second/three-pending queue. Never accept a client URL; keep manual redirects and safe failures.

## Hosted Forge (Queue 13k)
- Shared Forge request builders preserve exact model, low reasoning, store:false, strict BossDef schema and one repair turn. The Node-agnostic BossForge service is shared; local server paths re-export its API. Browser code never constructs a real-key client or runs simulation in a Worker request.
- /play health.forge gates the HostedForgeClient. Ideas/endorsements follow existing chat rules; only broadcaster/mod plain !forge generates between rounds. Protected display names and moderated ideas stay in page-session memory only, outside metrics/export/storage. Existing browser Web Worker runs gate/tune; phase changes/veto cancel pending work and queued bosses. Admission still requires moderation, deterministic validation and balance gates.
- ChannelHub persists UTC-day counters: five initial generations, two hundred moderation calls; singleton forge-global caps initial generations at one hundred/day. A one-use hash receipt ties the sole repair to an initial output/idea; never persist text or upstream bodies. Reserve before paid I/O and fail closed on errors; spent failed attempts are not refunded.
- Worker endpoints reject client model/prompt/schema fields, construct the shared request themselves, use only configured OPENAI_API_KEY, manual redirects and bounded timeouts, and return only service-consumed response fields. Daily cap replies are 429 with reason daily-cap; no logs contain ideas, outputs, tokens or upstream bodies. Flags remain off in committed config.

## Hosted viewer memory (Queue 13l)
- The shared storage-agnostic domain/lifecycle preserves local file behavior. ChannelHub stores per-channel versioned records and ID-only runtime checkpoints in SQLite; transactionSync commits records, opt-outs and retry dedup together. Await durability before any forget acknowledgement. Retention is applied on load; permanent opt-outs survive it.
- HOSTED_MEMORY stays off in committed config. Authenticated token identity selects the channel; structured event allowlists reject chat text, submitted channels and simulated/booth sources. No-login demo never calls these endpoints.
- /play remembers viewers only after the unchecked-by-default consent toggle is checked. Bounded ordered batches retry safely; unchecking cancels pending work and stops memory requests. Exact lethal-ledger supporters determine KO attribution; MVP finalizes once per page session. Keep remembered IDs/names separate from the counts-only metrics export.
- Forget deletes durably before the fixed acknowledgement enters the existing bot queue; with bot off, acknowledge on screen only. Never expose opted-out MVP identity, including after unchecking. Memory failures must not block gameplay, STOP/disconnect or counts export.
