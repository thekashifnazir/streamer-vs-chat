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

## Row 6: selected Rex Thunder takes

Updated the prep repository (already current at 84ece4eb543fed649d1dab3f933aabbff0ab420d), then copied its 14 selected Rex WAVs over the same 14 destination names. Root and independent subagent review each SHA-256 compared every destination to the prep source; all match byte-for-byte. Source QC metadata records all 42 Rex takes passing. No generation request, credential or runtime audio-code change was involved.

Voice README now identifies ElevenLabs, eleven_v3, Rex Thunder - Deep N Tough and voice ID mtrellq69YZsNwzUSyXh, with the requested paid Creator-plan credit and frame-count durations. The CREDITS introduction and generated voice rows use that exact credit. SOUNDS now points to the chosen Rex source and current timing rather than the previous takes. MediaPipe's Apache notice remains.

A WAV regression checks the exact 14-name set, PCM16 mono 44.1 kHz format and hands-up duration below the shared 800 ms telegraph. Measured hands-up duration is 599.931972789 ms. Independent subagent review cleared bytes, provenance, credit wording and timing.

## Final gates

Node 22.23.4 full suite: **506/506 tests**, including goldens, exact asset inventory coverage, actual dist-demo audio audit and the new WAV timing check. TypeScript and whitespace checks pass. No deployment performed.

The complete balance run passes all four ordinary/coordinated R1/R2 matrices, scouting/brace coverage and all four boss fixtures. Production results are unchanged: casual 48.5-65.6%, no-punch 35.9-53.1%.
