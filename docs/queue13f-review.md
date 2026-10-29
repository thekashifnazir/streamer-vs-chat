# Queue 13f review

## Part A — difficulty

Pulled twitchprep main before implementation (already current). Added the shared tempo table, authoritative difficulty, next-START choices on all three input pages, HUD/result labels, scaled Forge timing and difficulty simulation. Engine default remains Hard; menus start at Medium. Pose classifier and golden files are unchanged. No deployment.

Choice: use the prompt's explicit written probability formula. Its Easy/Medium examples conflict with the arithmetic; the formula gives +.08 / +.04 / −.03. This is INFERRED and documented in SPEC §13 and sim output, with no changes to damage, HP or Hard gates.

The 4,000-round difficulty matrix is recorded in SPEC §13. All ordering/bounds gates pass; Medium no-punch minimum is 46.75%, Easy casual maximum 75.175%, Expert casual minimum 37.125%.

Independent subagent review covered engine clocks/options, server application at START, persistent demo controls, HUD countdown/labels, simulation timing and Forge projections. Findings fixed: persistent selectors must remain reachable after the tutorial; Expert pending punches must preserve chronological event order; Forge bonuses must stop at timeout/KO and respect counter expiry/throttle. Added regressions for terminal Expert COMBO and a late stray punch crossing the next lethal hit. Hard trajectories were compared against the previous simulator with identical seeded full states/logs. Targeted golden suite passed unchanged. Final review also fixed modeled responses backdating before short Expert Forge tells and queued long-chain counter punches across the next draw. Independent review cleared the final revisions. Local full suite: 533/533 tests in 78 files; TypeScript passed.

Fresh-clone verification on Node 22.23.4, with a new npm cache and no local credentials/config copied:

- `npm ci`: exit 0 (9.27 s).
- `npm test`: 533/533 tests, 78 files, exit 0 (18.77 s).
- `npx tsc --noEmit`: exit 0 (3.47 s).
- `npm run build:demo`: exit 0 (1.62 s), offline audit passed; 25.5 MB raw / 15.4 MB gzip.
- `npm run sim`: exit 0 (400.20 s). All four unchanged Hard matrices, all 32 difficulty cells and default plus three Forge fixture gates passed. The difficulty matrix reproduced SPEC §13. Ordinary R2 totals: cards 1,304 / exploits 1,309 / fixes 335 / braces 23,465; coordinated R2: cards 787 / exploits 748 / fixes 197 / braces 73,805.

The fresh clone contained both implementation commits; the final amendment only records these verification results. No deployment.

## Needs Kash

Physical webcam play-test of each tempo and OBS input-lock visibility. No credentials, live Twitch, camera or deployment were used for automated verification.

## Part B — visible input lock

Capture starts stopped and shows a dedicated persistent INPUTS LOCKED banner above START, with the current clear-space/connection/camera/calibration/framing/Resume blocker. Rejected START focuses Resume inputs. Keyboard requires only clear space and explicit Resume; pose retains separate calibrated, fresh-frame checks. Local STOP, disconnect, restored calibration and input-source changes revoke local authorization. A normal moderator pause/resume preserves prior explicit authorization only while safety checks remain valid. An unauthorized server READY is answered with STOP without a feedback loop.

The server rejects START while input state is stopped and broadcasts the authoritative lock with every tick, including initial snapshots. OBS shows INPUTS LOCKED in the existing left-rail header, using the 36 px text floor without changing memory/Forge layout or covering the body.

Independent subagent review cleared capture, server and overlay changes after fixing stale-pose START and unauthorized READY cases. Capture/overlay/socket helpers cover focus, blocked START, keyboard without camera, restored/invalid pose, reconnect, moderator resume and lock persistence through ordinary game updates. Full local verification: 533/533 tests; TypeScript passes. No classifier or golden-vector changes.
