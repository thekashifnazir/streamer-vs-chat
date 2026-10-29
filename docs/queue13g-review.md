# Queue 13g-1 review

Pulled twitchprep main first (already current) and inspected mock-1-hit.png, mock-2-super.png and mock-3-ready.png for layout/colour intent. This pass covers A, B and E only; no focus/finisher combat rules or SUPER redesign. Existing HUD styling and shared FEEL constants govern presentation. No deployment, live Twitch or physical webcam claims.

## Part A — chat commands

Default Chat Golem accepts primary !left / !right and short !l / !r / !j / !c / !s, alongside the original commands, case-insensitive and first token only. Explicit canonical default definitions receive the same behavior; custom Forge definitions retain exactly their own commands. A custom boss may deliberately own !left in any slot, without inheriting !l or any other alias.

Display-only command helpers supply compact primary/short HUD rows, tooltip/accessible legend, detailed offline/hosted key help, scouting vote prompts, hype prompt and result-message hints. README How to play, JUDGES and SPEC §1 name both forms and defence directions. Stored BossDef commands, move IDs, scouting and memory data stay unchanged. Names, counts over the weighted bar, and percentages have separate cells in standing and seated layouts; the 36 px text floor remains. Shipped Barlow font metrics check the widest command, three-digit count and 100% at 1080p/720p scale. Thousands compact on screen with exact counts retained in accessible labels/tooltips.

Parser tests cover lower/upper/mixed case for every accepted token, first-token behavior, missing ! and suffix lookalikes, canonical-default handling and custom-command isolation. Existing vote golden vectors are unchanged. Independent subagent review cleared A after fixing a measured seated overlap: primary/short labels and inline counts could collide with 100%. Counts now sit over retained weighted bars, with separate text cells and the existing condensed font. 106 parser/display/layout/golden tests plus server-result tests pass locally. Golden JSON unchanged; physical rendering remains a Mac check.

## Changed golden vectors

None. No golden fixture JSON was edited in this pass. Existing vectors remain mandatory in the full test suite.

## Needs Kash

Physical Chrome webcam play and OBS/720p legibility checks. These are explicit Mac checks; synthetic/recorded inputs and unit helpers do not establish physical webcam results.
