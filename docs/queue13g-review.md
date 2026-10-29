# Queue 13g-1 review

Pulled twitchprep main first (already current) and inspected mock-1-hit.png, mock-2-super.png and mock-3-ready.png for layout/colour intent. This pass covers A, B and E only; no focus/finisher combat rules or SUPER redesign. Existing HUD styling and shared FEEL constants govern presentation. No deployment, live Twitch or physical webcam claims.

## Part A — chat commands

Default Chat Golem accepts primary !left / !right and short !l / !r / !j / !c / !s, alongside the original commands, case-insensitive and first token only. Explicit canonical default definitions receive the same behavior; custom Forge definitions retain exactly their own commands. A custom boss may deliberately own !left in any slot, without inheriting !l or any other alias.

Display-only command helpers supply compact primary/short HUD rows, tooltip/accessible legend, detailed offline/hosted key help, scouting vote prompts, hype prompt and result-message hints. README How to play, JUDGES and SPEC §1 name both forms and defence directions. Stored BossDef commands, move IDs, scouting and memory data stay unchanged. Names, counts over the weighted bar, and percentages have separate cells in standing and seated layouts; the 36 px text floor remains. Shipped Barlow font metrics check the widest command, three-digit count and 100% at 1080p/720p scale. Thousands compact on screen with exact counts retained in accessible labels/tooltips.

Parser tests cover lower/upper/mixed case for every accepted token, first-token behavior, missing ! and suffix lookalikes, canonical-default handling and custom-command isolation. Existing vote golden vectors are unchanged. Independent subagent review cleared A after fixing a measured seated overlap: primary/short labels and inline counts could collide with 100%. Counts now sit over retained weighted bars, with separate text cells and the existing condensed font. 106 parser/display/layout/golden tests plus server-result tests pass locally. Golden JSON unchanged; physical rendering remains a Mac check.

## Changed golden vectors

None. No golden fixture JSON was edited in this pass. Existing vectors remain mandatory in the full test suite.

## Needs Kash

Physical Chrome webcam play and OBS/720p legibility checks. These are explicit Mac checks; synthetic/recorded inputs and unit helpers do not establish physical webcam results.

## Part E — one webcam readiness gate

Camera status, INPUTS LOCKED and refused Resume use the same detailed input/pose blocker snapshot. Messages name missing camera, unfinished calibration, frames ≥500 ms old, head/left or right shoulder/wrist missing/out of bounds/below 0.5 visibility, or seated shoulders wider than 0.20. Tracking failures remain sticky for 1 s after the last failing frame; Resume conservatively waits for that recovery period. The bounds/visibility/freshness checks are not relaxed. Setup stages (no camera/calibration/first frame) do not introduce a gratuitous recovery wait after setup completes.

Confirmed code cause: the previous camera status used metrics, framing and seated distance only. Resume separately checked camera/calibration readiness and frame age, so even the same fresh framed landmarks could produce “in frame” while calibration still prevented Resume. Between frames, the status could also become stale until the next callback. The framing predicates themselves agreed on the same synchronous frame; wrist y/visibility flicker as the live cause remains a hypothesis, not established by code inspection.

A real recorded wrist-boundary failure is replayed unchanged through the actual capture page helper, followed by a valid frame and timed recovery. It verifies matching status/banner/Resume messages for the full sticky second. Separate cases cover all five named landmarks, each frame edge, low visibility, camera/calibration/500 ms boundary/seated distance, plus clear-space, server connection and benchmark blockers. 44 page-handler tests pass. Independent subagent review cleared the implementation after ensuring Resume passes one computed blocker snapshot through all three surfaces, including the exact sticky-expiry boundary. No classifier math or fixture JSON changed.

## Part B — boss impact feedback

Every observed boss HP loss produces exact actual-damage text (including fractional/overkill amounts), a bounded sprite flash and boss-rail-only knock-back. FEEL owns the 600 ms / 72 px number rise, 80 ms white torso flash (150×200 = 30,000 px), 12 px / 180 ms knock-back and 400 ms trail hold followed by 400 ms drain. Combined with the existing 17,160 px HP flash, the flashing area stays 47,160 px, below 57,500. Counter numbers carry COUNTER HIT!, braced counters READ IT!, with the existing large counter/read stamps preserved. The public presentation entry point accepts FINISHER! labels for 13g-2; no finisher combat mechanic is added here.

Calm uses no knock-back or shake, stationary damage text and a 150 ms fade; existing hit-stop and sounds remain. All new HUD labels meet the 36 px floor. No FX changes reducer clocks, input, HP/damage, vote rules or balance models.

Independent review caught immediate trail drain and aggregated punches under delayed HUD delivery. Fixed both: a bounded 48-entry presentation ledger observes each reducer application outside GameState, recording exact counter and accepted-punch HP deltas. Local server ticks and browser demo paint forward those receipts; the HUD deduplicates them and primes first/reconnected views without replaying old impacts. Two punches between snapshots remain two pops and two bonus sound calls, including a counter plus two bonus punches. No guessed splitting or new gameplay events are needed.

The actual HUD renderer is exercised with lightweight DOM nodes: −1, −1.5, −8 and braced −10, stamp children, rise/fade, calm identity and cleanup at 600 ms. Tests also cover bounded receipts, reconnect priming, exact sound counts, trail hold, rail isolation and flash budget. Independent subagent review cleared the final implementation after these fixes. Full local suite: 601/601 tests in 82 files; TypeScript passes. README test badges/counts updated accordingly.

## Final gates

