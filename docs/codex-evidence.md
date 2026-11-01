# Codex build evidence

Snapshot measured on Kash's Mac on **1 November 2026**, with entry `main` at `ee1a6e2`, the live build (before the docs commits that record it). The Codex thread counts are unchanged since 31 October, because there were no Codex turns after 13w. The earlier snapshots (29 October: 52/51 turns, 38 commits, 642 tests at `0be805d`; 31 October morning: 76/76 turns, 56 commits, 991 tests at `69eca5d`; 31 October evening: 74 commits, 1,029 tests at `74cc38d`) stay in git history.

| Evidence | Count / identity |
|---|---|
| Main root thread | `01a17e04-f4f0-7d12-ac96-ff47bf3cc88f` |
| Root task-start / task-complete events | 77 / 77 (re-counted 1 November; the last task started 31 October, 13:43 UK) |
| Completed root turns with tools / without tools | 54 / 23 (without tools includes usage-limit retries) |
| Codex plan | ChatGPT Plus. Weekly limit about 94% used by the last Codex turn (13w, `3677761`, 31 October); **96% used, 4% left** on 1 November at 10:39 UK, resetting 5 November at 23:47, after the deadline ([screenshot](img/codex-limit-1nov.png)). No Codex turns after 13w |
| Entry git commits through `ee1a6e2` | 171 = 57 code commits made in the Codex thread + 57 "fix (Claude Code)" + 25 "feat (Claude Code)" + 16 "docs (Claude Code)" + 16 merges of Claude Code branches. Lines: [Codex vs Claude Code split](#codex-vs-claude-code-split) |
| Docs-only commits by Claude Code | 16 through `ee1a6e2`, plus the commits that record this snapshot (messages start "docs (Claude Code)") |
| Passing offline tests at `ee1a6e2` | 1,226 in 159 files (`npx vitest run`, Claude's clone); sim output identical to `0be805d`, no golden vector changes |
| Automated end-to-end checks, 1 November | local Playwright runs on the live build: 9 offline demo flows, 41 Crowd Trainer checks, all 9 steps of the mocked `/play` journey. Earlier, at `74cc38d`: responsive/a11y at 6 widths in Chromium and WebKit (Lighthouse accessibility 100 on `/` and `/play`); 10 bugs found and fixed |
| Scratch resume probe | `01a17fb6-76f6-78f2-9c20-e7926e5aba23`, working directory `/private/tmp/cx-resume-test` |
| Scratch resume probe | `01a17fb7-0a50-70b1-af8e-edcee261d14d`, working directory `/Users/kash/cx-resume-test` |

The scratch threads tested CLI resume behaviour, not entry code. The second contains the ONE, TWO and THREE reply probes. Subagent lanes are part of the main build's work; they are separate from those scratch probes.

One main Codex thread wrote the entry's code up to its last turn, 13w (`3677761`): 57 code commits. Kash directed and approved every brief; the briefs were drafted with Claude Code from their notes and queued into the thread with `codex exec resume`, and Claude Code checked each result in a fresh clone and deployed. Codex planned each task, split it into subagent lanes, made the design calls inside the brief and wrote the code. Devin wrote task prompts and reviewed results until 30 October. From 31 October Claude Code writes the Markdown docs, to save Codex budget for the site. From 31 October, with the Codex weekly limit used up and its reset after the deadline, Claude Code also writes code, each a separate commit whose message starts "fix (Claude Code)" or "feat (Claude Code)". On 31 October and overnight that was polish and bug fixes from live tests. On 1 November it was larger: the Crowd Trainer mode, recorded voice lines, a homepage redesign, the 5-step webcam setup and a new straight-punch detector, plus a voice corner coach that is switched off for the submission. The README lists these commits under [Finished with Claude Code](../README.md#finished-with-claude-code). Kash supplied the live Twitch, camera and physical playtest checks. Codex reviewed each commit with an independent subagent pass, except some late small turns where Claude's fresh-clone and browser checks replaced it to save budget.

The end-to-end checks are local Playwright scripts in the owner's scratch folders, outside this repository, so they are described rather than linked. Demo flows include a full best-of-3 played by a bot that reads the callouts, and the webcam path driven by a recorded clip of Kash as a fake camera. The hosted `/play` journey mocks Twitch OAuth, Helix, EventSub, WHIP and the Worker inside the browser, with zero off-origin requests.

## How the counts were measured

The root rollout is the matching `rollout-*-01a17e04-f4f0-7d12-ac96-ff47bf3cc88f.jsonl` under `~/.codex/sessions/`. Count `event_msg.payload.type` equal to `task_started` or `task_complete`. A completed turn with tools means the interval from its start through its completion contains at least one `response_item` whose payload type is `function_call` or `custom_tool_call`. This counts tasks that used tools; it does not claim every such turn changed code. Turns without tools are retained in the total instead of being presented as productive turns. At this snapshot started and completed are equal, so no task was active.

For commits, run:

```sh
git rev-list --count ee1a6e2                                          # 171
git rev-list --count --merges ee1a6e2                                 # 16
git log --oneline ee1a6e2 | grep -c 'fix (Claude Code)'               # 57
git log --oneline ee1a6e2 | grep -c 'feat (Claude Code)'              # 25
git log --oneline ee1a6e2 | grep -c 'docs (Claude Code)'              # 16
git log --oneline --no-merges ee1a6e2 | grep -vc '(Claude Code)'      # 57, the Codex thread's commits
```

Scratch identities and working directories were read from their rollout metadata. Only counts and identities are published here; transcript contents, credentials and private prompts are not copied into this repository. Later `npm test` results belong to the current queue's review document, while the test count above stays tied to its source commit.

## Usage limits and continues

The entry was built on ChatGPT Plus, so the build ran into Codex usage limits often. Kash kept the work in the one Codex thread: early turns used credits left from a previous OpenAI hackathon, and after each limit a short continue (some scheduled) resumed the same task. Times are UK. Sources: the prep repo's handoff log (`state/HANDOFF.md`, not part of this repo) for the limit events, and this repo's git log for commit times (**MEASURED**).

| When (UK) | What happened | Commit |
|---|---|---|
| Wed 28 Oct, 03:10–06:41 | Viewer memory: Codex sat at a usage limit for about 3.5 hours; a later retry ran | `9417af9`, `d6e2096` (06:47–07:11) |
| Wed 28 Oct, 07:38–12:09 | Boss Forge: at the usage limit again; a later retry ran | `6272440` (12:19) |
| Thu 29 Oct, afternoon | 13g-1 commands and hit feedback: the first send hit the limit; a 30-minute retry got through at 17:35 | `e76b693` (17:44) |
| Thu 29 Oct, 18:40–22:11 | 13g-2 SUPER and FOCUS/FINISHER: repeated retries each hit the limit; Kash's resume message at 22:39 finished it | `0be805d` (23:04) |
| Fri 30 Oct, overnight | 13i Worker fix: the continue turn hit the limit (reset 04:47); after the reset Codex landed four commits | `cd8938f` (04:49), `bfc54cc`, `f722ac8`, `9d8b286` |
| Fri 30 Oct, 14:52 | 13m `/play` onboarding: hit the limit once; a scheduled short continue finished it | `c7e3749` (14:52) |
| Fri 30 Oct, 18:54 → 19:53 | 13n page polish: hit the limit at 18:54 with the work nearly done but uncommitted (reset 19:52); a short continue at 19:53 committed it | `f4bb6df` (19:54) |
| Sat 31 Oct, 00:58 | 13q judge-ready fixes: pushed after two usage-limit stops | `cce440d` |
| Sat 31 Oct, morning | Weekly budget 84% used before 13s (resets Thu 5 Nov) | `5aff6f4` (13s, 11:54) |
| Sat 31 Oct, afternoon | Weekly budget 92% used before 13v | `69eca5d` (13v, 13:05) |
| Sat 31 Oct, 13:55 | 13w, the last Codex turn; weekly limit about 94% used. Claude Code takes over code fixes to meet the deadline | `3677761` |
| Sun 1 Nov, 10:39 | Usage panel: 4% left, weekly, resets 5 Nov at 23:47 ([screenshot](img/codex-limit-1nov.png)) | none |
| Sun 1 Nov, all day | No Codex turns. Claude Code lands 52 code commits: Crowd Trainer, recorded voice lines, homepage redesign, webcam setup and punch detection, `/play` and results polish | up to `ee1a6e2` (19:48) |

### Plan usage page (Kash's screenshots, 1 Nov)

Read from screenshots of Kash's ChatGPT plan usage page, taken on 1 November (**MEASURED**, account-wide: the page covers all of Kash's Codex and agent work on the account, not only this entry).

| What the page shows | Value |
|---|---|
| Usage limit resets used (past 30 days) | 25 Oct 22:34 and 29 Oct 23:47 (UK), during the build; 1 reset left. Two earlier resets (30 Sep, 5 Oct) were before the Submission Period |
| Credit usage rows, 26–28 Oct | 26 Oct: 112 + 266 · 27 Oct: 48 + 234 + 295 + 1 · 28 Oct: 703. That is 1,659 credits in the rows shown |
| Messages, 7 days to 31 Oct | 209, on gpt-6.1-sol, gpt-5.6-luna and gpt-6-luna |
| Share of plan usage, 26 Oct – 1 Nov | Chats 52.6%, subagents 47.4% |
| Tool activity, 24–30 Oct | 74 plugin calls (Computer Use, Unified Computer Use, Codex App Tools); 2 skills (Cloudflare One, OpenAI Platform API key) |

So on top of the weekly limit, the build spent both limit resets that fell inside the Submission Period, plus bought credits, before Claude Code took over on 31 October.

## Codex vs Claude Code split

**MEASURED** at `ee1a6e2` (1 November 2026, 19:48 UK), the build live on the night of 1 November. The README table shows the same numbers. To regenerate later, replace `ee1a6e2` with `HEAD`.

"Codex" = every commit up to and including `3677761` whose message does not contain "(Claude Code)". "Claude Code" = commits after `3677761` whose message contains "(Claude Code)": "fix" and "feat" commits change code; "docs" commits change only Markdown and images, so they add no source lines. Merge commits add no lines of their own. Source = the folders `capture demo overlay scripts server shared test worker`; Markdown docs, images and assets outside those folders (including the recorded voice bank's audio and its manifests) are not counted. Tests are files under `test/` or named `*.test.ts`. Binary files (one pose model) are skipped. Run in bash (zsh does not split the folder list the same way).

```sh
SPLIT='$1!="-" && NF==3 {t=($3~/^test\//||$3~/\.test\.ts$/)?"tests":"app"; a[t]+=$1; d[t]+=$2} END {for (t in a) print t, "+" a[t], "-" d[t]}'
SRC="capture demo overlay scripts server shared test worker"
git log --oneline 3677761 | grep -vc '(Claude Code)'                                  # Codex code commits: 57
git log --oneline 3677761..ee1a6e2 | grep -c 'fix (Claude Code)'                       # 57
git log --oneline 3677761..ee1a6e2 | grep -c 'feat (Claude Code)'                      # 25
git log --oneline 3677761..ee1a6e2 | grep -c 'docs (Claude Code)'                      # 15 (16 in all, one before 13w)
git log --numstat --format= --invert-grep --grep='(Claude Code)' 3677761 -- $SRC | awk -F'\t' "$SPLIT"
git log --numstat --format= --grep='(Claude Code)' 3677761..ee1a6e2 -- $SRC | awk -F'\t' "$SPLIT"
git log --numstat --format= --grep='(Claude Code)' 3dfc4df..ee1a6e2 -- $SRC | awk -F'\t' "$SPLIT"   # 1 November only
```

| | Codex | Claude Code |
|---|---|---|
| Code commits | 57 | 82 (57 "fix", 25 "feat") |
| App lines added / removed | 10,187 / 2,021 | 3,039 / 497 |
| Test and fixture lines added / removed | 11,211 / 360 | 2,421 / 206 |
| All source lines added / removed | 21,398 / 2,381 | 5,460 / 703 |
| Share of source lines added | 79.7% | 20.3% |

How the Claude Code share grew. At `3dfc4df` (early 1 November) it was 30 fixes and 1,194 source lines added (5.3%). The 52 code commits after `3dfc4df`, all on 1 November, added 4,266 lines and removed 532: app 2,645 / 397, tests 1,621 / 135. By group (source lines added): Crowd Trainer 8 commits, 1,045 · recorded voice lines 3, 804 · homepage redesign and demo extras 7, 664 · voice corner coach (switched off) 10, 567 · webcam setup and punch detection 5, 450 · saved preferences 4, 274 · fight and results polish 8, 266 · `/play` journey and clips 7, 196. The README lists each commit.

Lines added count edits as well as new code, so this is a size measure, not a value judgement.

## In Kash's words

Kash approved this paragraph for the Devpost page on 31 October (the numbers in it are from that day):

> All of this was built on a Plus plan, and in the first iterations we burned through a load of credits I had from a previous OpenAI hackathon, and after that we used the weekly reset. There's only so much I'm able to do on a Plus account, so we tried to do as much as we can in Codex: 77 turns and 57 code commits in one thread.
>
> Near the end we had to be realistic if we wanted to get this finished. We were having to iterate quite a bit to fix problems that we kept seeing coming up in live tests, and so when the weekly limit ran out we finished it off with Claude Code (the last 16 fixes, listed below). Ideally I would have had a Pro Codex account to do this, and from doing this hackathon that's now something I want, because I really enjoyed working with Codex.
