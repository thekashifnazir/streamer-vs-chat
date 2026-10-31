# Codex build evidence

Snapshot measured on Kash's Mac on **31 October 2026**, with entry `HEAD` at `74cc38d` (before the docs commit that records it). This is a dated snapshot, not a claim that later work has stopped. The earlier snapshots (29 October: 52/51 turns, 38 commits, 642 tests at `0be805d`; 31 October morning: 76/76 turns, 56 commits, 991 tests at `69eca5d`) stay in git history.

| Evidence | Count / identity |
|---|---|
| Main root thread | `01a17e04-f4f0-7d12-ac96-ff47bf3cc88f` |
| Root task-start / task-complete events | 77 / 77 |
| Completed root turns with tools / without tools | 54 / 23 (without tools includes usage-limit retries) |
| Codex plan | Plus; the weekly limit was about 94% used by the last Codex turn (13w, `3677761`) |
| Entry git commits through `74cc38d` | 74 = 57 code commits made in the Codex thread + 16 "fix (Claude Code)" + 1 "docs (Claude Code)" |
| Docs-only commits by Claude Code | 1 before this one, plus this one (messages start "docs (Claude Code)") |
| Passing offline tests at `74cc38d` | 1,029, from Claude's fresh-clone check; sim output identical to `0be805d`, no golden vector changes |
| Automated end-to-end suites at `74cc38d` | demo flows 8/8, hosted `/play` journey 9/9, responsive/a11y at 6 widths in Chromium and WebKit (Lighthouse accessibility 100 on `/` and `/play`); 10 bugs found and fixed |
| Scratch resume probe | `01a17fb6-76f6-78f2-9c20-e7926e5aba23`, working directory `/private/tmp/cx-resume-test` |
| Scratch resume probe | `01a17fb7-0a50-70b1-af8e-edcee261d14d`, working directory `/Users/kash/cx-resume-test` |

The scratch threads tested CLI resume behaviour, not entry code. The second contains the ONE, TWO and THREE reply probes. Subagent lanes are part of the main build's work; they are separate from those scratch probes.

One main Codex thread wrote the entry's code up to its last turn, 13w (`3677761`): 57 code commits. Kash directed and approved every brief; the briefs were drafted with Claude Code from his notes and queued into the thread with `codex exec resume`, and Claude Code checked each result in a fresh clone and deployed. Codex planned each task, split it into subagent lanes, made the design calls inside the brief and wrote the code. Devin wrote task prompts and reviewed results until 30 October. From 31 October Claude Code writes the Markdown docs, to save Codex budget for the site. From 31 October, after the Codex weekly limit, Claude Code also wrote 16 code fixes, each a separate commit whose message starts "fix (Claude Code)"; the README lists them under [Fixes made with Claude Code](../README.md#fixes-made-with-claude-code). Kash supplied the live Twitch, camera and physical playtest checks. Codex reviewed each commit with an independent subagent pass, except some late small turns where Claude's fresh-clone and browser checks replaced it to save budget.

The three end-to-end suites are scripts in the owner's scratch folders, outside this repository, so they are described rather than linked. Demo flows include a full best-of-3 played by a bot that reads the callouts, and the webcam path driven by a recorded clip of Kash as a fake camera. The hosted `/play` journey mocks Twitch OAuth, Helix, EventSub, WHIP and the Worker inside the browser, with zero off-origin requests.

## How the counts were measured

The root rollout is the matching `rollout-*-01a17e04-f4f0-7d12-ac96-ff47bf3cc88f.jsonl` under `~/.codex/sessions/`. Count `event_msg.payload.type` equal to `task_started` or `task_complete`. A completed turn with tools means the interval from its start through its completion contains at least one `response_item` whose payload type is `function_call` or `custom_tool_call`. This counts tasks that used tools; it does not claim every such turn changed code. Turns without tools are retained in the total instead of being presented as productive turns. At this snapshot started and completed are equal, so no task was active.

For commits, run:

```sh
git rev-list --count 74cc38d                                   # 74
git log --oneline 74cc38d | grep -c 'fix (Claude Code)'        # 16
git log --oneline 74cc38d | grep -c 'docs (Claude Code)'       # 1
git log --oneline 74cc38d | grep -vc '(Claude Code)'           # 57, the Codex thread's commits
```

Scratch identities and working directories were read from their rollout metadata. Only counts and identities are published here; transcript contents, credentials and private prompts are not copied into this repository. Later `npm test` results belong to the current queue's review document, while the test count above stays tied to its source commit.
