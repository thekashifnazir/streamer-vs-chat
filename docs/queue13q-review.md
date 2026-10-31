# Queue 13q — judge-ready fixes

31 October 2026. UI, loading and transport presentation only; no reducer, timing, damage, balance, classifier or calibration arithmetic changes. No new dependencies; no deployment.

## Changes

- Camera instructions now follow the preview instead of covering its permission button/note. The camera button is disabled until the existing single clear-space checkbox is checked, with a visible adjacent reason. Camera failures use the requested fixed plain-language messages, scroll into view and never display browser error text. Browser advice says “Works best in Chrome.”
- Demo/play audio fetch/decode starts on explicit activation, not HUD mount. The warning pair is prepared first; delayed warning readiness retries only while its telegraph is active. Optional music cannot hold up the warning. Standalone OBS overlays retain an idle autoplay attempt (with cancellation on disposal), since START happens in another window.
- Runtime audio uses 26 96-kbps MP3 files; WAV masters remain provenance assets and are excluded from the built runtime. The boss uses a same-layout WebP atlas sheet. A visible vector stand-in replaces the previous clear-and-return blank canvas while the sheet/atlas is pending or fails. That pending path is a confirmed code cause of blank rendering; the original headless screenshots' exact cause remains unverified.
- `/play` contains its complete onboarding panel in static HTML and reuses it on mount. A shared health reader coalesces startup requests and refreshes after Connect, including stale-response race protection.
- HP bars expose progressbar roles and current bounded HP values. Connect uses #772ce8. The Plain control compensates for HUD scale to retain a 24px target.
- The build emits immutable one-year headers for actual fingerprinted assets, and no-cache headers for HTML; model/WASM paths remain revalidated.
- Credits include all new assets. Build audits reject inline/uncompressed runtime audio. DOM/unit tests cover camera messages/safety, static panel parity, accessibility, health requests, sound activation/readiness, sprite fallback and cache headers.

## Loading budget

| Affected runtime assets | Before | After |
| --- | ---: | ---: |
| Audio loaded eagerly before interaction | 4,756,550 B | 0 B |
| Boss sheet | 2,867,378 B PNG | 803,458 B WebP |
| Total affected initial asset budget | 7,623,928 B | 803,458 B |

Reduction: 6,820,470 B (89.5%). All 26 MP3 files total 667,254 B after interaction. These are exact file-size/transfer-budget calculations, **not a complete browser network trace**. The supplied live first-load measurement was approximately 7.5 MiB. A complete after trace remains a Mac check. WebP retains the 4096×1315 layout and approximately 21.5 MB decoded RGBA allocation; this change does not claim lower decoded memory.

## Checks and review

- Full sim passed, 506.66 seconds; byte-identical to the 0be805d reference: 3,652 bytes, SHA-256 `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`. All production, difficulty and five Forge fixture gates passed. No golden changes.
- `npm test`: 950/950 tests, 122/122 files, exit 0 (17.12 s). `npx tsc --noEmit`: exit 0 (6.23 s). `npm run build:demo`: exit 0 (2.18 s), including offline/compressed-audio/header audits. `npx wrangler deploy --dry-run`: exit 0 (2.30 s); all hosted flags remain off. No deployment.
- The first full test run exposed an old master-directory assertion that rejected the new MP3 derivatives. It now filters WAVs before the unchanged exact 14-name/PCM/duration checks; separate build tests enforce compressed runtime output. The final independent reviewer accepted that distinction.
- Independent subagent reviews covered camera, assets/audio, hosted health/caching and final integration. Final review caught the standalone OBS activation regression; idle-only priming and disposal tests fix it. Final follow-up independently reviewed the idle fix and found no remaining actionable code issues; its documentation precision note is applied.

## Needs Kash

Computer Use reported that Google Chrome was not approved, and browser automation was unavailable. No alternate browser-control route was used. Therefore actual 390×844 hit-testing, first-load ResourceTiming/CLS, scaled checkbox geometry and audible Chrome/Safari/OBS checks remain unverified. The isolated built-page audit is ready: after `npm run build:demo`, run `npx tsx scripts/browser-ui-audit.ts`, open its localhost `/__audit` URL and run the checks. It checks the camera button with `elementFromPoint` at its centre on both pages and records pre-interaction audio requests/transfer sizes; it does not request the real camera or connect to Twitch. Its HTTP/probe-compilation unit test is distinct from executing those rendered assertions.
