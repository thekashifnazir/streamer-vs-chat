# Boss art: "Chat Golem" (original, CC0)

Original 2D art for the chat-piloted heavyweight boss in "Streamer vs Chat". It replaces the stand-in OGA boxer listed in `docs/assets.md`. Every pixel is drawn by code in this folder.

## Provenance and licence

- **Method:** `src/boss.py` builds each pose from geometric primitives (capsules, ellipses, Bézier paths) as SVG, written by hand in Python for this repo. CairoSVG rasterises it. No source images, traced art, photos, image-generation models or third-party art went in. The only inputs are the HUD colours from `docs/design/mockups/shared.css`.
- **Licence:** CC0 1.0 Universal. Kash (Kashif Nazir) dedicates the art, the SVGs and the scripts to the public domain: https://creativecommons.org/publicdomain/zero/1.0/
- **Rebuild:** `pip install cairosvg pillow numpy colour-science`, then from `src/`: `python3 boss.py && python3 pack.py`. For previews and checks: `node preview.cjs` (needs Playwright; set `CHROME=` to pick a browser) and then `python3 a11y.py`. The output is deterministic. To change a pose, edit its `pose(...)` call in `frames()`.
- **Entry rule:** the entry must be created during the Submission Period. The PNGs, sheets and atlas are CC0 **assets**, so the entry can ship them the same way it ships CC0 SFX. Don't copy `src/` scripts into the entry as code.

## Files

| Path | What |
|---|---|
| `frames/<name>.png` | One transparent PNG per frame at 2x: 1080 × 972. In idle he stands ~837 px tall, so ~418 px on a 1080p overlay at 0.5 scale. |
| `frames/<name>.svg` | The vector source of each frame (drawing units 1200 × 1080) |
| `boss-sheet@1x.png` + `.json` | All 30 frames trimmed onto one 4096 × 1315 sheet at overlay size. **Use this on a 1080p overlay.** |
| `boss-sheet@2x-0/-1.png` + `.json` | The 2x frames on two pages (≤ 4096 px each, the safe WebGL texture limit), linked by `related_multi_packs` |
| `previews/<name>.jpg` | Every frame on the Rails HUD at 1920 × 1080, with the telegraph set for that move (see below) |
| `previews/_literal-composite-over-b-rails-png.jpg` | `hookl_windup_1` pasted straight onto `docs/design/shots/b-rails.png`. This shows why the right rail is compacted in the previews. |
| `a11y/` | Protanopia and deuteranopia simulations of the telegraph frames, at full size and phone size (390 px wide) |
| `src/` | `boss.py` (drawing), `pack.py` (sheet + atlas), `preview.cjs` (HUD previews), `a11y.py` (colour-blind check), `frames.json` (names + ms) |

## Browser delivery (Queue 13q)

The runtime uses `boss-sheet@1x.webp`, encoded from the retained 4096 × 1315 PNG with `cwebp -q 88 -alpha_q 100 -m 6`. Frame rectangles, dimensions, alpha channel and atlas timings are unchanged; RGB is compressed. PNG: 2,867,378 bytes; WebP: 803,458 bytes. The image request begins when the HUD mounts. A small original vector silhouette remains visible while the sheet or atlas loads, or after a load failure, instead of a cleared blank canvas.

## Atlas

The atlas uses the TexturePacker "JSON hash" layout, so PixiJS `Assets.load('boss-sheet@1x.json')` and Phaser `load.atlas` read it directly. For each frame it gives the `frame` rect on the sheet, the trim offset (`spriteSourceSize`), `sourceSize`, an `anchor`, the suggested `duration` in ms and a `note`. `animations` lists the frame order for each clip.

**Pivot:** every frame shares `anchor {x: 0.5, y: 0.963}`, the floor point between his boots. Put that point at the same overlay position for every frame and nothing jumps when clips change. The previews use (1660, 1066) on the 1920 × 1080 overlay.

| Clip | Frames → ms | Timing vs `docs/spec.md` |
|---|---|---|
| `idle` | idle_0..3 → 160 each | 640 ms loop |
| `<move>_windup` (jab, hookl, hookr, combo) | `_windup_0` 120 → `_windup_1` 680 | = the 800 ms telegraph. Start it with `HANDS UP!` and hold `_1` until `landsAt` |
| `<move>_hit` | 220 | starts at `landsAt` |
| `combo_hit` | combo_hit_1 300 → combo_hit_2 220 | the 2nd hit lands at `landsAt + 300` |
| `super_windup` | 0 (crouch) 160 → 1, 2, 1, 2 at 160 | 800 ms: the aura shimmers between 1 and 2 |
| `super_hit` | 300 | |
| `hurt` (counter landed) | 140 → 200 | then idle |
| `blocked` (his hit was blocked or dodged) | 140 → 260 | then idle |
| `ko` | 180 → 180 → hold `ko_2` (`duration: 0`) | |
| `victory` | 300 each, loop | |

