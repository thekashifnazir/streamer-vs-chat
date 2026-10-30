# Queue 13m — onboarding UI

Date: 30 October 2026. UI/copy only; no deployment.

## What changed

- `/play` has a three-step Twitch/OBS/fight panel, optional feature switches, a single permissions banner and a privacy disclosure. The memory switch remains unchecked by default and retains its 90-day/forget wording.
- Fight setup uses one clear-space checkbox, one posture setting and one defence-only setting. The tutorial consumes those settings without duplicate inputs. Difficulty/input/posture buttons retain the existing source values.
- The webcam setup is an in-page view around the same camera, classifier and calibration objects. Its checklist/progress and framing chips reflect existing state; no measurement or calibration formula changes. Existing validated saved profiles may be restored; no new automatic calibration storage was added. The 4:3 preview contains the full camera feed so edge landmarks are not cropped.
- Connecting leaves the onboarding steps available. Starting a fight reveals the compact stream controls and preserves the existing full Rails/safety-control viewport budget.
- Command mapping checked against the default BossDef, keyboard and reducer defence table: left hook requires D/right lean; right hook requires A/left lean. Forge rows use their own commands and defences.

## Verification

Fresh clone: `/private/tmp/queue13m-fresh-t7925ixo/repo`, Node 22, clean `npm ci`. Final UI amendments were copied into this clean dependency installation and the required non-sim checks repeated there.

| Check | Result |
| --- | --- |
| `npm test` | 893/893 across 110 files, exit 0 |
| `npx tsc --noEmit` | Pass |
| `npm run build:demo` | Pass; offline/API isolation audit passes |
| `npx wrangler deploy --dry-run` | Pass; no deployment |
| `npm run sim` | Pass, exit 0 (569.74 s); output byte-identical to 0be805d baseline |

Sim SHA-256: `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`. All four production matrices, difficulty matrix and five Forge fixture gates pass unchanged.

The checked clone matches all final TypeScript/HTML/CSS/config changes. No new dependencies; no reducer/timing/damage/balance/classifier/calibration-maths, golden or committed flag changes. Existing moved-markup assertions now check the actual DOM and dynamic move rows rather than obsolete HTML locations. Offline integration still completes a reducer round without any `/api` request; it also covers posture/defence-only tutorial updates, camera-off selection and restarting from expanded setup.

## Independent subagent review

- `onboard_style` independently reviewed hosted onboarding and service switches. Corrected duplicated permission notices, retained confirmed clip links across Off/On and preserved the existing 30-second clip spacing. Flags/scopes, unchecked memory consent and cleanup were checked; focused hosted tests pass.
- `onboard_hosted` independently reviewed setup/webcam and root layout/test changes. Corrected stale input cards after stopping the camera, a no-op Start button when expanding an existing fight and compact Green background changes not updating the onboarding step. Verified commands against BossDef defences, single-setting sources, fresh-frame/calibration safety gates, and absence of classifier/calibration maths edits. Focused setup/layout/difficulty/command tests pass.
- `onboard_setup` independently reviewed CSS/compact layout. Corrected a 10px STOP hint and narrow-screen control crowding. Direct page-main scoping preserves both nested Rails; the 120px chrome budget remains unchanged. Final review also covers the visible switch tracks, header/footer link touch targets, full-feed preview and its approximate 760×570 size.

## Compact layout test evidence

These are CSS geometry/DOM tests, **not rendered bounding-box measurements**. Computed-style tests keep both Rails displayed and dimensioned; source-bound geometry checks cover the actual 120px chrome budget.

| Viewport | Frame width × height | Frame bottom | Controls bottom | Status bottom |
| --- | --- | --- | --- | --- |
| 1920×1080 | 1706.67×960 | 1004 | 1056 | 1080 |
| 1280×720 | 1066.67×600 | 644 | 696 | 720 |

The compact bar is hidden before the first fight. Twitch connection alone no longer collapses the three-step setup. Green background stays synchronized when expanding again. Browser access was rechecked after the continuation: the browser host is still unavailable and native Chrome remains unapproved. Earlier native Edge access also failed; those surfaces were unavailable/refused, so physical rendered fit is explicitly left below.

## Needs Kash / Claude

- Rendered Chrome/OBS check at 1920×1080 after starting, plus a narrow/mobile visual pass. This run's browser host is unavailable; native Chrome computer-use access was refused. DOM/computed-style and viewport-budget tests are not represented as a physical rendered measurement.
- Real camera permission/framing/calibration walkthrough in standing and seated modes; no physical webcam check is claimed.
- Claude deploys after review. All committed hosted flags stay off.
