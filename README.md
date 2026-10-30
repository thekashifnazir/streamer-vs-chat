<p align="center"><img src="docs/img/cover.png" alt="Streamer vs Chat: Twitch chat controls the boss, the streamer defends on camera" width="900"></p>

<h3 align="center">Twitch chat is the boss's brain. Your body is the defence.</h3>

<p align="center">Chat votes the boss's next attack; you choose the difficulty. You block with your hands and dodge with a lean, on webcam, live.</p>

<p align="center">
  <a href="https://streamervschat.kashifnazir.com"><b>Play now, no login</b></a> ·
  <a href="https://streamervschat.kashifnazir.com/play"><b>Try it on your channel</b></a> ·
  <a href="[VIDEO_URL]"><b>3-min demo</b></a> ·
  <a href="[DEVPOST_URL]"><b>Devpost</b></a>
</p>

<p align="center"><img src="docs/img/hero.gif" alt="SIMULATED local HUD recording: HANDS UP!, a successful block and counter damage" width="720"></p>

<p align="center">
  <a href="https://streamervschat.kashifnazir.com"><img src="https://img.shields.io/badge/%E2%96%B6%20Play%20now-no%20login-9146FF?style=for-the-badge" alt="Play now, no login" height="44"></a>
</p>
<p align="center">
  <a href="#how-codex-built-this"><img src="https://img.shields.io/badge/Built%20with-OpenAI%20Codex-000000?style=for-the-badge&logo=openai&logoColor=white" alt="Built with OpenAI Codex"></a>
  <a href="#how-it-works"><img src="https://img.shields.io/badge/Twitch-EventSub%20%C2%B7%20Helix%20%C2%B7%20Clips-9146FF?style=for-the-badge&logo=twitch&logoColor=white" alt="Twitch EventSub, Helix and Clips"></a>
  <a href="#how-it-works"><img src="https://img.shields.io/badge/MediaPipe-Pose-0097A7?style=for-the-badge" alt="MediaPipe Pose"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/Node-22%20%C2%B7%20TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="Node 22 and TypeScript"></a>
  <a href="#tests-and-balance"><img src="https://img.shields.io/badge/tests-651%20offline-5C5850?style=for-the-badge" alt="651 offline tests"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/licence-MIT-5C5850?style=for-the-badge" alt="Licence: MIT"></a>
</p>

**Codex × TwitchCon Hackathon** · entry code written in one main Codex thread, October 2026 · Codex session ID `01a17e04-f4f0-7d12-ac96-ff47bf3cc88f`

**Built with** OpenAI Codex · Twitch EventSub, Helix and Clips (Twurple) · MediaPipe Pose Landmarker · Node 22 + TypeScript · OBS · Cloudflare Workers

Most chat games ask chat to spam and the streamer to watch. Here chat runs the boss and the streamer has to physically survive it. The game also learns habits on both sides: it tells chat "DODGES LEFT 83%", and it tells the streamer what chat keeps voting. So chat stops spamming and starts coaching. One viewer is enough to play.

| Headline result | |
|---|---|
| Medium casual / no-punch win rates, ordinary round 1, 0 to 500 viewers · **INFERRED** player models | **66.1–70.1% / 50.4–54.6%** |
| Hard casual / no-punch win rates, four ordinary/coordinated R1/R2 matrices · **INFERRED** player models | **54.7–70.0% / 39.7–57.4%** |
| Real live Twitch chat to server · **MEASURED** on Kash's Mac | **p95 291 ms** ([measurement](docs/prompts/day0-kickoff.txt)) |
| Simulated load, 1,000 chatters: ingest to HUD · **MEASURED** | **p95 104 ms**, 12 ms worst beat drift, 0 dropped votes ([LOAD.md](docs/LOAD.md)) |
| Offline tests (unit, golden vectors, recorded pose clips, transports) | **651**, no Twitch or external network |

## How to play

Chat Golem commands (first word, case-insensitive): **!jab (!j)** = guard; **!left (!l)** = hook from the left → **you lean right**; **!right (!r)** = hook from the right → **you lean left**; **!combo (!c)** = guard; **!super (!s)** = follow all three displayed GUARD / LEAN steps, only at full hype. Custom Forge bosses use exactly their displayed commands. Keyboard K / A / D / J controls the streamer.

### Try it in 60 seconds

