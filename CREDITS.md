# Asset and dependency credits

- **Chat Golem:** original art dedicated to CC0 by Kash (Kashif Nazir). Atlas and provenance: `assets/boss/README.md`.
- **Anton / Barlow Condensed:** SIL Open Font License1.1. Original notices are retained in `assets/fonts/anton-OFL.txt` and `assets/fonts/barlowcondensed-OFL.txt`.
- **Prepared SFX/music:** CC0 sources documented in `assets/SOUNDS.md`: Kenney sound packs; Freesound420668 by SypherZent,520998 by Mateusz_Chenc,221567 by AlaskaRobotics; OpenGameArt “8-Bit Battle Loop” by Wolfgang_. Original Kenney notices are in `assets/licences/`.
- **Original announcer audio:** generated locally with Kokoro-82M. Source-model, process and provenance notes: `assets/voice/README.md`.
- **MediaPipe Tasks Vision0.10.32:** Google/MediaPipe Authors, Apache-2.0 as declared by the pinned npm package. License text is retained in `assets/licences/Apache-2.0.txt`. Official lite model source/checksum: `capture/public/models/README.md`.

The demo build includes this file and the relevant notices under `/credits/`. No prep-repository implementation code is included.

## Asset-by-asset inventory

All prepared SFX/music below are CC0 1.0; the source names are retained from `assets/sfx-ready/levels.json`. Source attribution is courtesy attribution under CC0, not a new licence condition.

| Prepared asset (`assets/sfx-ready/`) | Original source | Licence |
|---|---|---|
| `hands-up.wav` | `sfx/hands-up-sting_kenney_jingles_HIT03.ogg` | CC0 1.0 |
| `block.wav` | `sfx/block-thud_kenney_impactPunch_medium_001.ogg` | CC0 1.0 |
| `perfect.wav` | `sfx/perfect-clang_kenney_impactBell_heavy_002.ogg` | CC0 1.0 |
| `counter.wav` | `sfx/counter-hit_kenney_impactPunch_heavy_004.ogg` | CC0 1.0 |
| `counter-accent.wav` | `sfx/counter-hit-accent_kenney_jingles_HIT00.ogg` | CC0 1.0 |
| `hit-taken.wav` | `sfx/punch-hit_kenney_impactPunch_heavy_002.ogg` | CC0 1.0 |
| `punch-bonus.wav` | `sfx/punch-hit_kenney_impactPunch_heavy_000.ogg` | CC0 1.0 |
| `dodge.wav` | `sfx/dodge-whoosh_freesound_420668_SypherZent.mp3` | CC0 1.0 |
| `ko-bell.wav` | `sfx/ko-bell_freesound_520998_Mateusz_Chenc.mp3` | CC0 1.0 |
| `round-1.wav` | `sfx/round-start_kenney_vo_round_1.ogg` | CC0 1.0 |
| `round-2.wav` | `sfx/round-start_kenney_vo_round_2.ogg` | CC0 1.0 |
| `final-round.wav` | `sfx/round-start_kenney_vo_final_round.ogg` | CC0 1.0 |
| `fight.wav` | `sfx/round-start_kenney_vo_fight.ogg` | CC0 1.0 |
| `you-win.wav` | `sfx/result_kenney_vo_you_win.ogg` | CC0 1.0 |
| `you-lose.wav` | `sfx/result_kenney_vo_you_lose.ogg` | CC0 1.0 |
| `hype-cheer.wav` | `sfx/crowd-cheer_freesound_221567_AlaskaRobotics.mp3` | CC0 1.0 |
| `super-charge.wav` | `sfx/super-charge_kenney_powerUp1.ogg` | CC0 1.0 |
| `vote-tick.wav` | `sfx/vote-tick_kenney_tick_002.ogg` | CC0 1.0 |
| `music-battle-loop.wav` | `music/bed_oga_8-bit-battle-loop_Wolfgang_.ogg` | CC0 1.0 |

| Other shipped asset | Licence / provenance |
|---|---|
| `assets/boss/boss-sheet@1x.png` and `.json` | Original Chat Golem art, CC0 1.0 Universal, dedicated by Kashif Nazir; see `assets/boss/README.md` |
| `assets/fonts/Anton-400.woff2` | SIL OFL 1.1, `assets/fonts/anton-OFL.txt` |
| `assets/fonts/BarlowCondensed-700.woff2`, `BarlowCondensed-900.woff2` | SIL OFL 1.1, `assets/fonts/barlowcondensed-OFL.txt` |
| Every `assets/voice/ready/*.wav` | Original generated announcer recordings for this project. Generated with Kokoro-82M and its Apache-2.0 voice packs by hexgrad; model licence is not asserted to impose a separate output licence. Source, process and model licence links: `assets/voice/README.md`; Apache notice: `assets/licences/Apache-2.0.txt` |
| `capture/public/models/pose_landmarker_lite.task` | MediaPipe model, Apache-2.0; official source and pinned checksum in `capture/public/models/README.md` |
| MediaPipe SIMD WASM and loader | `@mediapipe/tasks-vision`0.10.32, Apache-2.0; `assets/licences/Apache-2.0.txt` |

Kenney pack notices for Digital Audio, Game Icons, Impact Sounds, Interface Sounds, Music Jingles, UI Audio and Voiceover Pack Fighter are retained under `assets/licences/kenney-*-License.txt` (including lower-case `license` in the Game Icons filename). The build copies every Kenney notice into `/credits/`. The SVG defence icon is code-native HUD markup created in this repository; there is no additional icon pack.
