# Announcer voice: Rex Thunder - Deep N Tough

Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan.

Selected by Kash after listening on 28 October 2026. Source: the prep repository, `docs/assets/voice-elevenlabs-library/rex-thunder-deep-tough/ready/`, at commit `84ece4eb543fed649d1dab3f933aabbff0ab420d`. The 14 WAVs were copied byte-for-byte after updating that repository; filenames and runtime audio wiring are unchanged.

## Generation and provenance

- Provider: ElevenLabs Voice Library. Voice: **Rex Thunder - Deep N Tough**, ID `mtrellq69YZsNwzUSyXh`.
- Model: `eleven_v3`; generation output `mp3_44100_128`.
- Source settings: stability 0.45, similarity boost 0.82, style 0.30, speaker boost on, varied seeds. Hands-up used faster synthesis/SoX tempo where needed to fit its cue.
- Prep processing used its recorded SoX chain, silence trimming, -17 dBFS RMS target and -1 dBFS peak cap. Shipped files are 16-bit PCM mono at 44.1 kHz.
- The prep QC report records 42/42 Rex takes passing transcript/duration checks. Only the 14 selected ready files ship here; alternative takes and synthesis tools remain in prep. No TTS request or key was used for this replacement.
- These replace the previous locally generated takes; do not attribute the current recordings to that previous model or apply its model licence to them. MediaPipe still requires the separately retained Apache-2.0 notice.

## Shipped takes and measured duration

Durations below were read from the copied WAV frame counts. `hands-up.wav` lasts 599.932 ms, leaving about 200 ms inside the 800 ms telegraph when played at t=0. Runtime cues still preload/decode these local files; no audio scheduling or game rules changed.

| File | Selected prep take | Duration |
|---|---|---|
| `ready/blocked.wav` | `blocked_t2` | 0.595986 s |
| `ready/chat-wins.wav` | `chat-wins_t2` | 1.418549 s |
| `ready/counter.wav` | `counter_t2` | 0.884104 s |
| `ready/draw.wav` | `draw_t3` | 2.012676 s |
| `ready/final-round.wav` | `final-round_t1` | 1.514603 s |
| `ready/fixed-it.wav` | `fixed-it_t2` | 0.726961 s |
| `ready/hands-up.wav` | `hands-up_t3` | 0.599932 s |
| `ready/ko.wav` | `ko_t2` | 1.015510 s |
| `ready/perfect.wav` | `perfect_t2` | 0.597460 s |
| `ready/round-1-fight.wav` | `round-1-fight_t2` | 1.769524 s |
| `ready/round-2.wav` | `round-2_t3` | 1.167868 s |
| `ready/streamer-wins.wav` | `streamer-wins_t2` | 1.235261 s |
| `ready/super-incoming.wav` | `super-incoming_t1` | 1.463923 s |
| `ready/weakness-found.wav` | `weakness-found_t1` | 1.504331 s |

The paid Creator-plan provenance and selection are supplied by Kash. Source generation/QC metadata is in the prep repository's `docs/assets/voice-elevenlabs-library/levels.json`.
