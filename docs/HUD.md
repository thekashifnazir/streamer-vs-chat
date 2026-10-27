# HUD design exploration: what to borrow, three variants, one recommendation

**Recommendation: Variant B "Rails".** Everything lives in two dark side rails. The middle ~1,000 px stays camera, and the only thing allowed into the middle is the 0.8 s `HANDS UP!` banner above the head plus the lean chevrons beside the body. Borrow C's idea of a very large, single-colour lean arrow (B's chevrons were enlarged after the phone check for this reason).

Tags: **MEASURED** = rendered or checked on the VM, **READ** = docs/pages, **INFERRED** = my design judgement. Mockups are throwaway static HTML/CSS (`mockups/`), **not entry code**: per `AGENTS.md`, nothing here gets copied into the Codex entry. All names are made up (`KASH`, `CHAT GOLEM`, `tinyfist_99`). No third-party names, logos or sprites appear in any mockup. Backgrounds are Pexels stock frames (free licence) standing in for a mirrored webcam.

In the entry repo this file is `docs/HUD.md` and the recommended shot is `docs/hud-rails.png`; the other `shots/`, `mockups/` and `docs/spikes/` paths are prep-repo only. Rules used (`SPEC.md`): 2.4 s beat, 0.8 s telegraph, `HOOK_L` → lean right, `HOOK_R` → lean left, `SUPER` → any lean, guard blocks jab/combo, hype ≤100 gates `!super`, scouting cards from round 2 (≥65%, ≥12 observations).

## Files
| Variant | HUD | End-of-stream card |
|---|---|---|
| A Arena | `shots/a-arena.png` | `shots/a-arena-highlight.png` |
| **B Rails (recommended)** | `shots/b-rails.png` | `shots/b-rails-highlight.png` |
| C Scorebug | `shots/c-scorebug.png` | `shots/c-scorebug-highlight.png` |
| Before / after | `shots/before-current-hud.png` (copy of `docs/spikes/design/hud-1920x1080.png`) | `shots/after-recommended-b-rails.png` |

Re-render: `cd docs/design/mockups && node render.mjs [name ...]` (needs Playwright; set `CHROME=/path/to/chrome-headless-shell` if its bundled browser is missing).

## References: what to borrow and why
| Reference | What it does (READ) | Borrow | Why (INFERRED) |
|---|---|---|---|
| Boxing game with readable tells (NES/Wii "Punch-Out!!" series) https://en.wikipedia.org/wiki/Punch-Out!!_(Wii), https://en.wikipedia.org/wiki/Punch-Out!!_(NES) | Opponents telegraph each punch with a visible tell; the player reacts with a dodge/block, then counters in a short window. | The whole loop: **one tell, one answer**. The telegraph names the move *and* the answer ("HOOK LEFT · LEAN →"), then a counter prompt. | Viewers and streamer must parse it in 0.8 s. Naming the defence, not just the attack, removes the mirror-image confusion (hook left needs lean right). |
| 2023 fighting game with a resource gauge (SF6) https://en.wikipedia.org/wiki/Street_Fighter_6 | Drive Gauge: a segmented resource bar under the health bar, visually separate from HP; HP bars sit top-left/top-right around a central timer. | Top-corner HP with a red **damage trail**, centre timer, **segmented** hype meter in a different colour from HP. | The fighting-game top bar is a convention everyone on Twitch already reads. Segments let viewers see "two more chunks to a super". |
| 2024 fighting game with a comeback state (Tekken 8) https://en.wikipedia.org/wiki/Tekken_8 | Heat and Rage: a resource *state* that changes how the character looks. | `!super` row/button turns from "LOCKED" to lit when hype hits 100. | A state change is more readable than a number creeping up. |
| Crowd Control https://crowdcontrol.live/ | Viewers trigger effects in a streamer's game; the stream shows who triggered what. | Credit the crowd: "37 voting", top voter on the end card. | Chat needs to see its input landed, or it stops voting. |
| Twitch Extensions design guide https://dev.twitch.tv/docs/extensions/designing/ and policies https://dev.twitch.tv/docs/extensions/guidelines-and-policies/ | Overlays take video real estate; keep them small, adapt to resizing, limit fonts/sizes, one key colour for emphasis. | Two families only (Anton display, Barlow Condensed labels); one key colour per meaning. | Fewer styles = faster scanning on a phone. |
| Twitch polls https://help.twitch.tv/s/article/how-to-use-polls | Native polls show option, bar and percentage. | Vote rows as **command · bar · %**, leader highlighted. | It's the pattern Twitch viewers already know. |
| Mobbin, live polls: Yubo https://mobbin.com/screens/bf25e0d1-7ac3-4747-aca0-e7cab1b850fb, Shopee live https://mobbin.com/screens/a5ecb34c-6a6c-424a-a9c7-171d13fbda7e, Locals https://mobbin.com/screens/a3479c2a-0af1-4895-ae28-d8db4ea869ce, Instagram https://mobbin.com/screens/e1a4b640-360a-477d-9c34-85359e60de87 | Polls over live video: short label, thick bar, big %, winner tinted. | Leader row tinted and outlined (B), or as a lit button (C). | Same pattern across four big apps, so it's the safe default. |
| Mobbin, workout video metrics (Tempo, Future, Centr, Peloton Strength+) and sports scorebugs (Apple Sports, theScore, DAZN, FotMob) | Big numerals on a dark gradient at the frame edge; sports apps put two sides and a score in one band. | B's rail gradient and big HP numbers; C's TV-style band and the C end card's "KASH 2–1 CHAT GOLEM" header. | Video-over-metrics apps solved "numbers on top of a moving body" already. |
| Mobbin, share/summary cards (Runna, Hevy, Fitbit) and insight cards (5 Minute Journal, Finch) | One hero number, a few stats, one evidence line. | End-of-stream card: result, best-moment clip, 2–4 stats. Scouting card: claim + % + `n=`. | `n=30` makes the weakness feel earned, not random. |
| Xbox Accessibility Guideline 101 (text) https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101; Game Accessibility Guidelines https://gameaccessibilityguidelines.com/use-an-easily-readable-default-font-size/; WCAG contrast https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html | ≥26 px text at 1080p on console (18 px minimum for streaming/mobile); 4.5:1 contrast. | **No text under 26 px**; labels 28–34 px, key values 50–150 px; text on 84–92% dark panels or with a black stroke. | A phone player shrinks 1080p ~4–5×, so 26 px becomes ~6 px. Only the big numbers survive. |

