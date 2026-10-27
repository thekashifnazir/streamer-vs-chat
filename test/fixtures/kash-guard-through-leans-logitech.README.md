# Logitech guard through leans

Supplied by Kash from a real 720p Logitech recording. Raw landmarks are copied unchanged from Downloads. The corrected intervals are unchanged; `label_source: "cue"` and `onset_verified: false` were added after Kash confirmed the labels came from a scripted on-screen cue schedule. The original, focus-loss-truncated labels are not used.

- Landmarks SHA-256: `c68aa7c96e4f4740b4d4f49603e9ac931f3e502cf5c53849fcf41f0aa09a0ed0`
- Original corrected-label source SHA-256 (before metadata addition): `8a17a0d430d34d9efda2068449109d6cc4879a1dc444d8470f71fb7140021e88`
- Stored calibration threshold: 0.1552707172155952.
- Corrected guard interval: 300–45300 ms.

`pose-regressions.json` requires ≥90% correct guard state after trimming 500 ms from both ends of each labelled lean. Lean percentages and strict 150 ms transition scores are diagnostic for this cue-labelled pair. Cue acceptance requires ≥1 s continuous correct-direction detection and no new opposite-direction detection. Key-labelled fixtures retain strict timing acceptance.

| Lean label | Guard expected | Guard state correct | Lean side correct | First observed ±0.5 tilt crossing |
|---|---|---|---|---|
| L, 5.31–11.32 s | on | 100% | 79.87% | 6.58 s |
| R, 15.32–21.32 s | on | 100% | 85.62% | 16.34 s |
| L, 25.32–31.32 s | on | 100% | 85.81% | 26.37 s |
| R, 35.33–41.33 s | on | 100% | 80.54% | 36.64 s |
| L, 49.33–54.34 s | off | 100% | 38.33% | 52.08 s |
| R, 54.34–59.34 s | off | 100% | 65.55% | 56.01 s |

The shoulder-aligned guard and raised-only punch gate fix the observed geometry failures. Kash confirmed that cue times precede movement because of delayed reactions, particularly while dropping guard and switching directly from L to R. Neither the labels nor the classifier were tuned to make cue times match movement onset.

All six cues pass direction acceptance. Continuous correct-direction runs are 4.47, 4.75, 4.75, 4.49, 2.03 and 3.10 seconds, with zero new opposite-direction detections. The final R cue carries approximately 0.81 s of the preceding L lean across the cue boundary; that carry-in is explicitly reported, not treated as a new R-cue error. Guard is correct on 100% of each of the six steady segments.

```sh
npx tsx test/pose/report.ts test/fixtures/kash-guard-through-leans-logitech.landmarks.json test/fixtures/kash-guard-through-leans-logitech.labels.corrected.json
```
