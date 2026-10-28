# Day 7 hygiene review

## Row 1: external audio

Vite now returns false from assetsInlineLimit for WAV files, preserving the default limit for other assets. The CSP is unchanged. The build audit rejects complete audio data URLs, and a real dist-demo build test also verifies the small vote-tick file is emitted and no built file contains an embedded audio URL. A negative audit fixture covers the original failure.

The unchanged MediaPipe loader includes a dynamic MIME-prefix helper, not an embedded audio URL. The audit deliberately requires a complete MIME/metadata/comma form to distinguish that code from actual inlined audio; the helper and real URLs have regression tests. Vendoring is unchanged.

Independent subagent review checked Vite fallback behavior, CSP preservation, negative coverage, actual build output and the complete-URL matcher. Focused audit/build tests pass. The full test, TypeScript and balance gates will run before the four hygiene commits are pushed.
