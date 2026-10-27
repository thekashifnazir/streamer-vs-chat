# Sun 1: polish and play-testing

```
Today: feel and proof.
1. Juice and mix tuning: the sounds, announcer lines, fonts, and Chat Golem boss are already wired from day 3. Add hit-stop and rail-only shake per the numbers in `docs/prompts/stretch-1-feel.md`, a red damage-trail on the HP bars, and a big "BLOCKED!" stamp. Tune `assets/sfx-ready/` and `assets/voice/ready/` per `assets/SOUNDS.md`; keep Anton + Barlow fonts from `assets/fonts/` and the Chat Golem from `assets/boss/` (sprite sheet + JSON atlas: `frames` rects, `animations` with per-frame ms; play each move's wind-up during the 0.8 s telegraph, bottom-right of the right rail at ~420 px tall, with vote rows tightened to 38 px as in docs/hud-rails-with-boss.jpg). List every asset licence in CREDITS.md. Readable at 720p.
2. A 5-second cold open for the video: HANDS UP! → a real block → BLOCKED! → the chat tally.
3. Performance pass: capture page fps and inference ms on this Mac (GPU vs CPU delegate); pick the faster.
4. A play-test build for friends: the demo link, plus an opt-in local stats export (votes/min, unique chatters, rounds) to quote in the submission.
5. Boss Forge is `docs/prompts/stretch-4-boss-forge.md`, only if ahead.
/review and fix the findings.
```
