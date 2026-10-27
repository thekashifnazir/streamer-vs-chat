# Original announcer voice lines (Kokoro-82M, generated locally)

> **Kash hasn't listened to any of these yet.** Every check below is by analysis (two speech recognisers, loudness meters and an AI audio model), not a human ear. Spend 3 minutes on `ready/*.wav` before wiring them in, and swap any line you dislike for its `_t2`/`_t3` take or the Kenney alternative in `../SOUNDS.md`.

These are 14 new lines in one synthetic "arena announcer" voice, made for this game. No line is a catchphrase from an existing fighting game (no "Flawless victory", "Combo breaker", "Finish him", "Toasty"). Use the `ready/` files as they are and play them at gain 1.0, like `../sfx-ready/`.

## Files
- `ready/<line>.wav`: the recommended take for each line. Copy these into the entry repo's `assets/voice/ready/`.
- `ready/<line>_t1..t3.wav`: all three kept takes, processed and level-matched. Swap one in by renaming.
- `raw/<line>_t1..t3.wav`: the same takes straight from the model (24 kHz, float, untrimmed, no processing).
- `levels.json`: every number in this file, plus all 37 rejected candidates and their transcripts.
- `audit/ai-listen.json`: the AI audio model's notes on each kept take.
- `tools/make_voice.py`: rebuilds everything from scratch, and gives the same files every run (MEASURED: the second run was byte-identical apart from the one override below).

## Recommended takes
| Line | File | Length | Note |
|---|---|---|---|
| round-1-fight | `ready/round-1-fight.wav` = `round-1-fight_t1` | 1.52 s |
| round-2 | `ready/round-2.wav` = `round-2_t1` | 0.75 s |
| final-round | `ready/final-round.wav` = `final-round_t1` | 0.90 s |
| hands-up | `ready/hands-up.wav` = `hands-up_t1` | 0.57 s |
| ko | `ready/ko.wav` = `ko_t1` | 0.66 s |
| blocked | `ready/blocked.wav` = `blocked_t1` | 0.61 s |
| perfect | `ready/perfect.wav` = `perfect_t1` | 0.67 s |
| counter | `ready/counter.wav` = `counter_t1` | 0.69 s |
| super-incoming | `ready/super-incoming.wav` = `super-incoming_t1` | 0.99 s |
| chat-wins | `ready/chat-wins.wav` = `chat-wins_t2` | 0.82 s | t1 heard as 'Red corner wins!' by the AI listen; t2 agrees in all three checks
| streamer-wins | `ready/streamer-wins.wav` = `streamer-wins_t1` | 0.95 s |
| draw | `ready/draw.wav` = `draw_t1` | 0.61 s |
| weakness-found | `ready/weakness-found.wav` = `weakness-found_t1` | 1.04 s |
| fixed-it | `ready/fixed-it.wav` = `fixed-it_t1` | 0.74 s |

All recommended takes use the same voice (`am_michael`), so the announcer sounds like one person. The `_t3` take of each line uses a different voice as a fallback.

