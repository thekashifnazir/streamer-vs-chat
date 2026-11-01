# Hosted `/play`: backend, permissions and privacy

[Try it on your channel](https://streamervschat.kashifnazir.com/play) lets a streamer play against their own real Twitch chat with no local server. This page holds the hosted detail that used to sit in the [README](../README.md#hosted-backend). The [local-server path](DEVELOPMENT.md) remains supported.

## Status (31 October 2026)

| Hosted stage | Status (31 October 2026) |
|---|---|
| Bot round results and HYPE notices | Deployed on streamervschat.kashifnazir.com with the flag on · live check: not yet checked live in this build |
| Clips | Deployed with the flag on · live check: not yet checked live in this build |
| Boss Forge | Deployed with the flag on · live check: not yet checked live in this build |
| Viewer memory | Deployed with the flag on, opt-in each session |
| Reload keeps the session | Works: on 31 October a manual reload kept Kash connected to Twitch |
| Sound on stream (OBS audio) | not yet confirmed live |
| Go live from the page (WHIP, experimental) | Deployed; MEASURED live on kashruns on 31 October (a viewer saw only the fight stage with the camera bubble) · in-app go-live: used live on kashruns on 31 October; a pause bug in that run was then fixed in `3677761` |

The repository commits every hosted flag off (`HOSTED_BOT`, `HOSTED_CLIPS`, `HOSTED_FORGE`, `HOSTED_MEMORY` in [wrangler.toml](../wrangler.toml)); the deployed Worker turns them on. Cheers and subs are local-server only. The voice corner coach is switched off for the submission: its flags `HOSTED_COACH` and `HOSTED_COACH_DEMO` stay off, and the homepage demo no longer mounts its button. The code is kept: see [COACH.md](COACH.md).

## Permissions

Initial access is chat read, `channel:bot` for optional results, and `clips:edit` for optional clips. Older chat-only tokens keep working and can reconnect to enable results or clips. `/play` can post results, make confirmed clips, run Forge and remember viewers only when the corresponding hosted flags/permissions allow it. Memory is off each session; Forge starts off.

## Going live from the page (experimental)

OBS is the documented path: the **Advanced (OBS)** option keeps the Mac/Windows OBS guide, green background and Chroma Key; keep your webcam as an OBS source. **Quick (this page, no OBS)** is an experimental shortcut. It asks to share this Chrome tab with tab audio and captures the fight stage, with an optional camera bubble. Only when you choose Go live does it request `channel:read:stream_key`; the key stays in browser memory. It sends the tab to Twitch's WHIP ingest, which Twitch does not publicly document ([code](../demo/src/go-live.ts)).

**MEASURED 31 Oct:** Kash's prep test received HTTP 201, connected in under one second and appeared live on twitch.tv/kashruns. Later that day going live from the page was **MEASURED** working on twitch.tv/kashruns: a viewer saw only the fight stage with the camera bubble, and the deployed app's own Go live was used live on kashruns (a pause bug seen in that run was then fixed in `3677761`). These are tests on one account, not a guarantee for every browser/account. If quick streaming is unavailable or fails, use Advanced. You can also skip if already live.

## Worker and bot

The Worker serves `/api` and keeps a separate Durable Object result queue per authenticated channel ([ChannelHub](../worker/src/channel.ts), [queue](../worker/src/queue.ts)). `/play` never posts chat with the streamer's token: the bot sends only server-formatted round results, HYPE notices, verified clip links and fixed forget acknowledgements, at most once per 10 seconds. “Post results in chat (as streamervschatbot)” defaults on only when the deployed bot flag and `channel:bot` grant are present. Delivery failures show a status line and leave play running. All hosted flags are committed off; the public app/bot IDs and the Worker secret are set at deploy time, not committed.

## Login token

The user token is remembered on this computer (localStorage, or this tab’s sessionStorage if storage is blocked) until Disconnect, and is revalidated before reconnecting; Disconnect, any 401 or validation failure clears it.

## Clips

Hosted clips use that user token, require `clips:edit` and a stream at least 60 seconds old, and appear only after Get Clips confirmation within 15 seconds. Stale/unconfirmed moments stay stats-only; hosted mode has no local replay. The bot independently verifies each clip belongs to the authenticated channel before posting its link ([clip results](../worker/src/clip-results.ts)).

## Boss Forge on `/play`

With hosted Forge enabled, `/play` runs the same service as the local server, uses the Worker's capped OpenAI proxy, and runs the gate/tuner in a browser Web Worker. Chat proposes ideas with `!forge <idea>` and endorses with `!forge +1`; a moderator or broadcaster sends plain `!forge` between rounds to generate, or `!veto` to cancel. The Worker allows 5 generations and 200 moderation calls per channel per UTC day, plus 100 generations globally; one verified repair belongs to its original generation ([caps](../worker/src/forge-caps.ts)). When the budget is reached, the Forge card says ‘daily cap reached’. Details: [Boss Forge review](boss-forge-review.md).

## Viewer memory and privacy

Hosted viewer memory is **unchecked by default**. When enabled on the host, “Remember my viewers” stores Twitch IDs, latest display names and vote counts per channel, with 90-day retention applied when loaded. It never stores chat text. Viewers can type `!forgetme`; deletion is durable before acknowledgement, and a permanent per-channel opt-out prevents later recording. Unchecking stops memory requests; the separate counts-only results export does not include these records. The no-login demo uses only its fictional, SIMULATED memory and never calls these APIs ([Worker memory](../worker/src/memory.ts)).

The rules Codex followed for the hosted backend (token identity selects the channel, no chat text stored, flags committed off) are in [AGENTS.md](../AGENTS.md).
