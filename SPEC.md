# Streamer vs Chat: game spec and acceptance tests

What Codex builds. The numbers are tuned by `spikes/defence-sim/sim.mjs` **[MEASURED in sim; player skill levels are INFERRED guesses]**. The pose facts come from `docs/spikes/pose/` and `docs/spikes/nologin-demo/`. Give Codex this file and its numbers instead of asking it to design the rules, which saves Plus messages.

**In the entry repo:** paths under `spikes/` and `docs/spikes/` and PR numbers point at the prep repo and do not exist here. Don't look for them; every number they produced is copied into this file.

## 1. Core loop
| Thing | Value |
|---|---|
| Beat | 2,400 ms. Chat voting is open for the whole beat |
| Telegraph | "HANDS UP!" + the move name, 800 ms before the hit lands |
| Round | 75 s. KO ends it early. With no KO, the higher HP % wins; a tie goes to the streamer. Best of 3: each round resets both HP, hype and the super count; the scouting log carries over |
| HP | streamer 100, boss **135** |
| Low-HP mercy | streamer below 30 HP takes ×0.6 damage (HIT and CHIP) |
| Beat timeline | Votes collected during beat N are drawn at the end of beat N. The telegraph runs for the next 800 ms and the hit lands at its end. Beat N+1's voting is already open meanwhile |

**Votes:** `!jab` `!hookl` `!hookr` `!combo`, plus `!super` when the hype meter is full.
- One vote per viewer per beat, and the latest message wins.
- The move is a **weighted draw by vote share**, not the most-voted. Plurality let one spammer group decide every beat in big chats; the draw kept casual win rates flat from 0 to 500 viewers.
- The same move can't come up 3 beats in a row: if the draw repeats a move for the third time, replace it with a uniform pick from the other three of JAB/HOOK_L/HOOK_R/COMBO.
- With 0 voters (autopilot), the move is a uniform pick from JAB/HOOK_L/HOOK_R/COMBO.
- SUPER: `!super` votes only count while hype = 100 and fewer than 3 supers have fired this round (otherwise they're dropped from the tally). Counted SUPER votes join the weighted draw like any move.

**Hype:** each beat, `hype += 12·log2(1 + voters) / max(1, log2(1 + viewers)/3)`, plus 6 more when viewers = 0. Capped at 100. A super sets it to 0. Max 3 supers per round.
- *voters* = distinct users with a counted vote this beat. *viewers* = the stream's viewer count (Get Streams `viewer_count`, polled every 60 s; 0 when offline), or the simulated crowd size in demo/mock mode.

## 2. Defence table (decided on the input state when the hit lands)
| Boss move | Held guard | Lean the right way | Lean the wrong way | Nothing | Hit damage |
|---|---|---|---|---|---|
| JAB | BLOCK (PERFECT if guard went up ≤400 ms before landing) | no effect | no effect | HIT | 8 |
| COMBO (2 hits, 300 ms apart) | BLOCK, if guard is held across both hits | no effect | no effect | HIT | 14 |
| HOOK_L | CHIP 3 | DODGE = lean **right** | HIT | HIT | 12 |
| HOOK_R | CHIP 3 | DODGE = lean **left** | HIT | HIT | 12 |
| SUPER | CHIP 10 | DODGE = either way | DODGE | HIT | 25 |

Streamer damage is 0 on BLOCK, PERFECT and DODGE. If guard and a lean are both held: for JAB/COMBO the guard decides and the lean is ignored; for hooks and SUPER the lean decides (a right-way lean is a DODGE even with guard up; guard plus a wrong-way lean is a CHIP). A COMBO is PERFECT when the guard went up ≤400 ms before the first hit; `landsAt` is the first hit. Each COMBO hit is 7; if the guard isn't up for either hit, that hit lands for 7 and the combo gives **no counter** (so a guard dropped between hits costs 7 and the counter).

One rule for viewers to read: **straight attacks (jab, combo) need the guard, swings (hooks) need a lean, and a super needs any lean.** Hooks are named from the boss's side, so "hook left" swings from the screen's left and you lean right. That matches the demo spike. Show an arrow on the telegraph so nobody has to think about it.

**Counter:** a BLOCK, PERFECT or DODGE damages the boss straight away: BLOCK 8, PERFECT 11, DODGE 9.
- It then opens a 700 ms counter window. Each punch in that window adds 1.5. Punches are throttled to one per 450 ms.
- A punch outside a window does 1.
- So **defence decides the round and punches are a bonus.** No-punch and seated players have to stay viable (see §5).

## 3. Inputs (pose and keyboard are equal)
| Input | Keyboard | Pose (MediaPipe Pose Landmarker lite, normal Chrome tab) |
|---|---|---|
| guard (held) | hold K | `g = (shoulder-midpoint y − lower wrist y) / shoulderWidth`; guard is on while g is above the midpoint of the user's calibrated neutral and guard values (3 s each). MEASURED on Kash: neutral −2.62, guard +0.60 → threshold −1.01, 100% of held frames read; seated guard is only ≈+0.1, so seated calibrates separately |
| lean L/R (held) | hold A / D | shoulder tilt `(leftShoulder.y − rightShoulder.y) / shoulderWidth` beyond ±0.5 held ≥ 200 ms, with hysteresis (off at ±0.25). **Punch gate:** ignore lean for 300 ms after either wrist is more than 1.6 shoulder widths from its shoulder, or right jabs read as lean-right. MEASURED on Kash's webcam: 12/12 lean cues, false leans during jabs 8 → 2 with the gate (`spikes/kash-webcam/REPORT.md`, PR #8) |
| punch (event) | J | wrist extension peak. Bonus only. Recall on unseen people was 0.33–0.55 |

**Logitech recording refinement:** guard height is measured in the shoulder-aligned frame: project each wrist onto the upward normal to the shoulder line, divide by shoulder-axis length, then take the lower height. Calibrate neutral/guard in this same frame; engage above the midpoint and release below midpoint −0.25. The historical screen-space g measurements above are prep evidence, not defaults for this refined metric. Lean tilt and framing still use the horizontal shoulder width. The 300 ms lean gate requires an extended wrist (>1.6 horizontal shoulder widths) that is also raised (body-relative height ≥−0.5 shoulder-axis lengths); hanging relaxed arms must not gate a lean. Calibration uses that same gate qualification.

- The capture page sends `pose` events over WebSocket. OBS Browser Source can't open the camera, so OBS shows the overlay only.
- Mirror the webcam, so leaning left on camera means left. `lean: 'L'` is always the player's own left (MediaPipe's left), which is screen-left in the mirrored overlay.
- The server stamps input events with its own receive time (capture and server run on the same machine); the capture page's `at` is kept for logs and the reaction-time stats.

