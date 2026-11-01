# Asset and dependency credits

- **Chat Golem:** original art dedicated to CC0 by Kash (Kashif Nazir). Atlas and provenance: `assets/boss/README.md`.
- **Anton / Barlow Condensed / Bungee / Russo One / Inter:** SIL Open Font License 1.1. Original notices are retained in `assets/fonts/` and identified per file below.
- **Prepared SFX/music:** CC0 sources documented in `assets/SOUNDS.md`: Kenney sound packs; Freesound 420668 by SypherZent, 520998 by Mateusz_Chenc, 221567 by AlaskaRobotics; OpenGameArt “8-Bit Battle Loop” by Wolfgang_. Original Kenney notices are in `assets/licences/`.
- Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. Source, model and take notes: `assets/voice/README.md`.
- **Recorded voice bank** (`assets/voice/bank/`): boss taunts, coach calls and five sound effects made with ElevenLabs (Voice Design voices Stone Golem, Gremlin, Rock Queen, Big Rumble, Drill Coach, Hype Coach, Corner Coach and Pad Pro; text to speech model `eleven_v4`; Sound Effects), generated on Kash's paid ElevenLabs plan. All text is fixed and written by the project. Voice ids, model and QC: `assets/voice/bank/README.md`.
- **Landing gameplay loop** (`assets/landing/gameplay-loop-SIMULATED.*`): original footage of this game: a screen capture of its own offline demo with simulated chat (31 Oct 2026 b-roll), cut to 7.9 s, no audio. It shows the Chat Golem art and fonts credited on this page.
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
| `assets/boss/boss-sheet@1x.webp` | Original Chat Golem art, atlas and provenance by Kashif Nazir; `assets/boss/README.md` | CC0 1.0 Universal |
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
| `assets/landing/gameplay-loop-SIMULATED-poster.webp` | Original footage of this game: screen capture of its own offline demo (simulated chat), cut from b-roll clip 03-lean-dodge-SIMULATED | Project footage, same terms as this repository; shows the CC0 Chat Golem art and OFL fonts credited here |
| `assets/landing/gameplay-loop-SIMULATED.mp4` | Original footage of this game: screen capture of its own offline demo (simulated chat), cut from b-roll clip 03-lean-dodge-SIMULATED | Project footage, same terms as this repository; shows the CC0 Chat Golem art and OFL fonts credited here |
| `assets/landing/gameplay-loop-SIMULATED.webm` | Original footage of this game: screen capture of its own offline demo (simulated chat), cut from b-roll clip 03-lean-dodge-SIMULATED | Project footage, same terms as this repository; shows the CC0 Chat Golem art and OFL fonts credited here |
| `assets/licences/Apache-2.0.txt` | Apache Software Foundation licence text retained for MediaPipe | Apache License 2.0 (notice text) |
| `assets/licences/kenney-digital-audio-License.txt` | Original Kenney pack notice; pack named in the file | CC0 1.0 (notice text) |
| `assets/licences/kenney-game-icons-license.txt` | Original Kenney pack notice; pack named in the file | CC0 1.0 (notice text) |
| `assets/licences/kenney-impact-sounds-License.txt` | Original Kenney pack notice; pack named in the file | CC0 1.0 (notice text) |
| `assets/licences/kenney-interface-sounds-License.txt` | Original Kenney pack notice; pack named in the file | CC0 1.0 (notice text) |
| `assets/licences/kenney-music-jingles-License.txt` | Original Kenney pack notice; pack named in the file | CC0 1.0 (notice text) |
| `assets/licences/kenney-ui-audio-License.txt` | Original Kenney pack notice; pack named in the file | CC0 1.0 (notice text) |
| `assets/licences/kenney-voiceover-pack-fighter-License.txt` | Original Kenney pack notice; pack named in the file | CC0 1.0 (notice text) |
| `assets/sfx-ready/block.mp3` | `sfx/block-thud_kenney_impactPunch_medium_001.ogg` | CC0 1.0 |
| `assets/sfx-ready/block.wav` | `sfx/block-thud_kenney_impactPunch_medium_001.ogg` | CC0 1.0 |
| `assets/sfx-ready/counter-accent.mp3` | `sfx/counter-hit-accent_kenney_jingles_HIT00.ogg` | CC0 1.0 |
| `assets/sfx-ready/counter-accent.wav` | `sfx/counter-hit-accent_kenney_jingles_HIT00.ogg` | CC0 1.0 |
| `assets/sfx-ready/counter.mp3` | `sfx/counter-hit_kenney_impactPunch_heavy_004.ogg` | CC0 1.0 |
| `assets/sfx-ready/counter.wav` | `sfx/counter-hit_kenney_impactPunch_heavy_004.ogg` | CC0 1.0 |
| `assets/sfx-ready/dodge.mp3` | `sfx/dodge-whoosh_freesound_420668_SypherZent.mp3` | CC0 1.0 |
| `assets/sfx-ready/dodge.wav` | `sfx/dodge-whoosh_freesound_420668_SypherZent.mp3` | CC0 1.0 |
| `assets/sfx-ready/fight.mp3` | `sfx/round-start_kenney_vo_fight.ogg` | CC0 1.0 |
| `assets/sfx-ready/fight.wav` | `sfx/round-start_kenney_vo_fight.ogg` | CC0 1.0 |
| `assets/sfx-ready/final-round.wav` | `sfx/round-start_kenney_vo_final_round.ogg` | CC0 1.0 |
| `assets/sfx-ready/hands-up.mp3` | `sfx/hands-up-sting_kenney_jingles_HIT03.ogg` | CC0 1.0 |
| `assets/sfx-ready/hands-up.wav` | `sfx/hands-up-sting_kenney_jingles_HIT03.ogg` | CC0 1.0 |
| `assets/sfx-ready/hit-taken.mp3` | `sfx/punch-hit_kenney_impactPunch_heavy_002.ogg` | CC0 1.0 |
| `assets/sfx-ready/hit-taken.wav` | `sfx/punch-hit_kenney_impactPunch_heavy_002.ogg` | CC0 1.0 |
| `assets/sfx-ready/hype-cheer.mp3` | `sfx/crowd-cheer_freesound_221567_AlaskaRobotics.mp3` | CC0 1.0 |
| `assets/sfx-ready/hype-cheer.wav` | `sfx/crowd-cheer_freesound_221567_AlaskaRobotics.mp3` | CC0 1.0 |
| `assets/sfx-ready/ko-bell.mp3` | `sfx/ko-bell_freesound_520998_Mateusz_Chenc.mp3` | CC0 1.0 |
| `assets/sfx-ready/ko-bell.wav` | `sfx/ko-bell_freesound_520998_Mateusz_Chenc.mp3` | CC0 1.0 |
| `assets/sfx-ready/levels.json` | Project source attribution, trim and level metadata for prepared SFX/music | Metadata; underlying audio CC0 1.0 |
| `assets/sfx-ready/music-battle-loop.mp3` | `music/bed_oga_8-bit-battle-loop_Wolfgang_.ogg` | CC0 1.0 |
| `assets/sfx-ready/music-battle-loop.wav` | `music/bed_oga_8-bit-battle-loop_Wolfgang_.ogg` | CC0 1.0 |
| `assets/sfx-ready/perfect.mp3` | `sfx/perfect-clang_kenney_impactBell_heavy_002.ogg` | CC0 1.0 |
| `assets/sfx-ready/perfect.wav` | `sfx/perfect-clang_kenney_impactBell_heavy_002.ogg` | CC0 1.0 |
| `assets/sfx-ready/punch-bonus.mp3` | `sfx/punch-hit_kenney_impactPunch_heavy_000.ogg` | CC0 1.0 |
| `assets/sfx-ready/punch-bonus.wav` | `sfx/punch-hit_kenney_impactPunch_heavy_000.ogg` | CC0 1.0 |
| `assets/sfx-ready/round-1.wav` | `sfx/round-start_kenney_vo_round_1.ogg` | CC0 1.0 |
| `assets/sfx-ready/round-2.wav` | `sfx/round-start_kenney_vo_round_2.ogg` | CC0 1.0 |
| `assets/sfx-ready/super-charge.mp3` | `sfx/super-charge_kenney_powerUp1.ogg` | CC0 1.0 |
| `assets/sfx-ready/super-charge.wav` | `sfx/super-charge_kenney_powerUp1.ogg` | CC0 1.0 |
| `assets/sfx-ready/vote-tick.mp3` | `sfx/vote-tick_kenney_tick_002.ogg` | CC0 1.0 |
| `assets/sfx-ready/vote-tick.wav` | `sfx/vote-tick_kenney_tick_002.ogg` | CC0 1.0 |
| `assets/sfx-ready/you-lose.wav` | `sfx/result_kenney_vo_you_lose.ogg` | CC0 1.0 |
| `assets/sfx-ready/you-win.wav` | `sfx/result_kenney_vo_you_win.ogg` | CC0 1.0 |
| `assets/voice/README.md` | Project provenance and preparation documentation | Documentation; underlying asset terms listed here and in this file |
| `assets/voice/bank/README.md` | Project voice-bank script data, QC and provenance documentation | Documentation/metadata; underlying audio terms listed here |
| `assets/voice/bank/corner/chat-picked-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/chat-picked-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/chat-picked-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/chat-picked-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/chat-picked-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/chat-picked-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/clean-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/clean-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/clean-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/clean-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/clean-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/clean-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/clean-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/clean-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/clean-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/clean-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/clean-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/clean-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-112-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-112-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-112-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-112-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-12-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-12-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-12-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-12-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-121-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-121-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-121-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-121-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-1212-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-1212-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-1212-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-1212-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-12g-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-12g-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-12g-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-12g-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-12s-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-12s-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-12s-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-12s-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-2s2-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-2s2-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-2s2-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-2s2-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-s12-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-s12-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-s12-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/combo-s12-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/faster-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/faster-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/faster-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/faster-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/faster-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/faster-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/missed-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/missed-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/missed-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/missed-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/missed-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/missed-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/partial-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/partial-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/partial-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/partial-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/partial-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/partial-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/partial-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/partial-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/partial-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/partial-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/partial-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/partial-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/qc.json` | Project voice-bank script data, QC and provenance documentation | Documentation/metadata; underlying audio terms listed here |
| `assets/voice/bank/corner/rest-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/rest-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/rest-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/rest-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/rest-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/rest-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/round-start-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/round-start-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/round-start-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/round-start-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/round-start-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/round-start-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/slower-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/slower-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/slower-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/slower-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/slower-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/slower-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/ten-seconds-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/ten-seconds-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/ten-seconds-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/ten-seconds-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/ten-seconds-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/ten-seconds-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/time-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/time-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/time-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/time-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/time-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/time-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/workout-done-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/workout-done-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/workout-done-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/workout-done-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/workout-done-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/corner/workout-done-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `corner` | Generated audio |
| `assets/voice/bank/drill/chat-picked-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/chat-picked-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/chat-picked-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/chat-picked-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/chat-picked-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/chat-picked-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/clean-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/clean-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/clean-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/clean-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/clean-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/clean-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/clean-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/clean-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/clean-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/clean-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/clean-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/clean-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-112-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-112-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-112-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-112-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-12-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-12-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-12-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-12-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-121-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-121-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-121-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-121-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-1212-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-1212-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-1212-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-1212-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-12g-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-12g-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-12g-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-12g-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-12s-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-12s-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-12s-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-12s-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-2s2-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-2s2-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-2s2-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-2s2-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-s12-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-s12-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-s12-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/combo-s12-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/faster-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/faster-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/faster-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/faster-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/faster-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/faster-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/missed-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/missed-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/missed-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/missed-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/missed-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/missed-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/partial-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/partial-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/partial-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/partial-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/partial-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/partial-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/partial-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/partial-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/partial-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/partial-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/partial-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/partial-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/qc.json` | Project voice-bank script data, QC and provenance documentation | Documentation/metadata; underlying audio terms listed here |
| `assets/voice/bank/drill/rest-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/rest-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/rest-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/rest-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/rest-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/rest-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/round-start-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/round-start-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/round-start-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/round-start-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/round-start-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/round-start-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/slower-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/slower-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/slower-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/slower-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/slower-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/slower-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/ten-seconds-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/ten-seconds-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/ten-seconds-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/ten-seconds-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/ten-seconds-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/ten-seconds-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/time-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/time-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/time-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/time-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/time-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/time-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/workout-done-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/workout-done-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/workout-done-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/workout-done-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/workout-done-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/drill/workout-done-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `drill` | Generated audio |
| `assets/voice/bank/durations.json` | Project voice-bank script data, QC and provenance documentation | Documentation/metadata; underlying audio terms listed here |
| `assets/voice/bank/golem/qc.json` | Project voice-bank script data, QC and provenance documentation | Documentation/metadata; underlying audio terms listed here |
| `assets/voice/bank/golem/taunt-blocked-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-blocked-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-blocked-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-blocked-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-blocked-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-blocked-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-blocked-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-blocked-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-blocked-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-blocked-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-blocked-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-blocked-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-dodged-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-dodged-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-dodged-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-dodged-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-dodged-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-dodged-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-dodged-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-dodged-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-dodged-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-dodged-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-dodged-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-dodged-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-finisher-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-finisher-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-finisher-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-finisher-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-finisher-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-finisher-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-finisher-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-finisher-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-left-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-left-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-left-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-left-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-left-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-left-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-left-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-left-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-right-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-right-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-right-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-right-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-right-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-right-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-right-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-habit-right-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-hit-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-hit-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-hit-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-hit-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-hit-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-hit-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-hit-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-hit-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-hit-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-hit-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-hit-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-hit-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-perfect-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-perfect-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-perfect-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-perfect-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-perfect-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-perfect-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-perfect-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-perfect-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-quiet-chat-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-quiet-chat-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-quiet-chat-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-quiet-chat-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-quiet-chat-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-quiet-chat-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-quiet-chat-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-quiet-chat-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-lose-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-lose-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-lose-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-lose-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-lose-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-lose-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-lose-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-lose-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-start-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-start-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-start-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-start-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-start-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-start-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-start-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-start-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-win-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-win-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-win-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-win-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-win-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-win-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-win-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-round-win-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-super-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-super-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-super-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-super-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-super-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-super-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-super-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/golem/taunt-super-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `golem` | Generated audio |
| `assets/voice/bank/gremlin/qc.json` | Project voice-bank script data, QC and provenance documentation | Documentation/metadata; underlying audio terms listed here |
| `assets/voice/bank/gremlin/taunt-blocked-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-blocked-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-blocked-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-blocked-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-blocked-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-blocked-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-blocked-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-blocked-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-blocked-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-blocked-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-blocked-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-blocked-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-dodged-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-dodged-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-dodged-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-dodged-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-dodged-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-dodged-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-dodged-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-dodged-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-dodged-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-dodged-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-dodged-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-dodged-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-finisher-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-finisher-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-finisher-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-finisher-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-finisher-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-finisher-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-finisher-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-finisher-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-left-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-left-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-left-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-left-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-left-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-left-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-left-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-left-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-right-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-right-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-right-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-right-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-right-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-right-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-right-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-habit-right-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-hit-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-hit-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-hit-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-hit-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-hit-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-hit-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-hit-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-hit-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-hit-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-hit-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-hit-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-hit-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-perfect-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-perfect-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-perfect-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-perfect-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-perfect-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-perfect-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-perfect-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-perfect-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-quiet-chat-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-quiet-chat-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-quiet-chat-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-quiet-chat-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-quiet-chat-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-quiet-chat-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-quiet-chat-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-quiet-chat-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-lose-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-lose-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-lose-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-lose-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-lose-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-lose-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-lose-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-lose-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-start-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-start-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-start-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-start-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-start-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-start-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-start-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-start-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-win-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-win-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-win-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-win-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-win-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-win-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-win-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-round-win-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-super-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-super-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-super-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-super-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-super-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-super-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-super-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/gremlin/taunt-super-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `gremlin` | Generated audio |
| `assets/voice/bank/hype/chat-picked-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/chat-picked-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/chat-picked-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/chat-picked-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/chat-picked-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/chat-picked-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/clean-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/clean-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/clean-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/clean-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/clean-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/clean-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/clean-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/clean-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/clean-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/clean-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/clean-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/clean-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-112-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-112-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-112-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-112-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-12-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-12-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-12-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-12-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-121-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-121-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-121-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-121-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-1212-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-1212-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-1212-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-1212-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-12g-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-12g-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-12g-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-12g-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-12s-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-12s-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-12s-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-12s-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-2s2-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-2s2-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-2s2-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-2s2-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-s12-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-s12-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-s12-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/combo-s12-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/faster-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/faster-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/faster-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/faster-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/faster-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/faster-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/missed-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/missed-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/missed-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/missed-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/missed-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/missed-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/partial-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/partial-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/partial-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/partial-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/partial-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/partial-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/partial-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/partial-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/partial-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/partial-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/partial-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/partial-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/qc.json` | Project voice-bank script data, QC and provenance documentation | Documentation/metadata; underlying audio terms listed here |
| `assets/voice/bank/hype/rest-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/rest-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/rest-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/rest-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/rest-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/rest-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/round-start-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/round-start-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/round-start-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/round-start-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/round-start-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/round-start-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/slower-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/slower-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/slower-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/slower-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/slower-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/slower-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/ten-seconds-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/ten-seconds-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/ten-seconds-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/ten-seconds-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/ten-seconds-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/ten-seconds-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/time-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/time-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/time-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/time-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/time-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/time-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/workout-done-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/workout-done-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/workout-done-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/workout-done-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/workout-done-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/hype/workout-done-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `hype` | Generated audio |
| `assets/voice/bank/lines.json` | Project voice-bank script data, QC and provenance documentation | Documentation/metadata; underlying audio terms listed here |
| `assets/voice/bank/pads/chat-picked-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/chat-picked-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/chat-picked-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/chat-picked-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/chat-picked-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/chat-picked-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/clean-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/clean-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/clean-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/clean-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/clean-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/clean-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/clean-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/clean-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/clean-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/clean-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/clean-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/clean-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-112-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-112-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-112-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-112-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-12-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-12-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-12-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-12-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-121-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-121-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-121-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-121-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-1212-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-1212-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-1212-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-1212-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-12g-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-12g-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-12g-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-12g-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-12s-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-12s-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-12s-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-12s-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-2s2-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-2s2-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-2s2-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-2s2-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-s12-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-s12-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-s12-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/combo-s12-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/faster-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/faster-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/faster-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/faster-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/faster-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/faster-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/missed-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/missed-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/missed-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/missed-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/missed-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/missed-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/partial-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/partial-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/partial-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/partial-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/partial-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/partial-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/partial-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/partial-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/partial-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/partial-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/partial-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/partial-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/qc.json` | Project voice-bank script data, QC and provenance documentation | Documentation/metadata; underlying audio terms listed here |
| `assets/voice/bank/pads/rest-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/rest-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/rest-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/rest-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/rest-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/rest-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/round-start-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/round-start-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/round-start-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/round-start-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/round-start-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/round-start-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/slower-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/slower-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/slower-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/slower-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/slower-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/slower-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/ten-seconds-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/ten-seconds-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/ten-seconds-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/ten-seconds-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/ten-seconds-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/ten-seconds-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/time-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/time-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/time-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/time-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/time-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/time-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/workout-done-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/workout-done-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/workout-done-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/workout-done-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/workout-done-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/pads/workout-done-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `pads` | Generated audio |
| `assets/voice/bank/queen/qc.json` | Project voice-bank script data, QC and provenance documentation | Documentation/metadata; underlying audio terms listed here |
| `assets/voice/bank/queen/taunt-blocked-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-blocked-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-blocked-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-blocked-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-blocked-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-blocked-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-blocked-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-blocked-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-blocked-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-blocked-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-blocked-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-blocked-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-dodged-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-dodged-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-dodged-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-dodged-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-dodged-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-dodged-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-dodged-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-dodged-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-dodged-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-dodged-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-dodged-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-dodged-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-finisher-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-finisher-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-finisher-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-finisher-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-finisher-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-finisher-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-finisher-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-finisher-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-left-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-left-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-left-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-left-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-left-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-left-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-left-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-left-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-right-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-right-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-right-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-right-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-right-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-right-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-right-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-habit-right-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-hit-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-hit-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-hit-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-hit-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-hit-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-hit-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-hit-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-hit-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-hit-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-hit-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-hit-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-hit-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-perfect-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-perfect-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-perfect-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-perfect-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-perfect-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-perfect-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-perfect-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-perfect-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-quiet-chat-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-quiet-chat-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-quiet-chat-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-quiet-chat-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-quiet-chat-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-quiet-chat-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-quiet-chat-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-quiet-chat-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-lose-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-lose-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-lose-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-lose-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-lose-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-lose-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-lose-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-lose-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-start-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-start-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-start-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-start-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-start-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-start-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-start-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-start-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-win-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-win-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-win-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-win-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-win-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-win-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-win-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-round-win-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-super-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-super-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-super-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-super-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-super-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-super-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-super-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/queen/taunt-super-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `queen` | Generated audio |
| `assets/voice/bank/rumble/qc.json` | Project voice-bank script data, QC and provenance documentation | Documentation/metadata; underlying audio terms listed here |
| `assets/voice/bank/rumble/taunt-blocked-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-blocked-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-blocked-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-blocked-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-blocked-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-blocked-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-blocked-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-blocked-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-blocked-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-blocked-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-blocked-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-blocked-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-dodged-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-dodged-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-dodged-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-dodged-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-dodged-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-dodged-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-dodged-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-dodged-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-dodged-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-dodged-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-dodged-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-dodged-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-finisher-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-finisher-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-finisher-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-finisher-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-finisher-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-finisher-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-finisher-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-finisher-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-left-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-left-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-left-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-left-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-left-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-left-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-left-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-left-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-right-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-right-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-right-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-right-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-right-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-right-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-right-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-habit-right-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-hit-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-hit-10.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-hit-11.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-hit-12.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-hit-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-hit-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-hit-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-hit-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-hit-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-hit-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-hit-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-hit-9.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-perfect-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-perfect-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-perfect-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-perfect-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-perfect-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-perfect-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-perfect-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-perfect-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-quiet-chat-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-quiet-chat-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-quiet-chat-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-quiet-chat-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-quiet-chat-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-quiet-chat-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-quiet-chat-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-quiet-chat-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-lose-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-lose-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-lose-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-lose-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-lose-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-lose-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-lose-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-lose-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-start-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-start-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-start-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-start-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-start-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-start-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-start-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-start-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-win-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-win-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-win-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-win-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-win-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-win-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-win-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-round-win-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-super-1.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-super-2.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-super-3.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-super-4.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-super-5.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-super-6.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-super-7.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/rumble/taunt-super-8.mp3` | ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`: `rumble` | Generated audio |
| `assets/voice/bank/sfx/big-bell.mp3` | ElevenLabs Sound Effects, generated on Kash's paid ElevenLabs plan; `assets/voice/bank/README.md` | Generated audio; see provenance |
| `assets/voice/bank/sfx/crowd-cheer.mp3` | ElevenLabs Sound Effects, generated on Kash's paid ElevenLabs plan; `assets/voice/bank/README.md` | Generated audio; see provenance |
| `assets/voice/bank/sfx/crowd-groan.mp3` | ElevenLabs Sound Effects, generated on Kash's paid ElevenLabs plan; `assets/voice/bank/README.md` | Generated audio; see provenance |
| `assets/voice/bank/sfx/pad-hit.mp3` | ElevenLabs Sound Effects, generated on Kash's paid ElevenLabs plan; `assets/voice/bank/README.md` | Generated audio; see provenance |
| `assets/voice/bank/sfx/qc.json` | Project voice-bank script data, QC and provenance documentation | Documentation/metadata; underlying audio terms listed here |
| `assets/voice/bank/sfx/rest-whistle.mp3` | ElevenLabs Sound Effects, generated on Kash's paid ElevenLabs plan; `assets/voice/bank/README.md` | Generated audio; see provenance |
| `assets/voice/ready/blocked.mp3` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/blocked.wav` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/chat-wins.mp3` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/chat-wins.wav` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/counter.mp3` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/counter.wav` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/draw.wav` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/final-round.mp3` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/final-round.wav` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/fixed-it.mp3` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/fixed-it.wav` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/hands-up.mp3` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/hands-up.wav` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/ko.mp3` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/ko.wav` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/perfect.mp3` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/perfect.wav` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/round-1-fight.mp3` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/round-1-fight.wav` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/round-2.mp3` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/round-2.wav` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/streamer-wins.mp3` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/streamer-wins.wav` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/super-incoming.wav` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/weakness-found.mp3` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
| `assets/voice/ready/weakness-found.wav` | Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan. | Generated audio; see provenance |
<!-- asset-inventory:end -->

## Vendored dependencies outside assets/

| Shipped dependency | Licence / provenance |
|---|---|
| `capture/public/models/pose_landmarker_lite.task` | MediaPipe model, Apache-2.0; official source and pinned checksum in `capture/public/models/README.md` |
| MediaPipe SIMD WASM and loader | `@mediapipe/tasks-vision` 0.10.32, Apache-2.0; `assets/licences/Apache-2.0.txt` |

Kenney pack notices for Digital Audio, Game Icons, Impact Sounds, Interface Sounds, Music Jingles, UI Audio and Voiceover Pack Fighter are retained under `assets/licences/kenney-*-License.txt` (including lower-case `license` in the Game Icons filename). The build copies every Kenney notice into `/credits/`. The SVG defence icon is code-native HUD markup created in this repository; there is no additional icon pack.
