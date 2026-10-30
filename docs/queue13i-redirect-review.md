# Queue 13i follow-up — Worker redirect compatibility

## Cause and fix

The deployed auth-unavailable result is consistent with a Worker Request construction error hidden by the intended sanitized error path. Cloudflare's [Request documentation](https://developers.cloudflare.com/workers/runtime-apis/request/) confirms that Workers supports follow/manual only and throws TypeError for the Fetch-standard error mode before any outbound request. Node fetch accepts that mode, so the original Node tests missed this platform mismatch.

Changed only Worker credential-bearing fetch calls: OAuth user validation, app-token acquisition and bot chat send now use manual. Validation and token acquisition reject any 3xx or opaque redirect before parsing. Chat sends return their existing safe HTTP failure code for 3xx, or invalid_response for an opaque redirect; neither follows nor retries a redirect. Timeout, token caching/401 refresh, rate limiting and browser redirect policy are unchanged.

## Regression coverage

Injected fetch models workerd by throwing TypeError for the unsupported mode and requiring manual. The full validation → app-token → send-chat path succeeds; invalid-token 401 remains unauthorized. All three paths reject 300/301/302/303/304/307/308/399 plus opaque redirects without extra requests. A recursive source assertion prevents the unsupported initializer anywhere under worker/src. Existing tests now expect manual.

## Verification and independent review

Fresh clone on Node 22: npm ci passed; npm test **768/768** across 98 files; npx tsc --noEmit, npm run build:demo and npx wrangler deploy --dry-run passed. An initial candidate exposed a redundant opaque comparison during TypeScript narrowing; it was removed and the final fresh clone passed all these checks. The capacity interruption stopped the first sim before completion. A full rerun from the same verified fresh clone completed with exit 0 in 676.16 seconds. All production/scouting/difficulty/Forge gates passed; its complete stdout is byte-identical to the saved 0be805d baseline (SHA-256 `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`). No golden files changed.

Manual smoke (outside the mocked unit tests): ran the actual Worker under npx wrangler dev --local from a clean clone, with a dummy public client ID, all hosted flags off, no .env/.dev.vars or secrets, and isolated temporary registry/state/log paths. GET /api/status with the explicitly supplied dummy token returned **401 {"reason":"unauthorized"}**, rather than 503. The Worker was stopped afterward; no bot chat was sent.

Independent subagent review inspected the final Worker-only diff and regression coverage, confirmed fail-closed redirects and unchanged browser/gameplay paths, and cleared it with no outstanding findings. No deployment.

## Needs Claude / Kash

Claude redeploys the reviewed commit with the existing deployment configuration. Kash plays the real round check. No live bot message is sent during development.
