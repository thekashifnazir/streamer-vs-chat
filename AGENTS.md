# Streamer vs Chat
Twitch chat is the boss's brain; the streamer's body is the defence (guard blocks, lean dodges, punches are bonus).

## Commands
- dev (mock Twitch): npm run dev:mock   # twitch CLI mock + chat shim + server + overlay
- dev (live Twitch): npm run dev
- test: npm test   # unit and recorded-landmark regression tests; balance sim arrives day 3
- balance: npm run sim   # from day 3; not installed on Day 1. Fails if casual win rate leaves 30-70% or no-punch drops under 30% at 0/3/50/500 viewers

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
- All game state belongs on the server. Overlay is a view; capture provides inputs. Pose and keyboard are equal inputs; punches are bonus damage. Future engine is a pure step(state,event,now) reducer, with no internal clock calls.
- Current scope: Day 1 chat/auth/HUD plumbing plus Day 2 webcam capture, calibration, keyboard inputs, fixture recording and pose regression. No game engine, sound, sim, demo or build:demo scripts yet.
- Two server-held Twitch tokens: bot user:read:chat user:write:chat user:bot; broadcaster channel:bot clips:edit. bits:read/channel:read:subscriptions and cheer/subscribe/raid subscriptions are day 4 work.
- Secrets belong in .env and gitignored tokens.json. Never commit tokens or print credentials.
- Tests must never call real Twitch. Mock CLI listens on 8080, injection shim on 8081. Listener URL ws://127.0.0.1:8081/ws and TWURPLE_MOCK_API_PORT=8081; never connect directly to 8080. Other mock event triggers must use the session and subscription IDs from getCliTestCommand().
- Never send scripted chat to a live channel. Label simulated input SIMULATED on screen. Mock startup must not load live tokens.
- Do not copy prep-repo spike code. Existing fixture data and reference docs may be reused.
- Use subagents for independent lanes where useful. Run /review before each commit; if unavailable, perform and document an independent review pass before committing.
