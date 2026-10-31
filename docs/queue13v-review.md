# Queue 13v — last page polish

31 October 2026. Small presentation pass; no engine, reducer, timing, damage,
classifier, balance or golden-vector changes. No deployment. The requested
subagent review was skipped; Claude reviews the built pages.

- Centred the offline hero in one column capped at 960 px.
- Kept one inline Options control, with an expanded state, and hid the redundant
  disclosure summary.
- Removed the stale practice instruction on both pages. Practice replaces the
  entire live voter heading with one wrapping VOTING STARTS AFTER PRACTICE label.
- Made pause Resume a full-width yellow primary target (56 px minimum); secondary
  exits retain 44 px targets.
- Set OBS instructions to 16 px. Both Mac and Windows source text already had
  single arrows; tests now prevent consecutive arrows. Advanced setup retains
  its 44 px minimum target.
- Narrow practice cards occupy the left 60% (maximum 260 px), leaving the boss
  side visible rather than covering the whole stage.

## Checks

- `npx vitest run`: 991 tests passed across 128 files.
- `npx tsc --noEmit`: passed.
- `npm run build:demo`: passed.
- `npm run sim`: passed all matrices and five Forge fixture gates (551.73 s).
  Completed output is byte-identical to the 0be805d reference: 3,652 bytes,
  SHA-256 `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`.
- No golden-vector changes relative to 0be805d; `git diff --check` passed.

DOM/CSS tests cover
centred layout constraints, the disclosure, practice text, pause targets, OBS
copy and narrow-card constraints. jsdom does not measure browser rectangles.
Actual 390 px / 1920 px and compact stream rendering remains Claude's browser
check; this pass does not claim a rendered measurement.
