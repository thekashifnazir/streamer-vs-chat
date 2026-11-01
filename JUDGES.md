# Streamer vs Chat: notes for judges

Two ways to play: **Boss Fight** (Twitch chat votes the boss's attacks; the streamer blocks and dodges on camera) and **Crowd Trainer** (chat votes the combo the streamer throws, like a boxing class calling numbers). Start with the 90-second path; the 60-second Crowd Trainer path, the five-minute tour and the detail follow.

**Address:** https://streamervschat.kashifnazir.com. The no-login demo is free. The Workers fallback is https://streamer-vs-chat.kash-553.workers.dev.

## The 90-second path

1. **Open the homepage:** [streamervschat.kashifnazir.com](https://streamervschat.kashifnazir.com). The big **PLAY ON YOUR TWITCH STREAM** button is the real game on your own stream (`/play`, Twitch login). The **Try it now · fake chat, no login** box under it is the demo: no login, no install; chat is simulated and badged **SIMULATED**.
2. **In Try it now, pick Keyboard and press TRY THE DEMO** (on a computer the page starts on **Webcam**; your choice is remembered). Do the short practice (**K → A → J**).
3. **Follow the callouts.** Each warning names the defence: **GUARD!** → hold **K**; **LEAN LEFT!** → hold **A**; **LEAN RIGHT!** → hold **D**. You have 1.0 s on Medium.
4. **Watch for the scouting card in round 2.** If you keep dodging to one side, a card on the left rail shows chat your habit; if chat keeps voting one move, a card on the right rail tells you. It needs enough evidence, so it may not appear every match; [the scout preview](https://streamervschat.kashifnazir.com/?scout=fast) (badged **SCOUT PREVIEW · SIMULATED**) shows it in round 1.
5. **Press Esc** to pause: Resume / Restart / Quit to setup. Browser **Back** pauses too; Back again returns to the homepage.

## The 60-second Crowd Trainer path

For fitness and boxing or martial-arts streamers, and any streamer who wants chat to be part of a workout.

1. **Open [streamervschat.kashifnazir.com/?mode=trainer](https://streamervschat.kashifnazir.com/?mode=trainer).** Chat is simulated and badged **SIMULATED**.
2. **Read the code.** **1** = left (lead) hand, **2** = right (rear) hand, **S** = slip (a lean), **G** = guard. On the keyboard: **F** = 1, **J** = 2, **A/D** slip, **K** guard.
3. **Throw what chat calls.** Chat votes combos such as `!12` (one-two), `!112`, `!121`, `!1212`, `!12s` (one-two, slip), `!s12`, `!12g` (one-two, guard) and `!2s2`, and votes the pace with `!faster` / `!slower`.
4. **Watch the score.** Each combo is scored leniently: **CLEAN**, **PARTIAL** or **MISSED**. Options: **Southpaw**, and **any hand counts**.
5. **Finish.** Three 60 s rounds with 20 s rest, then a workout summary. It makes no calorie or medical claims.

The camera reads only which hand, slips and guard; it can't tell a jab from a hook or measure force ([what the webcam can and can't see](docs/WEBCAM.md)).

### What to look for

- **Chat is the opponent, the body is the controller.** Vote bars pick the next attack; the callout names the defence, and you answer with your hands or a lean (keys here).
- **Both sides scout each other.** Chat learns your dodge habit; you learn chat's favourite move and can pre-hold the counter for **READ IT** and +25% counter damage.
- **Nothing unfair reaches the fight.** A Forge boss only fights after validation and the balance gate, which simulates its before/after win rates.

## 1. What's live and what's simulated

| Where | Chat | Labelled |
|---|---|---|
| The no-login demo (this address; the README GIF) | Simulated crowd of 0, 3, 50 or 500 viewers | **SIMULATED** badge on screen |
| `/play` (Try it on your channel) | Your own real Twitch chat; optional hosted bot results | Twitch chat connected |
| Local live server + OBS | Real Twitch chat; the bot posts results | LIVE transport status |
| Local mock server + OBS | Local simulated chat | SIMULATED CHAT |

Simulated chat is never sent to a live Twitch channel.

## Two ways to go live

**Advanced (OBS)** is the documented path: expand the Mac/Windows guide, complete video/audio setup and press “Done, it's in OBS”. **Quick (this page, no OBS)** is an experimental shortcut that uses Twitch's undocumented WHIP ingest: open [/play](https://streamervschat.kashifnazir.com/play), Connect Twitch, then Go live. Grant the extra stream-key permission only when requested; share this Chrome tab with tab audio. The key remains in memory. **MEASURED 31 Oct:** Kash's prep test returned 201, connected in under one second and was visible on twitch.tv/kashruns. Later on 31 Oct, going live from the page was **MEASURED** working on twitch.tv/kashruns: a viewer saw only the fight stage with the camera bubble, and the deployed app's own Go live was used live on kashruns (a pause bug seen in that run was then fixed in `3677761`). Skip is available if already live. Then choose Webcam (calibration, clear space and countdown) or Keyboard (no camera or checkbox). More: [docs/HOSTED.md](docs/HOSTED.md).

## 2. Five-minute tour

Chat Golem commands (first word, case-insensitive): **!jab (!j)** = guard; **!left (!l)** = hook from the left → **you lean right**; **!right (!r)** = hook from the right → **you lean left**; **!combo (!c)** = guard; **!super (!s)** = follow all three displayed GUARD / LEAN steps, only at full hype. Custom Forge bosses use exactly their displayed commands. Keyboard K / A / D / J controls the streamer.

1. **Play a round on the keyboard.** Open the address, pick **Keyboard** in **Try it now** and press **TRY THE DEMO**, then practise: press **K → A → J** (hold **K** to guard, hold **A/D** to lean, **J** for bonus punches). With **Defence only**, the tutorial is **K → A → D**. Difficulty initially selects **Medium** (3.0 s beats, 1.0 s warnings). The **Options** disclosure also offers Easy, Hard and Expert, applying at the next match; Hard has the original 0.8 s warning. When the warning appears it names the defence: **GUARD!** for a JAB or COMBO, **LEAN RIGHT!** for HOOK L, **LEAN LEFT!** for HOOK R (TILT instead of LEAN when seated); **SUPER!** shows all three guard/lean steps up front; follow each highlighted step. The spoken "hands up" line plays at most once per round. **Esc Pause** (or the on-screen button) opens Resume / Restart / Quit to setup at any time, including between rounds. Clean defences fill **FOCUS**. At **FINISHER READY**, hold **K** (guard) for **1 s** in a gap between attacks: **FINISHER!** deals **4 damage** and opens a **3 s** double-punch window. No punches are required to trigger it, and the boss keeps attacking on its normal schedule.
2. **Change the crowd.** Between rounds, set **Crowd** (in the bar under the fight screen) to **500 viewers**; the next round or a **New match** uses it, so watch the vote bars. The selector only appears between rounds. The attack is drawn by vote share, so a big chat stays unpredictable.
3. **[See the scouting card in one round](https://streamervschat.kashifnazir.com/?scout=fast).** This demo-only preset lowers the evidence threshold and is badged **SCOUT PREVIEW · SIMULATED**. Keep making successful same-side dodges in round 1 to reveal it. For production scouting, open the normal address and lean the same way most of the time in round 1. From round 2, enough consistent successful dodges can show your habit on the left rail (at least 12 samples, ≥65% share and a confidence bound); it is not guaranteed every match. Balance your last eight dodge leans to clear it and heal up to 10 HP. If chat repeats one move enough, a right-rail card reveals it: pre-hold that card's correct defence before the tell, then defend successfully for **READ IT** and +25% automatic counter damage.
4. **Webcam.** In **Try it now** choose **Webcam** (the default on a computer) and press **TRY THE DEMO**, select Standing/Seated, confirm clear space, and press **Turn on camera**. Choosing the webcam preselects **Easy** (1.2 s warnings, labelled "Recommended for webcam") unless you already picked a level; webcam leans take about 0.4 s to register. Follow relaxed / hands-at-waist / guard / left / right cues. Keep head, shoulders and both wrists in frame; press **START WEBCAM FIGHT** when enabled. Guard is wrists above elbows near the face; lean is shoulder tilt, with directions belonging to the player, not the mirrored preview.

## 3. Checking the build

```sh
git clone https://github.com/thekashifnazir/streamer-vs-chat && cd streamer-vs-chat
npm ci && npm test && npx tsc --noEmit && npm run sim && npm run build:demo
```

Clone and `npm ci` need network access to download the repository and packages. After installation, tests, type-check, sim and build need no key or external network. **MEASURED 31 Oct** on a fresh clone at `74cc38d`: 1,029 offline tests pass, and the sim output is identical to `0be805d`.

Three end-to-end browser suites were run by the team outside this repo; not included. **MEASURED** at `74cc38d`: demo flows 8/8 (including a bot-played best-of-3 and the webcam path fed a recorded clip as a fake camera), a hosted `/play` journey 9/9 with Twitch and the Worker mocked in the browser, and responsive/a11y checks at 6 widths in Chromium and WebKit with Lighthouse accessibility 100 on `/` and `/play`.

The Codex session ID is `01a17e04-f4f0-7d12-ac96-ff47bf3cc88f`. The entry was built mostly with Codex on a Plus plan: Kash directed, and that one thread made 57 code commits up to its last turn (`3677761`, 31 October). Kash kept the work in Codex through repeated usage limits with short continues after each reset. With the weekly limit used up (4% left on 1 November, reset 5 November, after the deadline), the entry was finished with Claude Code: mostly polish and bug fixes from live tests, plus Crowd Trainer and recorded voice lines, every commit labelled "(Claude Code)". The measured split and the command to reproduce it: [How Codex built this](README.md#how-codex-built-this), [Finished with Claude Code](README.md#finished-with-claude-code), [usage-limit timeline](docs/codex-evidence.md#usage-limits-and-continues).

## 4. Known limits

- Punches are optional bonus damage; no-punch mode keeps automatic defence counters.
- The webcam needs Chrome and reasonable light. Webcam leans take about 0.4 s to register, so Easy is recommended (and preselected) for webcam play. It reads guard, lean and roughly which hand punched; it can't read punch type, force, footwork or kicks ([docs/WEBCAM.md](docs/WEBCAM.md)).
- Not yet checked live in this build: bot result lines, clips, `!forge` and sound on stream (OBS audio). The first three are deployed with their flags on.
- Going live from the page is experimental (undocumented WHIP ingest); OBS is the documented path.
- `/play` reads chat; bot results, clips, hosted Forge and viewer memory each need their deployed flag and, where relevant, a Twitch grant (`channel:bot`, `clips:edit`). Clips need a live stream at least 60 seconds old; viewer memory is unchecked by default and never stores chat text. Details: [docs/HOSTED.md](docs/HOSTED.md).
- The loaded no-login demo runs without network requests; reloading offline is not supported because there is no service worker. For a fully local copy, run `npm run demo`.
- **Esc Pause** opens Resume / Restart / Quit to setup, including during practice. Webcam Resume retains fresh-frame/safety checks. The demo enables sound at TRY THE DEMO; M mutes. On the demo, browser **Back** pauses a running round and Back again (or Back from results or webcam setup) returns to the homepage. Round results auto-advance after five seconds.
- The local `/capture` page starts **INPUTS LOCKED**: tick **My space is clear** and press **Resume inputs** before **START MATCH**. Webcam input additionally requires valid calibration and a fresh framed pose.