## How the telegraphs read (and agree with the HUD)

The rule from `docs/spec.md` is that straight attacks need the guard, hooks need a lean, and the super takes any lean. Each wind-up pairs an exaggerated pose with one non-colour direction cue drawn in white and pink:

- **JAB:** lead glove cocked high by his ear, body coiled back, a dashed ring round the glove. No sideways arrow, so it can't be read as a lean. The HUD shows `JAB GUARD` with no chevrons.
- **COMBO:** both gloves cocked high, each with a ring (two rings = two hits), wide stance. The HUD shows `COMBO GUARD`.
- **HOOK_L** (swings from the screen's left): lead arm thrown out to screen-left, torso turned, and a thick swing trail across his chest from left to right with the **arrowhead pointing right**. That matches the HUD's `LEAN →` and its chevrons on the right.
- **HOOK_R** (swings from the screen's right): the mirror. Rear arm out to screen-right, trail right to left, **arrowhead pointing left**, which matches `← LEAN` and the left chevrons.
- **SUPER:** a deep crouch with both gloves clasped overhead (a vertical smash), glowing eyes and a spiky pink aura. No sideways arrow, because either lean works. The HUD shows `LEAN ANY WAY` with chevrons on both sides.

The arrow on a hook trail shows where the glove travels, which is also the way to lean, so the boss art, the HUD arrow and the chevrons all point the same way. Nothing in the art flashes: the super aura switches between two frames at 160 ms (about 6 Hz) with a small change in outline, not a light/dark flash.

Colours follow `docs/design/`. Boss pink `#ff2e88` is used for the gloves, trim and trail. Cyan `#2ef2ff` (the defence colour) and streamer yellow `#ffd84a` are left out of the character, so they keep their HUD meaning. Skin is a muted violet `#7a68b0` and every shape has a dark ink line plus an outer white keyline, so he stands out against both the camera and the dark rail.

## Colour-blind and phone-size check (MEASURED with `src/a11y.py`)

`src/a11y.py` uses the Machado 2009 simulation from `spikes/a11y-check/cvd.py`, CIEDE2000 and WCAG contrast:

| Pair | ΔE00 normal | ΔE00 protan | ΔE00 deutan | Contrast normal / protan / deutan |
|---|---|---|---|---|
| glove/arc pink vs skin `#7a68b0` | 29 | **10** | 34 | 1.4 / 1.1 / 1.6 |
| glove/arc pink vs skin shadow `#54448a` | 35 | 15 | 43 | 2.3 / 1.6 / 2.8 |
| skin vs trunks `#2b1747` | 28 | 28 | 28 | 3.4 / 3.4 / 3.3 |
| white keyline vs gym wall in the b-rails cam `#4a5560` | 52 | 51 | 52 | 7.6 / 7.4 / 7.7 |
| white keyline vs rail panel `#080510` | 98 | 98 | 98 | 20.2 |
| pink vs cue cyan | 81 | 35 | 31 | 2.5 / 4.0 / 2.0 |

What this means:

- Under protanopia the pink gloves and violet skin come out as similar greys and blues (ΔE 10). The gloves still read because they have an ink outline and a white highlight, and they're big round shapes. No cue depends on glove colour. Direction comes from the pose and the white-cored trail and arrowhead, which keep 7:1 or better on any background. See `a11y/hookl_windup_1--protanopia.jpg`.
- The silhouette doesn't depend on colour: the white keyline is ≥ 7.4:1 against the camera for all three vision types.
- **Phone size:** at 390 px wide (`a11y/*--phone*.png`) he's about 85 px tall. The pose class is still clear: one arm out with a horizontal trail (hook), gloves up with rings (jab/combo), arms overhead with an aura (super). The trail's arrowhead is only ~10 px, though. On a phone the HUD's banner and chevrons carry the direction, and the boss art backs them up.

## The previews

`previews/` is rendered from `docs/design/mockups/b-rails.html`, the page `docs/design/shots/b-rails.png` is shot from, rather than pasted onto the PNG. Two reasons:

- The telegraph banner and chevrons have to match each frame's move.
- In the original mockup the vote list runs down to y≈700, exactly where a ~420 px boss stands. `_literal-composite-over-b-rails-png.jpg` shows the overlap. The previews compact the right rail so it ends at y≈576: name 54 px, HP 96 px, vote rows 38 px (still ≥ 36 px, the phone-legibility floor in `docs/research/11`). The boss stands in the freed space from about y≈640 down to the floor.

That compaction is a suggestion for the entry's HUD, not a change to `docs/design/`.
