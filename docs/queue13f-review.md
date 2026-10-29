# Queue 13f review

## Part A — difficulty

Pulled twitchprep main before implementation (already current). Added the shared tempo table, authoritative difficulty, next-START choices on all three input pages, HUD/result labels, scaled Forge timing and difficulty simulation. Engine default remains Hard; menus start at Medium. Pose classifier and golden files are unchanged. No deployment.

Choice: use the prompt's explicit written probability formula. Its Easy/Medium examples conflict with the arithmetic; the formula gives +.08 / +.04 / −.03. This is INFERRED and documented in SPEC §13 and sim output, with no changes to damage, HP or Hard gates.

The 4,000-round difficulty matrix is recorded in SPEC §13. All ordering/bounds gates pass; Medium no-punch minimum is 46.75%, Easy casual maximum 75.175%, Expert casual minimum 37.125%.

Independent subagent review covered engine clocks/options, server application at START, persistent demo controls, HUD countdown/labels, simulation timing and Forge projections. Findings fixed: persistent selectors must remain reachable after the tutorial; Expert pending punches must preserve chronological event order; Forge bonuses must stop at timeout/KO and respect counter expiry/throttle. Added regressions for terminal Expert COMBO and a late stray punch crossing the next lethal hit. Hard trajectories were compared against the previous simulator with identical seeded full states/logs. Targeted golden suite passed unchanged. Final review also fixed modeled responses backdating before short Expert Forge tells and queued long-chain counter punches across the next draw. Independent review cleared the final revisions. Local full suite: 533/533 tests in 78 files; TypeScript passed.

Final fresh-clone test/type-check/sim/build results will be recorded after both commits.

## Needs Kash

Physical webcam play-test of each tempo and OBS input-lock visibility. No credentials, live Twitch, camera or deployment were used for automated verification.
