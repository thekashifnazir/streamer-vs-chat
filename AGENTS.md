# Streamer vs Chat
Twitch chat is the boss's brain; the streamer's body is the defence (guard blocks, lean dodges, punches are bonus).

## Commands
- dev (mock Twitch): npm run dev:mock   # twitch CLI mock + chat shim + server + overlay
- dev (live Twitch): npm run dev
- test: npm test   # unit, golden-vector, transport and recorded-landmark regression tests
- optional-event integration: npm run test:mock-events   # installed Twitch CLI; own isolated mock, ports 8080/8081/44747 must be free
- balance: npm run sim   # 4000 single R1 rounds/cell plus 4000 scouting-enabled R2 rounds/cell after real R1 warmups; both fail if casual leaves 30-70% or no-punch drops below 30% at 0/3/50/500 viewers

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
- Use subagents for independent lanes where useful. Run /review before each commit; if unavailable, perform and document an independent review pass before committing.

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
- OAuth implicit uses only user:read:chat. Keep tokens in memory, strip callback hashes immediately, validate at start/hourly, check random state; sessionStorage may retain only the CSRF nonce. No client secret, persisted token or analytics service.
- Build/dev read only explicit public VITE_TWITCH_CLIENT_ID, never .env/server tokens. Redirect origins are primarydomain root and localhost:5173 root; other previews direct users to a registered origin. No deployment by agents.
- Live credential state must gate simulated source creation even if a caller incorrectly passes false. LIVE transport loss freezes play until connected and explicitly resumed. Hosted mode never sends chat.
- Metrics export only counts/rates. Salted SHA-256 identities and fresh session salt stay in memory, never persisted/exported; never retain/export chat text or usernames. Baseline is up to10 observed minutes before the first round; each round is a fight.

## Presentation feel and proof
- shared/src/feel.ts is the single FX constants table. FX never mutate the reducer clock, vote timing, input or damage; only presentation animation clocks hit-stop. Shake/glow only the damaged rail, never webcam or page.
- Calm FX (?fx=calm or reduced-motion) keeps trauma zero and uses150ms fades; hit-stop and audio remain. Keep the36px HUD font floor,40px scouting n and small-area flash metadata/tests.
- No-login cold-open rehearsal is SIMULATED and requires actual player guard. It deliberately pauses one resolved attack; do not present it as live-chat proof.
- Friends' stats export is opt-in, local and counts-only; withdrawal clears records and pending exports. Keep simulated metrics distinguished from hosted real-chat metrics.
- Capture CPU/GPU comparison must use real camera frames; do not invent measurements. Default CPU until a completed bounded comparison chooses a measured delegate. No classifier formula changes.
