# Day 6: feel and proof

## Teardown correction (separate commit)

Claude reproduced Node 22 keep-alive sockets holding the route-test afterAll open. Cleanup now closes the HTTP listener, terminates all HTTP connections, awaits its close callback, then closes Vite in finally. The timeout is unchanged.

Independent subagent review: a second agent inspected the fix and ran the route suite three times on Node 22. All 10 tests passed each time (312/302/297 ms). Full npm test passed 310/310, 41 files, with exit 0. No real Twitch was called.

## Feel pass

The feel pass is presentation-only. Shared FEEL defines every requested hit-stop/trauma/KO duration; the reducer and damage numbers are unchanged. Both presentation animation clocks freeze on impact so boss hit-stop is visible; webcam, input, votes, game clock and telegraph timing continue normally. Trauma/Perlin shake and bounded glow target only the damaged rail. First and second COMBO impacts are deduplicated; reconnect snapshots prime history rather than replay old effects.

Both HP bars retain hatched red/black trails for 500 ms before draining. HANDS UP uses a non-blinking scale pop (or calm fade), black/white move pill and cyan guard/lean icon chip; clean guard outcomes show BLOCKED!. Calm is enabled by ?fx=calm or reduced-motion preference, with zero trauma and 150 ms fades while retaining hit-stop/audio. Font declarations have a 36 px floor and scouting n is 40 px. Chat Golem uses the original atlas timings, stable source anchor and approximately 420 px natural height; seated containment remains smaller to preserve the clear body area.

Audio uses the existing prepared unity-gain assets, exact -6 dB/ratio 12 limiter, music -6 dB and another -6 dB duck under speech, two-second routine voice throttle, predecoded buffers and no cue-time fetching. Demo sound stays off by default. OBS requests sound on but waits safely for a user gesture where autoplay is restricted; suspended resume never locks controls. No subjective listening result is claimed. CREDITS now inventories every prepared sound and other shipped asset licence/provenance.

Five-second cold-open rehearsal is available only in the simulated no-login demo. It needs the player's actual K/webcam guard through the shared reducer, never fabricates a block, highlights the tally after the result and deliberately pauses its one attack to hold the shot. It refuses live credentials. This is a rehearsal, not a video or live-chat proof.

Friends can use https://streamervschat.kashifnazir.com/ after Claude deploys. Opt-in local play-test counts start only with consent and clear on withdrawal; export contains votes/min, distinct anonymous simulated participants and rounds, never identities or text. A round already complete before consent does not count. Hosted real-chat metrics remain separate.

Capture has a bounded real-frame CPU/GPU comparison: 30 warmup + 90 measured frames/delegate, 20 s attempt limit, p50/p95 FPS/inference, automatic measured lower-inference selection. Measurement stops inputs and local replay; fixture recording must already be stopped. Resume is explicit. CPU remains the accepted default until a physical comparison completes. Classifier formulas are unchanged.

## Review and verification

Independent subagent review covered FX/safety/timing, HUD/audio/assets, capture benchmark and root cold-open/stats integration. Fixed findings include stable sprite scale/headroom, global presentation hit-stop, broken COMBO guard metadata, pending autoplay resume/mute, repeated HP-trail transition resets, per-hit COMBO audio, benchmark startup race, already-completed-round consent and consent withdrawal during async export. Final verification: 342 tests in 46 files pass on Node 22; TypeScript and whitespace checks pass. Static offline build passes at 25.2 MB raw / 15.1 MB gzip, retaining the vendored lite model and single SIMD fileset. The route suite teardown remains fast as part of the full run. No live Twitch calls or scripted live chat.

Both 4000-round/cell matrices pass unchanged. R1 casual 48.5–55.6%, no-punch 35.9–42.1%; scouting R2 casual 48.4–56.7%, no-punch 36.1–41.4%. Scouting exercised 1326 cards, 1316 exploits, 335 fixes. Full model/viewer tables remain identical to docs/day5-review.md.

## Needs Kash

- Run the physical Mac CPU/GPU comparison and record the measured rows/winner in docs/capture-performance.md. No camera or GPU benchmark was run overnight.
- Record the actual 5-second OBS cold open using docs/COLD-OPEN.md. No real video footage or real-chat proof was produced by this agent. Keep simulated footage labelled.
- Listen to the voice/SFX mix and check readability at 720p, normal/seated framing, calm effects and Chroma Key in Chrome/OBS. No browser surface was available for rendered visual QA; code/fixtures/fakes and localhost checks are the available evidence.
- Claude deploys the static build; no wrangler login/deploy was run. Boss Forge was skipped as requested.
