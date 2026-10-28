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
- Current scope includes the Day 3 pure shared reducer, server loop, result queue, golden-vector tests, balance sim, offline demo and basic asset wiring. Keep the accepted pose classifier unchanged for engine work. Day 4 scouting and optional cheer/sub/raid events are implemented. Clips and Day 6 feel/mix polish remain later work.
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
