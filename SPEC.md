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

**Default-boss votes:** `!jab` (`!j`) = guard; `!left` (`!l`) = hook from the left → LEAN →; `!right` (`!r`) = hook from the right → ← LEAN; `!combo` (`!c`) = guard; `!super` (`!s`) = follow the three-step GUARD / LEAN sequence when hype is full. Legacy `!hookl` / `!hookr` remain accepted. Commands are case-insensitive and only the first token counts; the ! is required. Custom/Forge bosses accept exactly their own commands, without default aliases. Internal move IDs, scouting/memory identities and weighted draws are unchanged.
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
| SUPER sequence | GUARD step blocks; a held guard chips a missed lean step | Match each shown lean step | HIT on a wrong lean without guard | HIT | 8 / 8 / 9 (25 total); chip 3 / 3 / 4 |

Streamer damage is 0 on BLOCK, PERFECT and DODGE. If guard and a lean are both held: for JAB/COMBO the guard decides and the lean is ignored; for hooks and SUPER the lean decides (a right-way lean is a DODGE even with guard up; guard plus a wrong-way lean is a CHIP). A COMBO is PERFECT when the guard went up ≤400 ms before the first hit; `landsAt` is the first hit. Each COMBO hit is 7; if the guard isn't up for either hit, that hit lands for 7 and the combo gives **no counter** (so a guard dropped between hits costs 7 and the counter).

One rule for viewers to read: **straight attacks (jab, combo) need the guard, swings (hooks) need a lean, and SUPER needs the three displayed guard/lean reads (§14).** Hooks are named from the boss's side, so "hook left" swings from the screen's left and you lean right. That matches the demo spike. Show an arrow on the telegraph so nobody has to think about it.

**Counter:** a BLOCK, PERFECT or DODGE damages the boss straight away: BLOCK 8, PERFECT 11, DODGE 9.
- It then opens a 700 ms counter window. Each punch in that window adds 1.5. Punches are throttled to one per 450 ms.
- A punch outside a window does 1.
- So **defence decides the round and punches are a bonus.** No-punch and seated players have to stay viable (see §5).

## 3. Inputs (pose and keyboard are equal)
| Input | Keyboard | Pose (MediaPipe Pose Landmarker lite, normal Chrome tab) |
|---|---|---|
| guard (held) | hold K | `g = (shoulder-midpoint y − lower wrist y) / shoulderWidth`; guard is on while g is above the midpoint of the user's calibrated neutral and guard values (3 s each). MEASURED on Kash: neutral −2.62, guard +0.60 → threshold −1.01, 100% of held frames read; seated guard is only ≈+0.1, so seated calibrates separately |
| lean L/R (held) | hold A / D | shoulder tilt `(leftShoulder.y − rightShoulder.y) / shoulderWidth` beyond per-side calibrated thresholds held ≥200 ms, releasing at half each side’s threshold (legacy defaults: ±0.5 on, ±0.25 off). **Punch gate:** ignore lean for 300 ms after either wrist is more than 1.6 shoulder widths from its shoulder, or right jabs read as lean-right. MEASURED on Kash's webcam: 12/12 lean cues, false leans during jabs 8 → 2 with the gate (`spikes/kash-webcam/REPORT.md`, PR #8) |
| punch (event) | J | wrist extension peak. Bonus only. Recall on unseen people was 0.33–0.55 |

**Logitech recording refinement:** guard height is measured in the shoulder-aligned frame: project each wrist onto the upward normal to the shoulder line, divide by shoulder-axis length, then take the lower height. Calibrate neutral, waist-resting hands and face-height guard for 3 s each in this same frame. Guard activation is max(−0.5, baseline + 0.70·(guardMedian − baseline)), where baseline is the higher neutral/resting median; release is activation −0.25·(guardMedian − neutralMedian). Both raw unmirrored wrists must also be above their own elbows and above mid-torso (halfway between mean shoulders and mean hips); the calibrated threshold is the fine guard test. A guard median must clear activation by at least0.05, and release must clear the higher resting median by at least0.05; otherwise reject calibration. The runtime enforces the −0.5 activation floor even for legacy low thresholds. The historical screen-space g measurements above are prep evidence, not defaults for this refined metric. Lean tilt and framing still use the horizontal shoulder width. The 300 ms lean gate requires an extended wrist (>1.6 horizontal shoulder widths) that is also raised (body-relative height ≥−0.5 shoulder-axis lengths); hanging relaxed arms must not gate a lean. Calibration uses that same gate qualification. Each comfortable lean is sampled independently for 1.5 s beyond a measured sway floor: floor=max(0.30,1.5·p95(abs neutral tilt)), using the continuous relaxed phase. Activation is max(floor,0.60·that side’s measured peak), release is half activation, and the 200 ms runtime dwell remains. Save the release band, neutral sway and side thresholds/peaks with recordings; replay uses them, defaulting to0.5 only for older files without settings.

