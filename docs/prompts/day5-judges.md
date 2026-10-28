# Sat 31: clips, accessibility and demo extension

```
Today: things judges will touch; extend the day-3 demo.
1. Auto-clips: on KO, perfect block or comeback, POST /helix/clips (clips:edit) while live, poll Get Clips for up to ~15 s, and store the clip id. A 202 from Create Clip is not proof (measured: a clip requested 20 s into a stream returned 202 and never appeared; one 2 min in appeared after 7.3 s), so never clip in the first minute of a stream and fall back to the local MediaRecorder replay when the poll times out (SPEC.md test 15a). End-of-stream card: the top 3 clips + chat MVP (the voter whose moves did the most damage) + stats. If clip creation fails or we're offline, fall back to a stats-only card.
2. Extend the day-3 no-login demo for judges. Keep the day-3 Worker URL as the demo link and put it first in the README, before setup instructions.
3. Accessibility: seated mode (separate calibration, "TILT" cues, and rails that get out of the way per docs/HUD.md "Framing") and a no-punch mode (punch detection and prompts off; blocks and dodges still counter, damage numbers unchanged), each selectable on the start screen.
Arrange independent subagent review of everything. The README needs the demo link first, then setup.
```
