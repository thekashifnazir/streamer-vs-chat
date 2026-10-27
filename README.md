# Streamer vs Chat

Twitch chat is the boss's brain; the streamer's body is the defence. Guard blocks straight attacks, lean dodges swings, and punches add bonus damage. [SPEC.md](SPEC.md) defines the rules; [docs/HUD.md](docs/HUD.md) defines the Rails layout.

Requires Node **22.12+** and npm. Install with `npm ci`. Twitch development also needs the [Twitch CLI](https://dev.twitch.tv/docs/cli/).

## Play the offline demo

```sh
npm run demo
```

Open **http://localhost:4173/**. Confirm your clear space, then press **K → A → J** through the three-step tutorial. Keyboard works immediately; optional webcam mode reuses the accepted lite CPU classifier and calibration. Select0/3/50/500 simulated viewers, use seated or no-punch mode, and play best of three. Sound starts off. Esc or STOP freezes the game; Resume continues it.

```sh
npm run build:demo
```

Produces `dist-demo/` with all runtime assets, one SIMD WASM binary, the vendored lite model, local fonts, boss art, SFX and voices. No login, CDN or external runtime downloads. The builder/preview never loads `.env` or the server token store. The complete bundle is about25 MB raw /15 MB gzip; pose-only assets are about8.4 MB gzip. See [demo and deployment notes](docs/DEMO.md).

## Twitch development

```sh
npm run dev:mock
```

Starts CLI mock8080 → chat injection shim8081 → server3000 and Vite5173. Open [capture](http://localhost:5173/capture) and [overlay](http://localhost:5173/overlay). Add the overlay as a1920×1080 OBS Browser Source, with the webcam source beneath its transparent centre. Use a normal Chrome window for capture.

After `channel.chat.message active (SIMULATED)`:

```sh
curl -X POST localhost:8081/inject -H 'Content-Type: application/json' \
  -d '{"user":"viewer-1","text":"!jab"}'
```

An empty POST also injects `!jab`. Before a match starts, the input preview shows JAB1 and SIMULATED CHAT. Confirm clear space and press **START MATCH** in capture when ready. During a fight the server resets votes every2400 ms, keeping each viewer's latest eligible command. SUPER is accepted only at full hype and below the three-super cap. Attacks use a weighted draw, including autopilot when nobody votes.

Mock moderation and results stay local:

```sh
curl -X POST localhost:8081/inject -H 'Content-Type: application/json' -d '{"role":"mod","text":"!veto"}'
curl -X POST localhost:8081/inject -H 'Content-Type: application/json' -d '{"role":"mod","text":"!resume"}'
curl -X POST localhost:8081/inject -H 'Content-Type: application/json' -d '{"role":"broadcaster","text":"stop"}'
curl localhost:8081/results
```

The shim provides EventSub-shaped chat notifications and proxies other mock subscriptions. Twurple's API and socket both use **8081** via explicit `mockServerPort:8081`, `url:ws://127.0.0.1:8081/ws` and `TWURPLE_MOCK_API_PORT=8081`. For future non-chat mock events, use the exact session/subscription IDs from `getCliTestCommand()`:

```sh
twitch event trigger <event> -T websocket --session <id> -u <subscription-id>
```

Never send scripted chat to a live channel. Mock mode skips auth/token loading; live sessions reject simulated votes/results.

### Live chat

Copy `.env.example` to `.env`, fill the app credentials locally, and register **http://localhost:3000/callback** exactly. Run `npm run dev`, then visit [account setup](http://localhost:3000/auth). Authorize two different accounts:

- Bot: `user:read:chat user:write:chat user:bot`.
- Broadcaster: `channel:bot clips:edit`.

The server stores/refreshes both identities in gitignored owner-only `tokens.json`. Start the match from capture; round results are sent in the bot's user context, at most once per10 seconds with a three-message drop-oldest queue. No results are generated before explicit START. Viewer count is polled every60 seconds, with0 offline. Round two starts after a short results pause unless stopped; START MATCH resets the match.

Only broadcaster plain `stop` and moderator/broadcaster `!pause`, `!veto`, `!resume` are accepted from chat. Veto cancels the pending attack and freezes the clock. Capture Esc/STOP also freeze immediately; disconnected or stale capture inputs do not survive resume. Clear `TWURPLE_MOCK_API_PORT` before live development.

Kash has verified the two-account login with `streamervschatbot`/`kashruns` and the accepted Logitech pose input on the Mac. This change does not alter the classifier. [Capture and fixture instructions](docs/CAPTURE.md) remain applicable.

## Tests and balance

```sh
npm test
npm run sim
npx tsc --noEmit
```

Tests use local transports or mocked Twitch modules. All50 golden vectors run through the same pure `step(state,event,now)` reducer used by the server, browser demo and balance sim. The sim runs4000 single rounds per cell across five player models and0/3/50/500 viewers; it fails if casual wins leave30–70% or no-punch falls below30%. GitHub Actions runs `npm ci`, tests, sim and offline build.

[Day3 verification and balance results](docs/day3-review.md). Clips, cheers/subscriptions/raids, and day6 feel/mix tuning remain later work.
