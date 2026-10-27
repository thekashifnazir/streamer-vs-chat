# Sounds: which file plays on which game event

This is the audited sound map. Copy `docs/assets/sfx-ready/`, `docs/assets/voice/ready/` (recommended files only, without the `_t*` takes), `docs/assets/fonts/` and this file into the entry repo as `assets/` when you start the Codex build. They're CC0/OFL assets (plus original Apache-2.0-model voice lines), not code, so the "newly created" rule isn't affected (see `docs/assets.md` in the prep repo for every source URL). Licences, for the entry's CREDITS.md: every `sfx-ready/` file is CC0 (Kenney Impact Sounds, Music Jingles, Interface Sounds, Digital Audio and Voiceover Pack: Fighter; Freesound 420668 by SypherZent, 520998 by Mateusz_Chenc, 221567 by AlaskaRobotics; OpenGameArt "8-Bit Battle Loop" by Wolfgang_). Kenney's licence files are in `licences/`. The `voice/ready/` lines are original, generated with Kokoro-82M (Apache-2.0, https://huggingface.co/hexgrad/Kokoro-82M); see `voice/README.md`. Fonts are SIL OFL 1.1, with each `*-OFL.txt` next to its font in `fonts/`. The entry should play the `sfx-ready/*.wav` files at gain 1.0 and do its own mixing from there.

How these were checked:
- **MEASURED (numbers):** duration, peak, RMS, onset (first sample above 10% of peak), clipped-sample count, music loop-edge jump. Done with ffmpeg + numpy on the VM; raw table at the bottom.
- **AI listen (not a human ear):** each file was described by an audio model (`audit/ai-listen-notes.json`). It confirmed speech, timbre and obvious faults. **Kash still hasn't heard any of them.** Spend 5 minutes listening to `sfx-ready/` before the day-6 polish prompt.
- **MEASURED (speech):** faster-whisper transcribed the Kenney voice lines as "Round 1", "ROUND TWO", "final round", "Fight!", "You win!", "You lose." None of them is a catchphrase from a famous game.

`sfx-ready/` is built by `python3 docs/assets/tools/prepare_sfx.py`. It trims the leading silence, fades the tails, converts to mono 44.1 kHz WAV (Safari-safe, with no MP3 encoder delay), and matches loudness: the target RMS over the audible part, with peaks held at or below −1 dBFS. The per-file results are in `sfx-ready/levels.json`.

## Event → file

**New (27 Oct): original announcer voice lines** in `voice/ready/` (Kokoro-82M, Apache-2.0, generated locally, levelled to −17 dBFS RMS with peaks ≤ −1 dBFS; see `voice/README.md` for licence URLs, settings and the measurement table). **Kash hasn't listened to them yet.** They were checked by two speech recognisers and an AI listen, not a human ear. Each event below lists the voice line first, with the audited Kenney/Freesound sound kept as the alternative. SFX and voice can also play together: the voice lines are short, and the mix rules duck the music under them.

| Game event (spec) | Voice line (`voice/ready/`, new) | SFX / Kenney alternative (`sfx-ready/`) | Why this one | Level (RMS) |
|---|---|---|---|---|
| Telegraph `HANDS UP!` (t = 0 of the 0.8 s window) | `hands-up.wav` (0.57 s, ends inside the 800 ms window) | `hands-up.wav` (Kenney jingles_HIT03) | Sting starts in 19 ms; twoTone1 starts 112 ms late, a seventh of the reaction window. AI listen: "bright, brassy, punchy attack". Play the sting, or the sting with the voice on top; don't play the voice alone if it fetches late (preload both). | −18 sting / −17 voice |
| BLOCK | `blocked.wav` | `block.wav` (impactPunch_medium_001) | Muffled low thud reads as "absorbed", unlike a hit. Suggestion (INFERRED): throttle the voice to once every 2 s so it doesn't talk over a fast exchange. | −18 / −17 |
| PERFECT | `perfect.wav` | `perfect.wav` (impactBell_heavy_002) | A resonant bell clang is distinct from every punch sound. impactMetal_heavy_001 was rejected: thin, abrupt end. | −20 / −17 |
| Counter damage on the boss | `counter.wav` | `counter.wav` + `counter-accent.wav` together | Bass thud plus a rising chime marks the reward moment. | −17 / −22 / −17 |
| Streamer takes a HIT | (none) | `hit-taken.wav` (impactPunch_heavy_002) | Heaviest, bassiest punch (313 Hz centroid), so getting hit feels bad. | −17 |
| Bonus punch lands (counter window) | (none) | `punch-bonus.wav` (impactPunch_heavy_000) | Lighter slap on top of the thud; fires up to every 450 ms, so it's 2 dB under the counter. | −19 |
| DODGE | (none) | `dodge.wav` (Freesound 420668) | Sharp whoosh, 0.15 s. 389590 was 8 dB quieter with a softer attack. | −20 |
| Round start | `round-1-fight.wav` (one file, "Round one… fight!") / `round-2.wav` / `final-round.wav` | `round-1.wav` / `round-2.wav` / `final-round.wav`, then `fight.wav` (Kenney announcer) | `fight` has a slightly gritty tail (AI listen); a 80 ms fade is applied. | −17 |
| Fight result | `chat-wins.wav` / `streamer-wins.wav` / `draw.wav` | `you-win.wav` / `you-lose.wav` (Kenney; there's no Kenney "draw") | The new lines name the winner, where the Kenney ones only say "you". | −17 |
| KO | `ko.wav` (layer on the bell) | `ko-bell.wav` (Freesound 520998, first strike only, 0–4 s) | The source is 33 s with three strikes 8 s apart. 438626 was rejected: a spoken "number nine, number ten" count and the bell only at 11 s. | −20 bell / −17 voice |
| Hype meter fills / `!super` ready | `super-incoming.wav` | `super-charge.wav` (Kenney powerUp1) | Clean ascending chime. Freesound 375925 was rejected: 1,829 clipped samples, and AI listen heard distortion plus a noisy cut. | −20 / −17 |
| Boss weakness / exploit revealed | `weakness-found.wav` | (none) | New event line. | −17 |
| Exploit FIXED | `fixed-it.wav`, then `hype-cheer.wav` | `hype-cheer.wav` | | −17 / −24 |
| Big moment (KO, raid) | (none) | `hype-cheer.wav` (Freesound 221567, 0–4.5 s) | Clean stadium cheer. 651646 was rejected: rumble, high noise floor and an abrupt end. | −24 |
| Each vote counted (throttle to ≤ 8/s) | (none) | `vote-tick.wav` (Kenney tick_002) | A 23 ms click, quiet on purpose. | −26 |
| Music bed | (none) | `music-battle-loop.wav` (OpenGameArt 8-bit battle loop, CC0) | MEASURED loop edge = 0.000 (last sample equals first), so it loops seamlessly with `loop = true`. The AI listen heard an "abrupt cut at 0:27" when played once, which is the loop point. The RPG loop was rejected: 6,687 clipped samples, +2.8 dBFS. Head-in-the-sand was rejected: a 2× RMS jump at the loop edge. | −24 |

## Mix rules for the entry (INFERRED, for Codex to implement)
- One master `GainNode` → `DynamicsCompressorNode` (threshold −6 dB, ratio 12, as a safety limiter) → destination.
- Music sits 6 dB under the table level during a fight and ducks another 6 dB while an announcer line plays.
- Sound is **off by default** in the no-login demo and on by default in the OBS overlay. A mute key `M` works in both.
- Voice-stamina stretch: SFX and music must play from the page that owns the mic (so echo cancellation removes them), or be muted while the meter listens (`docs/spikes/voice/REPORT.md`).
- Preload everything with `decodeAudioData` before round 1. The total is about 4 MB; `HANDS UP!` must never wait on a fetch.

## Raw measurements (source files, before prep)
Peaks above 0 dBFS on the Kenney impacts are decoder inter-sample overs, not audible clipping (AI listen: clean). The prep gain removes them anyway.

| File | Dur s | Peak dBFS | RMS dBFS | Onset ms | Clipped samples |
|---|---|---|---|---|---|
| hands-up-sting_kenney_jingles_HIT03 | 0.75 | −0.8 | −12.9 | 19 | 0 |
| hands-up-sting_kenney_twoTone1 | 0.72 | −1.1 | −14.6 | 112 | 0 |
| block-thud_kenney_impactPunch_medium_001 | 0.40 | +1.9 | −13.9 | 8 | 95 |
| perfect-clang_kenney_impactBell_heavy_002 | 0.70 | +2.2 | −20.8 | 0 | 28 |
| counter-hit_kenney_impactPunch_heavy_004 | 0.54 | +2.0 | −14.4 | 19 | 144 |
| punch-hit_kenney_impactPunch_heavy_002 | 0.46 | +2.0 | −13.7 | 16 | 217 |
| dodge-whoosh_freesound_420668 | 0.22 | −9.2 | −23.7 | 41 | 0 |
| dodge-whoosh_freesound_389590 | 0.37 | −12.5 | −31.4 | 58 | 0 |
| ko-bell_freesound_520998 | 32.84 | −1.7 | −27.7 | 84 (strikes at 0.1, 9.3, 17.8 s) | 0 |
| ko-bell_freesound_438626 | 14.23 | −14.1 | −37.9 | 7,256 (bell at 11.0 s) | 0 |
| super-charge_freesound_375925 | 2.53 | +2.9 | −8.1 | 116 | 1,829 |
| super-charge_kenney_powerUp1 | 1.20 | −0.6 | −14.4 | 97 | 0 |
| crowd-cheer_freesound_221567 | 8.42 | +1.5 | −15.9 | 91 | 26 |
| crowd-cheer_freesound_651646 | 6.38 | −5.6 | −29.2 | 12 | 0 |
| bed_oga_8-bit-battle-loop | 26.65 | −1.0 | −16.5 | 18 | 0 (loop edge 0.000) |
| bed_oga_rpg-battle-loop | 59.12 | +2.8 | −11.3 | 31 | 6,687 |
| bed_oga_head-in-the-sand | 38.40 | −9.0 | −24.7 | 0 | 0 (loop edge 2.03× RMS) |