- The capture page sends `pose` events over WebSocket. OBS Browser Source can't open the camera, so OBS shows the overlay only.
- Mirror the webcam, so leaning left on camera means left. `lean: 'L'` is always the player's own left (MediaPipe's left), which is screen-left in the mirrored overlay.
- The server stamps input events with its own receive time (capture and server run on the same machine); the capture page's `at` is kept for logs and the reaction-time stats.

## 4. Scouting report (from round 2)
- Log every telegraph, defence, lean direction and reaction time.
- The habit is **lean side**: the share of the streamer's dodge leans (on hooks and supers) that go to one side.
- A weakness card shows only when that share is at least 65% **and** n ≥ 12 **and** the Wilson lower bound with z = 1.645 is at least 0.60 (the scouting spike's `leanLB`). A habit is **fixed** when, over the last 8 leans, the dominant side's share is ≤ 62.5% (the scouting spike's rule).
- Example card: "DODGES LEFT EVERY TIME 83% (n=30)". The matching vote button glows (a left-leaner's card lights `!left` (`!l`), which needs a lean right; a right-leaner's lights `!right` (`!r`)), and the telegraph names the exploit. An exploit adds no damage: it only steers votes and labels the telegraph.
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
19. **Viewer KO memory:** A's counted HOOK_L supports the streamer-KO beat in two server sessions → stored `koVotes` is 2 and A qualifies as nemesis.
20. **Forget me:** A sends `!forgetme` → delete A's record and atomically persist A's ID in the channel opt-out list; subsequent messages/votes never recreate it. Queue one acknowledgement through the existing shared 10-second bot limit.
21. **Retention:** loading a record last seen 91 days ago removes it from memory and the saved file; opt-out tombstones remain.
22. **No chat text:** after 100 messages, the viewer file contains none of their message bodies, only the allowlisted identity/stat fields. Simulated and booth input never accesses this server file.


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

## 10. Two-way scouting (Queue 11a; CHAT SYNC rejected by balance gate)

These rules extend §1/§2 using the same reducer and explicit receive/game-clock time. Existing vote eligibility, draw weights, no-triple rule, health and balance gates are unchanged.

### 10.1 Chat habits and brace

- Retain the **last12 selected moves backed by at least one counted, positive-weight chat vote** across rounds. Record the selected move, not plurality. Autopilot/zero-influence draws are not evidence of chat habits. A vetoed selected move remains evidence, just as it remains in history.
- Also log opening picks: the first selected attack after round start/restart or a veto cancels a pending attack (including the remaining hit of a COMBO). An ordinary completed attack or pause/resume is not a reset. Openings are descriptive metadata; the card uses the overall12-pick window, not openings alone.
- Require the full12-pick window. From round2, create a card when one move's share is at least55% and its Wilson lower bound (z=1.645) is at least0.40. With n=12 this requires8/12 (66.7%);7/12 fails the Wilson gate. The illustrative64% caption is not a new threshold. If multiple candidates tie, use §1 move order.
- Retain an existing card while its move remains at least50% of the current window; clear it strictly below50%, then evaluate a replacement. No heal is awarded. The HUD shows the authoritative card on the **right rail** to the streamer, e.g. `CHAT LEANS ON HOOK L 67%`. The existing streamer-weakness card stays on the left rail.
- **Brace** is a read of an already-visible card: if the card existed before this beat's draw, the selected move matches it, and the correct defence is already held when the telegraph starts, mark that attack braced. A card created by that very pick cannot retroactively qualify it. Guard qualifies for JAB/COMBO; R for HOOK_L; L for HOOK_R; either lean for SUPER. Input at the exact telegraph time runs after the draw and is too late.
- Only a successful BLOCK/PERFECT/DODGE earns the brace reward: multiply its automatic counter by1.25 (8→10,11→13.75,9→11.25), with the normal boss HP cap at0. Show `READ IT`. COMBO must still keep guard across both hits. CHIP/HIT and veto give no reward. Punch damage and the700ms counter window are unchanged. No brace in round1 or without a matching card. Cards never restrict chat voting. `GameState.chatScouting` carries the bounded history, card/n/share/lowerBound and descriptive opening log; `Attack.brace` snapshots eligibility and `Resolution.braced` records a rewarded clean defence. These fields travel in the existing tick; no new client command is introduced.

### 10.2 CHAT SYNC — not shipped

The proposed eight-viewer/first1000ms SYNC attack bonus was removed entirely under the requested fallback. Attempt1 (35% brace attempts) failed ordinary R1 no-punch at500 viewers:28.5%. Attempt2 increased bracing to50%; R1 is unchanged because cards only start in round2, so the same exact R1 samples still fail. No damage numbers, gates or crowd timings were weakened to rescue SYNC. Early coordinated votes now behave exactly like other normal votes: no SYNC state, cue, cooldown or damage bonus. Golden regression vectors verify eight early same-move votes still yield normal damage.

### 10.3 Acceptance and balance

Golden vectors and unit tests cover full-window/Wilson/card hysteresis, openings/reset/carry, prior-card and exact-time brace, each defence and counter amount, COMBO success/failure, veto, and unmodified damage with eight early same-move votes. Existing §7 tests remain mandatory.

The balance run retains §5 player/crowd parameters and gates. Added read model (inferred):35% chance to pre-hold the visible card's defence before a tell,85% chance to maintain that read; failed/wrong reads use the unchanged §5 model. Independent random streams prevent vote timing/brace decisions from perturbing the base player RNG. Ordinary votes are distributed across the beat; a coordinated profile replaces35% of personas with a persistent JAB group only when that group contains at least8 people. Tiny0/3-viewer samples use ordinary personas, rather than treating one person as a coordinated group. The no-triple rule still limits repeated picks. Both profiles run4000 R1 and4000 R2 samples per cell (R2 after actual R1 warmups), with the unchanged casual30–70% and no-punch≥30% gate applied to all four matrices. Coverage requires successful braces as proof that visible prior cards were exercised.

## 11. Viewer memory (display and statistics only)

Memory observes server-accepted input and completed round evidence; it never supplies reducer events or affects damage, weights, draws, cooldowns, scouting or balance. `server/memory.ts` atomically persists versioned per-channel records in gitignored `data/viewers.json`, using Twitch user IDs, latest display names, first/last seen, streams, votes, KO votes, MVP count, favourite KO move and KO counts by move. Records older than 90 days are removed on load. Opt-out IDs remain permanently; no message bodies are persisted. Non-live server sources skip all file access.

- Viewer streams count once per Node server session with an accepted in-fight vote. Vote statistics count one participation per viewer per beat; replacements still refresh nemesis activity. Favourite move means the most frequent credited KO move, breaking equal counts in §6 move order; no KO history means none.
- KO credit uses unique supporters of the actual selected move at the damaging beat, including a COMBO whose first hit ends the round. An autopilot or no-triple replacement without supporters earns no viewer credit. Channel record streams count once per server session with a completed round; bosses KO'd and times KO'd count actual KOs, excluding timeouts.
- Nemesis requires at least two KO votes, ranked by KO votes then most recent lastSeen, then user ID for a deterministic remaining tie. The activity card uses last accepted vote wall time, with the interval [vote, vote+30 seconds). Matching favourite-move telegraphs show the historical KO-move tag even if that viewer is currently inactive; it does not attribute the present draw to them.
- The cumulative damage-credit session MVP is finalized once at explicit End session or shutdown. Automatic round/match end cards preview the streak without awarding it again. Reopening the card or starting another match in the same server process cannot add another stream MVP. Sessions with no attacks do not break a streak. Forgetting the remembered MVP clears their persisted streak and hides their current public MVP identity.
- `!forgetme` is case-insensitive, first word only, and applies to the sender's own ID. The deletion/tombstone is immediate in memory and is persisted before one generic acknowledgement enters the existing shared bot queue. Repeated requests from an already opted-out viewer do not fill that queue. Writes failing do not produce a success acknowledgement.
- The Rails HUD receives a projection without Twitch IDs (display names and counts only): left record and top four hall of fame, right active-nemesis card, historical move tag and end-card streak/forget reminder. The body centre stays clear. Hosted `/play` retains its counts-only privacy contract and does not enable persistent viewer memory.
- The offline demo uses a separate simulated-only IndexedDB database seeded once with three made-up prior streams. Its browser-safe observation model never touches the server file or network. Storage denial falls back to the same in-memory fiction without delaying keyboard play; labels remain SIMULATED.

## 12. Boss Forge (opt-in, between rounds)

`BossDef` is `{name,tagline,hp,moves}`; each move is `{command,label,defence,damage,chip,telegraph_ms,hits}`. Names contain 1–24 printable characters, taglines 1–80 and labels 1–32. HP is 90–200; 3–5 unique lowercase ASCII commands match `^![a-z]{2,10}$`. Defences are `guard|lean_left|lean_right|lean_any`; damage is 4–30 per hit, chip is nonnegative and at most half damage, tells are 600–1200 ms, hits are integers 1–3 and total damage is at most 36. Require guard and lean coverage. Unknown fields, controls, blocked words and protected broadcaster/recent-chatter names (including punctuation/case/one-edit variants) fail validation. Reserved commands include `!pause !stop !super !vote !forge`; only the exact canonical built-in may retain `!super`.

The default Chat Golem data exactly preserves §1–§4 and all golden vectors. Custom moves map to the five existing internal slots in array order; their commands, displayed names, defences, per-hit damage and timing come from the definition. A custom fifth slot is ordinary, without the built-in SUPER gate. Autopilot samples available custom moves; weighted draws and no-triple remain. Multihits land 300 ms apart, apply mercy per hit, resolve immediately on lethal damage, and open one counter only when the whole chain is clean. Counter damage/windows/punch throttle, round duration, safety and match rules stay unchanged. Switching definition between rounds clears chat-move scouting history because the slot identities changed; body-lean evidence carries normally.

`gateBoss` uses 4,000 seeded R1 rounds for casual and no-punch at 0/3/50/500 viewers, with unchanged §5 models and gates. To meet the interactive bound, compile damage-independent persona/read/perfect/chip/punch trajectories into a bounded cache, then evaluate using the same damage/counter arithmetic as the reducer. Seeded trajectory tests replay through `step` and compare HP/winner. The ordinary/coordinated R1/R2 production-reducer matrices still run in CI; default and every prebaked fixture additionally pass the Forge gate. `tuneBoss` bisects one uniform damage/chip scale within 0.2–2.0 and legal numeric bounds for eight iterations toward mean casual 50%, then returns the best all-cell passing candidate or an explicit rejected result. Never weaken a gate.

Ideas are ephemeral, moderated before admission, once per viewer per match. Latest one-vote endorsements produce a stable top-three shortlist; ties use admission order. A bare `+1` endorses the most recently admitted idea; an optional rank 1–3 chooses the displayed shortlist position. Generate its winner only before START or between rounds, holding the next round while active. Mods/broadcaster veto retires outstanding results and discards a queued boss. Phase changes and channel rebinding also invalidate pending work. Protected names are fetched for the broadcaster before generation and retain the latest 100 chatter names in memory only.

Use moderation `omni-moderation-latest`, Responses `gpt-6-luna`, low reasoning, strict BossDef JSON schema, no stored response and one validation-error repair turn. Moderate every output string and revalidate before acceptance. Never synthesize speech from ideas or generated text. Log operation, model, tokens and elapsed time only. Unknown API prices are not invented. No-key demo uses three local fixtures plus JSON editing and a worker, badged Prebaked (no API key), with no credentials or downloads.

Acceptance: validator rejects Unicode/underscore/reserved commands, 999 HP, `kashrunz` for protected `kashruns`, missing lean and all other numeric/schema failures; default passes every gate; a legal doubled-damage custom boss is rescued; mocked clients exercise repair, moderation rejection and stale/vetoed results; source isolation, round hold and reducer-equivalent trajectories remain tested.

## 13. Difficulty levels

Difficulty is selected before START. The engine defaults to Hard for compatibility; capture, the offline demo and hosted `/play` initially select Medium. Changing the selector affects the next START, never the current match. The authoritative state, HUD and round result identify the active level.

| Level | Tempo factor | Beat | Default telegraph | COMBO hit gap |
|---|---:|---:|---:|---:|
| Easy | 1.5 | 3600 ms | 1200 ms | 450 ms |
| Medium | 1.25 | 3000 ms | 1000 ms | 375 ms |
| Hard | 1 | 2400 ms | 800 ms | 300 ms |
| Expert | 0.8125 | 1950 ms | 650 ms | 244 ms |

`shared/src/tempo.ts` owns the tempo table. Each move's effective telegraph is `round(stored telegraph_ms × tempo)`, including Forge moves; the hit gap is `round(300 × tempo)`. Boss validation still checks the stored, unscaled values. The 75-second round, HP, damage, chip, 700 ms counter window, punch throttle, scouting thresholds, SUPER cap and voting rules remain unchanged. Hard preserves all existing golden vectors without edits.

The difficulty simulation's guard/lean success model is **INFERRED**, not a measured physical-response curve: `min(.95, p + .08 × (effective telegraph_ms − 800) / 400)`. Perfect and punch probabilities are unchanged. The written formula produces Easy +.08, Medium +.04 and Expert −.03 before the cap; it takes precedence here over the prompt's conflicting Easy +.16 / Medium +.08 examples. At Hard it exactly equals the existing model.

Measured ordinary R1 wins, 4,000 rounds per cell, seed 2026 (percent; viewers 0 / 3 / 50 / 500):

| Level | Player | 0 | 3 | 50 | 500 |
|---|---|---:|---:|---:|---:|
| Easy | Casual | 75.175 | 73.600 | 70.875 | 69.450 |
| Easy | No-punch | 58.950 | 59.225 | 55.075 | 55.750 |
| Medium | Casual | 69.450 | 67.350 | 63.950 | 61.875 |
| Medium | No-punch | 51.800 | 52.075 | 46.750 | 47.075 |
| Hard | Casual | 55.650 | 55.000 | 49.850 | 48.475 |
| Hard | No-punch | 41.125 | 42.150 | 35.875 | 36.050 |
| Expert | Casual | 43.950 | 43.550 | 39.225 | 37.125 |
| Expert | No-punch | 28.975 | 31.625 | 25.525 | 25.400 |

All difficulty gates pass: win rates decrease in level order (2 percentage points tolerance), Easy casual ≤90%, Expert casual ≥15%, Medium no-punch ≥40%. The original four Hard matrices and fixture gates remain mandatory and unchanged. Expert no-punch has no 30% floor; that existing floor continues to apply to Hard.


## 14. SUPER sequence

Default Chat Golem SUPER reveals three seeded steps chosen from `guard`, `lean_left`, `lean_right` at draw, with no adjacent repeated step. Internal move ID remains SUPER. Custom/Forge moves retain their single-defence definitions, including a fifth slot; they never inherit this sequence.

The first step lands after twice the move’s scaled telegraph (Hard 1600 ms). Remaining steps land at `round(600 × tempo)` intervals (Easy 900, Medium 750, Hard 600, Expert 488 ms). Damage is 8 / 8 / 9; missed lean with guard chips 3 / 3 / 4. Guard steps require held guard and cannot be PERFECT; lean steps require the matching player-side lean. Each clean lean contributes one scouting sample with its receive/capture reaction evidence. Aggregate severity is HIT > CHIP > BLOCK > DODGE. Only an entirely clean chain opens a counter: any guard step yields BLOCK (8 counter); an all-lean chain yields DODGE (9), with the existing brace multiplier when qualified.

A full SUPER can cross a fixed beat boundary. An occupied boundary advances on the same grid without overwriting the active sequence; accepted votes are retained until the next available draw. It does not shift later beat deadlines. End guards reject a selected move whose full chain would reach/exceed the round deadline. The Forge plan-length guard reserves full SUPER duration, including both gaps; its conservative fixed prefix is replay-tested rather than claimed equivalent to arbitrary unscripted terminal autopilot picks.

The unlock remains hype=100 and fewer than three supers used. Locked !s/!super votes stay dropped. The HUD shows LOCKED · HYPE n%, the full ordered chips, current highlight and tick/cross results (TILT seated). A fresh unlock shows SUPER READY: chat type !s for up to 3 s; rejected votes get a 1 s hint, at most once per beat. Hype’s visible legend explains that votes fill it and more voters fill it faster. The local bot queues one “HYPE is full! Type !s for the SUPER” notice per round through the existing 10 s / three-message bounded queue. Preview and new-match notice state reset explicitly; pause/resume does not permit a duplicate round announcement. Notification display timestamps use wall time outside the reducer, so preview hints expire while waiting for START.
