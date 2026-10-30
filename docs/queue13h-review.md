# Queue 13h — AI judge dry-run fixes

Read the three judge-report files directly with `git show origin/devin/1793298447-ai-judge-dryrun:docs/research/ai-judge/<file>` after fetching twitchprep origin. No checkout or modification of that branch. Reports: 2026-10-29-opus-5-5.md, 2026-10-29-sonnet-5-5.md, system.txt. Treat their scores and recommendations as review input, not evidence of real users.

## Changes and choices

- README leads with Medium ordinary-R1 casual/no-punch rates; Hard follows with explicit matrix scopes. Every win-rate row is INFERRED (assumed player models). MEASURED real Twitch p95 291 ms is separate from MEASURED local simulated 1,000-chatter p95 104 ms. Loaded-demo offline continuation is supported; offline reload is unsupported, with no service worker. State ownership explicitly distinguishes local server from browser demo/hosted modes.
- Honest dated Codex evidence uses the actual root rollout and git: 52 starts / 51 completions, 29 completed turns with tools and 22 without, 38 commits through 0be805d, 642 passing tests at that snapshot, and both scratch resume probes. Current test results below are separate from that historical snapshot. Main-thread entry work, Claude Code's resume queue, Devin's prompts/reviews and independent subagent reviews are disclosed.
- `?scout=fast` is accepted only by the no-login demo. It configures the existing scouting decision, with round 1 / three samples / 65% share / Wilson lower bound .40. Three genuine successful same-side dodges under the scripted Hard-level simulated-vote test reveal the card at 12.8 s (a reducer test timestamp, not a measured Medium playthrough); no outcomes or scouting evidence are fabricated. URL, credential-registry and callback-hash guards reject every non-demo entry. The optional configuration is omitted from default states, retaining exact production state shape. Restart/next-round retain explicit preview configuration. No production rule, damage, timing, default threshold or balance model changes.
- The sole reducer-file edit extracts the existing scouting evidence constants into optional configuration and carries it between rounds/restarts, as required by C1. Combat arithmetic, RNG, draw rules and timers are untouched. The preview is badged SCOUT PREVIEW · SIMULATED in the header, HUD connection status and compact toolbar; the toolbar preserves the complete label when seated or when setup is hidden.
- A connected hosted page collapses setup to status / Green background / End session / Expand. Demo fight start does the same. The full 16:9 stage is bounded by a 44 px toolbar, 52 px safety-controls row and 24 px status row; 1080p/720p geometry tests assert the frame plus controls fit the viewport. STOP/Resume/Next/New match stay mounted. Expand restores difficulty, crowd, webcam, Forge and results. JUDGES names Expand where needed.
- Hook help says hook from the left → you lean right, with short forms preserved. README adds the requested /play setup path, names missing bot/clip/live-Forge features, links the local server path, and reserves real playtest placeholders for Kash's genuine sessions.

## Independent review

Separate subagent passes reviewed scouting/config isolation, layout/control behavior and documentation/evidence. Findings fixed: preview footer could truncate when seated, so the full label is also in the compact toolbar; JUDGES needed Expand before hidden settings; hosted counts-only results were distinguished from local bot result posts; stale command-help assertions were updated to the requested wording. No review used a live Twitch connection.

## Verification

Initial local concurrent checks found a stale HTML alias assertion plus a 30 s Forge regression-test timeout while multiple review test processes competed. The assertion now tests the new explicit mapping and retained alias. Test timeouts and gates were not relaxed. Definitive fresh-clone checks run alone below.

## Needs Kash / verification limits

Computer-use inventory exposed no browser tabs, and native Chrome control returned “Computer Use was not approved to use Google Chrome.” No workaround or live login was attempted. The layout tests assert 1920×1080 / 1280×720 viewport budgets, CSS coupling and DOM control events; they are not actual rendered bounding-box measurements. A rendered hosted-connection and compact demo check remains for Kash/Claude on the Mac, including seated preview-badge legibility and tutorial/start-button visibility. No deployment was performed.

## Changed files

- `JUDGES.md`
- `README.md`
- `demo/index.html`
- `demo/play/index.html`
- `demo/src/main.ts`
- `demo/src/play.ts`
- `demo/src/scout-preview.test.ts`
- `demo/src/scout-preview.ts`
- `demo/src/stream-layout.test.ts`
- `demo/src/stream-layout.ts`
- `demo/src/style.css`
- `docs/codex-evidence.md`
- `docs/queue13h-review.md`
- `shared/src/chat-commands.test.ts`
- `shared/src/chat-commands.ts`
- `shared/src/engine.ts`
- `shared/src/scouting-config.ts`

## Final verification — 30 October 2026

Fresh empty clone and npm cache at `/private/tmp/queue13h-fresh-50ocnq6m`, Node 22.23.4. The exact uncommitted candidate was copied onto committed 0be805d before npm ci; new documentation was marked intent-to-add for the tracked-link check. All final non-documentation files were byte-compared with the tested clone and match. After the completed sim, the final presentation refinements were copied into the same clone and the full tests/type check/build rerun without a competing sim/test process. Later edits only append these results. No credentials were loaded.

| Command | Result | Wall seconds |
|---|---|---:|
| npm ci | PASS | 5.46 |
| npm test — 649/649, 90 files | PASS | 49.26 |
| npx tsc --noEmit | PASS | 30.26 |
| npm run sim — all gates | PASS | 845.38 |
| npm run build:demo | PASS | 7.49 |

The full sim stdout is **byte-for-byte identical** to the final pre-13h output from 0be805d. Both SHA-256 values: `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`. All four production matrices, both scouting-coverage gates, the difficulty matrix and all five Forge gates remain identical. `scripts/sim.ts` is unchanged. All eight golden JSON files (59 vectors) are byte-identical to 0be805d; no golden changed.

The independent final review cleared preview isolation, unchanged defaults, compact controls, initialized Collapse/accessibility state, hook help and evidence prose. The full SCOUT PREVIEW · SIMULATED toolbar label resolves the seated truncation finding. Current README counts show 649, while the historical 642/38-commit/root-turn snapshot remains explicitly tied to 0be805d and 29 October 23:43 UTC. No deployment, real Twitch traffic or physical webcam test was performed.
