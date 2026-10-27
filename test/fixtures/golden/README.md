# Golden test vectors: core loop

Test **data** for the Streamer vs Chat engine, derived from `docs/spec.md` (§1 core loop, §2 defence table, §4 scouting, §7 acceptance tests). `mac/new-entry.sh` copies this folder to **`test/fixtures/golden/`** in the entry, so the entry's tests should load `test/fixtures/golden/*.json` and run every vector through its own engine. This folder holds no code. The prep repo's checker (`spikes/golden-check/`) is a throwaway that shows the vectors agree with each other; it is reference only, so never copy it into the entry.

**MEASURED:** `python3 spikes/golden-check/check.py` reports `50/50 vectors pass` on this commit.

Where the spec didn't settle a detail, a vector lists it in `assumes` (for example `"Q1"`), and [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md) gives the recommended answer that the vector uses. If Kash decides differently, change those vectors.

## Files

| File | Vectors | Covers |
|---|---|---|
| `defence.json` | 8 | every cell of every §2 row (JAB, COMBO, HOOK_L, HOOK_R, SUPER), guard+lean precedence, the PERFECT 400/401 ms edge, the COMBO split guard (7 lands, no counter), keyboard = pose |
| `damage.json` | 7 | counter window 699/700/701 ms, punch throttle 449/450 ms, CHIP opens no window, low-HP mercy at exactly 30 and below, mercy on CHIP |
| `votes.json` | 11 | latest-per-viewer, beat-boundary vote, 10k-draw distribution, weighted not plurality, autopilot, no-triple-repeat, SUPER gate, SUPER cap, hype formula and cap |
| `rounds.json` | 9 | timeout on HP %, % not raw HP, tie to the streamer, KO mid-beat by punch, KO by counter, KO mid-COMBO, 30 attacks per round, best of 3 |
| `scouting.json` | 10 | §7 test 12 (11/11, 12/14), Wilson boundary 10/12 pass vs 9/12 fail, round-1 gate, live 12th dodge, exploit cooldown, which move is the exploit, fix at 62.5% with the HP cap |
| `edge-cases.json` | 5 | same-millisecond ordering, input at the round end, `!veto` cancel and freeze |

Each file is `{ "format": "streamer-vs-chat-golden/1", "file": "<name>", "vectors": [ ... ] }`.

## Vector format

```json
{
  "id": "def-jab-row",
  "spec_ref": "§2 row 1 (JAB); §7 tests 5, 6",
  "description": "What happens, in words, with the arithmetic.",
  "seed": 0,
  "initial_state": { "streamer.hp": 30, "moves": ["JAB", "JAB"] },
  "events": [ { "t_ms": 2900, "type": "guard", "value": true } ],
  "expect": [ { "t_ms": 3200, "path": "log.resolved[0].outcome", "equals": "PERFECT" } ],
  "assumes": ["Q1"]
}
```

- **One vector = one round**, starting at `t_ms = 0`. All times are ms relative to the round start. Later rounds are tested by setting `round.number`, `match.round_wins` and `scouting.dodges` in `initial_state` (the things that carry over); everything else starts fresh, as §1 says each round resets.
- **`seed`**: seeds the round's RNG (below). Used only by draws.
- **`initial_state`**: dotted-path overrides on the default state below. Special key **`moves`**: a scripted list of boss moves, one per beat (beat 0 first). When `moves` is set the RNG is not used, votes don't pick the move, and a scripted SUPER doesn't spend hype or count toward the cap: it only tests defence. A beat past the end of the list has no attack. When `moves` is absent, moves come from the vote draw.
- **`events`**: inputs, applied in `t_ms` order (ties keep file order).

