# Queue 13: viewer memory and judge cold-start cleanup

## Part 1: spacing

README and eleven top-level docs now separate words, ports, counts and units. Independent subagent review compared each changed file after removing whitespace: every non-whitespace character is unchanged. Code, URLs, paths, dimensions, technical tokens and game numbers retain their meaning. No teardown change was needed; 071ce4b already fixes the cold-clone failure.

The requested separate documentation commit follows independent subagent review. Node 22 tests and TypeScript pass in the current tree, and all four unchanged SPEC §5 balance matrices pass. Feature work is committed separately.

## Part 2: choices and implementation

Viewer memory is an observer of accepted input and authoritative round/damage evidence. No changes were made to the combat reducer, pose classifier, §1–§4 rules, balance models or thresholds. Tests assert observing state does not mutate it. SPEC §7 now includes tests 19–22 and §11 records the display/stat semantics.

Storage is per channel in `data/viewers.json`, indexed by immutable Twitch IDs. Atomic temp-file/rename writes are serialized, owner-only, and flushed at round end, explicit session finalization and shutdown. Startup validates an allowlist, removes records older than 90 days and atomically saves the pruned result. Invalid storage fails closed rather than silently discarding opt-out tombstones. No message text is retained. Simulated/booth adapters do not read or write the file; per-message source guards also protect live-mode observation.

A viewer's stream counts once per server session with an accepted in-fight vote. Vote statistics count participation once per viewer per beat; replacing the vote refreshes last-vote activity without inflating that count. Deduplication holds only the current beat's identities. Channel streams count sessions with a completed round; KO record totals exclude timeouts. Favourite move means the viewer's most frequent credited KO move, ties in the existing move order. This uses the requested KO-by-move map without adding text or a second gameplay rule.

KO credit follows the lethal actual-damage entry and its selected attack. This covers a COMBO KO on its first hit without requiring the second hit and excludes votes for a no-triple-replaced move. Stream MVP follows the existing cumulative actual-damage credit. Explicit End session or shutdown seals it once for that server session; ordinary end cards preview the streak. Reopening cards/new matches cannot add another award, and a different later leader cannot inherit a sealed winner's streak. Idle login/demo visits do not break a streak.

`!forgetme` deletes immediately in memory, persists the permanent per-channel opt-out ID, then puts one generic acknowledgement in the existing shared 10-second queue. Repeats do not fill the queue, failed writes do not claim success, and delayed acknowledgements cannot cross channel changes. Public MVP identity is hidden for an opted-out winner. Channel rebinding is serialized; old listeners, viewer-count polls and highlight/replay IDs cannot leak into a replacement channel.

Memory occupies the Rails only: compact record/Hall on the left; active nemesis on the right; existing telegraph gets a historical favourite-move tag. Long display names use text nodes and ellipsis/title, never HTML. The existing generic instruction panel yields space to memory; streamer weakness remains visible. Decorative boss art yields while a nemesis card is present. The 36 px HUD floor and 40 px scouting evidence stay enforced. The reduced layout is also used in seated mode; centre placement is unchanged.

The offline demo opens a separate simulated-only IndexedDB database and atomically seeds three fictional prior streams once. Delayed hydration replays early accepted observations; unavailable/corrupt storage falls back to the same immediate in-memory fiction without overwriting it. Current-match cursors stay bounded across restarts. The hosted `/play` path and live-credential guard never open this store; its counts-only metrics contract is unchanged. All offline history is badged SIMULATED.

## Review and verification

Independent subagent review covered storage/tombstones/retention, lethal-hit attribution, rate-limited acknowledgement, MVP finalization, channel rebinding, source isolation, IndexedDB lifecycle and HUD presentation. Findings fixed before commit included idle-demo streak erasure, first-hit COMBO credit, all-beat dedup growth, stale/overlapping channel callbacks, delayed acknowledgement routing, cross-channel replay IDs paint after disposal and a demo end-card/session-MVP mismatch.

- Node 22 unit/integration tests include acceptance 19–22 with real temporary JSON files and fake chat; no real Twitch traffic.
- All four SPEC §5 balance matrices pass with exactly the prior seed-2026 results: casual 48.5–65.6%, no-punch 35.9–53.1%. Scouting and brace coverage gates also pass.
- The actual isolated CLI/shim/server recovery rehearsal passes with the new server wiring: authoritative reload 19.3 ms, pending attack/accepted vote preserved, subscription recovery and new injected chat observed; zero unhandled errors.
- Final local Node 22 verification: **442/442 tests** across 64 files, TypeScript, diff checks and the offline build pass. The static bundle is 25.2 MB raw / 15.2 MB gzip; runtime model/WASM vendoring is unchanged.

## Needs Kash

- Inspect the standing/seated Rails at 1920×1080 and 720p in Chrome/OBS, including simultaneous scouting, four Hall entries and an active nemesis. Computer Use denied access to Chrome ("not approved to use Google Chrome"); automated presentation/font checks and CSS budget review are not a rendered visual check.
- Optional live check: returning viewer identity/name refresh and a viewer-originated `!forgetme` acknowledgement. All development verification used local/fake inputs; no scripted chat was sent to a live channel.
- No deployment was performed; Claude deploys.
