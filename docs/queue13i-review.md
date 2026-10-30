# Queue 13i — hosted bot results

Implemented the Shared design from twitchprep `docs/codex-prompts/13i-hosted-stack.md`. No reducer, classifier, timing, damage, sim model or golden changes. No deployment.

## Decisions and boundaries

- Shared pure formatters preserve the local server's exact round/HYPE strings. Hosted callers submit bounded structured data, never message text. Channel identity comes exclusively from the validated user token.
- ChannelHub persists a maximum of three pending messages and alarm scheduling atomically. It consumes before sending to avoid duplicate chat after an alarm retry; failed sends retain only a sanitized code. Ten-second spacing is conservative from completion, including slow requests.
- OAuth identity caches retain SHA-256 keys and validated identity/scopes for at most five minutes. Tokens stay transient. Upstream requests reject redirects and have eight-second timeouts. App credentials/token remain isolate-only; no request bodies or upstream errors are logged.
- Worker bindings are generated without global runtime declarations and mechanically given a module boundary so Cloudflare's HTML types and generated Node environment declarations do not override the capture/browser DOM types.
- `/play` observes completed round edges and the existing once-per-round HYPE notice. A new observer baselines historical results rather than reposting them. Failures only update one status line; no engine/safety transition depends on delivery. The no-login entry does not initialize hosted APIs.
- All four hosted flags remain off. The local server path and its chat queue remain supported.

## Independent subagent review

- Formatter/server lane: exact output parity tests, including custom commands, difficulties and match completion.
- Browser review: scoped token handling, feature gating, nonblocking failures and mounted-only API path cleared. Hardened initial history and added reducer-driven three-round/restart payload validation.
- Worker review: validated identity routing, strict schema, durable spacing/cap/alarm state, app-token refresh and safe status cleared. Added a bounded token-validation timeout after review.
- Documentation review corrected the old read-only OAuth scope statement to match new grants while retaining older-token compatibility.

## Verification

Fresh clone on Node 22: npm ci passed; npm test **738/738** across 97 files; npx tsc --noEmit passed; npm run build:demo passed; npx wrangler deploy --dry-run passed with all four flags off. npm run sim passed in 520.4 seconds: all four production matrices, both scouting coverage gates, difficulty matrix and all five Forge fixture gates. The entire sim stdout is byte-identical to the saved pre-13h/0be805d baseline, SHA-256 `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`. No golden, reducer, sim or classifier files changed. Repeated binding generation was byte-identical; git diff --check passed.

The runtime offline tests mount the actual default and scout-preview demo, run keyboard tutorial/simulated crowd/reducer through a completed round, and assert no fetch and no hosted mount. Worker tests use fake fetch/clock/storage for strict bodies, authenticated channel selection, off flags, token expiry/401 refresh, queue spacing/cap/concurrent alarm recovery and code-only errors. Server formatter parity tests preserve the old literal output.

Final independent subagent review covered Worker platform bindings/index/DO, generator, config, authentication, queue integration, browser observer, scope and failure behavior, and documentation; no blocking findings remained.

## Needs Kash / Claude

Configure public app/bot IDs, provision TWITCH_CLIENT_SECRET with wrangler secret, build with the public client ID, and enable only HOSTED_BOT in the deployment worktree. Claude deploys. Kash reconnects to grant channel:bot and plays a real round; confirm the bot posts the actual result, or check the code-only permission hint/mod fallback. No live Twitch request, scripted chat, login or deployment was performed during this task.

Platform references: [Durable Object alarms](https://developers.cloudflare.com/durable-objects/api/alarms/), [Twitch Send Chat Message](https://dev.twitch.tv/docs/api/reference/#send-chat-message), [token validation](https://dev.twitch.tv/docs/authentication/validate-tokens/).
