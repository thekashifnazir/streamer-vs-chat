# Recorded voice bank: boss taunts and coach calls

Pre-recorded, fixed lines for two banks:

- **Boss** (Boss Fight): playful, PG trash talk from the boss when the streamer is hit, blocks, dodges or parries, when the boss spots a lean habit, when chat's SUPER charges, when the streamer lands a FINISHER, at round start and end, and when chat goes quiet.
- **Coach** (Crowd Trainer): pad-work combination calls (`combo-12` "One-two!" … `combo-2s2` "Two, slip, two!"), round start, rest, ten seconds, time, clean / partial / missed (always encouraging), faster / slower, chat picked, workout done.

All text is written by the project and lives in `lines.json`. Nothing is generated live, and no chat text or username is ever spoken. That is why this replaces the cut live AI boss voice: there is nothing to moderate.

The 14-line announcer in `../ready/` is unchanged and always wins. Taunts only play when no announcer line or callout is speaking. There is at most one taunt per 6 s, never while an attack is telegraphed or landing, and the line must end before the next beat. A new warning or announcer line cuts a taunt off with a 40 ms fade.

## Provenance

- Provider: ElevenLabs, generated on Kash's paid ElevenLabs plan on 1 November 2026.
- Voices: made with ElevenLabs **Voice Design** (`/v1/text-to-voice/design`, model `eleven_ttv_v3`) from the briefs in `lines.json`, then saved to the account's voice library. Each brief gave 3 previews. All 24 previews transcribed word-perfectly (whisper `small.en`), so the tie-break was pace: the faster take, because short taunts must fit between attacks. Kash has not listened to these yet.
- Lines: text to speech model **`eleven_v4`** (`/v1/text-to-speech/{voice_id}`, `mp3_44100_128`), stability 0.5, similarity 0.8, style 0.3–0.35, speaker boost on, seed 1000 and up to two retries (1001, 1002) when a check failed. The key cannot list models (`models_read` is not granted), so `eleven_v4` was confirmed by a successful request; `eleven_v4_alpha`, `eleven_v4_preview` and `eleven_multilingual_v4` were rejected as `model_not_found`.
- Sound effects (`sfx/`): ElevenLabs Sound Effects (`/v1/sound-generation`, prompt influence 0.6): crowd cheer, crowd groan, pad hit, rest whistle, ring bell. They are not wired into gameplay yet; the Crowd Trainer can use them.
- Processing (FFmpeg): mono 44.1 kHz; leading and trailing silence trimmed at −45 dB; takes longer than 2.4 s sped up (pitch kept), at most 1.25x; levelled to −17 dBFS RMS through a limiter at −2 dBFS; 64 kbps CBR MP3 with metadata stripped, re-encoded a little quieter in the rare case the MP3 still peaks above −1 dBFS. Each folder's `qc.json` records every take: text, voice id, model, seed, RMS, peak, seconds, tempo, whisper transcript, similarity and pass. `durations.json` gives the player the take lengths, so it can choose one that fits the gap without fetching.
- Checks: a take passes when whisper `small.en` (local whisper.cpp) hears the text (word or letter similarity ≥ 0.8, ignoring punctuation, digits and contractions) and it lasts 2.5 s or less.

## Voices

Players choose these next to the Sound switch, on `/` (Options) and `/play` (More options). The choice is stored in `localStorage` as `svc.prefs.voice.boss` (`off` or a folder id) and `svc.prefs.voice.coach`. Only the chosen voice's files are fetched, one line at a time when first needed.

### Boss voices

