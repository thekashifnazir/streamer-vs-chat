# Asset and dependency credits

- **Chat Golem:** original art dedicated to CC0 by Kash (Kashif Nazir). Atlas and provenance: `assets/boss/README.md`.
- **Anton / Barlow Condensed / Bungee / Russo One / Inter:** SIL Open Font License 1.1. Original notices are retained in `assets/fonts/` and identified per file below.
- **Prepared SFX/music:** CC0 sources documented in `assets/SOUNDS.md`: Kenney sound packs; Freesound 420668 by SypherZent, 520998 by Mateusz_Chenc, 221567 by AlaskaRobotics; OpenGameArt “8-Bit Battle Loop” by Wolfgang_. Original Kenney notices are in `assets/licences/`.
- **Original announcer audio:** generated locally with Kokoro-82M. Source-model, process and provenance notes: `assets/voice/README.md`.
- **MediaPipe Tasks Vision 0.10.32:** Google/MediaPipe Authors, Apache-2.0 as declared by the pinned npm package. License text is retained in `assets/licences/Apache-2.0.txt`. Official lite model source/checksum: `capture/public/models/README.md`.

The demo build includes this file and the relevant notices under `/credits/`. No prep-repository implementation code is included.

## Asset-by-asset inventory

All prepared SFX/music below are CC0 1.0; the source names are retained from `assets/sfx-ready/levels.json`. Source attribution is courtesy attribution under CC0, not a new licence condition.

The table is generated from `git ls-files assets`: one row per tracked file, including provenance documents, metadata and notices. Regenerate with `npx tsx scripts/asset-credits.ts`. Unclassified additions fail generation rather than receiving an assumed licence.