| `type` | `value` | other fields | meaning |
|---|---|---|---|
| `vote` | chat text, e.g. `"!jab"` | `viewer` (user id) | a chat message; anything that isn't exactly a vote command is ignored |
| `guard` | `true` / `false` | | guard raised / dropped (pose or keyboard, already debounced) |
| `lean` | `"L"` / `"R"` / `null` | | current lean; `null` = centred |
| `punch` | `"L"` / `"R"` | | one punch (the hand doesn't matter) |
| `key` | `{ "key": "K"\|"A"\|"D"\|"J", "down": bool }` | | keyboard: hold K = guard, hold A = lean L, hold D = lean R (both or neither = no lean), J down = punch |
| `control` | `"veto"` (or `"pause"`) | `viewer`, `role`: `"viewer"`\|`"mod"`\|`"broadcaster"` | a `!veto` / `!pause` chat command; only mods and the broadcaster count |

- **`expect`**: `{ t_ms, path, <matcher> }`. `t_ms` is a number (the state *after* everything at that ms, engine and inputs, has run) or `"end"` (after the round is over, or after the clock would reach 75,000 ms). Matchers: `equals` (exact JSON equality, `null` included), `approx` (number, tolerance `tol`, default 1e-6), `in` / `not_in` (list membership). Paths use dots and `[i]`; `.length` is a list's length.
- **`kind: "draw"`** vectors (only `vote-draw-10k`) skip the round: run the draw procedure `draws.n` times on one RNG with fixed `draws.counts` and an empty history, then check `count.<MOVE>`, `share.<MOVE>` and `first10` (the first 10 picks).

### State paths the vectors read

| Path | Meaning |
|---|---|
| `streamer.hp`, `streamer.max_hp` (100), `boss.hp`, `boss.max_hp` (135) | HP as a float; damage is never rounded |
| `hype` (0..100), `supers_used`, `viewers` | §1 hype. `viewers` defaults to 0 |
| `history` | moves drawn so far (oldest first), used by the no-triple rule |
| `tally.<MOVE>`, `voters` | counted votes in the current beat; cleared when the beat is drawn |
| `round.number` (1), `round.over`, `round.winner` (`"streamer"`/`"boss"`/null), `round.ended_at`, `round.end_reason` (`"ko"`/`"timeout"`) | |
| `match.round_wins.streamer`, `match.round_wins.boss`, `match.winner` | best of 3; winner after 2 round wins |
| `counter.open`, `counter.closes_at` | §2 counter window |
| `paused` | frozen by `!veto` / `!pause` |
| `scouting.dodges` | lean side (`"L"`/`"R"`) of every DODGE on a hook or SUPER, oldest first; carries over between rounds |
| `scouting.n`, `scouting.card` (`"L"`/`"R"`/null), `scouting.fixes` | §4 |
| `log.telegraphs[i]`: `beat, move, at, lands_at, exploit, vetoed` | one per attack drawn |
| `log.resolved[i]`: `beat, move, at, outcome, dmg, counter_dmg` | one per attack resolved. `outcome` ∈ BLOCK, PERFECT, DODGE, CHIP, HIT. `dmg` = damage to the streamer after mercy. For a COMBO, `at` is the second hit and `dmg` is the total |

## Timing (§1 beat timeline)

- Beat `N` (from 0) covers `[2400·N, 2400·(N+1))`. A vote at exactly `2400·(N+1)` belongs to beat `N+1`.
- At `2400·(N+1)` beat N is drawn. Its telegraph starts there and the hit lands at `L(N) = 2400·(N+1) + 800`. So beat 0's hit lands at 3,200, beat 1's at 5,600.
- A beat whose hit would land at or after 75,000 isn't drawn, so a full round has 30 attacks (the last drawn at 72,000, landing at 72,800).
- COMBO hits land at `L(N)` and `L(N)+300`. The outcome, counter and window are decided at the second hit.
- Counter window: open over `[resolve, resolve + 700)`. A punch at +699 is inside (+1.5), at +700 outside (+1).
- Punch throttle: a punch counts if it's ≥ 450 ms after the last **counted** punch. Ignored punches don't restart the timer.
- **Same-millisecond order:** at any ms, run the engine first, in this order: counter-window close, hits landing (COMBO hit 1 before hit 2), beat draw, round timeout. Then apply that ms's input events. So a guard raised at the exact landing ms is too late, and an input at 75,000 is ignored. Once the round is over (KO or timeout), nothing else is applied.
- Mercy uses the streamer's HP **before** each hit: `hp < 30` → damage ×0.6 (applies to each COMBO hit separately).
- Each beat draw, in order: (1) pick the move with the procedure below; (2) `hype = min(100, hype + 12·log2(1+voters) / max(1, log2(1+viewers)/3) + (viewers == 0 ? 6 : 0))`; (3) if the move is SUPER, `hype = 0` and `supers_used += 1`; (4) exploit check (§4); (5) clear the tally.
- A `!super` vote is dropped when it arrives unless `hype == 100 && supers_used < 3` at that moment.

## RNG: mulberry32

One generator per round, seeded with `seed`, called only by the draw. Every call advances it once. All arithmetic is unsigned 32-bit.

```
state = seed >>> 0
next():
  state = (state + 0x6D2B79F5) mod 2^32
  t = imul(state ^ (state >>> 15), 1 | state)
  t = (t + imul(t ^ (t >>> 7), 61 | t)) ^ t        // the + is mod 2^32
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296    // float in [0, 1)
```

`imul` is 32-bit multiplication (JavaScript `Math.imul`). Check values (`next()·2^32`, first three calls): seed 0 → 1144304738, 1416247, 958946056; seed 42 → 2581720956, 1925393290, 3661312704; seed 2026 → 1955961175, 1324980858, 2839649622.

## Weighted draw

Move order is fixed: `ORDER = [JAB, HOOK_L, HOOK_R, COMBO, SUPER]`, `BASE = [JAB, HOOK_L, HOOK_R, COMBO]`.

1. Tally: each viewer's latest valid command in the beat (dropped `!super` votes don't count, and don't overwrite that viewer's earlier vote). `w[m]` = number of viewers whose latest vote is `m`. `total = Σ w`.
2. If `total > 0`: `x = floor(next() · total)`. Walk `ORDER`; the pick is the first `m` with `x < w[m]`, otherwise `x -= w[m]` and continue.
3. If `total == 0` (autopilot): pick `BASE[floor(next() · 4)]`.
4. No triple: if the last two entries of `history` both equal the pick, replace it with `others[floor(next() · 3)]`, where `others` is `BASE` without the pick, in `BASE` order. (This uses a second RNG call.)
5. Append the pick to `history`.

