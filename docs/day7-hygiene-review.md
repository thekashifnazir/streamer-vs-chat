# Day 7 hygiene review

## Row 1: external audio

Vite now returns false from assetsInlineLimit for WAV files, preserving the default limit for other assets. The CSP is unchanged. The build audit rejects complete audio data URLs, and a real dist-demo build test also verifies the small vote-tick file is emitted and no built file contains an embedded audio URL. A negative audit fixture covers the original failure.

The unchanged MediaPipe loader includes a dynamic MIME-prefix helper, not an embedded audio URL. The audit deliberately requires a complete MIME/metadata/comma form to distinguish that code from actual inlined audio; the helper and real URLs have regression tests. Vendoring is unchanged.

Independent subagent review checked Vite fallback behavior, CSP preservation, negative coverage, actual build output and the complete-URL matcher. Focused audit/build tests pass. The full test, TypeScript and balance gates will run before the four hygiene commits are pushed.

## Row 3: complete asset credits

The generated inventory enumerates all 64 paths from git ls-files assets, with one row per path, including unused font variants, 2x atlases, metadata, notices and all voice files. The generator fails closed for unknown provenance; tests check exact inventory coverage and every original SFX source. The offline package now also retains the Bungee, Russo One and Inter OFL notices.

Independent subagent review checked the inventory and local provenance; root reviewed the generator and notice packaging. Coverage and real-build tests pass. Apache is retained because MediaPipe still uses it. Voice provenance is updated separately in row 6.

## Row 5: accurate review wording

README, agent instructions, prompts and historical reports now say independent subagent review. Removed unavailable-command fallback wording while retaining findings, counts and the Boss Forge qualification that root completed the final pass after the reviewer reached its limit. No external Devpost content was changed. A separate subagent reviewed this wording lane and verified no obsolete command references remain in tracked text.
