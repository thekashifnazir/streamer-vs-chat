**[Play Streamer vs Chat — no login needed](https://streamervschat.kashifnazir.com)** · [Workers fallback](https://streamer-vs-chat.kash-553.workers.dev)

# Streamer vs Chat

Twitch chat is the boss's brain; the streamer's body is the defence. Guard blocks straight attacks, lean dodges swings, and punches add bonus damage. [SPEC.md](SPEC.md) defines the rules; [docs/HUD.md](docs/HUD.md) defines the Rails layout.

Requires Node **22.12+** and npm. Install with `npm ci`. Twitch development also needs the [Twitch CLI](https://dev.twitch.tv/docs/cli/).

## Play the offline demo

```sh
npm run demo
```

Open **http://localhost:4173/**. Choose standing or seated and optional no-punch mode on the start screen. Confirm your clear space, then press **K → A → J** through the three-step tutorial (**K → A → D** in no-punch mode). Keyboard works immediately; optional webcam mode reuses the accepted lite CPU classifier and calibration. Select 0/3/50/500 simulated viewers, use seated or no-punch mode, and play best of three. Sound starts off. Esc or STOP freezes the game; Resume continues it.

```sh
npm run build:demo
```

Produces `dist-demo/` with all runtime assets, one SIMD WASM binary, the vendored lite model, local fonts, boss art, SFX and voices. The no-login demo needs no CDN or external runtime downloads; optional `/play` connects to Twitch. The builder/preview never loads `.env` or the server token store. The complete bundle is about25 MB raw /15 MB gzip; pose-only assets are about8.4 MB gzip. See [demo and deployment notes](docs/DEMO.md).

## Play-test and record a cold open

Share **https://streamervschat.kashifnazir.com/** with friends. The offline demo has an optional **Count this local play-test** checkbox and **Copy local stats** button. Consent starts a fresh local sample; withdrawing clears it. JSON contains votes/min, unique anonymous simulated participants and rounds, labelled simulated. These are play-test counts, not evidence of live chat engagement. Hosted `/play` keeps its separate real-chat counts export.

**Rehearse 5-second cold open** starts one JAB with visibly simulated chat. Hold K or a calibrated webcam guard: the reducer must actually block it before BLOCKED! is shown. The shot starts with HANDS UP!, shows the actual defence, then highlights the tally. The rehearsal pauses after the first outcome; New match returns to normal play. Record the five seconds with OBS. A missed block is labelled a failed take. See [cold-open shot plan](docs/COLD-OPEN.md).

FX are presentation only: hit-stop and rail shake never pause combat, pose input, votes or telegraphs. `?fx=calm` removes shake and replaces slams with fades; reduced-motion preference also enables calm automatically. Sound starts off in the demo; OBS requests sound on, subject to browser autoplay permission. M toggles mute.

Capture now offers **Compare CPU / GPU** using your real camera, with warm-up and bounded sample collection. It stops gameplay inputs during measurement and selects the measured lower-latency delegate. CPU remains the accepted default until an actual comparison is run. [Mac measurement instructions](docs/capture-performance.md).

## Try it on your channel

Open **[Try it on your channel](https://streamervschat.kashifnazir.com/play)**. This hosted mode runs entirely in your browser, using the same game reducer as the offline demo and local server. Connect with Twitch, confirm clear space, and start with keyboard or a calibrated webcam. Standing, seated and no-punch choices remain available.

It requests **`user:read:chat`** to read messages from your own channel. It does not request chat-writing permission or post results to chat. OAuth uses the implicit flow; the token is removed from the URL immediately and kept only in this document's memory. Reloading or disconnecting signs you out; expired authorization shows Reconnect. LIVE mode never starts a simulated crowd. With no votes, the normal game-rule autopilot still chooses attacks.

For OBS:

1. Open `/play` in a normal Chrome window and connect Twitch.
2. Add **Window Capture** in OBS and select that window.
3. Enable **Green background** in the page; add an OBS **Chroma Key** filter set to green.
4. Crop to the game frame, check both Rails are visible, then go live.

Before the first fight, the page measures up to ten minutes of baseline chat. Each round counts as a fight. End session / Copy results exports counts and rates only: messages/min, unique chatters, accepted voters, fights played and session minutes. Chat text, usernames, IDs, hashes and the random session salt are never exported or persisted. Nothing is sent to an analytics service.

To configure a hosted build, register **both exact redirect URIs** on a Twitch application:

- `https://streamervschat.kashifnazir.com/`
- `http://localhost:5173/`

Set the **public** client ID in the build environment, then run `npm run build:demo` (or `npm run demo`). For example: `VITE_TWITCH_CLIENT_ID=your_public_client_id npm run build:demo`. The builder reads this variable explicitly and does not load `.env`. No client secret belongs in this build. For development login, run `VITE_TWITCH_CLIENT_ID=your_public_client_id npm run dev`, then open `http://localhost:5173/play`. The4173 preview and Workers fallback still serve the no-login demo; Twitch login uses the two registered origins above. `npm run dev` also serves `/play` on5173; the local Node + OBS Browser Source workflow below stays available. See [hosted-mode verification and Needs Kash](docs/stretch-2-review.md) for registration/login/deployment checks.

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

The shim provides EventSub-shaped chat notifications and proxies other mock subscriptions. Twurple's API and socket both use **8081** via explicit `mockServerPort:8081`, `url:ws://127.0.0.1:8081/ws` and `TWURPLE_MOCK_API_PORT=8081`. Cheer, subscription and raid mock subscriptions print their exact commands from `getCliTestCommand()`. Always keep the registered session/subscription IDs:

```sh
twitch event trigger <event> -T websocket --session <id> -u <subscription-id>
```

Run the isolated optional-event integration check with the Twitch CLI installed and the mock stack stopped:

```sh
npm run test:mock-events
```

It starts its own CLI and shim, uses the exact registered session/subscription IDs, verifies cheer/sub/raid effects in the real game session, and confirms chat injection still works. Its configuration and event cache are temporary; it does not load server credentials. Normal completion and Ctrl+C/termination clean up its services.

Never send scripted chat to a live channel. Mock mode skips auth/token loading; live sessions reject simulated votes/results.

### Live chat

Copy `.env.example` to `.env`, fill the app credentials locally, and register **http://localhost:3000/callback** exactly. Run `npm run dev`, then visit [account setup](http://localhost:3000/auth). Authorize two different accounts:

- Bot: `user:read:chat user:write:chat user:bot`.
- Broadcaster: `channel:bot clips:edit bits:read channel:read:subscriptions`.

Existing broadcaster tokens without the two added scopes keep chat working; reconnect the broadcaster account to enable cheers/subscriptions. Raid notifications need no added scope. Optional events are tested locally with the CLI mock; no scripted events are sent to live Twitch.

The server stores/refreshes both identities in gitignored owner-only `tokens.json`. Start the match from capture; round results are sent in the bot's user context, at most once per10 seconds with a three-message drop-oldest queue. No results are generated before explicit START. Viewer count is polled every60 seconds, with0 offline. Round two starts after a short results pause unless stopped; START MATCH resets the match.

Only broadcaster plain `stop` and moderator/broadcaster `!pause`, `!veto`, `!resume` are accepted from chat. Veto cancels the pending attack and freezes the clock. Capture Esc/STOP also freeze immediately; disconnected or stale capture inputs do not survive resume. Clear `TWURPLE_MOCK_API_PORT` before live development.

Kash has verified the two-account login with `streamervschatbot`/`kashruns` and the accepted Logitech pose input on the Mac. Guard and lean classification remain unchanged; no-punch mode disables punch detection and prompts. [Capture and fixture instructions](docs/CAPTURE.md) remain applicable.

## Highlights and the session card

Live KO, PERFECT and comeback moments request Twitch clips in the broadcaster's context. Requests are skipped during the stream's first minute. A Create Clip response alone never produces a link: the server polls Get Clips for up to 15 seconds and stores only confirmed IDs in gitignored `highlights.json`. Simultaneous moments share one request, prioritising KO, comeback, then PERFECT. A comeback means winning after dropping below 30 HP.

For a local fallback, enable **Local replay** in capture with the webcam running. It records camera video only in that browser; media is never uploaded. The moment is saved before polling so a timeout can use it. Download links stay in capture and disappear when the page closes. Without recording support, or when offline/creation fails, the card shows stats only. Recording keeps at most six saved replays /32 MB, with recording segments rotated every90 seconds.

Press **End session / show card** in capture to freeze play and show session stats, Chat MVP and the top three confirmed clips on the overlay. Match completion also shows the card. Chat MVP splits actual damage equally among counted voters for the selected move; autopilot earns no credit. The no-login demo has stats-only cards and never calls Twitch.

Seated mode uses its own calibration, TILT cues and narrower fading rails. No-punch mode removes punch detection and prompts; clean blocks and dodges retain the same automatic counter damage.

## Tests and balance

```sh
npm test
npm run sim
npx tsc --noEmit
```

Tests use local transports or mocked Twitch modules. All50 golden vectors run through the same pure `step(state,event,now)` reducer used by the server, browser demo and balance sim. The sim runs 4000 single R1 rounds per cell across five player models and 0/3/50/500 viewers, plus 4000 scouting-enabled R2 rounds per cell with real R1 evidence. Both matrices fail if casual wins leave 30–70% or no-punch falls below 30%; the scouting matrix also requires cards, exploits and fixes to occur. GitHub Actions runs `npm ci`, tests, sim and offline build.

[Day 4 verification, scouting results and optional-event semantics](docs/day4-review.md). Scouting begins in round 2; fixing a habit heals up to 10 HP. Cheers add capped hype, new subscriptions heal 8 HP, and raids start a 15-second Phase 2 with inferred raider weighting capped at half the draw. [Day 5 verification and highlight/accessibility notes](docs/day5-review.md). Day-6 feel/mix tuning remains later work.
