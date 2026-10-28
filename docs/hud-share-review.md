# Scouting share glyph overlap review

The 150 px standing / 120 px seated percentage column was narrower than the widest 100% glyph run. Claude measured that run at 181 px with 76 px Anton. The percentage now occupies its own grid row with intrinsic max-content width and 8 px right ink allowance. Evidence follows on another row and wraps as needed. Its existing font sizes are preserved.

The seated scouting reservation grows from 300 to 340 px to accommodate the wrapped evidence and vote hint. Its content still ends before the separately reserved footer; SIMULATED remains protected. Every changed selector excludes .memory-on, and Forge selectors are unchanged.

The layout regression derives the actual standing/seated font sizes and card heights from CSS, checks the supplied widest-glyph measurement with proportional 1080p/720p scaling, asserts the single-column/intrinsic-width structure, and budgets wrapped vertical content plus footer separation. This is an analytical layout assertion using Claude's real glyph measurement, not a claim that a new browser render was measured here.

Independent subagent review found no blocking issues. Its suggestion to derive seated declarations from CSS and account conservatively for wrap spacing was applied; focused layout tests pass. /review is unavailable, so this independent pass uses the AGENTS.md fallback.

Verification: full Node 22 suite passes 500/500 tests and TypeScript passes. The complete npm run sim passes all four ordinary/coordinated R1/R2 matrices, scouting/brace coverage and all four boss fixture gates, with unchanged production results (casual 48.5-65.6%, no-punch 35.9-53.1%). No deployment performed.
