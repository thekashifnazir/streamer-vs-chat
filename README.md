# Streamer vs Chat

Twitch chat is the boss's brain; the streamer's body is the defence. Day 1 builds the chat plumbing and a Rails HUD preview. [SPEC.md](SPEC.md) governs the game; [docs/HUD.md](docs/HUD.md) governs the layout.

Requires Node **22.12+** (Node 22 recommended), npm, and the [Twitch CLI](https://dev.twitch.tv/docs/cli/). Install dependencies with `npm install`.

## Mock development — no login

```sh
npm run dev:mock
```

Starts the Twitch CLI WebSocket mock on 8080, the chat injection shim on 8081, the Node server on 3000, and Vite on 5173. Wait for `channel.chat.message active (SIMULATED)` in the terminal, then open [the overlay](http://localhost:5173/overlay/) or add that URL as an OBS Browser Source at **1920 × 1080**. The centre is transparent for your camera source beneath it. Capture is a placeholder at [the capture page](http://localhost:5173/capture/).

```sh
curl -X POST localhost:8081/inject \
  -H 'Content-Type: application/json' \
  -d '{"user":"viewer-1","text":"!jab"}'
```

The overlay shows **JAB 1** and **SIMULATED CHAT**. An empty `curl -X POST localhost:8081/inject` also injects `!jab` from `simulated-viewer`. Change `text` to `!hookl` for the same `user`: JAB becomes 0 and HOOK L becomes 1. New users add votes. All five commands parse case-insensitively, only in the first word. SUPER is ignored while the placeholder hype remains 0.

This is an input monitor: each viewer's latest eligible choice persists **until server restart**. There are no beat timers, attacks or damage yet. HP, hype, round and clock are labelled placeholders. Mock input never loads live tokens or sends chat messages. Stop the stack with Ctrl-C; occupied ports cause a clear startup error rather than reusing an unknown service.

The shim proxies CLI WebSocket sessions and non-chat subscription HTTP requests, and supplies `channel.chat.message` subscriptions/notifications itself because the CLI cannot mock that type. Both the EventSub socket and subscription API go through **8081**, using `url: ws://127.0.0.1:8081/ws`, `TWURPLE_MOCK_API_PORT=8081`, and Twurple's explicit `ApiClient({ mockServerPort: 8081 })` option. The installed Twurple version requires that explicit option; the environment variable alone does not route its API.

Other event subscriptions arrive on day 4. When testing those, print the subscription's `getCliTestCommand()` and use its exact IDs:

```sh
twitch event trigger <event> -T websocket --session <id> -u <subscription-id>
```

A plain trigger with only `--transport=websocket` invents a subscription ID and Twurple drops it. Never send scripted messages to a live Twitch channel.

## Live development — two Twitch accounts

1. Create a Twitch developer application and register **http://localhost:3000/callback** exactly.
2. Copy `.env.example` to `.env`, then fill `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` locally.
3. Run `npm run dev`, then visit [account setup](http://localhost:3000/auth).
4. Authorize the **bot** account with `user:read:chat user:write:chat user:bot`.
5. Authorize a different **broadcaster** account with `channel:bot clips:edit`. Confirm which account Twitch displays for each authorization; switch Twitch accounts between steps as needed.
6. After both authorizations, wait for the EventSub subscription success log. Type a message yourself in that broadcaster's chat: it prints in the server log; attack commands update the overlay.

The server uses Authorization Code exchange and `RefreshingAuthProvider`. Tokens for both identities are stored in root `tokens.json` (gitignored, atomic writes, owner-only permissions), including refreshed tokens. Neither web page receives tokens. `.env` is gitignored too. Clear `TWURPLE_MOCK_API_PORT` before live development. Outgoing round result messages and rate limiting arrive with the engine; no outgoing chat is sent on Day 1.

## Validation

```sh
npm test
npx tsc --noEmit
```

Vitest runs local tests only. Real-login verification is a manual check with your own app and accounts; it is never part of the test suite. `sim`, `demo`, and `build:demo` scripts will arrive on days 3 and 5. No engine, pose, calibration, keyboard gameplay, audio, or round result handling is implemented in this step.

## Day 1 verification — 27 October 2026

Kash verified real Twitch authorization on the Mac with bot `streamervschatbot` and broadcaster `kashruns`, plus OBS. A manually sent `!jab` from a phone reached the server and showed JAB 1 on the live overlay without the simulated badge. The original 19 tests passed.

Both `/overlay` and `/capture` redirect to their trailing-slash URLs; regression tests start a local Vite server and check the redirect and final page response. Each incoming chat message is logged once with its display name and LIVE or SIMULATED label.
