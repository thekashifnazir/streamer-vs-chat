# Queue 13j — hosted clips

Shared design: twitchprep docs/codex-prompts/13i-hosted-stack.md. No reducer, timing, damage, balance, classifier or golden changes. No deployment; hosted flags remain committed off.

## Implementation and choices

- Shared ServerHighlightCoordinator/ClipTransport extraction preserves the original code except its relative import; server re-exports it and existing server tests remain unchanged.
- Hosted clips use the user's transient clips:edit token, gated by public health.clips. The shared coordinator retains first-minute protection, fifteen-second confirmation, priority, three pending including active, thirty-second creation spacing and ten-second stale-moment protection. Hosted mode supplies no replay callback, so old/unconfirmed moments stay stats-only.
- Browser and Worker verify matching clip ID/channel independently. Worker result bodies accept a clip ID only; its private app-token path queries Get Clips and generates a canonical Twitch link. The existing persistent bot queue owns posting rate/cap. No client-provided URL, title or text enters chat.
- All API/transport tests use fakes; no real clip creation, token use or scripted chat. Failures update status/stats without blocking gameplay. The no-login demo remains offline.

## Independent subagent review and checks

Independent subagent cross-review cleared both lanes. Worker review covered strict clip bodies, validated identity, same-channel confirmation, canonical URL construction, flags before/after lookup, cached app-token/401 handling, manual redirects/timeouts and unchanged persistent queue. Browser review covered account checks before/after requests and JSON, feature/scope gating, confirmed-only endcard links, cooldown/epoch behavior across restarts, bot opt-in, nonblocking failures and runtime no-login isolation. Browser/Worker slug bounds are aligned at 200 ASCII characters; invalid direct transport IDs fail before a request.

Fresh clone on Node 22: npm ci passed; npm test **809/809** across 100 files; npx tsc --noEmit, npm run build:demo and npx wrangler deploy --dry-run passed. Existing server clip tests remain unchanged and pass (11/11). The shared extraction was independently compared byte-for-byte to the old server source, with only the relative import changed. npm run sim completed with exit 0 in 529.38 seconds. All four production matrices, both scouting coverage gates, the difficulty matrix and five Forge fixture gates passed. Complete stdout is byte-identical to the saved 0be805d baseline (SHA-256 `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`). No golden changes. Final cross-review cleared the 200-character slug preflight and corrected README wording to distinguish chat posting from user-token clip creation. git diff --check passed.

## Needs Claude / Kash

Claude enables HOSTED_CLIPS (and HOSTED_BOT for link posts) only in the deployment worktree and deploys. Kash reconnects with clips:edit, goes live for at least sixty seconds and plays a real qualifying moment. Confirm a Create Clip acceptance alone shows no link, then a verified clip appears on the session card and, when opted in, through the bot. No real stream/camera/live clip check is claimed here.

Reference: [Twitch Create Clip / Get Clips](https://dev.twitch.tv/docs/api/reference/#create-clip). The project intentionally retains its fifteen-second confirmation budget and sixty-second stream-age guard.