## 4. Scouting report (from round 2)
- Log every telegraph, defence, lean direction and reaction time.
- The habit is **lean side**: the share of the streamer's dodge leans (on hooks and supers) that go to one side.
- A weakness card shows only when that share is at least 65% **and** n ≥ 12 **and** the Wilson lower bound with z = 1.645 is at least 0.60 (the scouting spike's `leanLB`). A habit is **fixed** when, over the last 8 leans, the dominant side's share is ≤ 62.5% (the scouting spike's rule).
- Example card: "DODGES LEFT EVERY TIME 83% (n=30)". The matching vote button glows (a left-leaner's card lights `!hookl`, which needs a lean right; a right-leaner's lights `!hookr`), and the telegraph names the exploit. An exploit adds no damage: it only steers votes and labels the telegraph.
- After an exploit fires, there's a 3-beat cooldown before it can fire again.
- Fixing the habit removes the card and gives the streamer +10 HP. The HP cap stays 100.

## 5. Balance gate (`npm run sim`, runs in CI)
The sim plays single 75 s rounds (not best of 3), 4,000 per cell, with a seeded RNG. These must hold at 0 / 3 / 50 / 500 viewers:
- **casual** wins 30–70%.
- **no-punch** wins at least 30%.

The sim spike's result (`spikes/defence-sim/output.txt`):

```
bossHp=135  win% for the streamer (4000 fights per cell)
player        v=0    v=3   v=50  v=500
casual       55.3   53.8   49.9   48.8
good         99.3   98.8   98.5   98.5
seated       71.3   71.3   65.5   63.8
nopunch      40.6   40.7   36.8   34.9
keyboard     96.0   95.0   93.3   93.2
PASS: casual 30-70%, no-punch >= 30%
```

Sim player models (the spike's numbers, INFERRED skill guesses). `p` = chance of reading the telegraph and choosing the right defence (×0.7 on an exploit beat); `perfect` = chance a correct guard is PERFECT; `lean` = chance an unsure lean goes left; `punch` = mean punches landed per counter window (rounded after ±0.5 noise, max 2); punchers also land a stray 1-damage punch on 25% of beats. A missed read on a hook or super is a CHIP 30% of the time, else a HIT.

| player | p | perfect | lean | punch |
|---|---|---|---|---|
| casual | 0.55 | 0.15 | 0.75 | 0.6 |
| good | 0.75 | 0.35 | 0.75 | 1.2 |
| seated | 0.60 | 0.20 | 0.75 | 0.4 |
| nopunch | 0.55 | 0.15 | 0.75 | 0 |
| keyboard | 0.70 | 0.30 | 0.6 | 0.8 |

Sim crowd: each viewer is a persona: spammer 25% (always `!jab`), tactician 20% (votes the exploit when one is live and off cooldown, else random), chaos 25% (random 70% of beats), hype 15% (`!super` when ready, else random), lurker 15% (random 15% of beats).

Keyboard players win about 93–96% of the time. That suits judges trying the demo, but don't sell it as hard.

## 6. Events between processes (shared/ types)
```ts
type ChatVote   = { kind: 'vote'; user: string; move: 'JAB'|'HOOK_L'|'HOOK_R'|'COMBO'|'SUPER'; at: number; simulated: boolean };
type PoseState  = { kind: 'pose'; guard: boolean; lean: 'L'|'R'|null; at: number; source: 'pose'|'keyboard' };
type PunchEvent = { kind: 'punch'; side: 'L'|'R'; at: number; source: 'pose'|'keyboard' };
type Move       = 'JAB'|'HOOK_L'|'HOOK_R'|'COMBO'|'SUPER';
type Control    = { kind: 'control'; action: 'pause'|'resume'|'veto'|'stop'; by: string };   // mods/broadcaster: !pause !resume !veto
type Tick       = { kind: 'tick'; state: GameState };                 // server -> overlay, at least 10 Hz
type Telegraph  = { kind: 'telegraph'; move: Move; landsAt: number; exploit?: string };
type Resolved   = { kind: 'resolved'; move: Move; outcome: 'HIT'|'BLOCK'|'PERFECT'|'DODGE'|'CHIP'; dmg: number; counterDmg: number };
```
- The game logic is one pure reducer, `step(state, event, now)`, shared by the server, the sim and the no-login demo.
- `now` is always passed in. No `Date.now()` inside the reducer.

## 7. Acceptance tests (Given / When / Then)
Each line should become a test in the entry repo.
1. **One vote per beat:** with viewer A sending `!jab` then `!hookl` in one beat, the tally counts A once, as HOOK_L.
2. **Weighted draw:** with votes JAB 3 / HOOK_L 1 and a seeded RNG, 10k draws give JAB at 75% ±2%.
3. **No triple repeat:** after the move is JAB twice, the next move isn't JAB.
4. **Super gate:** with hype under 100, a `!super` vote is ignored. When a super fires, hype goes to 0, and a 4th super in a round can't fire.
5. **Perfect block:** guard goes up 300 ms before a JAB lands → PERFECT, 0 damage, boss −11.
6. **Late guard:** guard goes up 450 ms before a JAB lands → BLOCK, boss −8.
7. **Hook direction:** HOOK_L landing with lean R → DODGE. With lean L → HIT, −12.
8. **Combo:** guard held across both hits → BLOCK. Guard dropped between the hits → the second hit lands (half of 14 = 7). The sim doesn't model the split yet.
9. **Counter window:** two punches in the 700 ms after a DODGE add 3. A third punch inside 450 ms of the last is ignored.
10. **Low-HP mercy:** a HIT on a streamer at 25 HP does ×0.6 damage.
11. **Decision:** at 75 s with no KO, streamer 40/100 (40%) vs boss 60/135 (44.4%) → the **boss** wins. HP is compared as a percentage, not as raw HP.
12. **Card threshold:** 11 left dodges out of 11 → no card. 12 of 14 → card.
13. **Exploit cooldown:** after an exploit fires, the next 3 beats can't fire it.
14. **Safety:** a `stop` Control (the Esc key or the big STOP button on the capture page, or the broadcaster typing `stop` in chat), or `!pause` / `!veto` from a mod or the broadcaster, freezes the game within one tick (100 ms). `!veto` also cancels the attack currently telegraphed: it never lands, so there's no damage and no counter either way. `!resume` from a mod or the broadcaster unfreezes. Non-mods can't pause. A spoken "stop" is optional extra (it needs speech recognition).
15. **Bot rate:** the chat queue holds at most 3 messages (INFERRED default) and sends at most 1 per 10 s; when full it drops the oldest. 10 results queued in 5 s → the first is sent at once and only the newest 3 remain, so exactly 4 messages go out in the next 60 s.
15a. **Clip fallback:** Create Clip returns 202 but Get Clips stays empty for 15 s → the highlight uses the local replay. A clip request in the first 60 s of a stream (by Get Streams `started_at`) is skipped.
16. **Pose regression:** on the landmark fixtures in `test/fixtures/` (Kash's webcam: `test/fixtures/kash-webcam.*`, plus unseen people in `test/fixtures/pexels/`, each `*.landmarks.json` + labels), guard and lean events match the labels within 150 ms. Punch recall/precision is reported per fixture and must meet `test/fixtures/gates.json` if that file exists.
17. **No-login demo:** with no `.env` and no network, `npm run demo` serves a page where pressing K then A then J starts a fight with simulated chat, badged SIMULATED.
18. **Never live with fake chat:** the simulated-chat source refuses to start if a live Twitch token is loaded, unless `--mock` is set.

## 8. Test data the entry can reuse
In the prep repo, `spikes/nologin-demo/fixtures/*.landmarks.json` are landmark data extracted from Pexels clips (licence https://www.pexels.com/license/, no attribution needed). `mac/new-entry.sh` copies them, with their labels and `gates.json`, into the entry's `test/fixtures/pexels/` and `test/fixtures/gates.json`, so punch recall is measured on people other than Kash.
- **[INFERRED]** Reusing *data* is fine under the "newly created" rule, just like using a library. Spike *code* must not be copied.
- Re-extract the fixtures with the entry's own extractor if you want zero doubt.

## 9. Edge rules (from the golden vectors)

1. **Same-millisecond order and boundaries:** process engine events first (counter close, hits landing, beat draw, timeout), then inputs at that millisecond. The counter window is `[resolve, resolve+700)`. A vote at `2400·(N+1)` belongs to beat N+1. Do not draw a beat whose hit would land at or after 75,000 ms; that gives 30 attacks per round.
2. **Punch throttle:** measure 450 ms from the last counted punch. An ignored punch does not restart the throttle. The throttle carries across counter-window boundaries, and a punch at exactly +450 ms counts.
3. **Low-HP mercy:** check `hp < 30` before each hit, including each COMBO hit separately. Do not round damage; HP is a float and only the UI rounds it.
4. **SUPER hype:** pick the move, add the beat's hype gain, then reset hype to 0 if a SUPER fires. Check the SUPER gate when the vote arrives; a dropped vote stays dropped.
5. **Counter KO:** counter damage from BLOCK, PERFECT or DODGE applies at the hit landing and can KO at that millisecond.
6. **Scouting fixes:** use the last 8 dodge leans from the same log as the scouting card. The dominant side is the card's side. Check for a fix after each new dodge; after a fix, judge a new card only from dodges logged after the fix, requiring n ≥ 12 again.
7. **Veto and pause:** freeze the round clock and beat timer on veto/pause; resume where they stopped. A vetoed beat counts as drawn and stays in `history`.
8. **Between rounds:** use one RNG per round, seeded from the match seed plus round number. Reset `history` and exploit cooldown each round. The scouting log carries over.
9. **COMBO counter window:** apply the counter and open its window at the second hit (`L+300`), once both hits are known. The window is `[L+300, L+1000)`.

The entry's `test/fixtures/golden/` holds 50 vectors implementing these rules.