## The three variants
All three share: yellow = streamer, pink = boss/chat, cyan = "what you do now", red = damage. Fake chat carries a striped yellow `SIMULATED CHAT` badge.

**A Arena:** classic fighting-game top bar (HP + damage trail + centre timer + segmented hype under the boss bar), scouting card top-left, vote panel top-right, big telegraph lower-centre.
- + Most familiar; very readable.
- − The telegraph sits on the torso, the exact area pose tracking and viewers need. Fails "keep the centre clear".

**B Rails (recommended):** a streamer rail on the left (HP, rounds, scouting card, SIMULATED), a boss rail on the right (HP, hype, votes). Telegraph is a drop-banner above the head; lean chevrons go in the gap on the lean side.
- + Centre stays camera. Each side "belongs" to one player, so colour + side tells you whose number it is.
- + At 16:9 the rails cover the dead wall either side of a person standing 2 m back.
- − Rails cost ~50% of width at the edges; a wide stance or a big lean can clip under them (keep rails 85–92% opacity, not solid).

**C Scorebug:** TV-sports bands. Slim HP band on top, five big vote "buttons" along the bottom (`!super` doubles as the hype meter), and the telegraph turns the lean side of the frame into one giant cyan arrow.
- + The arrow is readable from across a room, the strongest 3-second read of the three.
- − The bottom band hides the legs/stance; the arrow covers the space the streamer is leaning into.

## Phone check (MEASURED)
Downscaled every HUD to 400×225 (about a phone's inline Twitch player) and looked at each:
- **Current HUD:** only `HANDS UP!` and the timer read. The vote panel, feed, hype and safety text are illegible, and the callout sits on the face.
- **A, B, C:** HP %, timer, `HANDS UP!`, the move name, vote leader and `83%` all read. The `n=30` and "37 voting" lines don't, which is fine because they're secondary.
- B's first chevrons were too small at phone size; I made them 170 px and the `LEAN` label 76 px (now in the shot).

## Framing (measured on Kash's webcam)
These are Kash's figures from a real clip: 1280x720, low camera, waist-up, hips out of frame. They are MEASURED on his side, and the rail maths below is INFERRED from them. The clip is 16:9 like the 1920x1080 overlay, so the frame fractions carry over. B's rails cover x < 0.245 and x > 0.755. Body edge = shoulder midpoint ± half the shoulder width, and the mirror image of any range is 1 − x.

| Pose | Shoulder midpoint | Shoulder width | Full-lean midpoint | Body edges at full lean | Under a rail? |
|---|---|---|---|---|---|
| Standing | 0.47–0.50 | 0.15–0.19 | 0.37–0.58 | ≈0.28–0.67 (mirrored ≈0.33–0.72) | No. B fits. |
| Seated | (closer) | 0.20–0.28 | 0.31–0.62 | ≈0.17–0.76 (mirrored ≈0.24–0.83) | Yes. A full lean goes under a rail. |

- **Standing:** B Rails fits as drawn, with about 0.03 of frame width spare on each side.
- **Seated mode:** the rails must get out of the way. Either shrink them to ~300 px (0.16) and fade the inner edge to ~60% opacity, or move the rail content into a top band (A's top bar plus B's above-the-head telegraph). Either way, a full lean must never end under a panel, because that's the moment viewers need to see.
- **Seated calibration copy:** "Sit ~1 m further back than feels natural." The calibration step should check that shoulder width is ≤0.20 of frame width before the round starts.

## Recommended layout (B), spec for the Codex build
1. **Left rail (0–470 px):** STREAMER label, name, HP number at 150 px, HP bar with red trail, rounds, scouting card (from round 2 only), `SIMULATED CHAT` badge bottom-left.
2. **Right rail (1450–1920 px):** BOSS label, name, HP number, HP bar, segmented hype bar + "→ !SUPER", vote rows (command 50 px, bar, %), leader tinted yellow, `!super` greyed until hype = 100.
3. **Top centre:** timer pill (84 px) + "ROUND 2/3".
4. **Telegraph (0.8 s only):** `HANDS UP!` 140 px pink with black stroke at y≈140–300 (above the head), then a white pill with the move name + cyan "LEAN →". Chevrons on the lean side at body height. Guard moves (`!jab`/`!combo`) show "GUARD" with no arrow; `!super` shows "LEAN ANY WAY" with arrows both sides.
5. **After a clean defence:** swap the banner for "COUNTER!" in green for the counter window.
6. **Colours:** never use pink for the streamer or yellow for the boss. Cyan only for "do this now".
7. **Seated / no-punch modes:** the cue changes word ("TILT →" for seated), and seated mode shrinks or fades the rails (see Framing).
8. Keep the mirrored camera (`scaleX(-1)`) so screen-right = the streamer's right and the arrow matches the body.

## Open questions for Kash
- Boss name: `CHAT GOLEM` is a placeholder.
