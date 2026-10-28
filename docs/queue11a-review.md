# Queue 11a: two-way scouting and the SYNC balance fallback

## Shipped behaviour and choices

The reducer owns the right-rail CHAT HABIT card, opening metadata and brace reward, with explicit time and no clock reads. The left-rail streamer weakness card is unchanged. The right card uses the last 12 selected moves with positive counted-vote support, across rounds; it excludes autopilot and zero-influence all-raider draws. A vetoed pick remains evidence. Opening means the first attack after round start/restart or cancellation by veto (including a remaining COMBO hit), not an ordinary pause or successful resolution.

The card begins in R2, requires the full 12 and both requested confidence tests. At n 12, Wilson(z 1.645) ≥ .40 means 8/12 qualifies and 7/12 does not, despite the 55% share floor. Existing cards remain at 6/12 and clear at 5/12. No voting restrictions or healing are added. Brace requires the matching card to be visible before the draw and the correct defence already held strictly before the tell; a card formed by that pick cannot retroactively qualify. Only a clean BLOCK/PERFECT/DODGE gets automatic counter ×1.25, with unchanged punches/window. Actual HP loss remains capped correctly in summary telemetry.

The compact right-rail card preserves 36 px text and 40 px n, while full distribution/opening evidence is available as title/ARIA text. READ IT comes only from authoritative braced successful resolutions. Seated containment remains intact; when a habit card and raid banner coexist, decorative boss art hides so vote rows stay readable and the body area remains clear.

## CHAT SYNC: removed entirely

The initial implementation used the specified eight-viewer, first 1000 ms cohort, selected-move check, three-beat cadence, no SUPER and +3 landed damage (split +1.5 per COMBO hit, before mercy). It had no extra majority/share gate. Initial early votes were uniform across the beat; coordinated votes were early. No gate, damage number or timing threshold was weakened to rescue it.

Both attempts used 4000 rounds per cell and the unchanged §5 player parameters. Attempt 1 used 35% pre-brace attempts and 85% read maintenance. Ordinary R1 no-punch at 500 viewers was 28.5%, below 30%. Ordinary R2 no-punch was 30.0% at 500; the initial coordinated R2 casual 3 cell was 75.7%, above 70%.

Attempt 2 increased pre-bracing to 50%, keeping 85% maintenance. R1 cannot change because cards are disabled there, so the exact same deterministic 4000-sample R1 results were reused. Both R2 matrices were rerun: ordinary casual 500 43.0% and no-punch 500 30.4%, coordinated casual 3 worsened to 80.2%. Its overall gate still failed. This was a diagnostic run (printed matrix pass/fail), not a successful npm run sim gate.

Under the requested fallback, all SYNC engine state, deadlines, attack/resolution flags, damage, HUD and simulation coverage were removed. Eight early same-move votes now cause ordinary damage, protected by unit and golden regressions. Two-way scouting stays.

Independent review also caught a simulation-definition issue: floor(3×.35) created one extra permanent JAB voter and called it coordination. The final coordinated profile requires at least 8 group members. Thus 0/3 use ordinary personas; 50/500 retain the same 35% persistent JAB group. This is a documented cohort-definition correction, not a change to player skill, damage or the gate. Final brace rate returns to the original 35%, with 85% hold. Timing/prediction use independent random streams; votes are interleaved chronologically with prior attacks and COMBO hits. Failed/wrong predictions use the unchanged §5 reaction model.

## Verification

Final verification: 372 tests in 50 files pass on Node 22, including 59 goldens. TypeScript, diff whitespace and the 25.2 MB raw / 15.1 MB gzip offline build pass. All four 4000-sample matrices pass with the unchanged gates, and successful braces occur in both R2 profiles. Tests use the pure reducer/fakes; no real Twitch calls, live scripted chat, camera or deployment.

The original 50 golden vectors remain untouched; 6 two-way vectors and 3 rejected-SYNC standard-damage vectors bring the loaded total to 59. New tests cover confidence/hysteresis, opening carry/reset/immutability, prior-card eligibility and exact tell boundary, all defence types, broken COMBO, actual counter caps, zero-effective votes, transport metadata and negative SYNC behaviour.

/review is unavailable as a tool. Independent agents reviewed engine/goldens, HUD/calm/layout, server projection and simulation assumptions. Findings fixed: no guessed SYNC majority gate, early votes interleaved before overlapping COMBO/punch events, compact card layout, raid/art overlap, and one-person 'coordination'.

Claude clarified that the earlier route-test timeout was specific to its /private/tmp check environment; no additional teardown changes were made in this queue.

## Needs Kash

- Check the right-rail card and READ IT stamp at 720p in normal/seated/raid layouts on Chrome/OBS; no rendered browser surface was available here.
- Play-test whether 35% pre-bracing/85% maintenance are reasonable inferred models; they are simulation assumptions, not measured player behaviour.
- Claude deploys the existing static target after review. No registration/login, real-chat test or deployment was attempted overnight.

## Final balance matrices

Each cell contains 4000 samples; R2 uses genuine R1 warmups. Total 480,000 executed rounds across both profiles. Casual must remain 30–70%; no-punch must stay ≥30%.

### ordinary R1

| Model |0 viewers|3 viewers|50 viewers|500 viewers|
|---|---:|---:|---:|---:|
|casual|55.6%|55.0%|49.9%|48.5%|
|good|99.2%|98.9%|98.5%|98.6%|
|seated|71.4%|71.7%|66.4%|65.9%|
|nopunch|41.1%|42.1%|35.9%|36.0%|
|keyboard|96.0%|95.8%|94.5%|93.1%|

### ordinary R2

| Model |0 viewers|3 viewers|50 viewers|500 viewers|
|---|---:|---:|---:|---:|
|casual|56.7%|62.5%|49.3%|50.2%|
|good|99.5%|99.0%|98.6%|98.6%|
|seated|70.2%|75.9%|66.4%|66.5%|
|nopunch|41.4%|48.6%|37.6%|37.0%|
|keyboard|95.8%|95.5%|94.0%|93.3%|

Coverage: `PASS: cards=1304,exploits=1309,fixes=335,braces=23465`.

### coordinated R1

| Model |0 viewers|3 viewers|50 viewers|500 viewers|
|---|---:|---:|---:|---:|
|casual|55.6%|55.0%|55.2%|54.4%|
|good|99.2%|98.9%|98.9%|99.1%|
|seated|71.4%|71.7%|72.2%|71.8%|
|nopunch|41.1%|42.1%|39.4%|41.9%|
|keyboard|96.0%|95.8%|96.0%|96.2%|

### coordinated R2

| Model |0 viewers|3 viewers|50 viewers|500 viewers|
|---|---:|---:|---:|---:|
|casual|56.7%|62.5%|65.6%|65.5%|
|good|99.5%|99.0%|99.2%|99.1%|
|seated|70.2%|75.9%|78.8%|79.6%|
|nopunch|41.4%|48.6%|52.3%|53.1%|
|keyboard|95.8%|95.5%|97.5%|97.2%|

Coverage: `PASS: cards=787,exploits=748,fixes=197,braces=73805`.
