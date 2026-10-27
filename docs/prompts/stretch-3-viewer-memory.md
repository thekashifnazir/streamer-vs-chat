# Stretch 3 — rank 3, 3–4 Codex hours; source: docs/research/10-viewer-memory-and-booth.md

```
Read SPEC.md and AGENTS.md first. Add VIEWER MEMORY. Do not change the reducer's rules in SPEC.md §1–§4; memory is display and stats only, it never changes damage, draws or balance.

Storage: server/memory.ts owns a per-channel JSON file at data/viewers.json (gitignored). Atomic write (temp file + rename), loaded at start, saved at round end and on shutdown. Record per viewer, keyed by Twitch user id (chatter_user_id), never by login:
  { id, name (latest display name, refreshed on every message), firstSeen, lastSeen, streams, votes, koVotes, mvpCount, favMove, koVotesByMove }
Never store chat message text. Also keep optOut: string[] (ids only).

Rules:
- A "stream" for a viewer counts once per server session in which they voted.
- koVotes: +1 when the beat that KOs the streamer resolves the move this viewer voted for that beat.
- Stream MVP (already on the end card): mvpCount +1 for that viewer.
- Nemesis: viewer with the most koVotes against this channel, minimum 2; tie -> most recent lastSeen.
- Retention: on load, delete records with lastSeen older than 90 days.
- "!forgetme" from a viewer: delete their record now, add the id to optOut, never record them again; queue one bot acknowledgement through the existing bot rate limit (max 1 msg / 10 s).
- Simulated votes (source 'sim') and booth votes never touch the file.

Overlay (Rails HUD, docs/design B layout): left rail "YOUR RECORD vs THIS CHAT" (streams, bosses KO'd, times KO'd) and "CHAT HALL OF FAME · ALL TIME" top 4 by koVotes; right rail "YOUR NEMESIS IS VOTING" card only while the nemesis has voted in the last 30 s; when the drawn move is the nemesis's favMove, add a "<name>'s KO MOVE" tag under the telegraph. Centre stays clear.
End card: add "MVP n streams running" and the line "Type !forgetme to be forgotten".

Demo: in the no-login demo (no .env, no network), seed IndexedDB with 3 previous simulated streams of made-up viewers; everything badged SIMULATED.

Tests (vitest), add to SPEC.md §7 as 19–22:
19 koVotes: viewer A votes HOOK_L on the KO beat in two server sessions -> A.koVotes 2, A is nemesis.
20 !forgetme: A sends !forgetme -> record gone, file rewritten, later votes from A are not recorded.
21 Retention: record with lastSeen 91 days ago is dropped on load.
22 No text: after 100 chat messages, data/viewers.json contains none of the message bodies.
Run the tests and the balance sim; both must pass. Then /review.
```