## Model, voice and licences (READ 27 Oct 2026)
| Part | What | Licence | Source |
|---|---|---|---|
| TTS model | Kokoro-82M v1.0 (StyleTTS 2 architecture, 82 M parameters) | Apache-2.0 | https://huggingface.co/hexgrad/Kokoro-82M (model card front matter `license: apache-2.0`; the card says "Apache-licensed weights, Kokoro can be deployed anywhere from production environments to personal projects") · licence text https://www.apache.org/licenses/LICENSE-2.0 |
| Voices | `am_michael` (main), `am_fenrir`, `am_puck`, `bm_george` (alternates). Also tried `am_onyx`, which gave no kept takes | Voice packs ship in the same Apache-2.0 repo | https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md |
| Training data | The model card says it was "trained exclusively on permissive/non-copyrighted audio data": public domain, Apache/MIT audio and synthetic audio from closed TTS models. The only CC BY data it lists is Japanese (Koniwa) and French (SIWIS), neither of which is behind these English voices | n/a | https://huggingface.co/hexgrad/Kokoro-82M#training-details |
| ONNX runtime wrapper | kokoro-onnx 0.6.1 with the `model-files-v1.0` release (`kokoro-v1.0.onnx`, `voices-v1.0.bin`) | MIT | https://github.com/thewh1teagle/kokoro-onnx (LICENSE) · https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 |
| Phonemiser | espeak-ng (used through kokoro-onnx) | GPL-3.0 (the tool only; it isn't shipped) | https://github.com/espeak-ng/espeak-ng |
| QC | faster-whisper with `small.en` and `medium.en` | MIT (both the code and the Whisper weights) | https://github.com/SYSTRAN/faster-whisper · https://github.com/openai/whisper/blob/main/LICENSE |

**What that means for the entry (INFERRED, not legal advice):** the weights are Apache-2.0 and nothing on the model card limits what you do with the audio it makes, so the WAVs can go in a public repo, on stream and in the YouTube video. Neither Apache-2.0 nor the GPL of a tool you ran covers that tool's output. A courtesy credit is still nice: "Announcer voice generated with Kokoro-82M (Apache-2.0) by hexgrad." No paid API was used, and everything ran on the VM's CPU.

**Piper was not used:** each Piper voice carries its own dataset licence, and some are non-commercial. Kokoro's single Apache-2.0 licence was simpler to check, so I didn't vet Piper voices one by one.

## How the takes were made
1. **Synthesis (MEASURED settings):** each line went through 5 voices × 2 speeds (1.0 and 1.15). `hands-up` used speeds 1.3, 1.45 and 1.6 so it fits inside the 800 ms telegraph. `round-1-fight` is "Round one!" and "Fight!" (at 0.95× speed) generated separately and joined with a 320 ms gap, because one prompt rushed the pause. Kokoro read "K.O.!" as "ko", so the text sent is "Kay-oh!". "Fixed it!" came out as "Fixed in" in most voices, so two extra spellings ("Fixed. It!", "Fixt it!") were also tried. 154 candidates in total.
2. **Processing (sox):** `gain -6 highpass 90 equalizer 200 1q +2 equalizer 3200 1.2q +4 compand 0.003,0.12 6:-70,-70,-30,-14,-10,-8,0,-6 -3 -90 0.002 reverb 18 60 25 100 5 -9`. In plain terms: −6 dB headroom, a 90 Hz high-pass, +2 dB body at 200 Hz, +4 dB presence at 3.2 kHz, a fast compressor for punch, and a short small-room reverb at −9 dB wet. Then 44.1 kHz mono.
3. **Trim and level (the same rule as `../tools/prepare_sfx.py`):** trim to 5 ms before the first sample above −40 dB of peak, keep 30 ms after the last, add a 2 ms de-click and a 40 ms fade at the tail, then apply gain = min(target RMS − RMS, −1 dBFS − peak). The target is **−17 dBFS RMS**, the level `prepare_sfx.py` uses for the Kenney announcer lines, so the new and old voices sit at the same level. Output is 16-bit mono 44.1 kHz WAV.
4. **QC (MEASURED):** faster-whisper `small.en` (beam 5, no prompt, so it isn't steered toward the right answer) transcribed every candidate. A candidate is rejected if the normalised transcript isn't the line ("Round 1" counts as "round one"; "K.O." counts as "KO"), or if a `hands-up` take runs past 600 ms. From the takes that pass, it keeps 2 from the main voice (the voice with the most passes, `am_michael`, which passed on all 14 lines) and 1 from another voice. For `hands-up` it prefers the longest take under 600 ms (the least rushed); for every other line, the take with the best average log-probability (the clearest one). `medium.en` then re-transcribed each kept take as a second opinion.
5. **AI listen:** an audio model gave each kept take an energy and clarity score and listed any artefacts. It reported no artefacts on any take. Its energy scores (4–5 on everything) are too generous to rank takes with. Its transcripts did catch two problems: `chat-wins_t1` heard as "Red corner wins!" (hence the override) and `streamer-wins_t2` heard as "Streamer are wins".

Integrated LUFS (pyloudnorm, BS.1770; clips under 0.5 s were padded with silence so a 400 ms block exists) lands at −17.2 to −19.8 LUFS. It reads 1–2.5 dB under the RMS figure because of the K-weighting and the gating. Every peak is −1.0 dBFS or below.

## Measurements of every kept take (MEASURED; ✗ = that recogniser heard a different word)
| Take | Voice | Speed | Text sent | Dur s | LUFS | Peak dBFS | RMS dBFS | whisper small.en | whisper medium.en | AI listen heard |
|---|---|---|---|---|---|---|---|---|---|---|
| **round-1-fight_t1** (rec) | am_michael | 1.15 | Round one! [320 ms gap] Fight! | 1.523 | -18.9 | -1.7 | -17.3 | Round 1. Fight. | Round one, fight. | Round one. Fight. |
| round-1-fight_t2 | am_michael | 1.00 | Round one! [320 ms gap] Fight! | 1.658 | -19.1 | -1.1 | -17.3 | Round one, fight. | Round one, fight. | Round one, fight. |
| round-1-fight_t3 | am_fenrir | 1.00 | Round one! [320 ms gap] Fight! | 1.440 | -19.3 | -1.2 | -17.2 | Round 1. Fight! | Round 1, Fight! | Round one, fight! |
| **round-2_t1** (rec) | am_michael | 1.15 | Round two! | 0.753 | -17.3 | -1.0 | -17.3 | Round two. | Round two. | Round two |
| round-2_t2 | am_michael | 1.00 | Round two! | 0.900 | -17.2 | -2.9 | -17.3 | Round 2 | Round 2 | Round two |
| round-2_t3 | am_puck | 1.15 | Round two! | 0.635 | -17.9 | -4.1 | -17.1 | Round two. | Round two. | Round two. |
| **final-round_t1** (rec) | am_michael | 1.15 | Final round! | 0.896 | -18.1 | -1.0 | -17.3 | final round. | final round | Final round |
| final-round_t2 | am_michael | 1.00 | Final round! | 1.006 | -18.0 | -1.2 | -17.3 | Final round. | Final round. | Final round |
| final-round_t3 | am_onyx | 1.15 | Final round! | 0.882 | -18.7 | -3.6 | -17.2 | final round. | Final Round | Final round |
| **hands-up_t1** (rec) | am_michael | 1.45 | Hands up! | 0.573 | -18.8 | -4.4 | -17.2 | Hands up. | Hands up. | Hands up |
| hands-up_t2 | am_michael | 1.60 | Hands up! | 0.546 | -18.9 | -5.1 | -17.2 | Hands up. | Hands up. | Hands up. |
| hands-up_t3 | bm_george | 1.60 | Hands up! | 0.597 | -19.0 | -3.7 | -17.2 | Hands up. | Hands up! | Hands up. |
| **ko_t1** (rec) | am_michael | 1.00 | Kay-oh! | 0.659 | -18.2 | -4.7 | -17.2 | K.O. | K.O. | KO |
| ko_t2 | am_puck | 1.15 | Kay-oh! | 0.488 | -19.0 | -3.6 | -17.1 | K.O. | K.O. | KO |
| ko_t3 | am_fenrir | 1.15 | Kay-oh! | 0.522 | -18.2 | -4.3 | -17.1 | K.O. | K.O. | KO |
| **blocked_t1** (rec) | am_michael | 1.15 | Blocked! | 0.607 | -19.0 | -3.6 | -17.3 | BLOCKED | Blocked. | Blocked |
| blocked_t2 | am_michael | 1.00 | Blocked! | 0.723 | -18.3 | -4.2 | -17.3 | Blocked. | Blocked. | Blocked |
| blocked_t3 | am_fenrir | 1.00 | Blocked! | 0.565 | -19.9 | -3.2 | -17.2 | Blocked. | Blocked. | Blocked! |
| **perfect_t1** (rec) | am_michael | 1.15 | Perfect! | 0.670 | -19.7 | -4.7 | -17.3 | Perfect. | Perfect. | Perfect |
| perfect_t2 | am_michael | 1.00 | Perfect! | 0.721 | -19.1 | -5.1 | -17.3 | Perfect. | Perfect. | Perfect |
| perfect_t3 | am_puck | 1.15 | Perfect! | 0.565 | -19.8 | -4.4 | -17.2 | Perfect. | Perfect. | Perfect |
| **counter_t1** (rec) | am_michael | 1.00 | Counter! | 0.691 | -17.5 | -3.0 | -17.2 | Counter | Counter | Counter |
| counter_t2 | am_michael | 1.15 | Counter! | 0.632 | -17.6 | -4.3 | -17.2 | counter. | counter. | Counter |
| counter_t3 | bm_george | 1.15 | Counter! | 0.786 | -18.3 | -5.7 | -17.1 | Counter | Counter | Counter |
| **super-incoming_t1** (rec) | am_michael | 1.15 | Super incoming! | 0.990 | -18.0 | -2.4 | -17.3 | Super Incoming. | Super Incoming. | Super incoming |
| super-incoming_t2 | am_michael | 1.00 | Super incoming! | 1.141 | -18.0 | -2.3 | -17.3 | Super incoming. | Super Incoming! | Super incoming |
| super-incoming_t3 | am_puck | 1.00 | Super incoming! | 0.882 | -18.2 | -1.6 | -17.1 | Super incoming. | Super incoming. | Super incoming |
| chat-wins_t1 | am_michael | 1.00 | Chat wins! | 0.866 | -18.2 | -3.0 | -17.2 | Chat wins. | Chat wins! | Red corner wins! |
| **chat-wins_t2** (rec) | am_michael | 1.15 | Chat wins! | 0.821 | -17.7 | -3.3 | -17.2 | Chat wins. | Chat wins. | Chat wins! |
| chat-wins_t3 | bm_george | 1.15 | Chat wins! | 0.918 | -18.0 | -5.1 | -17.1 | Chat wins. | Chat wins. | That wins |
| **streamer-wins_t1** (rec) | am_michael | 1.15 | Streamer wins! | 0.951 | -18.2 | -4.8 | -17.2 | Streamer wins. | Streamer wins. | Streamer wins. |
| streamer-wins_t2 | am_michael | 1.00 | Streamer wins! | 1.038 | -17.7 | -2.9 | -17.2 | Streamr wins. | Streamer wins! | Streamer are wins. |
| streamer-wins_t3 | am_fenrir | 1.00 | Streamer wins! | 0.839 | -17.4 | -3.2 | -17.1 | Streamer wins. | Streamer wins. | Streamer wins |
| **draw_t1** (rec) | am_michael | 1.00 | Draw! | 0.608 | -17.9 | -4.4 | -17.3 | Draw | Draw | Draw |
| draw_t2 | am_michael | 1.15 | Draw! | 0.517 | -17.8 | -1.7 | -17.2 | Draw | Draw | Draw |
| draw_t3 | am_fenrir | 1.00 | Draw! | 0.520 | -18.9 | -4.9 | -17.2 | Draw | Draw. | Draw |
| **weakness-found_t1** (rec) | am_michael | 1.00 | Weakness found! | 1.037 | -17.3 | -3.2 | -17.3 | Weakness Found | Weakness found. | Weakness found. |
| weakness-found_t2 | am_michael | 1.15 | Weakness found! | 0.900 | -17.4 | -2.7 | -17.3 | Weakness found. | Weakness found. | Weakness found |
| weakness-found_t3 | bm_george | 1.15 | Weakness found! | 1.073 | -18.4 | -3.4 | -17.1 | Weakness Found | Weakness found. | Weakness found. |
| **fixed-it_t1** (rec) | am_michael | 1.15 | Fixed. It! | 0.738 | -17.9 | -2.2 | -17.4 | Fixed it. | Fixed it. | Fixed it. |
| fixed-it_t2 | am_michael | 1.00 | Fixed it! | 0.804 | -17.8 | -3.5 | -17.4 | Fixed it. | fixed in. ✗ | Fixed in |
| fixed-it_t3 | am_fenrir | 1.00 | Fixed. It! | 0.704 | -18.4 | -4.2 | -17.2 | Fixed it. | fixed in. ✗ | Fixed it! |

Known weak spots: `fixed-it_t2` and `_t3` were heard as "fixed in" by `medium.en` (the recommended `_t1` passes all three checks). `blocked` passed for only 4 of the 10 candidates (others were heard as "blogged" or "locked"). Kokoro is a calm narrator model, so these sound like a punchy announcer with compression and EQ, not someone shouting into a mic (INFERRED from the AI listen and the model's design). If they sound flat, try speed 1.25 or swap in the Kenney lines.

## Rejected candidates (MEASURED, from `small.en`)
<details><summary>37 rejected candidates</summary>

| Candidate | Transcript | Why rejected |
|---|---|---|
| round-1-fight · am_puck @ 1.15 · "Round one! [320 ms gap] Fight!" | Round 1. Buy it. | mis-heard |
| round-1-fight · bm_george @ 1.00 · "Round one! [320 ms gap] Fight!" | Round one, vital. | mis-heard |
| round-1-fight · bm_george @ 1.15 · "Round one! [320 ms gap] Fight!" | Round 1. Fido. | mis-heard |
| round-1-fight · am_onyx @ 1.00 · "Round one! [320 ms gap] Fight!" | Round one, fine. | mis-heard |
| hands-up · am_puck @ 1.60 · "Hands up!" | ends up. | mis-heard |
| hands-up · am_michael @ 1.30 · "Hands up!" | Hands up. | too long (> 0.6 s) |
| hands-up · bm_george @ 1.30 · "Hands up!" | Hands up. | too long (> 0.6 s) |
| hands-up · bm_george @ 1.45 · "Hands up!" | Hands up. | too long (> 0.6 s) |
| ko · am_michael @ 1.15 · "Kay-oh!" | K-Yo. | mis-heard |
| ko · am_onyx @ 1.00 · "Kay-oh!" | Okay, yo. | mis-heard |
| ko · am_onyx @ 1.15 · "Kay-oh!" | Okay, yo. | mis-heard |
| blocked · am_puck @ 1.00 · "Blocked!" | vlog to | mis-heard |
| blocked · am_puck @ 1.15 · "Blocked!" | Locked. | mis-heard |
| blocked · bm_george @ 1.00 · "Blocked!" | Blogged. | mis-heard |
| blocked · bm_george @ 1.15 · "Blocked!" | Vlog to! | mis-heard |
| blocked · am_onyx @ 1.00 · "Blocked!" | Blogged. | mis-heard |
| blocked · am_onyx @ 1.15 · "Blocked!" | blogged. | mis-heard |
| perfect · am_onyx @ 1.15 · "Perfect!" | or effect. | mis-heard |
| counter · am_onyx @ 1.15 · "Counter!" | calendar. | mis-heard |
| chat-wins · am_onyx @ 1.00 · "Chat wins!" | Shot wins. | mis-heard |
| chat-wins · am_onyx @ 1.15 · "Chat wins!" | Shot wins. | mis-heard |
| draw · bm_george @ 1.00 · "Draw!" | DROLL | mis-heard |
| draw · bm_george @ 1.15 · "Draw!" | DROLL | mis-heard |
| fixed-it · am_fenrir @ 1.00 · "Fixed it!" | Fixed in. | mis-heard |
| fixed-it · am_fenrir @ 1.15 · "Fixed it!" | Fixed in. | mis-heard |
| fixed-it · am_puck @ 1.00 · "Fixed it!" | Fixed end. | mis-heard |
| fixed-it · am_puck @ 1.00 · "Fixed. It!" | Fixed end. | mis-heard |
| fixed-it · am_puck @ 1.15 · "Fixed it!" | Bix 10. | mis-heard |
| fixed-it · am_puck @ 1.15 · "Fixed. It!" | Fixed in. | mis-heard |
| fixed-it · bm_george @ 1.00 · "Fixed it!" | Vic Stater | mis-heard |
| fixed-it · bm_george @ 1.00 · "Fixed. It!" | VIXED IT! | mis-heard |
| fixed-it · bm_george @ 1.15 · "Fixed it!" | Thanks for watching! Thanks for watching! | mis-heard |
| fixed-it · bm_george @ 1.15 · "Fixed. It!" | Thanks, Nathan. | mis-heard |
| fixed-it · am_onyx @ 1.00 · "Fixed it!" | Thanks, then. | mis-heard |
| fixed-it · am_onyx @ 1.00 · "Fixed. It!" | Thanks, then. | mis-heard |
| fixed-it · am_onyx @ 1.15 · "Fixed it!" | Thanks then. | mis-heard |
| fixed-it · am_onyx @ 1.15 · "Fixed. It!" | effects then. | mis-heard |

</details>

## Rebuild
```bash
pip install kokoro-onnx soundfile faster-whisper pyloudnorm numpy   # + sox and ffmpeg on PATH
mkdir -p ~/voicework && cd ~/voicework
wget https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx \
     https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
KOKORO_DIR=~/voicework python3 <repo>/docs/assets/voice/tools/make_voice.py   # ~4 min on 8 CPU cores
```
Set `MAIN_VOICE=am_fenrir` (for example) to force another main voice. Change `OVERRIDES` in the script to change a recommended take.