Verified from a fresh clone on Node 22.23.4 with a new npm cache and no local .env/tokens/API credentials copied. All commands exited 0:

| Command | Result | Wall time |
|---|---|---:|
| npm ci | clean install | 7.55 s |
| npm test | 601/601 tests, 82 files | 15.69 s |
| npx tsc --noEmit | clean | 3.30 s |
| npm run build:demo | offline audit passed; 25.5 MB raw / 15.4 MB gzip | 1.52 s |
| npm run sim | all gates pass | 376.64 s |

The complete gate output follows: ordinary/coordinated R1/R2 (all five player models), all four difficulty levels, and default plus all four prebaked Forge fixtures. Every cell uses 4,000 rounds at seed 2026. Hard gates remain casual 30–70% and no-punch ≥30%, with scouting coverage required; difficulty gates retain level ordering/tolerance and their original bounds. No damage, HP, model or gate values were adjusted. No golden vector or pose classifier changes. The final amendment only records completed verification evidence; no deployment or physical webcam claim.


### Every gate table — fresh-clone console output

```text
bossHp=135 ·4000 rounds/cell ·seed2026 ·ordinary · R1
player        v=0    v=3   v=50  v=500
casual       55.6   55.0   49.9   48.5
good         99.2   98.9   98.5   98.6
seated       71.4   71.7   66.4   65.9
nopunch      41.1   42.1   35.9   36.0
keyboard     96.0   95.8   94.5   93.1
PASS: casual30–70%, no-punch≥30%
ordinary R2 after real R1 warmups · brace attempt 0.35,hold 0.85
casual       56.7   62.5   49.3   50.2 · cards/exploits/fixes 67/85/21 brace=0 35/35/10 brace=3889 56/62/13 brace=637 42/41/9 brace=480
good         99.5   99.0   98.6   98.6 · cards/exploits/fixes 83/68/14 brace=0 32/28/10 brace=2652 58/49/11 brace=548 63/44/12 brace=473
seated       70.2   75.9   66.4   66.5 · cards/exploits/fixes 74/83/20 brace=0 65/83/20 brace=3864 78/86/18 brace=609 80/78/20 brace=560
nopunch      41.4   48.6   37.6   37.0 · cards/exploits/fixes 84/93/30 brace=0 75/83/27 brace=4289 79/82/14 brace=636 70/88/16 brace=554
keyboard     95.8   95.5   94.0   93.3 · cards/exploits/fixes 65/55/14 brace=0 59/51/19 brace=3288 72/61/18 brace=535 67/54/19 brace=451
PASS: cards=1304,exploits=1309,fixes=335,braces=23465
bossHp=135 ·4000 rounds/cell ·seed2026 ·coordinated · R1
player        v=0    v=3   v=50  v=500
casual       55.6   55.0   55.2   54.4
good         99.2   98.9   98.9   99.1
seated       71.4   71.7   72.2   71.8
nopunch      41.1   42.1   39.4   41.9
keyboard     96.0   95.8   96.0   96.2
PASS: casual30–70%, no-punch≥30%
coordinated R2 after real R1 warmups · brace attempt 0.35,hold 0.85
casual       56.7   62.5   65.6   65.5 · cards/exploits/fixes 67/85/21 brace=0 35/35/10 brace=3889 13/9/1 brace=5745 9/5/0 brace=5995
good         99.5   99.0   99.2   99.1 · cards/exploits/fixes 83/68/14 brace=0 32/28/10 brace=2652 11/2/0 brace=4631 8/2/0 brace=4549
seated       70.2   75.9   78.8   79.6 · cards/exploits/fixes 74/83/20 brace=0 65/83/20 brace=3864 19/9/2 brace=5869 23/13/3 brace=5700
nopunch      41.4   48.6   52.3   53.1 · cards/exploits/fixes 84/93/30 brace=0 75/83/27 brace=4289 21/12/1 brace=6443 23/25/3 brace=6396
keyboard     95.8   95.5   97.5   97.2 · cards/exploits/fixes 65/55/14 brace=0 59/51/19 brace=3288 6/3/1 brace=5241 15/4/1 brace=5254
PASS: cards=787,exploits=748,fixes=197,braces=73805
Difficulty model INFERRED: p=min(.95,p+.08*(effective telegraph_ms-800)/400); perfect/punch unchanged.
easy    casual     75.2   73.6   70.9   69.5
easy    nopunch    59.0   59.2   55.1   55.8
medium  casual     69.5   67.3   63.9   61.9
medium  nopunch    51.8   52.1   46.8   47.1
hard    casual     55.6   55.0   49.9   48.5
hard    nopunch    41.1   42.1   35.9   36.0
expert  casual     44.0   43.5   39.2   37.1
expert  nopunch    29.0   31.6   25.5   25.4
Forge default.json: {"casual":[55.65,55.275,49.625,50.425],"nopunch":[42.525,40.975,35.4,36.25]} PASS
Forge nak-muay.json: {"casual":[55.65,59.325,59.675,60.62499999999999],"nopunch":[42.525,44.95,44.1,45.175]} PASS
Forge neon-kraken.json: {"casual":[55.65,59.325,59.675,60.62499999999999],"nopunch":[42.525,44.95,44.1,45.175]} PASS
Forge tin-tactician.json: {"casual":[55.65,59.325,59.675,60.62499999999999],"nopunch":[42.525,44.95,44.1,45.175]} PASS
Forge velvet-sentinel.json: {"casual":[55.65,59.325,59.675,60.62499999999999],"nopunch":[42.525,44.95,44.1,45.175]} PASS
```