1. Open **[streamervschat.kashifnazir.com](https://streamervschat.kashifnazir.com)**. No account, no install. A loaded demo keeps running offline; reloading offline is not supported because there is no service worker.
2. Choose **Standing** or **Seated**, optionally **No punches**, and tick **My space is clear and I can move comfortably.** Follow the tutorial: **K → A → J** (or **K → A → D** with no punches). Difficulty starts at **Medium**; the control below the game offers Easy / Medium / Hard / Expert. Webcam is optional.
3. Simulated chat (badged **SIMULATED**) plays the boss. When **HANDS UP!** appears you have 1.0 s on Medium: guard a JAB or COMBO, lean right for HOOK L, left for HOOK R. SUPER has a longer warning and three highlighted guard/lean steps. Hard retains the original 0.8 s warning. Clean defences fill **FOCUS**. At **FINISHER READY**, hold **K** (guard) continuously for **1 s** in a gap between attacks: the FINISHER deals **4 damage**, then gives **3 s** of double-damage bonus punches. It works with no punches too; attacks keep their normal schedule.
4. **[See the scouting card in one round](https://streamervschat.kashifnazir.com/?scout=fast)** with the demo-only **SCOUT PREVIEW · SIMULATED** preset and repeated successful same-side dodges. Normal play keeps the full evidence threshold from round 2: your lean habit on the left rail for chat, chat's repeated move on the right rail for you.

Judges: [JUDGES.md](JUDGES.md) has a five-minute tour, what is live versus simulated, and the known limits.

### Stream it on your channel in 5 minutes

1. Open **[/play in Chrome](https://streamervschat.kashifnazir.com/play)** and press **Connect with Twitch**. It requests chat-read access, `channel:bot` for optional bot results, and `clips:edit` for optional hosted clips.
2. In OBS, add **Window Capture** of that Chrome window.
3. Tick **Green background**, then add an OBS **Chroma Key** filter and crop the capture to the game.
4. Keep your webcam as a normal OBS camera source below the game. After connecting, setup collapses to a one-line bar; **Expand** brings the controls back.

`/play` can post structured round results through the hosted bot and make confirmed clips when their hosted flags are enabled. Boss Forge and live viewer memory still use the [local-server path](docs/DEVELOPMENT.md). Five minutes is the setup guide, not a measured completion time.

## Why it's different

- **Your body is the controller, but only where it's reliable.** Guard and lean decide every hit; punches are bonus damage, because on unseen people punch detection was much less reliable than guard and lean. Keyboard, seated and no-punch modes play the same game.
- **Two-way scouting.** From round 2, at least 12 successful dodge leans plus share and confidence bounds can reveal your dominant side to chat. Fix the habit and you heal. Chat gets read too: pre-hold the right defence against chat's favourite move for +25% counter damage and **READ IT**.
- **Balanced by a gate, not a feeling.** Every change runs the same reducer through 4,000-round simulations per cell at 0, 3, 50 and 500 viewers, and CI fails if a Hard casual player's win rate leaves 30–70%. A feature that broke the gate (CHAT SYNC) was cut, not tuned around ([review](docs/queue11a-review.md)).
- **Chat designs the next boss.** `!forge <idea>` asks OpenAI for a boss, and code validates, moderates and balance-tests it before it can fight ([Boss Forge](#boss-forge)).
- **Safe on stream.** A clear-space check before every match. Esc / STOP or the broadcaster typing "stop" freezes play, and mods can `!pause` or `!veto`. Viewer memory stores no chat text, and `!forgetme` deletes a viewer's record.

## How it works

```mermaid
flowchart LR
    TC[Twitch chat<br/>EventSub WebSocket] --> S[Server<br/>pure step reducer<br/>votes each beat]
    CAM[Webcam<br/>MediaPipe Pose in Chrome] --> CAP[Capture page<br/>guard · lean · punch]
    KEY[Keyboard K / A / D / J] --> CAP
    CAP -- inputs over ws --> S
    S -- state over ws --> HUD[Rails HUD<br/>OBS Browser Source]
    S --> BOT[Bot posts round results<br/>max 1 per 10 s]
    S --> CLIP[Clips API<br/>KO · PERFECT · comeback]
    S -. between rounds .-> FORGE[Boss Forge<br/>OpenAI + validate + balance]
```

In the local Node/OBS flow, the server owns all game state; the HUD is a view and capture supplies inputs. The no-login demo and hosted `/play` own state in the browser. The same pure `step(state, event, now)` reducer runs in the server, the balance sim, the no-login demo and the hosted `/play` page, so what judges play is what streamers run.

| Mode | Chat | Needs |
|---|---|---|
| No-login demo | Simulated, badged | A browser |
| [Try it on your channel](https://streamervschat.kashifnazir.com/play) | Your real Twitch chat; optional hosted bot results | A Twitch login |
| Local live + OBS | Real chat, bot posts results, clips, viewer memory, Boss Forge | Node 22, a Twitch app, two accounts; optional OpenAI key for generated bosses |

### Hosted backend

The Worker serves `/api` and keeps a separate Durable Object result queue per authenticated channel. `/play` never posts chat with the streamer's token: the bot sends only server-formatted round results, HYPE notices and verified clip links, at most once per 10 seconds. “Post results in chat (as streamervschatbot)” defaults on only when the deployed bot flag and `channel:bot` grant are present. Delivery failures show a status line and leave play running. All hosted flags are committed off; Claude configures public app/bot IDs and the Worker secret before deploying. Older chat-only tokens keep working and can reconnect to enable results or clips. Hosted clips use the browser’s in-memory user token, require `clips:edit` and a stream at least 60 seconds old, and appear only after Get Clips confirmation within 15 seconds. Stale/unconfirmed moments stay stats-only; hosted mode has no local replay. The bot independently verifies each clip belongs to the authenticated channel before posting its link.

| Hosted roadmap stage | Status |
|---|---|
| Bot round results and HYPE notices | Implemented, flag off pending deployment/live check |
| Clips | Implemented, flag off pending deployment/live check |
| Boss Forge | Local server and prebaked demo; hosted stage pending |
| Viewer memory | Local server and simulated demo; hosted opt-in stage pending |

## Results

Balance below is from the final 13g-2 `npm run sim` at `0be805d` (4,000 rounds per cell). Every balance row is **INFERRED**, using assumed player models, not measured human win rates. Viewer columns in the first four rows are **0 / 3 / 50 / 500**. Load and soak figures come from saved 28 October local measurements. [Difficulty results](SPEC.md#13-difficulty-levels) cover all four levels.

| What | Result |
|---|---|
| Medium casual, ordinary round 1 · **INFERRED** | **70.1 / 69.3 / 67.7 / 66.1%** |
| Medium no-punch, ordinary round 1 · **INFERRED** | **53.8 / 54.6 / 50.4 / 52.2%** |
| Hard casual, ordinary round 1 · **INFERRED** | **56.8 / 57.0 / 55.8 / 54.7%** |
| Hard no-punch, ordinary round 1 · **INFERRED** | **43.5 / 44.0 / 40.3 / 39.7%** |
| Hard casual, all four ordinary/coordinated R1/R2 matrices · **INFERRED** | **54.7–70.0%** |
| Hard no-punch, same four matrices · **INFERRED** | **39.7–57.4%** |
| Real live Twitch chat to server · **MEASURED**, Kash's Mac | **p50 218 ms / p95 291 ms** ([measurement](docs/prompts/day0-kickoff.txt)) |
| Golden vectors through the shared reducer | **59** |
| Simulated 1,000-chatter local load · **MEASURED** ingest-to-HUD p95 / worst beat drift / dropped votes | **104 ms / 12 ms / 0** |
| 30-minute soak: server heap growth after warm-up | **+6.3182%** (gate under 20%) (measured 28 October; recomputed from the saved heap samples) |

How each number is produced, and the command that reruns it: [Tests and balance](#tests-and-balance), [LOAD.md](docs/LOAD.md), [Ship review](docs/queue13e-review.md).

## Real playtests

To be filled by Kash from real sessions only: **[players]**, **[real chat votes]**, **[quote + Twitch name with permission]**. Simulated crowds, balance rounds and load-test votes do not fill these fields.

## Run it locally

Needs Node **22.12+**, npm and Chrome. The Twitch steps also need the [Twitch CLI](https://dev.twitch.tv/docs/cli/).

```sh
npm ci
npm run demo          # no-login demo on http://localhost:4173, no keys, no network
npm run dev:mock      # stop demo first; full stack with local mocked Twitch
```

For your own live channel: copy `.env.example` to `.env`, register `http://localhost:3000/callback` on a Twitch app, run `npm run dev`, open http://localhost:3000/auth and authorise a bot account (`user:read:chat user:write:chat user:bot`) and your broadcaster account (`channel:bot clips:edit bits:read channel:read:subscriptions`). Open http://localhost:5173/capture in Chrome, tick clear space, then press **Resume inputs** before **START MATCH**. Add http://localhost:5173/overlay as a 1920×1080 OBS Browser Source over your webcam. Full steps, OBS setup and the mock commands: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

### Tests and balance

```sh
npm test              # offline; never calls Twitch or OpenAI
npm run sim           # balance gate, 4,000 rounds per cell
npx tsc --noEmit
npm run build:demo    # static no-login build in dist-demo/
```

GitHub Actions runs all four plus a two-minute local soak on every push.

## Boss Forge

In the no-login demo, open **Boss Forge**, pick one of four prebaked bosses—Neon Kraken, Tin Tactician, Velvet Sentinel or **Nak Muay** (Muay Thai)—or edit its JSON, then **Validate & balance**. It runs locally with no key. On a live channel, chat sends `!forge <idea>`; the server asks OpenAI (`gpt-6-luna`, one repair turn) with `OPENAI_API_KEY` from `.env`, then validation, moderation and the balance gate decide whether the boss can fight. Ideas never reach the announcer's voice. Details: [docs/boss-forge-review.md](docs/boss-forge-review.md).

## How Codex built this

One main Codex thread wrote all entry code, using subagent lanes for focused work. Claude Code on Kash's Mac queued each task into that thread with `codex exec resume`. Devin wrote task prompts and reviewed results; Kash performed the camera, Twitch and physical playtests. Reviews were **independent subagent passes before each commit**.

Evidence snapshot: **29 October 2026, 23:43 UTC**, before this 13h change. Counts come from the real root rollout and git; [definitions and reproduction](docs/codex-evidence.md).

| | |
|---|---|
| Main Codex thread (submit this ID) | `01a17e04-f4f0-7d12-ac96-ff47bf3cc88f` |
| Root turns started / completed | **52 / 51**, including the active 13h turn; **29** completed turns issued tools, while **22** completed without tools (including usage-limit retries) |
| Commits on `main` through `0be805d` | **38** |
| Tests over the build | 19 on day 1 → **651** passing in [13h verification](docs/queue13h-review.md); **642** at the `0be805d` snapshot |
| Scratch resume probe, temporary directory | `01a17fb6-76f6-78f2-9c20-e7926e5aba23` · `/private/tmp/cx-resume-test`; no entry code |
| Scratch resume probe, Mac directory | `01a17fb7-0a50-70b1-af8e-edcee261d14d` · `/Users/kash/cx-resume-test`; ONE/TWO/THREE replies tested resume, no entry code |

What the live tests and reviews caught, each fixed in the thread:
1. **Guard flickered while leaning**: on stream every lean would have dropped the block. Fixed with a lean-invariant guard and hysteresis (`0c75cd7`, `3c7a268`).
2. **Hands resting at the waist read as guard**: a streamer at rest would have blocked everything. Fixed with an anatomical wrist/elbow/torso gate (`0f7707f`).
3. **CHAT SYNC failed the balance gate in both tuning attempts**, so it was removed rather than loosening the gate ([review](docs/queue11a-review.md)).

`AGENTS.md` holds the rules Codex followed (the local server owns state in server mode; browser modes use the same shared reducer; no real Twitch in tests; pose changes need a recorded-clip test). Findings and checks are in the linked day and queue review documents.

## Known limits

- **Punches are optional bonus damage.** Punch detection is less reliable on unseen bodies than guard and lean; no-punch mode keeps automatic defence counters.
- **Camera needs Chrome**, not the OBS Browser Source, and decent light; lost tracking releases held pose inputs.
- **Hosted features are flagged off by default.** `/play` reads chat; its optional Worker bot posts formatted results when enabled. Viewer memory and Boss Forge still need the local server; hosted clips are optional behind their own flag.
- **Clips need a live stream at least 60 seconds old**; otherwise the session card shows stats (or a local replay in local server mode).
- **Boss Forge's real-model path needs your own OpenAI key**; the tests use injected fake clients.

## More

- **Rules and numbers:** [SPEC.md](SPEC.md). **HUD layout:** [docs/HUD.md](docs/HUD.md).
- **Developer guide** (OBS, mock Twitch, live chat, highlights, viewer memory, hardening): [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
- **Accessibility:** keyboard, seated and no-punch modes, a 36 px HUD font floor, calm FX (`?fx=calm` or reduced motion), sound off by default ([day 5](docs/day5-review.md), [day 6](docs/day6-review.md)).
- **Assets and licences:** [CREDITS.md](CREDITS.md).

## What's next

- **More fighting styles with the same detection.** Boss data supplies names, timing and damage within the validator and balance gates; detection stays guard, lean left, lean right and either lean. Nak Muay already adds TEEP, LEFT ELBOW, RIGHT ELBOW and CLINCH KNEES using those same reads; more styles can follow without new detection.
- **Other games on the same body input:** dodgeball, rhythm or fitness rounds where chat sets the pattern and the streamer moves to it.
- **A Twitch Extension** so viewers vote by clicking the video instead of typing (future work).

## Licence

MIT for the code: see [LICENSE](LICENSE). Fonts, sounds, art and voice lines keep their own licences, listed per file in [CREDITS.md](CREDITS.md).
