# Queue 13k — hosted Forge

Shared design: twitchprep docs/codex-prompts/13i-hosted-stack.md. No reducer, timing, damage, balance, classifier or golden changes. No deployment; all hosted flags remain committed off.

## Decisions and implementation

- Exact first-generation/repair/moderation request builders are shared, alongside the Node-agnostic BossForge service and client types. Local server APIs re-export the shared service; the live HTTP adapter keeps its default behavior, with explicit manual-redirect mode for Workers. Model remains gpt-6-luna, reasoning low, store:false, max output 3000, strict BossDef schema.
- Only validated OAuth identity selects the channel. Hosted endpoints admit bounded data fields, never client model/prompt/schema. The Worker uses its configured secret and strips responses to fields the service consumes. Ideas/output/error bodies never enter logs or TTS.
- Durable channel counters cap initial generations at five and moderation calls at two hundred per UTC day; a global singleton caps initial generations at one hundred. One-use hash receipts tie repairs to the exact initial output/idea, with no raw text storage. Reserve before outbound paid I/O; failed/aborted attempts remain charged. If global reservation fails after channel reservation, that channel attempt remains spent (conservative, no overspend). Receipts expire at UTC rollover.
- Hosted browser service uses the existing Web Worker for deterministic gate/tune; it cannot move simulation into the edge proxy. Existing chat submission/endorsement/generate/veto rules and between-round acceptance remain authoritative. Daily caps surface safely on the existing Forge card. The no-login demo remains offline/prebaked.
- Credential decision follows the explicitly supplied Shared design: reuse only the configured Worker secret at deployment time. No local credential inspection, provisioning or real API call was performed; tests inject fakes.

## Independent review and checks

Independent subagent cross-review covered Worker authentication/strict schemas, fixed request construction, counter transactions, singleton global budget, one-use repairs, flags/secrets, manual redirects/timeouts, response projection and absence of edge simulation. Review found duplicate-output repair leases could share an identity after expiry; persisted reservation counters now make leases unique, with a stale-completion regression. Empty moderation strings remain allowed within the specified total/item limits. Projection strips unused response IDs/item metadata.

Browser review covered role-checked commands, protected names, unchanged shared service, Web Worker gate/tune only, phase/veto cancellation, queued acceptance, token/account pinning and offline isolation. A late 429 JSON account-switch race was fixed and tested; actual worker dispatch tests verify explicit gate vs unchanged default tune behavior. No outstanding findings remain.

Fresh clone on Node 22: npm ci passed; npm test **838/838** across 103 files; npx tsc --noEmit, npm run build:demo and npx wrangler deploy --dry-run passed. Binding regeneration was byte-identical. After a final presentation-only fix, the fresh clone reran tests/types/build/dry-run successfully: an idle Forge card with a first-idea daily-cap error now remains visible (actual DOM regression; empty idle remains hidden). Independent review cleared that fix. npm run sim completed with exit 0 in 519.97 seconds; all four production matrices, both scouting coverage gates, difficulty and all five Forge fixture gates passed. Complete stdout is byte-identical to the saved 0be805d baseline, SHA-256 `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`. No golden changes. git diff --check passed.

## Needs Claude / Kash

Claude provisions OPENAI_API_KEY as a Worker secret, enables only landed flags in the deploy worktree, builds with the public Twitch client ID and deploys. Kash checks actual chat submission/endorsement, moderator/broadcaster generation between rounds, repaired/accepted HUD, veto and next-round boss application. Confirm daily-cap messaging in the deployed environment. No live model availability, cost, camera or real-channel check is claimed here.

References: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna). Exact project request parity and deterministic gates remain the implementation oracle.
