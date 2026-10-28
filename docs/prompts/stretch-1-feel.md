# Stretch 1 — rank 1, 2.5 Codex hours; source: docs/research/11-accessibility-and-feel.md §8b

```
Read SPEC.md (§1 core loop, §2 defence table, §6 events) and assets/SOUNDS.md first. Today: the feel + legibility pass. Don't change game rules or damage numbers.

1. Hit-stop, overlay animation only. The game clock, the vote timer and pose input keep running (never delay a Resolved event or the next telegraph). Durations by Resolved.outcome and move: BLOCK 80 ms, PERFECT 160, DODGE 60, counter on the boss 120, HIT JAB 120, HIT HOOK_L/HOOK_R 150, HIT COMBO 90 per hit, HIT SUPER 220, KO 400 then 0.5x animation speed for 600 ms. Put these in one FEEL table in shared/.
2. Screen shake, Eiserloh trauma model: trauma in [0,1], shake = trauma^2, offset = 24px * shake * perlin(t), rotation = 1.5deg * shake * perlin(t), linear decay 1.5/s. Shake ONLY the rail that took damage (streamer rail on HIT, boss rail on a counter), never the webcam or the whole page. Trauma added: JAB 0.4, HOOK 0.5, COMBO 0.35 per hit, SUPER 0.8, KO 1.0, counter 0.3, BLOCK/PERFECT/DODGE 0.
3. Damage trail on both HP bars: a hatched stripe (repeating-linear-gradient -45deg, red #ff3b30 10px / black 6px) that drains after 500 ms. Not a solid colour (colour-blind check: solid red vs pink is near-identical under deuteranopia).
4. Telegraph pill: black background, white move name, cyan #2ef2ff chip with black text and an icon: a shield for guard moves (JAB, COMBO), an arrow pointing the lean direction for HOOK_L (→) and HOOK_R (←), both arrows for SUPER. HANDS UP! pops in by scale 1.25 -> 1.0 over 120 ms and fades out. It must never blink.
5. Flash safety (WCAG 2.3.1): no full-screen white or red flashes. Any hit flash covers under 57,500 px at 1920x1080 (e.g. a glow on the hit rail's HP bar). Never use pure #ff0000 for a flash. Add a unit test that the FX scheduler never produces more than 3 large-area (>57,500 px) luminance flashes in any 1 s window for a worst-case COMBO + PERFECT + counter sequence.
6. Calm FX: on when the demo page matches prefers-reduced-motion: reduce, or when the overlay URL has ?fx=calm. Calm FX = trauma always 0, slams become 150 ms fades, hit-stop and sounds stay. Show a small CALM FX badge on the streamer rail when it is on.
7. Text floor: every HUD text has a font-size >= 36 px at 1920x1080 (n=30 on the scouting card 40 px). Add a test that fails on any smaller font-size in the overlay CSS.
8. Acceptance: (a) Given a JAB HIT, the Resolved event time is unchanged with and without hit-stop; (b) the next telegraph starts exactly 2400 ms after the previous one with FX on; (c) with ?fx=calm the rail transform stays identity through a SUPER HIT; (d) the flash test above passes.
Arrange independent subagent review and fix the findings.
```
