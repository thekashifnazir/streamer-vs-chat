# Codex prompt pack

Paste these into the **main Codex app project thread** on Mac, one day per file. Keep most of the build there; use separate side threads sparingly and list their IDs in the entry README. The CLI equivalent is `codex resume <ID>`. Each prompt says what done looks like, so Codex can plan, split work into subagent lanes and arrange independent subagent review. Day 1 is the first prompt in `../codex-kickoff.md`. These files carry on from there. Edit them freely. They follow `../plan-6day.md` and the spike reports in `../spikes/`.

Rule of thumb: let Codex write the code, and keep its plan, review notes and test runs in the thread. That transcript is the "how well it uses Codex" evidence.

## Model and usage guidance
- Paste the relevant parts of `../spec.md` (rules, numbers, acceptance tests) into the prompt, so Codex implements rather than designs. Design questions go to Claude or Devin first.
- Keep the main thread on GPT-6.1 Sol (medium) for core build days. `/model` → GPT-6 Luna for routine turns (asset wiring, docs, test plumbing, README); in the app, select it in the composer. OpenAI recommends Sol for complex coding and agentic work and Luna for focused, repeatable tasks (READ: https://learn.chatgpt.com/docs/models).
- No Astra (5–45 msgs/5 h on Plus). Plus reference allowances per 5 h: Sol 15–160, Terra 35–285, Luna 350–3,000; weekly caps also apply (READ: https://learn.chatgpt.com/docs/pricing). Kash has credits plus a usage reset; check Settings → Usage at each day boundary.
- In the app, open the entry folder as a project, start a new thread, and use `···` → Copy session ID (⌥⌘C) (READ, unverified: https://github.com/jinghan23/codex-export). For the CLI only, use `/status` to see the session ID. Use subagents sparingly: each one spends quota.
- Leave Fast mode off and avoid cloud tasks for the main build.
- Run `npm test` and `npm run sim` yourself, and paste only the failures back.
- Check usage with `/status` before starting a big lane.
