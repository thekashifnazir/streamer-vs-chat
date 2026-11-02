# Streamer vs Chat: notes for judges

Two ways to play: **Boss Fight** (Twitch chat votes the boss's attacks; the streamer blocks and dodges on camera) and **Crowd Trainer** (chat votes the combo the streamer throws, like a boxing class calling numbers). Start with the 90-second path; the 60-second Crowd Trainer path, the five-minute tour and the detail follow.

**Address:** https://streamervschat.kashifnazir.com. The no-login demo is free. The Workers fallback is https://streamer-vs-chat.kash-553.workers.dev.

## The 90-second path

1. **Open the homepage:** [streamervschat.kashifnazir.com](https://streamervschat.kashifnazir.com). The big **PLAY ON YOUR TWITCH STREAM** button is the real game on your own stream (`/play`, Twitch login). The **Try it now · fake chat, no login** box under it is the demo: no login, no install; chat is simulated and badged **SIMULATED**.
2. **In Try it now, pick Keyboard and press TRY THE DEMO** (on a computer the page starts on **Webcam**; your choice is remembered). Do the short practice: hold **K** (guard), then **A** and **D** (lean both ways), then **J** (punch).
3. **Follow the callouts.** Each warning names the defence: **GUARD!** → hold **K**; **LEAN LEFT!** → hold **A**; **LEAN RIGHT!** → hold **D**. You have 1.0 s on Medium. The **SIMULATED CHAT** panel shows the fake viewers' votes and the bot's result line.
4. **Finish a round, then press NEXT ROUND.** A knocked-out boss greys out under a **K.O.** stamp. After 1.5 s a scoreboard card shows the round score, your stats and a **Chat MVP · SIMULATED**. The next round waits for **NEXT ROUND** (no timer).
5. **Watch for the scouting card in round 2.** If you keep dodging to one side, a card on the left rail shows chat your habit; if chat keeps voting one move, a card on the right rail tells you. It needs enough evidence, so it may not appear every match; [the scout preview](https://streamervschat.kashifnazir.com/?scout=fast) (badged **SCOUT PREVIEW · SIMULATED**) shows it in round 1.
6. **Press Esc** to pause: Resume / Restart / Quit to setup. Browser **Back** pauses too; Back again returns to the homepage.

## The 60-second Crowd Trainer path

For fitness and boxing or martial-arts streamers, and any streamer who wants chat to be part of a workout.

1. **Open [streamervschat.kashifnazir.com/?mode=trainer](https://streamervschat.kashifnazir.com/?mode=trainer).** **Crowd Trainer** is selected under **CHOOSE YOUR FIGHT**. Pick **Keyboard** in **Try it now** and press **TRY THE WORKOUT**. Chat is simulated and badged **SIMULATED**.
2. **Read the code on the Your keys card.** **1** = left (lead) hand, **2** = right (rear) hand, **S** = slip (a lean), **G** = guard. On the keyboard press **1**, **2**, **S** or hold **G**, or use **F**, **J**, **A/D** and hold **K**. Press each move once to start the clock, or **Skip**. On webcam the card says **YOUR MOVES**: click **I'm ready** or hold your guard for 1 s. Each combo chip then shows its key.
3. **Throw what chat calls.** With sound on, a recorded coach voice calls each combo. Chat votes combos such as `!12` (one-two), `!112`, `!121`, `!1212`, `!12s` (one-two, slip), `!s12`, `!12g` (one-two, guard) and `!2s2`, and votes the pace with `!faster` / `!slower`.
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

**Advanced (OBS)** is the documented path: expand the Mac/Windows guide, complete video/audio setup and press “Done, it's in OBS”. **Quick (this page, no OBS)** is an experimental shortcut that uses Twitch's undocumented WHIP ingest: open [/play](https://streamervschat.kashifnazir.com/play), Connect Twitch, then Go live. Grant the extra stream-key permission only when requested; share this Chrome tab with tab audio. The key remains in memory. **MEASURED 31 Oct:** Kash's prep test returned 201, connected in under one second and was visible on twitch.tv/kashruns. Later on 31 Oct, going live from the page was **MEASURED** working on twitch.tv/kashruns: a viewer saw only the fight stage with the camera bubble, and the deployed app's own Go live was used live on kashruns (a pause bug seen in that run was then fixed in `3677761`). Skip is available if already live. Then, in step 3, choose the game mode first (Boss Fight or Crowd Trainer), then Webcam (calibration, clear space and countdown) or Keyboard (no camera or checkbox), and the **What your stream gets** extras (bot results, clips, remember my viewers, Boss Forge). Before Connect, step 1 says what Twitch will ask for and why. During a fight `/play` shows only the fight. **End fight**, **End stream** and **Finish & copy results** each do one job. Clips are requested 6 s after a KO or PERFECT, with a title. More: [docs/HOSTED.md](docs/HOSTED.md).

## 2. Five-minute tour

Chat Golem commands (first word, case-insensitive): **!jab (!j)** = guard; **!left (!l)** = hook from the left → **you lean right**; **!right (!r)** = hook from the right → **you lean left**; **!combo (!c)** = guard; **!super (!s)** = follow all three displayed GUARD / LEAN steps, only at full hype. Custom Forge bosses use exactly their displayed commands. Keyboard K / A / D / J controls the streamer.

1. **Play a round on the keyboard.** Open the address, pick **Keyboard** in **Try it now** and press **TRY THE DEMO**, then practise: hold **K** to guard, lean both ways with **A** and **D**, then press **J** for a bonus punch. With **Defence only**, the tutorial is **K → A → D**. Difficulty initially selects **Medium** (3.0 s beats, 1.0 s warnings). The **Options** disclosure also offers Easy, Hard and Expert, applying at the next match; Hard has the original 0.8 s warning. When the warning appears it names the defence: **GUARD!** for a JAB or COMBO, **LEAN RIGHT!** for HOOK L, **LEAN LEFT!** for HOOK R (TILT instead of LEAN when seated); **SUPER!** shows all three guard/lean steps up front; follow each highlighted step. The spoken "hands up" line plays at most once per round. **Esc Pause** (or the on-screen button) opens Resume / Restart / Quit to setup at any time, including between rounds. Clean defences fill **FOCUS**. At **FINISHER READY**, hold **K** (guard) for **1 s** in a gap between attacks: **FINISHER!** deals **4 damage** and opens a **3 s** double-punch window. No punches are required to trigger it, and the boss keeps attacking on its normal schedule.
2. **Change the crowd.** Between rounds, set **Crowd** (in the bar under the fight screen) to **500 viewers**; the next round or a **New match** uses it, so watch the vote bars. The selector only appears between rounds. The attack is drawn by vote share, so a big chat stays unpredictable.
3. **[See the scouting card in one round](https://streamervschat.kashifnazir.com/?scout=fast).** This demo-only preset lowers the evidence threshold and is badged **SCOUT PREVIEW · SIMULATED**. Keep making successful same-side dodges in round 1 to reveal it. For production scouting, open the normal address and lean the same way most of the time in round 1. From round 2, enough consistent successful dodges can show your habit on the left rail (at least 12 samples, ≥65% share and a confidence bound); it is not guaranteed every match. Balance your last eight dodge leans to clear it and heal up to 10 HP. If chat repeats one move enough, a right-rail card reveals it: pre-hold that card's correct defence before the tell, then defend successfully for **READ IT** and +25% automatic counter damage.
4. **Webcam.** In **Try it now** choose **Webcam** (the default on a computer) and press **TRY THE DEMO**, select Standing/Seated and press **Turn on camera** (the camera and every setup step work straight away; **My space is clear** is needed only before **START WEBCAM FIGHT**). Choosing the webcam preselects **Easy** (1.2 s warnings, labelled "Recommended for webcam") unless you already picked a level; webcam leans take about 0.4 s to register. Follow the 5 steps: get in frame (relaxed, hands at waist), guard up, lean left, lean right, then throw a punch with each hand (optional, or **Skip punches**). Keep head, shoulders and both wrists in frame; press **START WEBCAM FIGHT** when enabled. During the fight a small camera circle shows your tracked skeleton. Punches use a straight-punch detector: 42 of 44 of Kash's recorded punches caught, 4 false (**MEASURED**, [test](test/pose/straight-punch.test.ts)). Guard is wrists above elbows near the face; lean is shoulder tilt, with directions belonging to the player, not the mirrored preview.

## 3. Checking the build

```sh
git clone https://github.com/thekashifnazir/streamer-vs-chat && cd streamer-vs-chat
npm ci && npm test && npx tsc --noEmit && npm run sim && npm run build:demo
```

Clone and `npm ci` need network access to download the repository and packages. After installation, tests, type-check, sim and build need no key or external network. **MEASURED 2 Nov** at `8c99b7e` (the build deployed on 2 November): 1,281 offline tests in 169 files pass, and the sim output is identical to `0be805d`.

End-to-end browser checks are local Playwright runs outside this repo; not included. **MEASURED 1 Nov** on the live build: 9 offline demo flows (including a bot-played best-of-3 and the webcam path fed a recorded clip as a fake camera), 41 Crowd Trainer checks, and all 9 steps of a hosted `/play` journey with Twitch and the Worker mocked in the browser. An earlier run at `74cc38d` also did responsive/a11y checks at 6 widths in Chromium and WebKit, with Lighthouse accessibility 100 on `/` and `/play`.

The Codex session ID is `01a17e04-f4f0-7d12-ac96-ff47bf3cc88f`. The entry was built with Codex in one main thread: 57 code commits up to its last turn (`3677761`, 31 October), with Kash directing and doing every camera and Twitch test. It was built on a Plus plan, so once the Codex usage ran out, the last fixes from live tests and the Crowd Trainer mode were finished with Claude Code, every commit labelled "(Claude Code)". [How Codex built this](README.md#how-codex-built-this) · [measured split](docs/codex-evidence.md#codex-vs-claude-code-split) · [Claude Code commits](docs/codex-evidence.md#claude-code-commits).

## 4. Known limits

- Punches are optional bonus damage; no-punch mode keeps automatic defence counters.
- The webcam needs Chrome and reasonable light. Webcam leans take about 0.4 s to register, so Easy is recommended (and preselected) for webcam play. It reads guard, lean and roughly which hand punched; it can't read punch type, force, footwork or kicks ([docs/WEBCAM.md](docs/WEBCAM.md)).
- Not yet checked live in this build: `!forge`, sound on stream (OBS audio) and the new 6 s clip wait. Bot results, clips and Forge are deployed with their flags on. On 1 November clips were made on Kash's channel (before the 6 s wait), but the bot's result line failed to post (a request failure, still open).
- The voice corner coach is switched off for the submission (flags `HOSTED_COACH` and `HOSTED_COACH_DEMO` off; code kept): [docs/COACH.md](docs/COACH.md).
- Going live from the page is experimental (undocumented WHIP ingest); OBS is the documented path.
- `/play` reads chat; bot results, clips, hosted Forge and viewer memory each need their deployed flag and, where relevant, a Twitch grant (`channel:bot`, `clips:edit`). Clips need a live stream at least 60 seconds old; viewer memory is unchecked by default and never stores chat text. Details: [docs/HOSTED.md](docs/HOSTED.md).
- The loaded no-login demo runs without network requests; reloading offline is not supported because there is no service worker. For a fully local copy, run `npm run demo`.
- **Esc Pause** opens Resume / Restart / Quit to setup, including during practice. Webcam Resume retains fresh-frame/safety checks. The demo enables sound at TRY THE DEMO; M mutes. On the demo, browser **Back** pauses a running round and Back again (or Back from results or webcam setup) returns to the homepage. The next round starts only when you press **NEXT ROUND**.
- The local `/capture` page starts **INPUTS LOCKED**: tick **My space is clear** and press **Resume inputs** before **START MATCH**. Webcam input additionally requires valid calibration and a fresh framed pose.
