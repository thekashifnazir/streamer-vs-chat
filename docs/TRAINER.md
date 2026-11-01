# Crowd Trainer

A second game mode for fitness and boxing streams. Chat calls the combo, like a coach calling numbers in a boxing class. You throw it on webcam or keyboard. Boss Fight is unchanged.

Open it with the **Crowd Trainer** button on the setup screen, or go straight in with `?mode=trainer` (for example `/?mode=trainer` for the offline demo). The offline demo uses SIMULATED chat and says so on screen. `/play` uses your real Twitch chat.

## Chat commands

First word of the message, any case, `!` required. One vote per viewer per call; a later vote replaces an earlier one.

| Command | Combo | Tokens |
|---|---|---|
| `!12` | One-two | 1 2 |
| `!112` | One-one-two | 1 1 2 |
| `!121` | One-two-one | 1 2 1 |
| `!1212` | One-two-one-two | 1 2 1 2 |
| `!12s` | One-two, slip | 1 2 S |
| `!s12` | Slip, one-two | S 1 2 |
| `!12g` | One-two, guard | 1 2 G |
| `!2s2` | Two, slip, two | 2 S 2 |
| `!faster` / `!slower` | Pace | shortens or lengthens the gap between combos by 0.5 s, kept between 1.2 s and 5 s |

Votes count until the next call. The next combo is drawn weighted by votes, using the Boss Fight rules: never the same combo three times in a row, and autopilot picks at random when nobody votes. Votes cast during rest choose the first combo of the next round.

Mods and the broadcaster can use `!pause` and `!resume` (same as Boss Fight) and `!stop`, which ends the workout and shows the summary. `Esc` pauses.

## Tokens and what the webcam reads

| Token | Meaning | Webcam | Keyboard |
|---|---|---|---|
| `1` | Lead hand punch (your left; your right with **Southpaw** on) | which hand extended | `F` |
| `2` | Rear hand punch (your right; your left with Southpaw) | which hand extended | `J` |
| `S` | Slip: a lean to either side | lean starts | `A` or `D` |
| `G` | Guard up, held 0.5 s | both fists at face height | hold `K` |

A front webcam cannot see depth, so the game never claims a punch type (jab, cross, hook). It only reads which hand punched. Punch side comes from MediaPipe's anatomical landmarks on the raw, unmirrored frame, so `1` is your own left hand for an orthodox stance even though the preview is mirrored (READ: `capture/src/classifier.ts` uses raw indices and `test/pose/README.md` scores anatomical `left_punch`/`right_punch`).

On webcam, Trainer uses its own detector (`capture/src/trainer-moves.ts`); Boss Fight thresholds are unchanged. Straight punches at the camera barely lengthen the arm in 2D, so the Boss Fight gate (arm longer than 1.6 shoulder widths) missed most of Kash's recorded punches. The Trainer detector looks for a quick move of one wrist away from where it rests, measured against the recent shoulder width, and reads a slip as the head and shoulders shifting sideways while no hand is out. A Boss Fight lean onset also counts as a slip; the two are merged so one slip counts once.

Measured on Kash's 1 Nov drill clip (MEASURED, replay test `test/pose/trainer-moves.test.ts`, Logitech webcam, 30 fps, his 31 Oct calibration):

| Drill | Trainer detector | Boss Fight gate |
|---|---|---|
| Left punches (6 thrown) | 7 L (1 extra), 1 R | 4 L, 1 R |
| Right punches (5) | 5 R, 0 L | 0 R, 1 L |
| One-twos (5) | 3 L + 4 R, 2 complete in order | 1 L, 1 R |
| Slips left (3) | 3 L, 2 wrong side | lean L 1 |
| Slips right (3) | 2 R, 1 wrong side | lean R 3 |
| Guard holds (2) | 0 punches, 0 slips | guard 2 |
| One-two-slip / one-two-guard (6 one-twos) | 5 complete one-twos in order | 1 L, 1 R |

`1` is the player's own left hand: in the raw camera frame his LEFT punches move MediaPipe landmark 15 (left wrist) and his SLIP RIGHT registers lean R.

In Trainer, `J` is the right hand (in Boss Fight it is the bonus punch). `K`, `A` and `D` keep their Boss Fight meaning.

## Scoring

Scoring is lenient because the webcam misses some punches. Tokens light up in order as they are detected. Moves that do not fit are ignored. If a move fits the token after the current one, the current token is skipped (counted as missed) and play carries on.

- **CLEAN**: every token, in order.
- **PARTIAL**: at least one token.
- **MISSED**: nothing detected in time. Never a fail state; the next combo comes anyway.

**Any hand counts** (an easier option) ignores which hand punched. **Southpaw** swaps 1 and 2.

The time to throw a combo grows with its length and shrinks with difficulty (Easy is the most generous). A guard token adds its 0.5 s hold.

## Rounds

3 work rounds of 60 s with 20 s rest between them. The rest screen counts down. All timings live in `TRAINER` in `shared/src/trainer.ts`.

At the end a workout card shows combos clean / partial / missed, punches thrown (left and right), slips, guards, active minutes, chat's favourite combo and how many chatters voted. It makes no calorie, heart-rate or medical claims.

## Code

- `shared/src/trainer.ts`: pure reducer, no clock calls. Combo menu, timing constants, draw, matching, summary.
- `shared/src/trainer-commands.ts`: chat parser, used only in Trainer mode.
- `demo/src/trainer-ui.ts`: mode choice, stage overlay, rest screen and summary card. `demo/src/trainer-sim.ts`: SIMULATED voters for the offline demo.
- Audio hook: `onTrainerCue(listener)` in `demo/src/trainer-ui.ts` receives `combo-12` … `combo-2s2`, `round-start`, `rest`, `ten-seconds`, `time`, `clean`, `partial`, `missed`, `faster`, `slower`, `workout-done`. By default they play the existing sound effects; recorded coach lines can subscribe to the same ids.
