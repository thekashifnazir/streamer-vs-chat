# Queue 13u — hosted layout polish

31 October 2026. CSS/markup only, with the markup updater tolerating the removed OBS number. No changes to onboarding transitions, permissions, streaming, combat, inputs, classifier, calibration, balance or golden vectors. Demo `/` and fight HUD sources are unchanged. No new dependencies; no deployment.

## Changes

- Root cause: `#onboarding-row` outranked the old `.hosted-flow .page-top-row` display override, retaining the 3fr/2fr grid. The new `.hosted-flow #onboarding-row` rule directly wins that cascade. Every hosted step uses the same centred block column, `max-width:960px`, width `calc(100% - 32px)`. The slot and fight setup each fill that column; hidden siblings cannot reserve a second column. Panel height is automatic.
- Step bar is a three-column equal grid, with 4px top bars and labels below. Done uses cyan and a CSS check mark, current yellow/bold, upcoming muted grey. Existing authoritative flow states/aria-current remain unchanged.
- OBS expands as a compact unnumbered panel rather than a second step card. The same Mac/Windows buttons switch three/two short lines, and Done retains its tab-local completion. Green-screen copy and the existing toggle are behind More OBS options. The Advanced summary is a full-width, 44px outlined secondary control.
- Existing `OBS_VIDEO_URL` stays empty. Added empty Mac/Windows scene URL slots; each resource link is independently omitted until configured. No placeholder/broken downloads are shown. Static hosted markup is regenerated from the same renderer so it matches runtime markup.

## Layout checks

DOM/CSS cascade tests cover Twitch, Go live and Fight at viewport inputs 390, 1440 and 1920. They assert block/one-column layout wins the legacy ID grid, centred margins, 960px maximum, full-width children, equal segments, current/done state styling and the Advanced control dimensions. Tests also retain platform switching, explicit OBS completion, hidden resource links, controls/green-screen ownership and static/runtime markup parity.

The CSS constraint predicts these widths (not browser-measured bounding boxes):

| Viewport | Column | Side margin |
| --- | ---: | ---: |
| 390 | 358 | 16 |
| 1440 | 960 | 240 |
| 1920 | 960 | 480 |

jsdom checks the cascade, not rendered geometry. Computer Use inventory reported no browser host; automatic review then did not approve Google Chrome access. An asynchronous approval request is pending. No alternate browser-control route was used. Claude should verify the three widths in a real browser, including Fight/More options and the expanded OBS panel.

## Checks

`npx vitest run`: 986/986 tests across 128 files, exit 0 (21.88 s). `npx tsc --noEmit`: exit 0 (3.51 s). `npm run build:demo`: exit 0 (1.85 s), including offline/audio/header audits. `npm run sim`: exit 0 (557.97 s); every production/scouting/difficulty and Forge fixture gate passed. Complete output is byte-identical to 0be805d (3,652 bytes; SHA-256 `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`). No golden changes. No live Twitch calls, logins, camera access or streaming tests were attempted. Subagent review skipped per Queue 13u; Claude reviews the result. No deployment.