Worked example (`vote-weighted-not-plurality`): JAB 3, HOOK_L 1, seed 4. `next() = 0.92364`, `x = floor(3.69) = 3`. JAB covers 0-2, so x = 3 falls in HOOK_L.

## Scouting (§4)

After each resolved attack:
- If there is no card: look at the dodges logged since the last fix (all of them if none). `n` = count, `k` = count of the more common side (ties → L). Show a card for that side when `round.number ≥ 2 && n ≥ 12 && k/n ≥ 0.65 && wilsonLB(k, n) ≥ 0.60`, with `wilsonLB(k,n) = (p + z²/2n − z·sqrt(p(1−p)/n + z²/4n²)) / (1 + z²/n)`, `p = k/n`, `z = 1.645`. Boundary: 10/12 → 0.60077 (card), 9/12 → 0.51264 (no card).
- If there is a card: when the last 8 dodges hold ≥ 8 entries and the card side's share of them is ≤ 62.5% (5 of 8), the habit is fixed: `card = null`, `fixes += 1`, `streamer.hp = min(100, hp + 10)`.
- The exploit move is HOOK_L for card L and HOOK_R for card R. When a beat's move is the exploit, the card is live and the cooldown is 0, `exploit = true` and the cooldown becomes 3; otherwise a non-zero cooldown goes down by 1 per drawn beat. An exploit adds no damage.
