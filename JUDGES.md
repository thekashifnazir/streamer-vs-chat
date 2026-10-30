# Streamer vs Chat: notes for judges

Twitch chat votes the boss's attacks; the streamer blocks and dodges on camera. This page gets you from zero to the interesting parts in five minutes.

**Address:** https://streamervschat.kashifnazir.com. The no-login demo is free. The Workers fallback is https://streamer-vs-chat.kash-553.workers.dev.

## 1. What's live and what's simulated

| Where | Chat | Labelled |
|---|---|---|
| The no-login demo (this address) | Simulated crowd of 0, 3, 50 or 500 viewers | **SIMULATED** badge on screen |
| `/play` (Try it on your channel) | Your own real Twitch chat; optional hosted bot results | LIVE · Twitch chat connected |
| Local live server + OBS | Real Twitch chat; the bot posts results | LIVE transport status |
| Local mock server + OBS (the README GIF) | Local simulated chat | SIMULATED CHAT |

Simulated chat is never sent to a live Twitch channel.

## 2. Five-minute tour

Chat Golem commands (first word, case-insensitive): **!jab (!j)** = guard; **!left (!l)** = hook from the left → **you lean right**; **!right (!r)** = hook from the right → **you lean left**; **!combo (!c)** = guard; **!super (!s)** = follow all three displayed GUARD / LEAN steps, only at full hype. Custom Forge bosses use exactly their displayed commands. Keyboard K / A / D / J controls the streamer.


1. **Play a round on the keyboard.** Open the address, choose **Standing**, tick **My space is clear and I can move comfortably.**, then follow the tutorial: press **K → A → J** (hold **K** to guard, hold **A/D** to lean, **J** for bonus punches). With **No punches**, the tutorial is **K → A → D**. Difficulty initially selects **Medium** (3.0 s beats, 1.0 s warnings). The **Difficulty** menu below the game also offers Easy, Hard and Expert, applying at the next match; Hard has the original 0.8 s warning. When **HANDS UP!** appears, Guard a JAB or COMBO; for HOOK L lean right, for HOOK R lean left; SUPER shows all three guard/lean steps up front; follow each highlighted step. Clean defences fill **FOCUS**. At **FINISHER READY**, hold **K** (guard) for **1 s** in a gap between attacks: **FINISHER!** deals **4 damage** and opens a **3 s** double-punch window. No punches are required to trigger it, and the boss keeps attacking on its normal schedule.
2. **Change the crowd.** Between rounds, choose **Expand**, then set **Crowd** to **500 viewers**, then choose **Next round** or **New match** and watch the vote bars. The selector is disabled during a fight. The attack is drawn by vote share, so a big chat stays unpredictable.
3. **[See the scouting card in one round](https://streamervschat.kashifnazir.com/?scout=fast).** This demo-only preset lowers the evidence threshold and is badged **SCOUT PREVIEW · SIMULATED**. Keep making successful same-side dodges in round 1 to reveal it. For production scouting, open the normal address and lean the same way most of the time in round 1. From round 2, enough consistent successful dodges can show your habit on the left rail (at least 12 samples, ≥65% share and a confidence bound); it is not guaranteed every match. Balance your last eight dodge leans to clear it and heal up to 10 HP. If chat repeats one move enough, a right-rail card reveals it: pre-hold that card's correct defence before the tell, then defend successfully for **READ IT** and +25% automatic counter damage.
4. **Forge a boss.** Before starting or between rounds, choose **Expand** if the compact bar is shown, then open **Boss Forge**. Choose a **Boss**, optionally expand **Edit boss JSON**, then press **Validate & balance**. It shows before/after win rates; press **Use accepted boss next round**, then finish the tutorial if this is your first fight, or choose **New match** / **Next round** when available to play it. **Restore Chat Golem** selects the default again.
5. **Optional webcam.** Choose **Expand** if needed, tick the **My space is clear** control below the game, then expand **Optional webcam · calibrated guard and lean**, choose **Posture**, press **Start camera**, allow camera access, then **Calibrate**. Follow relaxed / hands-at-waist / guard / left / right cues. Keep head, shoulders and both wrists in frame; press **Start webcam fight** when enabled. Guard is wrists above elbows near the face; lean is shoulder tilt, with directions belonging to the player, not the mirrored preview.

## 3. Checking the build

```sh
git clone https://github.com/thekashifnazir/streamer-vs-chat && cd streamer-vs-chat
npm ci && npm test && npx tsc --noEmit && npm run sim && npm run build:demo
```

Clone and `npm ci` need network access to download the repository and packages. After installation, tests, type-check, sim and build need no key or external network. The Codex session ID is `01a17e04-f4f0-7d12-ac96-ff47bf3cc88f`; see [How Codex built this](README.md#how-codex-built-this).

## 4. Known limits

- Punches are optional bonus damage; no-punch mode keeps automatic defence counters.
- The webcam needs Chrome and reasonable light.
- `/play` reads chat; optional Worker bot results require the deployed bot flag and a `channel:bot` grant. Optional hosted clips require the deployed clips flag, a `clips:edit` grant and a live stream at least 60 seconds old. Only confirmed clips appear on the session card. When hosted Forge is enabled, chat can propose with `!forge <idea>` and endorse with `!forge +1`; a broadcaster/mod generates with plain `!forge` between rounds. Its gate runs in the browser, and daily caps apply. Persistent live viewer memory still needs the local server.
- The loaded no-login demo runs without network requests; reloading offline is not supported because there is no service worker. For a fully local copy, run `npm run demo`.
- Esc / **STOP** freezes play; **Resume** continues after clear-space confirmation. Sound starts off.
- The local `/capture` page starts **INPUTS LOCKED**: tick **My space is clear** and press **Resume inputs** before **START MATCH**. Webcam input additionally requires valid calibration and a fresh framed pose.
