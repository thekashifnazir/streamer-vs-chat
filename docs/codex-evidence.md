# Codex build evidence

Snapshot measured on Kash's Mac on **2 November 2026**, with entry `main` at `8c99b7e`, the build deployed on 2 November (before the docs commits that record it). The Codex thread counts are unchanged since 31 October, because there were no Codex turns after 13w. The earlier snapshots (29 October: 52/51 turns, 38 commits, 642 tests at `0be805d`; 31 October morning: 76/76 turns, 56 commits, 991 tests at `69eca5d`; 31 October evening: 74 commits, 1,029 tests at `74cc38d`; 1 November: 171 commits, 1,226 tests, 79.7% / 20.3% split at `ee1a6e2`) stay in git history.

| Evidence | Count / identity |
|---|---|
| Main root thread | `01a17e04-f4f0-7d12-ac96-ff47bf3cc88f` |
| Root task-start / task-complete events | 77 / 77 (re-counted 1 November; the last task started 31 October, 13:43 UK) |
| Completed root turns with tools / without tools | 54 / 23 (without tools includes usage-limit retries) |
| Codex plan | ChatGPT Plus. Weekly limit about 94% used by the last Codex turn (13w, `3677761`, 31 October); **96% used, 4% left** on 1 November at 10:39 UK, resetting 5 November at 23:47, after the deadline ([screenshot](img/codex-limit-1nov.png)). No Codex turns after 13w |
| Entry git commits through `8c99b7e` | 201 = 57 code commits made in the Codex thread + 69 "fix (Claude Code)" + 35 "feat (Claude Code)" + 21 "docs (Claude Code)" + 19 merges of Claude Code branches. Lines: [Codex vs Claude Code split](#codex-vs-claude-code-split) |
| Docs-only commits by Claude Code | 21 through `8c99b7e`, plus the commits that record this snapshot (messages start "docs (Claude Code)") |
| Passing offline tests at `8c99b7e` | 1,281 in 169 files (`npx vitest run`, Claude's clone); sim output identical to `0be805d`, no golden vector changes |
| Automated end-to-end checks, 1 November | local Playwright runs on the live build: 9 offline demo flows, 41 Crowd Trainer checks, all 9 steps of the mocked `/play` journey. Earlier, at `74cc38d`: responsive/a11y at 6 widths in Chromium and WebKit (Lighthouse accessibility 100 on `/` and `/play`); 10 bugs found and fixed |
| Scratch resume probe | `01a17fb6-76f6-78f2-9c20-e7926e5aba23`, working directory `/private/tmp/cx-resume-test` |
| Scratch resume probe | `01a17fb7-0a50-70b1-af8e-edcee261d14d`, working directory `/Users/kash/cx-resume-test` |

The scratch threads tested CLI resume behaviour, not entry code. The second contains the ONE, TWO and THREE reply probes. Subagent lanes are part of the main build's work; they are separate from those scratch probes.

One main Codex thread wrote the entry's code up to its last turn, 13w (`3677761`): 57 code commits. Kash directed and approved every brief; the briefs were drafted with Claude Code from their notes and queued into the thread with `codex exec resume`, and Claude Code checked each result in a fresh clone and deployed. Codex planned each task, split it into subagent lanes, made the design calls inside the brief and wrote the code. Devin wrote task prompts and reviewed results until 30 October. From 31 October Claude Code writes the Markdown docs, to save Codex budget for the site. From 31 October, with the Codex weekly limit used up and its reset after the deadline, Claude Code also writes code, each a separate commit whose message starts "fix (Claude Code)" or "feat (Claude Code)". On 31 October and overnight that was polish and bug fixes from live tests. On 1 November it was larger: the Crowd Trainer mode, recorded voice lines, a homepage redesign, the 5-step webcam setup and a new straight-punch detector, plus a voice corner coach that is switched off for the submission. The README lists these commits under [Claude Code commits](#claude-code-commits). Kash supplied the live Twitch, camera and physical playtest checks. Codex reviewed each commit with an independent subagent pass, except some late small turns where Claude's fresh-clone and browser checks replaced it to save budget.

The end-to-end checks are local Playwright scripts in the owner's scratch folders, outside this repository, so they are described rather than linked. Demo flows include a full best-of-3 played by a bot that reads the callouts, and the webcam path driven by a recorded clip of Kash as a fake camera. The hosted `/play` journey mocks Twitch OAuth, Helix, EventSub, WHIP and the Worker inside the browser, with zero off-origin requests.

## How the counts were measured

The root rollout is the matching `rollout-*-01a17e04-f4f0-7d12-ac96-ff47bf3cc88f.jsonl` under `~/.codex/sessions/`. Count `event_msg.payload.type` equal to `task_started` or `task_complete`. A completed turn with tools means the interval from its start through its completion contains at least one `response_item` whose payload type is `function_call` or `custom_tool_call`. This counts tasks that used tools; it does not claim every such turn changed code. Turns without tools are retained in the total instead of being presented as productive turns. At this snapshot started and completed are equal, so no task was active.

For commits, run:

```sh
git rev-list --count 8c99b7e                                          # 201
git rev-list --count --merges 8c99b7e                                 # 19
git log --oneline 8c99b7e | grep -c 'fix (Claude Code)'               # 69
git log --oneline 8c99b7e | grep -c 'feat (Claude Code)'              # 35
git log --oneline 8c99b7e | grep -c 'docs (Claude Code)'              # 21
git log --oneline --no-merges 8c99b7e | grep -vc '(Claude Code)'      # 57, the Codex thread's commits
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
| Sun 1 Nov night to Mon 2 Nov | No Codex turns. Claude Code lands 22 code commits from Kash's live tests: fight-screen lanes and hit feedback, the punch lab and punch fixes, `/play` setup, the chat bot fix and Boss Forge announcements | up to `8c99b7e` (2 Nov, 14:25) |

### Plan usage page (Kash's screenshots, 1 Nov)

Read from screenshots of Kash's ChatGPT plan usage page, taken on 1 November (**MEASURED**, account-wide: the page covers all of Kash's Codex and agent work on the account, not only this entry).

| What the page shows | Value |
|---|---|
| Usage limit resets used (past 30 days) | 25 Oct 22:34 and 29 Oct 23:47 (UK), during the build; 1 reset left. Two earlier resets (30 Sep, 5 Oct) were before the Submission Period |
| Credit usage rows, 26–28 Oct | 26 Oct: 112 + 266 · 27 Oct: 48 + 234 + 295 + 1 · 28 Oct: 703. That is 1,659 credits in the rows shown |
| Messages, 7 days to 31 Oct | 209, on gpt-6.1-sol, gpt-5.6-luna and gpt-6-luna |
| Share of plan usage, 26 Oct – 1 Nov | Chats 52.6%, subagents 47.4% |
| Tool activity, 24–30 Oct | 74 plugin calls (Computer Use, Unified Computer Use, Codex App Tools); 2 skills (Cloudflare One, OpenAI Platform API key) |

So on top of the weekly limit, the build spent both limit resets that fell inside the Submission Period, plus the extra credits (left from a previous OpenAI hackathon, in Kash's words), before Claude Code took over on 31 October.

## Codex vs Claude Code split

**MEASURED** at `8c99b7e` (2 November 2026, 14:25 UK), the build deployed that afternoon; later commits are not counted. The README table shows the same numbers. To regenerate later, replace `8c99b7e` with `HEAD`.

"Codex" = every commit up to and including `3677761` whose message does not contain "(Claude Code)". "Claude Code" = commits after `3677761` whose message contains "(Claude Code)": "fix" and "feat" commits change code; "docs" commits change only Markdown and images, so they add no source lines. Merge commits add no lines of their own. Source = the folders `capture demo overlay scripts server shared test worker`; Markdown docs, images and assets outside those folders (including the recorded voice bank's audio and its manifests) are not counted. Tests are files under `test/` or named `*.test.ts`. Binary files (one pose model) are skipped. Run in bash (zsh does not split the folder list the same way).

```sh
SPLIT='$1!="-" && NF==3 {t=($3~/^test\//||$3~/\.test\.ts$/)?"tests":"app"; a[t]+=$1; d[t]+=$2} END {for (t in a) print t, "+" a[t], "-" d[t]}'
SRC="capture demo overlay scripts server shared test worker"
git log --oneline 3677761 | grep -vc '(Claude Code)'                                  # Codex code commits: 57
git log --oneline 3677761..8c99b7e | grep -c 'fix (Claude Code)'                       # 69
git log --oneline 3677761..8c99b7e | grep -c 'feat (Claude Code)'                      # 35
git log --oneline 3677761..8c99b7e | grep -c 'docs (Claude Code)'                      # 20 (21 in all, one before 13w)
git log --numstat --format= --invert-grep --grep='(Claude Code)' 3677761 -- $SRC | awk -F'\t' "$SPLIT"
git log --numstat --format= --grep='(Claude Code)' 3677761..8c99b7e -- $SRC | awk -F'\t' "$SPLIT"
git log --numstat --format= --grep='(Claude Code)' 3dfc4df..ee1a6e2 -- $SRC | awk -F'\t' "$SPLIT"   # 1 November up to ee1a6e2
git log --numstat --format= --grep='(Claude Code)' ee1a6e2..8c99b7e -- $SRC | awk -F'\t' "$SPLIT"   # 1 November night to 2 November
```

| | Codex | Claude Code |
|---|---|---|
| Code commits | 57 | 104 (69 "fix", 35 "feat") |
| App lines added / removed | 10,187 / 2,021 | 4,093 / 647 |
| Test and fixture lines added / removed | 11,211 / 360 | 3,052 / 256 |
| All source lines added / removed | 21,398 / 2,381 | 7,145 / 903 |
| Share of source lines added | 75.0% | 25.0% |

How the Claude Code share grew. At `3dfc4df` (early 1 November) it was 30 fixes and 1,194 source lines added (5.3%). The 52 code commits after `3dfc4df`, all on 1 November, added 4,266 lines and removed 532: app 2,645 / 397, tests 1,621 / 135. By group (source lines added): Crowd Trainer 8 commits, 1,045 · recorded voice lines 3, 804 · homepage redesign and demo extras 7, 664 · voice corner coach (switched off) 10, 567 · webcam setup and punch detection 5, 450 · saved preferences 4, 274 · fight and results polish 8, 266 · `/play` journey and clips 7, 196. The README lists each commit. The 22 code commits after `ee1a6e2` (1 November night to 2 November) added 1,685 lines and removed 200: app 1,054 / 150, tests 631 / 50.

Lines added count edits as well as new code, so this is a size measure, not a value judgement.

## In Kash's words

Kash approved this paragraph for the Devpost page on 31 October (the numbers in it are from that day):

> All of this was built on a Plus plan, and in the first iterations we burned through a load of credits I had from a previous OpenAI hackathon, and after that we used the weekly reset. There's only so much I'm able to do on a Plus account, so we tried to do as much as we can in Codex: 77 turns and 57 code commits in one thread.
>
> Near the end we had to be realistic if we wanted to get this finished. We were having to iterate quite a bit to fix problems that we kept seeing coming up in live tests, and so when the weekly limit ran out we finished it off with Claude Code (the last 16 fixes, listed below). Ideally I would have had a Pro Codex account to do this, and from doing this hackathon that's now something I want, because I really enjoyed working with Codex.

## Claude Code commits

104 labelled code commits after the last Codex turn (`git log --oneline 3677761..8c99b7e | grep -cE '(fix|feat) \(Claude Code\)'`). Sim output is identical and no golden vector changed, so no Boss Fight rules changed.

**31 October to early 1 November: 30 fixes** from live tests, the end-to-end suites and an overnight audit (1,194 source lines added).

- **Webcam:** `4f3c5ef` deep leans vs punch gate · `7c71f02` lean 48% / 170 ms · `8bbf47e` countdown clock · `e1bfd01` start on Easy · `8fe8952` clear-space pointer
- **Twitch and `/play`:** `7348cf2` remember login · `7f06308` leave warning · `0ce1e42` no login flash · `ae39ec0` loading shell · `503ffd3` Disconnect notice · `6cc03bf` Reconnect card on expiry · `e4c0df8` real streamer name on the HUD
- **Fight and results:** `b1c7b22` callouts name the defence · `4bfb1dc` Resume between rounds · `b3cac4d` no "Next round in 0 s" · `cb1f49b` rehearsal result · `f62dd87` M mutes · `8598a9b` pause reason, guard resumes · `3cce3b3` match score · `0c18238` rehearsal Resume · `4e448ad` results clear of rails · `9a16f04` SUPER READY banner
- **Demo, phones, a11y:** `74cc38d` 24 px targets, focus trap · `8d66ecc` 390/768 layout · `b30bbc6` `?scout=fast` card in round 1 · `fe53547` Crowd selector · `e28c9d6` demo bar fits · `327d4b5` keyboard figure moves · `2f994ba` landing gameplay loop · `3dfc4df` 44 px phone buttons

**1 November: 52 commits** (27 fix, 25 feat; 4,266 source lines added, 532 removed). Source lines added per group in brackets.

- **Crowd Trainer, 8 (+1,045):** `d442bc6` the mode · `81dc4d4` Trainer punch/slip detector, phone layout · `e5c79ad` balanced simulated pace votes · `accd509` cues never dropped · `655a0b3` remembered mode and options · `86cc3c9` 1/2/S/G keys, Your keys card, key hints · `1a27787` keys card at 390 px · `d4b600b` TRY THE WORKOUT fits a phone
- **Recorded voice lines, 3 (+804):** `0ba45d3` ElevenLabs voice bank (4 boss and 4 coach voices, 872 fixed lines; audio not counted) · `36002e4` boss taunts and voice picker · `eabc382` Trainer calls combos in the coach voice
- **Homepage redesign and demo extras, 7 (+664):** `5e966ee` new hero · `1b5c667` SIMULATED CHAT panel, bot lines, simulated Chat MVP · `37458b6` PLAY ON YOUR TWITCH STREAM first, Try it now box · `e16f168` Back stays on the site · `2f5fb3b` larger chat panel · `394db11` webcam setup on one screen · `3221f1c` plain-words HUD labels
- **Webcam setup and detection, 5 (+450):** `08e54fd` straight punches without turning the body · `384b0cf` 5-step setup, camera before the tick · `8cc1a5e` Skip punches clickable · `2f5f334` forearm foreshortening, capped setup thresholds · `f701e78` camera circle in fights, punch step without the tick
- **Saved preferences, 4 (+274):** `2c0bb47` prefs store · `1f2baa0` `/` and `/play` remember settings · `b2a2141` Workout row · `bfc1c34` phone Workout row
- **`/play` journey and clips, 7 (+196):** `d3898aa` loading screen · `4f0b383` permissions before Connect · `1a84210` mode first, What your stream gets · `075ab6d` mode cards on phones · `861a946` Chat MVP name, clearer labels · `51b153d` fight-only view, plainer bot error · `15b1ca3` clips 6 s after a KO, titled
- **Fight and results polish from live tests, 8 (+266):** `9c8b84b` NEXT ROUND, no timer; practice teaches both leans · `e7f33bd` K.O. stamp · `f81938e` SUPER and FINISHER wording · `b1efa7f` stats from page load · `1faf00d` scoreboard results card · `ea8cd8e` End fight on cards, clip tiles · `d2cede9` camera bubble placement · `d083735` results card after 1.5 s
- **Voice corner coach, now switched off, 10 (+567):** `25cb3ad` · `7068f56` · `08f6a9d` · `acb01b7` · `dcd6040` · `4831c77` · `5cfd2d2` · `482763c` · `85f33a8` · `6ad6ba0` (off for the submission; code kept, [docs/COACH.md](docs/COACH.md))

**1 November night to 2 November: 22 commits** (12 fix, 10 feat; 1,685 source lines added, 200 removed) from Kash's live tests and punch-lab recordings.

- **Fight screen:** `bc75b97` fixed fight-stage lanes · `e3a9c15` one camera circle, opt-in skeleton · `085a546` PUNCH! pop over the boss · `769cd55` compact join panel · `ab6e85b` workout summary fits · `e11235a` BLOCK HIT / DODGE HIT, STEP BACK hint · `cfc70fb` boss hits visible at stream size · `891061f` camera circle hit feedback
- **Punch detection:** `0f9b2b9` Trainer counts straight jabs · `767e841` `?debug=pose` readout · `73f5cc0` hidden punch lab · `0929787` lab recording as a fixture · `5d9fe7c` Boss punch threshold 0.6 · `2274e59` the Trainer 2 is a cross · `8c99b7e` fast one-twos (Kash's drills 46 → 51 of 59)
- **`/play` and webcam setup:** `0b4e907` no ElevenLabs hosts in the page policy · `9aa9f69` setup per Kash's mock, ON STREAM NOW preview · `4fc503a` holding cards on stream · `4dca3f7` camera tip and punch lab link · `8cf73b7` clickable lab link, shorter text
- **Chat bot and Boss Forge:** `ca592e9` bot posts and clip links work in the Worker (every post had failed) · `ff882e8` Boss Forge announced in chat, on the results card and with a NEW BOSS banner

### Who wrote the code (moved from the README)

**Who wrote the code** (**MEASURED**, git at `8c99b7e`, the build deployed on 2 November (later commits not counted); source only, no docs or audio; [commands](codex-evidence.md#codex-vs-claude-code-split)):

| | Codex, up to `3677761` | Claude Code, after it |
|---|---|---|
| Code commits | **57** | **104** (69 "fix", 35 "feat") |
| App lines added / removed | **10,187** / 2,021 | **4,093** / 647 |
| Test and fixture lines added / removed | **11,211** / 360 | **3,052** / 256 |
| Share of source lines added | **75.0%** | **25.0%** |

Most of the Claude Code share is 1 November and after: 52 of its 104 code commits and 4,266 of its 7,145 added lines on 1 November up to `ee1a6e2`, then 22 commits and 1,685 lines from 1 November night to 2 November. Plus 21 docs-only Claude Code commits after 13w. Lines added count edits as well as new code, so this is a size measure, not a value judgement.
