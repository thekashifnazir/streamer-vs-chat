# Codex build evidence

Snapshot measured on Kash's Mac on **29 October 2026 at 23:43 UTC**, with entry `HEAD` at `0be805d`. This is a dated snapshot, not a claim that later work has stopped.

| Evidence | Count / identity |
|---|---|
| Main root thread | `01a17e04-f4f0-7d12-ac96-ff47bf3cc88f` |
| Root task-start events | 52, including the active 13h task |
| Root task-complete events | 51 |
| Completed root turns with tools | 29 |
| Completed root turns without tools | 22, including usage-limit retries |
| Entry git commits through `0be805d` | 38 |
| Passing tests at `0be805d` | 642, from the final fresh-clone check in [the 13g review](queue13g-review.md) |
| Scratch resume probe | `01a17fb6-76f6-78f2-9c20-e7926e5aba23`, working directory `/private/tmp/cx-resume-test` |
| Scratch resume probe | `01a17fb7-0a50-70b1-af8e-edcee261d14d`, working directory `/Users/kash/cx-resume-test` |

The scratch threads tested CLI resume behavior, not entry code. The second contains the ONE, TWO and THREE reply probes. Subagent lanes remain part of the main build's work; they are separate from those scratch probes.

One main Codex thread wrote all entry code. Claude Code on Kash's Mac queued tasks into it with `codex exec resume`. Devin wrote task prompts and reviewed results. Kash supplied live Twitch, camera and physical playtest checks. The commit review process used independent subagent passes before each commit.

## How the counts were measured

The root rollout is the matching `rollout-*-01a17e04-f4f0-7d12-ac96-ff47bf3cc88f.jsonl` under `~/.codex/sessions/`. Count `event_msg.payload.type` equal to `task_started` or `task_complete`. A completed turn with tools means the interval from its start through its completion contains at least one `response_item` whose payload type is `function_call` or `custom_tool_call`. This counts tasks that used tools; it does not claim every such turn changed code. Turns without tools are retained in the total instead of being presented as productive turns. The active 13h task is excluded from completed totals.

For commits, run:

```sh
git rev-list --count 0be805d
```

Scratch identities and working directories were read from their rollout metadata. Only counts and identities are published here; transcript contents, credentials and private prompts are not copied into this repository. Later `npm test` results belong to the current queue's review document, while the 642 count above stays tied to its source commit.
