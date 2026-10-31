# Codex build evidence

Snapshot measured on Kash's Mac on **31 October 2026**, with entry `HEAD` at `69eca5d` (before the docs commit that records it). This is a dated snapshot, not a claim that later work has stopped. The earlier 29 October snapshot (52/51 turns, 38 commits, 642 tests at `0be805d`) stays in git history.

| Evidence | Count / identity |
|---|---|
| Main root thread | `01a17e04-f4f0-7d12-ac96-ff47bf3cc88f` |
| Root task-start / task-complete events | 76 / 76 |
| Completed root turns with tools / without tools | 53 / 23 (without tools includes usage-limit retries) |
| Entry git commits through `69eca5d` | 56, all made in the Codex thread |
| Docs-only commits by Claude Code | 1 (this one) (from 31 October; messages start "docs (Claude Code)") |
| Passing offline tests at `69eca5d` | 991, from Claude's fresh-clone check |
| Scratch resume probe | `01a17fb6-76f6-78f2-9c20-e7926e5aba23`, working directory `/private/tmp/cx-resume-test` |
| Scratch resume probe | `01a17fb7-0a50-70b1-af8e-edcee261d14d`, working directory `/Users/kash/cx-resume-test` |

The scratch threads tested CLI resume behaviour, not entry code. The second contains the ONE, TWO and THREE reply probes. Subagent lanes are part of the main build's work; they are separate from those scratch probes.

One main Codex thread wrote all entry code. Claude Code on Kash's Mac wrote task briefs, queued them into it with `codex exec resume`, checked each result in a fresh clone and deployed. Devin wrote task prompts and reviewed results until 30 October. From 31 October Claude Code writes the Markdown docs, to save Codex budget for the site. Kash supplied the live Twitch, camera and physical playtest checks. Codex reviewed each commit with an independent subagent pass, except some late small turns where Claude's fresh-clone and browser checks replaced it to save budget.

## How the counts were measured

The root rollout is the matching `rollout-*-01a17e04-f4f0-7d12-ac96-ff47bf3cc88f.jsonl` under `~/.codex/sessions/`. Count `event_msg.payload.type` equal to `task_started` or `task_complete`. A completed turn with tools means the interval from its start through its completion contains at least one `response_item` whose payload type is `function_call` or `custom_tool_call`. This counts tasks that used tools; it does not claim every such turn changed code. Turns without tools are retained in the total instead of being presented as productive turns. The active 13h task is excluded from completed totals.

For commits, run:

```sh
git rev-list --count 69eca5d
```

Scratch identities and working directories were read from their rollout metadata. Only counts and identities are published here; transcript contents, credentials and private prompts are not copied into this repository. Later `npm test` results belong to the current queue's review document, while the test count above stays tied to its source commit.