| Player name | Folder | ElevenLabs voice id | Preview used | Alternatives (Voice Design previews, not saved) | Brief |
|---|---|---|---|---|---|
| Stone Golem (default) | `golem` | `6dMZ57d2t6uB5BnrjVay` | `~/cx-runs/voice-previews/golem/1.mp3` | `~/cx-runs/voice-previews/golem/2.mp3` (`Yfd92ahAT2Rn68T2bRdP`), `~/cx-runs/voice-previews/golem/3.mp3` (`kcMnpILncezsyPePpcRw`) | A deep, gravelly male voice for a giant stone golem boss in a cartoon fighting game. Menacing but fun, theatrical playful trash talk, slow rumbling delivery, clear diction, British accent. |
| Gremlin | `gremlin` | `0wyRTjUq37yf1vHOAe5X` | `~/cx-runs/voice-previews/gremlin/2.mp3` | `~/cx-runs/voice-previews/gremlin/1.mp3` (`B4XdMI0ncVDPSfBRXeso`), `~/cx-runs/voice-previews/gremlin/3.mp3` (`fWvUvb2DmXABmxzoOwWV`) | A raspy, mischievous, slightly high-pitched male voice for a cheeky little gremlin boss in a cartoon fighting game. Cackling, sneering playful trash talk, quick and snappy, clear diction, London accent. |
| Rock Queen | `queen` | `M26I7dx5tcrlUpUHe5CZ` | `~/cx-runs/voice-previews/queen/2.mp3` | `~/cx-runs/voice-previews/queen/1.mp3` (`lAmvX7gflSRlazwF3CvF`), `~/cx-runs/voice-previews/queen/3.mp3` (`4nIbSItR75TtjYv3OZ0e`) | A commanding, regal female villain voice for a towering crystal queen boss in a cartoon fighting game. Cold, amused, theatrical playful trash talk, smooth and clear, British accent. |
| Big Rumble | `rumble` | `9O6FlwSgeilQ1Ak4KXLM` | `~/cx-runs/voice-previews/rumble/2.mp3` | `~/cx-runs/voice-previews/rumble/1.mp3` (`TfQhSFwX19IJs07qkXkt`), `~/cx-runs/voice-previews/rumble/3.mp3` (`anqc12HNAuPevCYvuIpM`) | A booming, swaggering male pro-wrestling heel voice for a huge boulder brute boss in a cartoon fighting game. Loud, cocky, over-the-top playful trash talk, clear diction, American accent. |

### Coach voices

| Player name | Folder | ElevenLabs voice id | Preview used | Alternatives (Voice Design previews, not saved) | Brief |
|---|---|---|---|---|---|
| Drill Coach (default) | `drill` | `4mX6dDqC4tubmVrPqviu` | `~/cx-runs/voice-previews/drill/2.mp3` | `~/cx-runs/voice-previews/drill/1.mp3` (`YOg23JT2yP9VTww4F4Dk`), `~/cx-runs/voice-previews/drill/3.mp3` (`CUA0J9KABoDpQT2ZHDam`) | A tough, barking but encouraging male boxing coach running pad work in a busy gym. Sharp, loud, punchy, very clear when counting combinations, British accent, adult. |
| Hype Coach | `hype` | `xt0880NUCNiFmcQkf1Bc` | `~/cx-runs/voice-previews/hype/1.mp3` | `~/cx-runs/voice-previews/hype/2.mp3` (`vKvjrPzaNMniUA6JHjOt`), `~/cx-runs/voice-previews/hype/3.mp3` (`Ek1iZ7ziN29zqKHlYwwK`) | A high-energy, upbeat female fitness and boxing coach running pad work. Bright, enthusiastic, encouraging, very clear when counting combinations, American accent, adult. |
| Corner Coach | `corner` | `BJH1jMQWSZvlUdNzj5MA` | `~/cx-runs/voice-previews/corner/1.mp3` | `~/cx-runs/voice-previews/corner/2.mp3` (`R7D7mSMhg8N9SEzaCnFl`), `~/cx-runs/voice-previews/corner/3.mp3` (`FCsiUXiuOSwcq78lr2i5`) | A warm, gritty older male boxing trainer in the corner of the ring. Calm authority, encouraging, steady and very clear when counting combinations, Irish accent. |
| Pad Pro | `pads` | `APIsbeQ0LSHKxC3CrEDU` | `~/cx-runs/voice-previews/pads/1.mp3` | `~/cx-runs/voice-previews/pads/2.mp3` (`9dSd3B4u05xxk91wGw2F`), `~/cx-runs/voice-previews/pads/3.mp3` (`8r3oHfad0l1PTxJdh000`) | An energetic young female boxing pad-work coach. Fast, crisp, motivating and very clear when counting combinations, Australian accent. |

