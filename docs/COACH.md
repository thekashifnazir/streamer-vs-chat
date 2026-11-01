# Corner coach (optional live voice agent)

Between rounds, or while the fight is paused, the streamer on [/play](https://streamervschat.kashifnazir.com/play) can press **Talk to your corner** and speak with an AI boxing corner coach. It answers out loud in one or two short sentences, using the current fight numbers. It runs on [ElevenLabs Agents](https://elevenlabs.io/docs/agents-platform/overview).

It ships **off**. With the flag off there is no button, no extra request and no voice code in the page. The offline demo at `/` never has it, because it needs the Worker.

## Status (1 November 2026)

| Part | Status |
|---|---|
| Worker route, caps, tests | Built and tested with a fake fetch (not deployed) |
| `/play` button, prompt builder, session lifecycle | Built and tested with a fake Conversation (not deployed) |
| ElevenLabs agent | MEASURED 1 Nov: created by `scripts/create-coach-agent.ts`. Agent id `agent_2301m6bbje9tehbam3hnzp25j9nj` (not a secret). A read-back showed: voice George (`JBFqnCBsd6RMkjVDRZzb`), 60 s max duration, auth required, only prompt and first message overridable, 5 concurrent / 200 calls a day. A conversation token was minted once (HTTP 200) |
| Worker secret `ELEVENLABS_API_KEY` | Done: Kash set it on the deployed Worker (confirmed by `wrangler secret list`, names only) |
| A real voice conversation | Not yet tried: needs the flag on in a deployed build and a microphone |

## Safety rules

- **The coach never sees chat.** The prompt is built in [corner-coach.ts](../demo/src/corner-coach.ts) from an allowlist of numbers and fixed labels: round, score, health, counts of hits/chips/blocks/perfects/dodges, chat's most picked attack (as a fixed move name such as "left hook"), the streamer's dodge-side habit and the difficulty. No chat text, usernames, votes, MVP names or Forge boss names (those come from chat ideas). A custom boss is just "the boss". The builder re-clamps every field, so even a tampered object cannot pass a string through. Tests feed it a state full of chat fields and check none of them appear.
- **Never while an attack can come.** The button only works when the round is over or the game is paused. The session ends at once when the next round starts or play resumes (checked on every game step and every 250 ms). A round that starts while it is still connecting cancels it before any audio.
- **Hard limits.** 60 s per session, counted from the click (client) and enforced again by the agent's own `max_duration_seconds`. 15 s to connect. While a session runs, the next-round countdown waits; NEXT ROUND still works and ends the session.
- **Tone.** PG, encouraging, boxing-corner voice, one or two sentences, never discusses viewers, never gives medical, health or diet advice (it tells the streamer to stop and take a break). Base prompt: [coach-prompt.ts](../demo/src/coach-prompt.ts).
- **Mic.** The page asks for the microphone before it asks for a token, so a blocked mic costs nothing and shows "Microphone blocked. Allow the mic for this site in your browser, then try again."
- **No secrets in the browser.** The Worker holds the ElevenLabs key and mints a short-lived conversation token per session. The agent requires auth, so its id alone cannot start a call.
- **Failures never touch the fight.** Every error ends the session with a short message; gameplay, STOP and disconnect are unchanged.

## How it works

1. `/play` reads `coach` from `/api/health`. Only if it is `true` and the streamer is signed in does it add the button to the round-results and pause dialogs ([coach-button.ts](../demo/src/coach-button.ts)).
2. On the first click it lazy-loads `corner-coach.ts` (about 7 kB), and on connect `@elevenlabs/client` (pinned 1.28.0, about 630 kB, a separate chunk).
3. `POST /api/coach/token` ([router.ts](../worker/src/router.ts), [coach.ts](../worker/src/coach.ts)) checks the flag first (off: `503 {reason:"feature-off"}`, no Twitch or ElevenLabs call), validates the Twitch login like every other `/api` route, reserves the daily caps, then calls `GET https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=<COACH_AGENT_ID>` with `xi-api-key`. It returns only `{token}`. Upstream errors become `503 {reason:"unavailable"}` with no upstream text. Nothing is logged.
4. The browser starts a WebRTC session with that token and overrides only the prompt (base rules plus fight numbers) and first message.

Caps are UTC-day counters in Durable Object storage. They are reserved before the paid call and not refunded on failure (same as Forge). Over a cap the route returns `429 {reason:"daily-cap"}` and the page says the corner is resting.

| Worker var | Default | Meaning |
|---|---|---|
| `COACH_DAILY_CHANNEL` | 20 | Sessions per streamer (Twitch user id) per day |
| `COACH_DAILY_IP` | 10 | Sessions per hashed IP per day. The hash is SHA-256 of IP + day + the secret key, kept only in the `coach-global` Durable Object for that day |
| `COACH_DAILY_GLOBAL` | 200 | Sessions for everyone per day (the agent's own daily limit is also 200) |

## What Kash must set to turn it on

You cannot turn this on from the repo; everything below is on the deployed Worker.

1. `wrangler secret put ELEVENLABS_API_KEY`: **done** (1 November).
2. In the deploy copy of `wrangler.toml` (`/Users/kash/svc-deploy`): `COACH_AGENT_ID = "agent_2301m6bbje9tehbam3hnzp25j9nj"` and `HOSTED_COACH = "on"`. The flags use `"on"`/`"off"` like the other `HOSTED_*` flags, not `true`.
3. Deploy. Then `/api/health` should show `"coach":true`.

To change the agent's prompt or voice later: `COACH_AGENT_ID=agent_… npx tsx scripts/create-coach-agent.ts` (with the key loaded from `.env`) updates it in place and prints the id. Without `COACH_AGENT_ID` it creates a new agent.

### Guarded deploy script

`/Users/kash/svc-deploy/deploy.sh` was not edited. As it stands:

- Its flag check is `grep -cE '^HOSTED_(BOT|CLIPS|FORGE|MEMORY) = "on"' wrangler.toml` must equal 4. `HOSTED_COACH` is not in that pattern, so turning coach on does not block a deploy, but the script does not check it either. To require it, change the pattern to `(BOT|CLIPS|FORGE|MEMORY|COACH)` and the count to 5. To keep it optional, leave the check alone.
- Its secret scan of `dist-demo` covers `TWITCH_CLIENT_SECRET` and `OPENAI_API_KEY`. Add `ELEVENLABS_API_KEY` to that `for k in …` list so a leaked key would refuse the deploy.
- The header comment says "the 4 hosted flags + bot id"; it would also need the coach agent id.
- The local-change check already allows any edit to `wrangler.toml`, so the two new values fit.

## Known limits

- The page's CSP adds only ElevenLabs connect hosts (`api.elevenlabs.io`, `livekit.rtc.elevenlabs.io`, https and wss) on `/play`. `script-src` stays `'self'`, so the SDK's optional output-volume worklet (loaded from a `blob:` URL) is blocked. The SDK catches that and voice still plays, but the browser console will show a CSP warning during a session. INFERRED from the SDK source, not yet seen live.
- It is tap to talk / tap to end, not hold-to-talk. The agent listens for the whole session.
- Vite now warns that the `@elevenlabs/client` chunk is over 500 kB. It loads only on the first coach click.
