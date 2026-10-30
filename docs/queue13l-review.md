# Queue 13l — opt-in hosted viewer memory

Date: 30 October 2026. No deployment; all hosted flags remain off.

## Implementation and choices

- Extracted storage-agnostic lifecycle and runtime checkpoints around the existing shared viewer-memory domain. Local `server/memory.ts` still writes version-1 JSON through owner-only atomic temp/rename; unchanged local tests cover its behavior.
- ChannelHub uses SQLite state and retry-dedup tables. Domain records, permanent opt-outs and runtime checkpoints commit together; `storage.sync()` finishes before a forget acknowledgement can be queued. Native SQL avoids the KV value-size limit for larger channel records.
- Retention runs on load. Runtime checkpoints contain IDs/timestamps/sets only and prune inactive sessions; no chat bodies are stored. Exact lethal ledger entries determine KO supporters, including interrupted COMBO attacks. MVP finalizes once per page session.
- Authenticated token identity selects the channel. Strict event/query allowlists reject submitted channels, text, source tags and malformed identities. Hosted memory is independent of bot enablement: durable forget receives a fixed bot-queue acknowledgement when available, otherwise the browser shows confirmation.
- The hosted toggle is unchecked by default. Only explicit consent starts event/snapshot requests. Browser batches are bounded, ordered and retry dedup-safe; unchecking aborts pending requests and stops collection. Counts-only metrics stay separate. The no-login demo keeps its fictional IndexedDB store and never calls memory APIs.
- Errors do not change gameplay. No reducer, classifier, timing, damage, sim model or golden-vector changes.

## Independent subagent review

- `memory_shared` reviewed Worker persistence, routes and protocol: atomicity, durability before acknowledgement, retention/tombstones, retry dedup and authenticated channel isolation. A malformed-envelope fail-open issue was corrected and rechecked. All 63 focused Worker tests passed.
- `memory_worker` reviewed shared/file extraction and browser integration. Corrected lost failed batches, post-End-session collection, forgotten identity redaction after unchecking and partial-supporter overcredit. Final re-review confirmed account-pinned consent/requests, ignored stale account replies, immediate disconnect safety and non-blocking counts export. A full queue now admits forget requests ahead of replaceable telemetry. All 32 focused browser/shared/Worker memory tests passed in that review. Documentation was independently checked as well. A final privacy check also identified that a failed/backoff forget could be followed by a stale snapshot; snapshots now wait for queued events to clear so a forgotten-name preview cannot reappear before durable deletion. Opted-out votes now bypass dedup storage too; forgetting deletes historical per-user dedup rows in the same transaction, leaving only the permanent opt-out ID. `memory_shared` independently reviewed that amendment and re-ran all 65 Worker-focused tests successfully.
- All tests use fakes/local storage; no live Twitch or OpenAI requests.

## Verification

Fresh clone: `/private/tmp/queue13l-fresh-jcbzwrp9/repo`, clean `npm ci`, Node 22. Final observer/privacy changes were copied into that clone and all non-sim checks re-run there; no dependency files changed.

| Check | Result |
| --- | --- |
| `npm test` | 875/875 across 107 files, exit 0 |
| `npx tsc --noEmit` | Pass |
| `npm run build:demo` | Pass |
| `npx wrangler deploy --dry-run` | Pass; no deployment |
| `npm run types:worker` | Pass; generated bindings unchanged |
| `npm run sim` | Pass, exit 0; output byte-identical to 0be805d baseline (645.69 s) |

Sim SHA-256: `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`. All four production matrices, difficulty matrix and five Forge fixture gates pass unchanged.

All checked TypeScript/config files match the final working candidate. Reducer, simulation source, golden vectors and committed flags are unchanged. SQLite tests use Node's local in-memory database; the experimental Node SQLite warning is expected and does not affect the exit status.

## Needs Kash / Claude

After Claude provisions/enables hosted memory and deploys: use a consenting real channel to check unchecked/no requests, opt-in Rails memory, durable `!forgetme` acknowledgement with bot on/off, reload retention and session MVP. No real-channel or physical-camera verification is claimed here.
