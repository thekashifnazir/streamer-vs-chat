# Queue 13p — hosted play gaps

30 October 2026. No deployment, new dependency or OAuth scope. Engine, classifier, timing, damage, balance and golden vectors are unchanged.

## Changes

- `/play` requests sound ON, with a Sound on stream setup switch. The switch, HUD sound button and M key read/write the same `GameSound.requested` state. Hosted audio resumes directly from START FIGHT / START WEBCAM FIGHT, including tutorial start; unrelated gestures cannot unlock it beforehand. Offline demo defaults OFF. Local OBS overlay autoplay behavior is preserved. Sound failures never block gameplay.
- Step 2 includes the requested Windows/macOS Capture Audio routes and M/OBS meter test; the hosted footer states sound starts on at START FIGHT. This is guidance, not a claim of physical OBS verification.
- OAuth callback fragments are stripped before validation. Validated tokens persist only in this tab's sessionStorage; `/play` validates a saved token before opening EventSub and shows Reconnected. Disconnect, validation failure, or a backend/Helix 401 clears it. Generation checks prevent stale validation/API replies from resurrecting disconnected credentials or clearing newer credentials. Hourly validation remains. No token is logged, written to localStorage/cookies or added to a URL. Storage restrictions leave memory-only auth usable where possible. Updated the old AGENTS/README memory-only statements to match the explicitly requested tab storage.
- Shared `RaidTracker` is the unchanged local implementation; the server re-exports it. Hosted EventSub subscribes to incoming `channel.raid` on its existing session and routes it through the existing reducer. The same first-message cohort inference, 120s admission, raid-viewer cap, 15s Phase 2 and 50% weight cap apply. Tracker/dedup survive transport reconnects and reset on account rebinding. The existing HUD renders Phase 2 feedback.
- Incoming-raid payload/scope reference checked against [Twitch EventSub subscription types](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelraid). Existing requested scopes are unchanged.

## Tests and review

- Mocked auth tests cover callback stripping, tab reload validation, expiry/401/disconnect/failure clearing, unavailable storage, no localStorage writes and stale async replies.
- Hosted integration tests cover restore-before-connect, Reconnected, expired-token Connect state, Disconnect, raid forwarding and disposal during restoration. A backend 401 also removes readiness for a new START while an old socket may still be open; it does not freeze a running round.
- Mocked AudioContext tests cover per-mode defaults, deferred activation, switch/M/HUD synchronization and mute/disposal while activation is pending. DOM tests check OBS instructions and truthful footers.
- Raid fixture tests cover same-session subscription payload, channel validation, duplicate/stale sockets, account rebinding, inferred membership and the unchanged reducer's Phase 2 duration/weights. Existing local RaidTracker tests remain unchanged. No test calls real Twitch.
- Offline-entry regression starts with a stored tab token and verifies no auth restore or fetch; existing main-route guard tests keep hosted imports behind live mode. No-login demo stays isolated from `/api` and Twitch.
- Independent cross-lane review: `p_sound` reviewed auth/raid and final hosted integration; `p_auth` reviewed audio and its gesture/state behavior. No blockers. The extra offline-entry regression and final documentation were also reviewed before commit.

## Checks

On Node 22.23.4:

| Check | Result |
| --- | --- |
| `npm test` | 926/926 tests, 116 files; exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npm run build:demo` | exit 0 |
| `npx wrangler deploy --dry-run` | exit 0; all four hosted flags off |
| `npm run sim` | Pass; all production/difficulty/Forge gates, byte-identical to 0be805d |
| Golden vectors / engine / classifier / balance / dependencies / OAuth scopes | No changes |
| `git diff --check` | Pass |

Simulation stdout is exactly 3,652 bytes with SHA-256 `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`, identical to the preserved 0be805d reference.

The shared RaidTracker file was also byte-compared with the previous server implementation: identical. The final code was checked again after adding the 401 readiness guard. No real Twitch or hosted-service call was used by automated tests.

## Needs Kash / Claude

- Physical Chrome + OBS audio checks on Windows/macOS, including the meter instruction and switch/M behavior on a real stream.
- Real Twitch reload/reconnection/Disconnect and incoming raid walkthrough. All automated transport evidence here is mocked; no live event was sent or claimed.
- Claude handles deployment. All hosted backend flags remain off in committed configuration.
