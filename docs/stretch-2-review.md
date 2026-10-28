# Stretch 2: Try it on your channel

Demo landing: https://streamervschat.kashifnazir.com/ · hosted mode: https://streamervschat.kashifnazir.com/play

## Choices made overnight

- The hosted browser owns this mode's game state, an explicit exception for this no-server stretch. It calls the existing pure shared reducer; there is no second engine. The local Node/server/OBS Browser Source path remains unchanged.
- Request only user: read: chat. Chat writing, clips, optional cheer/sub/raid buffs and hosted bot results are outside this stretch; no write scope is needed. Viewer count uses Get Streams in the same user context every 60 seconds.
- OAuth Connect is enabled only on the two registered origins (primary domain and localhost: 5173). The 4173 preview and Workers fallback direct users to a registered origin rather than attempt an invalid redirect.
- Tokens stay in memory. Only a random OAuth state nonce goes into sessionStorage to survive Twitch's full-page redirect. The callback strips the hash before validation, then switches the same document to /play so no token needs storage or a second URL transfer. Reload signs out.
- Only VITE_TWITCH_CLIENT_ID is explicitly read from the build environment; .env and server tokens are not loaded. It is a public client ID, never a client secret. Missing ID leaves the no-login demo usable and gives a configuration hint on Connect.
- The root callback needs a CSP permitting Twitch validation. Both pages allow only the specific Twitch API/auth/WebSocket origins in connect-src; the build audits the actual no-login dependency graph to preserve offline play. The pose model and single SIMD WASM fileset are unchanged.
- EventSub handles welcome/subscription, keepalive timeout, reconnect handoff, bounded exponential backoff and duplicate delivery. Token validation runs at start and hourly. Loss of transport freezes play; reconnect requires an explicit Resume. Simulated crowd creation checks real credential state as well as its caller's flag. Rule-based zero-vote autopilot remains available in LIVE mode.
- A fight is one round, matching SPEC balance terminology. Baseline uses a rolling window of at most 10 minutes before the first fight; its rate divides by actual observed time, capped 10 minutes. Round counts include non-vote messages; voters count accepted eligible commands only. Hashing captures the receive-time fight before asynchronous SHA-256 completes.
- Per-session random salt and identity hashes exist only in memory and are cleared on disposal. Results contain counts/rates only, never chat text, usernames, raw IDs, hashes, salt or credentials. Copy is user-triggered, with selectable JSON if the clipboard is unavailable.

## Verification

- 310 tests pass on Node 22; TypeScript and diff whitespace checks pass.
- Static build passes the offline graph/credential-file audit: 25.2 MB raw / 15.1 MB gzip, unchanged lite model checksum and single SIMD WASM fileset. Local HTTP tests serve /, /play and pose assets, preserving /overlay and /capture redirects.
- Fake EventSub fixtures exercise channel.chat.message → ChatVote(simulated: false) → the actual reducer, subscription condition, duplicate suppression, reconnect handoff, stale subscription responses, backoff, hourly validation and revoked authorization.
- Hash stripping/state mismatch, live-token simulation refusal (including a falsely passed caller flag), metrics timing/counts-only exports and async fight attribution have dedicated tests.
- Both balance matrices pass unchanged: R1 casual 48.5–55.6%, no-punch 35.9–42.1%; scouting R2 casual 48.4–56.7%, no-punch 36.1–41.4%. Full tables match docs/day5-review.md; 1326 cards/1316 exploits/335 fixes exercised.
- Independent subagent review covered auth/EventSub, metrics/privacy, UI integration, static build/routing and documentation. Fixed retired-socket subscription readiness, expired-login button visibility, initial LIVE labeling and resume gating while disconnected or after ending the session. All Twitch tests use injected fakes, never real Twitch. No scripted chat was sent to a live channel.

The build/routing agent independently reviewed browser OAuth and EventSub source/tests, registered-origin handling and these setup instructions as an independent subagent review. The focused auth, transport, routing and offline-audit run passed 25 tests. A build with a non-secret test client ID confirmed that the explicit ID reaches the bundle while an unrelated `VITE_` environment variable does not; `envDir:false` and `envPrefix:[]` prevent dotenv and implicit public-variable loading.

## Needs Kash

- Register the two exact Twitch redirect URIs: https://streamervschat.kashifnazir.com/ and http://localhost:5173/. This is an application-console step, not performed overnight.
- Supply the public VITE_TWITCH_CLIENT_ID in the build environment; rebuild, then Claude deploys the unchanged wrangler.toml target. No login or deployment was run by this agent.
- Authorize the read-only scope in a real browser, confirm live chat/subscription and hourly/revoked-token Reconnect, and check OBS Window Capture + green Chroma Key. Real login/chat and camera require Kash.
- Verify seated webcam calibration and framing, green-background capture and clipboard interaction in Chrome/OBS. Browser automation inventory exposed no usable browser surface; localhost HTTP and fake transports cover the available checks.

## Official references

[Twitch implicit grant](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#implicit-grant-flow), [token validation](https://dev.twitch.tv/docs/authentication/validate-tokens/), [WebSocket lifecycle](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/) and [installed-client chat authentication](https://dev.twitch.tv/docs/chat/authenticating/) informed the implementation.
