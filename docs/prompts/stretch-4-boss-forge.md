# Stretch 4 — rank 4, 6–8 Codex hours; source: docs/research/8-openai-in-product.md §8

```text
Read SPEC.md (§2 defence table, §4 scouting, §5 balance gate, §7 acceptance tests) and AGENTS.md first.

Build "Boss Forge": chat-designed bosses that an LLM proposes and our deterministic code accepts or rejects.

1. Data: move the boss's moves out of code into a typed BossDef { name ≤24, tagline ≤80, hp 90–200, moves[3..5] }
   with Move { command /^![a-z]{2,10}$/, label, defence: guard|lean_left|lean_right|lean_any, damage 4–30,
   chip ≤ damage/2, telegraph_ms 600–1200, hits 1–3, hits*damage ≤ 36 }. The existing boss must be the default
   BossDef and every existing test must still pass.
2. validateBoss(def, protectedNames): pure function returning a list of human-readable errors: bounds above,
   reserved commands (!pause !stop !super !vote !forge), ≥1 guard move and ≥1 lean move, a word filter, and no
   protected name (broadcaster + recent chatters, case/punctuation-insensitive, also near-misses like trailing letters).
3. gateBoss(def): run the SPEC §5 sim for this BossDef at 0/3/50/500 viewers; pass = casual 30–70% and no-punch ≥30%.
   tuneBoss(def): bisect one damage scale factor (0.2–2.0, 8 steps) toward casual ≈50%, re-run gateBoss, return
   { factor, def, before, after }. Deterministic with a fixed seed. Must finish in < 5 s on a laptop.
4. Server: `!forge <idea>` (one per viewer per bout) → OpenAI moderation (omni-moderation-latest) → keep the top 3
   by `!forge +1` votes → chat votes → call gpt-6-luna via the Responses API with Structured Outputs (JSON schema =
   BossDef, strict), reasoning effort low. On validation errors, send the errors back once for a repair turn.
   Then gateBoss → tuneBoss if needed. Moderate every output string. Never put chat text into any TTS.
   Generate one boss at a time between rounds, never inside a beat. Mods and the streamer can veto (reuse the
   SPEC mod pause/veto). Key from OPENAI_API_KEY in .env only; log tokens and latency per call.
5. HUD: a "BOSS FORGE" card between rounds showing: the idea, the model's move list, validator ticks/crosses,
   the sim table before → after ("TOO STRONG: casual 11% → ×0.53 → 52% ✓"), and ACCEPTED / REJECTED, plus
   a small "AI: gpt-6-luna · 4.1 s · $0.0006" line.
6. No-key / no-login demo: if there's no key (always in the hosted demo), offer 3 prebaked bosses from
   fixtures/bosses/*.json and a textarea where the judge can paste or edit BossDef JSON. The validator, gate and
   tuner run in the browser on it, with the same Forge card. Badge: "Prebaked (no API key)". Never ask for a key.
7. Tests (Vitest): the validator rejects each bad case (underscore/unicode command, reserved command, 999 hp,
   protected name "kashrunz", no lean move); gateBoss passes the default boss; tuneBoss rescues a 2×-damage
   boss; a mocked LLM client drives the repair path; no network in tests. Add the default boss and fixtures
   to the CI balance gate.
Work in a subagent lane for the server/LLM part and one for the HUD card, then arrange independent subagent review of both.
```