## Measured QC (`python3 scripts/voice-bank.py qc`)

| Folder | Files | Size | RMS dBFS min / median / max | Max peak dBFS | Seconds min / median / max | Over 2.5 s | Sped up | Transcript + length pass |
|---|---|---|---|---|---|---|---|---|
| `golem` | 108 | 1.93 MB | -18.47 / -17.65 / -17.28 | -1.29 | 0.805 / 2.384 / 2.458 | 0 | 52 | 108/108 |
| `gremlin` | 108 | 1.80 MB | -19.37 / -18.08 / -17.19 | -1.11 | 0.666 / 2.087 / 2.421 | 0 | 32 | 108/108 |
| `queen` | 108 | 1.92 MB | -18.65 / -17.49 / -17.25 | -1.38 | 0.812 / 2.361 / 2.666 | 1 | 50 | 107/108 |
| `rumble` | 108 | 1.80 MB | -19.44 / -17.87 / -17.38 | -1.2 | 0.574 / 2.119 / 2.415 | 0 | 32 | 108/108 |
| `drill` | 110 | 1.78 MB | -18.99 / -17.55 / -17.33 | -1.22 | 0.7 / 2.067 / 2.418 | 0 | 20 | 110/110 |
| `hype` | 110 | 1.85 MB | -19.51 / -17.77 / -17.34 | -1.48 | 0.692 / 2.187 / 2.447 | 0 | 32 | 110/110 |
| `corner` | 110 | 1.89 MB | -18.61 / -17.44 / -17.25 | -1.99 | 0.765 / 2.271 / 2.451 | 0 | 39 | 110/110 |
| `pads` | 110 | 1.80 MB | -18.6 / -17.52 / -17.23 | -1.63 | 0.682 / 2.115 / 2.419 | 0 | 24 | 110/110 |
| `sfx` | 5 | 0.06 MB | -23.33 / -16.72 / -13.55 | -1.81 | 0.6 / 1.334 / 2.0 | n/a | n/a | peak only |

Total on disk: 14.82 MB of MP3.

Takes that did not pass (kept as the best of three seeds; listen before relying on them):

- `queen/taunt-habit-left-3.mp3` (2.666 s): "Left, left. Boring!" heard as "Left. Left. Boring."

## Regenerate or swap a voice

From the repo root, with the key loaded only into the environment:

```sh
set -a; . ../streamer-vs-chat/.env; set +a
python3 scripts/voice-bank.py generate            # fills only missing or changed files (spends credits)
python3 scripts/voice-bank.py qc                  # re-measures, rewrites durations.json (free)
```

- Change a line: edit `lines.json`, then run `generate`. Only that file is remade in every voice of its bank.
- Swap a voice for one of its alternative previews: `python3 scripts/voice-bank.py save <folder> <n>`, then `generate <folder>`. Or paste any library voice id into `voices.<bank>[].voice_id`. Preview ids are temporary until saved.
- New voice: add an entry to `voices.boss` or `voices.coach`. Then run `design <folder>`, `rank <folder>`, `save <folder> <n>` and `generate <folder>`. Add it to `VOICES` in `demo/src/voice-bank.ts`; a test keeps the two lists equal.
- Raw API takes are cached in `~/cx-runs/voice-bank-raw/`, so `refinish` can re-level or re-encode without spending credits.

Credits used: not measurable with this key (`/v1/user/subscription` needs `user_read`, which it lacks). The run made 24 Voice Design previews, 8 voice saves, 1,102 cached text to speech takes plus 7 model probes (872 shipped lines; the rest are retries and lines later reworded), about 20,500 characters in the shipped takes and their retries and 5 sound effects.