<!-- asset-inventory:start -->
| Tracked asset | Source / provenance | Licence / terms |
|---|---|---|
| `assets/SOUNDS.md` | Project provenance and preparation documentation | Documentation; underlying asset terms listed here and in this file |
| `assets/boss/README.md` | Original Chat Golem art, atlas and provenance by Kashif Nazir; `assets/boss/README.md` | CC0 1.0 Universal |
| `assets/boss/boss-sheet@1x.json` | Original Chat Golem art, atlas and provenance by Kashif Nazir; `assets/boss/README.md` | CC0 1.0 Universal |
| `assets/boss/boss-sheet@1x.png` | Original Chat Golem art, atlas and provenance by Kashif Nazir; `assets/boss/README.md` | CC0 1.0 Universal |
| `assets/boss/boss-sheet@2x-0.json` | Original Chat Golem art, atlas and provenance by Kashif Nazir; `assets/boss/README.md` | CC0 1.0 Universal |
| `assets/boss/boss-sheet@2x-0.png` | Original Chat Golem art, atlas and provenance by Kashif Nazir; `assets/boss/README.md` | CC0 1.0 Universal |
| `assets/boss/boss-sheet@2x-1.json` | Original Chat Golem art, atlas and provenance by Kashif Nazir; `assets/boss/README.md` | CC0 1.0 Universal |
| `assets/boss/boss-sheet@2x-1.png` | Original Chat Golem art, atlas and provenance by Kashif Nazir; `assets/boss/README.md` | CC0 1.0 Universal |
| `assets/fonts/Anton-400.woff2` | Anton project; original notice: `assets/fonts/anton-OFL.txt` | SIL Open Font License 1.1 |
| `assets/fonts/BarlowCondensed-600.woff2` | BarlowCondensed project; original notice: `assets/fonts/barlowcondensed-OFL.txt` | SIL Open Font License 1.1 |
| `assets/fonts/BarlowCondensed-700.woff2` | BarlowCondensed project; original notice: `assets/fonts/barlowcondensed-OFL.txt` | SIL Open Font License 1.1 |
| `assets/fonts/BarlowCondensed-800.woff2` | BarlowCondensed project; original notice: `assets/fonts/barlowcondensed-OFL.txt` | SIL Open Font License 1.1 |
| `assets/fonts/BarlowCondensed-900.woff2` | BarlowCondensed project; original notice: `assets/fonts/barlowcondensed-OFL.txt` | SIL Open Font License 1.1 |
| `assets/fonts/Bungee-OFL.txt` | Original font copyright and licence notice | SIL Open Font License 1.1 (notice text) |
| `assets/fonts/Bungee-Regular.ttf` | Bungee project; original notice: `assets/fonts/Bungee-OFL.txt` | SIL Open Font License 1.1 |
| `assets/fonts/Inter-var.woff2` | Inter project; original notice: `assets/fonts/inter-OFL.txt` | SIL Open Font License 1.1 |
| `assets/fonts/RussoOne-OFL.txt` | Original font copyright and licence notice | SIL Open Font License 1.1 (notice text) |
| `assets/fonts/RussoOne-Regular.ttf` | RussoOne project; original notice: `assets/fonts/RussoOne-OFL.txt` | SIL Open Font License 1.1 |
| `assets/fonts/anton-OFL.txt` | Original font copyright and licence notice | SIL Open Font License 1.1 (notice text) |
| `assets/fonts/barlowcondensed-OFL.txt` | Original font copyright and licence notice | SIL Open Font License 1.1 (notice text) |
| `assets/fonts/inter-OFL.txt` | Original font copyright and licence notice | SIL Open Font License 1.1 (notice text) |
| `assets/licences/Apache-2.0.txt` | Apache Software Foundation licence text retained for MediaPipe | Apache License 2.0 (notice text) |
| `assets/licences/kenney-digital-audio-License.txt` | Original Kenney pack notice; pack named in the file | CC0 1.0 (notice text) |
| `assets/licences/kenney-game-icons-license.txt` | Original Kenney pack notice; pack named in the file | CC0 1.0 (notice text) |
| `assets/licences/kenney-impact-sounds-License.txt` | Original Kenney pack notice; pack named in the file | CC0 1.0 (notice text) |
| `assets/licences/kenney-interface-sounds-License.txt` | Original Kenney pack notice; pack named in the file | CC0 1.0 (notice text) |
| `assets/licences/kenney-music-jingles-License.txt` | Original Kenney pack notice; pack named in the file | CC0 1.0 (notice text) |
| `assets/licences/kenney-ui-audio-License.txt` | Original Kenney pack notice; pack named in the file | CC0 1.0 (notice text) |
| `assets/licences/kenney-voiceover-pack-fighter-License.txt` | Original Kenney pack notice; pack named in the file | CC0 1.0 (notice text) |
| `assets/sfx-ready/block.wav` | `sfx/block-thud_kenney_impactPunch_medium_001.ogg` | CC0 1.0 |
| `assets/sfx-ready/counter-accent.wav` | `sfx/counter-hit-accent_kenney_jingles_HIT00.ogg` | CC0 1.0 |
| `assets/sfx-ready/counter.wav` | `sfx/counter-hit_kenney_impactPunch_heavy_004.ogg` | CC0 1.0 |
| `assets/sfx-ready/dodge.wav` | `sfx/dodge-whoosh_freesound_420668_SypherZent.mp3` | CC0 1.0 |
| `assets/sfx-ready/fight.wav` | `sfx/round-start_kenney_vo_fight.ogg` | CC0 1.0 |
| `assets/sfx-ready/final-round.wav` | `sfx/round-start_kenney_vo_final_round.ogg` | CC0 1.0 |
| `assets/sfx-ready/hands-up.wav` | `sfx/hands-up-sting_kenney_jingles_HIT03.ogg` | CC0 1.0 |
| `assets/sfx-ready/hit-taken.wav` | `sfx/punch-hit_kenney_impactPunch_heavy_002.ogg` | CC0 1.0 |
| `assets/sfx-ready/hype-cheer.wav` | `sfx/crowd-cheer_freesound_221567_AlaskaRobotics.mp3` | CC0 1.0 |
| `assets/sfx-ready/ko-bell.wav` | `sfx/ko-bell_freesound_520998_Mateusz_Chenc.mp3` | CC0 1.0 |
| `assets/sfx-ready/levels.json` | Project source attribution, trim and level metadata for prepared SFX/music | Metadata; underlying audio CC0 1.0 |
| `assets/sfx-ready/music-battle-loop.wav` | `music/bed_oga_8-bit-battle-loop_Wolfgang_.ogg` | CC0 1.0 |
| `assets/sfx-ready/perfect.wav` | `sfx/perfect-clang_kenney_impactBell_heavy_002.ogg` | CC0 1.0 |
| `assets/sfx-ready/punch-bonus.wav` | `sfx/punch-hit_kenney_impactPunch_heavy_000.ogg` | CC0 1.0 |
| `assets/sfx-ready/round-1.wav` | `sfx/round-start_kenney_vo_round_1.ogg` | CC0 1.0 |
| `assets/sfx-ready/round-2.wav` | `sfx/round-start_kenney_vo_round_2.ogg` | CC0 1.0 |
| `assets/sfx-ready/super-charge.wav` | `sfx/super-charge_kenney_powerUp1.ogg` | CC0 1.0 |
| `assets/sfx-ready/vote-tick.wav` | `sfx/vote-tick_kenney_tick_002.ogg` | CC0 1.0 |
| `assets/sfx-ready/you-lose.wav` | `sfx/result_kenney_vo_you_lose.ogg` | CC0 1.0 |
| `assets/sfx-ready/you-win.wav` | `sfx/result_kenney_vo_you_win.ogg` | CC0 1.0 |
| `assets/voice/README.md` | Project provenance and preparation documentation | Documentation; underlying asset terms listed here and in this file |
| `assets/voice/ready/blocked.wav` | Original generated announcer recordings, Kokoro-82M; model Apache-2.0 does not assert a separate output licence. See `assets/voice/README.md`. | Generated audio; see provenance |
| `assets/voice/ready/chat-wins.wav` | Original generated announcer recordings, Kokoro-82M; model Apache-2.0 does not assert a separate output licence. See `assets/voice/README.md`. | Generated audio; see provenance |
| `assets/voice/ready/counter.wav` | Original generated announcer recordings, Kokoro-82M; model Apache-2.0 does not assert a separate output licence. See `assets/voice/README.md`. | Generated audio; see provenance |
| `assets/voice/ready/draw.wav` | Original generated announcer recordings, Kokoro-82M; model Apache-2.0 does not assert a separate output licence. See `assets/voice/README.md`. | Generated audio; see provenance |
| `assets/voice/ready/final-round.wav` | Original generated announcer recordings, Kokoro-82M; model Apache-2.0 does not assert a separate output licence. See `assets/voice/README.md`. | Generated audio; see provenance |
| `assets/voice/ready/fixed-it.wav` | Original generated announcer recordings, Kokoro-82M; model Apache-2.0 does not assert a separate output licence. See `assets/voice/README.md`. | Generated audio; see provenance |
| `assets/voice/ready/hands-up.wav` | Original generated announcer recordings, Kokoro-82M; model Apache-2.0 does not assert a separate output licence. See `assets/voice/README.md`. | Generated audio; see provenance |
| `assets/voice/ready/ko.wav` | Original generated announcer recordings, Kokoro-82M; model Apache-2.0 does not assert a separate output licence. See `assets/voice/README.md`. | Generated audio; see provenance |
| `assets/voice/ready/perfect.wav` | Original generated announcer recordings, Kokoro-82M; model Apache-2.0 does not assert a separate output licence. See `assets/voice/README.md`. | Generated audio; see provenance |
| `assets/voice/ready/round-1-fight.wav` | Original generated announcer recordings, Kokoro-82M; model Apache-2.0 does not assert a separate output licence. See `assets/voice/README.md`. | Generated audio; see provenance |
| `assets/voice/ready/round-2.wav` | Original generated announcer recordings, Kokoro-82M; model Apache-2.0 does not assert a separate output licence. See `assets/voice/README.md`. | Generated audio; see provenance |
| `assets/voice/ready/streamer-wins.wav` | Original generated announcer recordings, Kokoro-82M; model Apache-2.0 does not assert a separate output licence. See `assets/voice/README.md`. | Generated audio; see provenance |
| `assets/voice/ready/super-incoming.wav` | Original generated announcer recordings, Kokoro-82M; model Apache-2.0 does not assert a separate output licence. See `assets/voice/README.md`. | Generated audio; see provenance |
| `assets/voice/ready/weakness-found.wav` | Original generated announcer recordings, Kokoro-82M; model Apache-2.0 does not assert a separate output licence. See `assets/voice/README.md`. | Generated audio; see provenance |
<!-- asset-inventory:end -->

## Vendored dependencies outside assets/

| Shipped dependency | Licence / provenance |
|---|---|
| `capture/public/models/pose_landmarker_lite.task` | MediaPipe model, Apache-2.0; official source and pinned checksum in `capture/public/models/README.md` |
| MediaPipe SIMD WASM and loader | `@mediapipe/tasks-vision` 0.10.32, Apache-2.0; `assets/licences/Apache-2.0.txt` |

Kenney pack notices for Digital Audio, Game Icons, Impact Sounds, Interface Sounds, Music Jingles, UI Audio and Voiceover Pack Fighter are retained under `assets/licences/kenney-*-License.txt` (including lower-case `license` in the Game Icons filename). The build copies every Kenney notice into `/credits/`. The SVG defence icon is code-native HUD markup created in this repository; there is no additional icon pack.
