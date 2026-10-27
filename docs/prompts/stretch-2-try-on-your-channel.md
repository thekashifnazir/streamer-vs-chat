# Stretch 2 — rank 2, 4–5 Codex hours; source: docs/research/9-impact-adoption.md §b

```text
Read SPEC.md (rules, §6 event types, §7 acceptance tests). Extend the day-3 Workers static-assets
demo with a hosted "Try it on your channel" mode that runs with NO server. Keep the day-3
`wrangler.toml` and deploy to the same Worker URL.

1. Build target `npm run build:demo` → `dist-demo/`, containing the existing no-login demo as the
   landing page (SPEC test 17 must still pass offline) plus /play. Keep day-3 model/WASM
   vendoring unchanged.
2. /play has a "Connect with Twitch" button using the OAuth implicit grant flow
   (https://id.twitch.tv/oauth2/authorize, response_type=token, scope "user:read:chat",
   optional "user:write:chat", random `state` checked on return). Register these exact redirect
   URIs: `https://streamervschat.kashifnazir.com/` and `http://localhost:5173/` for development.
   Handle the returned hash at `/`, remove the token with `history.replaceState`, then open /play.
   Client ID comes from VITE_TWITCH_CLIENT_ID at build time. No client secret anywhere.
   Read the token from location.hash, then remove it from the URL with history.replaceState.
   Call GET https://id.twitch.tv/oauth2/validate on start and every hour; on 401 show "Reconnect".
3. Open wss://eventsub.wss.twitch.tv/ws; on session_welcome, POST /helix/eventsub/subscriptions
   for channel.chat.message v1 with condition {broadcaster_user_id: me, user_id: me},
   transport {method: "websocket", session_id}. Handle session_keepalive, session_reconnect,
   and reconnect with backoff. Map messages to ChatVote (simulated:false) and feed the SAME
   step(state, event, now) reducer the server and demo use. Do not write a second game engine.
4. While a real token is loaded, simulated chat must be impossible to start (extend the existing
   live-safety test). The page labels itself LIVE vs SIMULATED.
5. The /play tab renders the Rails HUD (docs/HUD.md) with a "green background" toggle, and shows a
   4-step OBS card: Window Capture of this window + Chroma Key.
6. Metrics, counts only: baseline chat messages/min for up to 10 min before the first fight, then
   per fight: messages/min, unique chatters (salted SHA-256 of user_id, salt per session, never
   stored), voters, fights played, session minutes. End screen "Copy results" button exports JSON.
   Never store or export chat text or usernames.
7. Tests (vitest): fake EventSub server fixture → votes reach the reducer; token-in-hash is
   stripped; sim refuses to start with a token; metrics JSON contains no message text.
8. README: "Try it on your channel" section with the URL, the scope it asks for and why,
   and the OBS steps. Keep the local Node + Browser Source path unchanged.
```

The primary URL is `https://streamervschat.kashifnazir.com` (INFERRED: the zone must be on
Kash's Cloudflare account; Claude verifies Thu); keep `https://<name>.<account>.workers.dev`
as a fallback. If using a custom route, keep
`routes = [{ pattern = "streamervschat.kashifnazir.com", custom_domain = true }]` above the
first table header and set `workers_dev = true`.
