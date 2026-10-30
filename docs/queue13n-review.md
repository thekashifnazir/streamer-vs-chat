# Queue 13n — page polish

Date: 30 October 2026. UI and copy only. No deployment.

## Changes and verified copy

- Both pages use system body type, shared viewport-derived section widths, a 60/40 top row, a visible fight-screen preview and three illustrated defence cards. Page settings retain their existing sources and camera/calibration objects.
- Verified keyboard and default BossDef mapping: guard K handles jab/combo; A/player-left answers a hook from the right; D/player-right answers a hook from the left. Custom bosses populate cards from their declared defences; a custom lean-any move is not presented as the default SUPER sequence.
- The reducer ends a match at two round wins, so the demo says **Best of 3 rounds** and explains first to two, rather than promising that all matches last three rounds.
- Hosted onboarding keeps Connect/OBS as its two left-hand steps; setup is step 3. Feature diagnostics remain in tooltips/compact status without duplicate pre-connect paragraphs. Header pills render login as safe text. Memory remains unchecked and separate from counts-only metrics.
- Demo More to try contains Forge and local share/rehearsal/stats cards. Gate/tune, snapshots and explicit admission are unchanged. Rejected copy says **Your current boss stays**, since the code can retain a custom current boss; it does not always revert to Chat Golem. The requested “about 6 seconds” is UI guidance, not a new measured benchmark.
- Copy link is local clipboard-only; failure selects the read-only URL. Cold-open status starts empty. No new assets, dependencies or network paths.
- Compact chrome is 44px top bar + 64px fight controls, with the old bottom sentence hidden. STOP is 56px; Back to setup pauses and expands. HUD connection wraps at the explicitly requested 26px exception; other HUD text floors remain intact and sound labels are not ellipsized.

## Independent subagent review

- `polish_hosted` reviewed Forge/share and root compact changes: no automatic admission, unchanged gate/snapshots, honest rejection copy and safe clipboard fallback. Three focused tests passed. Flagged the obsolete tutorial/collapse source assertion, which root updated.
- `polish_style` reviewed setup/hosted markup and mappings. Fixed header class/state mismatch with the owners; checked arrows, best-of-3 copy, source controls and pre-auth status removal. Independently reviewed the final Connect-card notice amendment: actionable login errors remain visible as safe text, and connected identity replaces them; no blockers.
- `polish_layout` reviewed CSS/HUD. Fixed seated sound selector specificity, legacy 13px webcam text and narrow extras min-content overflow. Targeted CSS/HUD/compact checks passed (25 tests). Final heading/disclosure scoping was rechecked read-only by the independent reviewer; a permission-paragraph selector typo was also corrected.

- Final cross-lane pass by `polish_layout` caught a page/HUD `.forge-card` class collision. Removed the HUD-only class from the page card and added a computed-style regression using both production stylesheets. Also applied the requested cyan primary-button class. Independent final inspection found no remaining blockers.

## Checks

Final candidate code/markup/test bytes were verified identical in the working tree, a fresh clone, and the verification container. Clean `npm ci` completed in the official Node 22 image (Node 22.23.4 / npm 10.9.9); the container network was then disconnected before checks. No host credentials or `.env` files were supplied.

| Check | Result |
| --- | --- |
| `npm test` | 904/904 tests, 112/112 files; exit 0 after the late class fix |
| `npx tsc --noEmit` | exit 0 |
| `npm run build:demo` | exit 0 |
| `npx wrangler deploy --dry-run` | exit 0; all four hosted flags off |
| `npm run sim` | Pass, exit 0; all production/difficulty/Forge gates; byte-identical to 0be805d reference |
| Golden vectors / engine / classifier / calibration maths / dependencies | No changes |
| `git diff --check` | Pass |

Earlier Mac runs under heavy host load timed out in unchanged capture/storage/balance/build tests; two moved-markup source assertions were corrected. An initial container run also timed out in two unchanged Forge tests during the same load spike (901/903 passed). The final full suite passed without altering assertions, test timeouts or worker settings. The first run after the class fix passed 903/904 tests; the unchanged offline-build test exceeded its existing 30s timeout during I/O contention. The final unchanged full-suite rerun passed 904/904 in 33.22 seconds. Type check, build and dry-run were rerun afterward and passed. Failed runs are not counted as passes. The container image digest was `sha256:18a6d90fd60542269850c80ca03b29b1d9b14d6b221ac7ee8e35b0d33ef904bd`.

Simulation stdout is exactly 3,652 bytes with SHA-256 `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`, identical to the preserved pre-13h/0be805d reference. No golden files, reducer, timing, damage, balance numbers or sim code changed. The long elapsed host run included a deliberate pause while other checks ran; it is not a performance measurement.

## Compact geometry evidence

DOM/computed-style and CSS-bound geometry checks cover 1920×1080 and 1280×720. The new 108px chrome budget gives a 1728×972 frame at 1080p (top 44, bottom 1016, controls bottom 1080), and a 1088×612 frame at 720p (bottom 656, controls bottom 720). These are calculated/tested CSS dimensions, not measured browser rectangles.

## Needs Kash / Claude

- Actual Chrome/OBS render at 1920×1080 after START, plus 390px narrow view. The browser preview attempt timed out/reset the computer-use kernel; the subsequent native Chrome automatic approval review timed out without a decision. Previous browser host/native access was unavailable. No rendered-fit claim is made without a working browser surface.
- Eyeball the seated + memory + Calm FX footer with full sound text; tests cover computed wrapping/non-truncation, not physical glyph containment.
- Standing/seated real webcam walkthrough remains a physical check. No classifier or calibration-maths change is claimed or made.
- Claude deploys. Committed hosted flags stay off.
