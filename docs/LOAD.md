# Local load and soak checks

Both runners create an isolated **SIMULATED** stack: actual Twitch CLI on 8080, chat injection shim on 8081, server on 3000 and a HUD WebSocket consumer. Port 44747 is the CLI's auxiliary RPC listener. These ports must be free. The runners never load `.env`, token files, Vite or Twitch credentials; no request goes to live Twitch. The CLI uses temporary config/cache and preserves `HOME`.

Run with Node 22:

```sh
npm run load -- --out /tmp/streamer-load.json
npm run soak -- --minutes 30 --out /tmp/streamer-soak-30m.json
npm run soak -- --minutes 2 --out /tmp/streamer-soak-ci.json
npm run test:recovery -- --out /tmp/streamer-recovery.json
```

Default report paths use the platform temporary directory.

The scripts require explicit `--mock --hardening`; the npm commands supply both. Hardening mode replaces per-message chat-text console logging with bounded audit receipts; ordinary live chat logging is unchanged. Server telemetry is available only with both flags. Do not run the commands concurrently because they own the same local ports.

## Load protocol

The default load is 1000 anonymous simulated chatters for 30 seconds. Each schedules random JAB/HOOK_L/HOOK_R/COMBO commands every 1–4 seconds of eligible active voting time. At each beat boundary, up to 300 eligible viewers are rescheduled into a burst; this does not add extra votes or allow any viewer to send within 1 second of their previous message. Natural scheduled traffic may accompany the burst. The schedule has a fixed seed. Injection uses a FIFO queue with at most 32 concurrent HTTP requests, without retries or discarded queued commands. This preserves the scheduled burst while bounding the local driver transport. Reports include maximum active/queued requests and sanitized failure categories.

A held keyboard guard travels through the normal capture WebSocket protocol every 250 ms, without punches or leans. The benchmark is bounded to 30 seconds: even the worst possible draw sequence cannot KO either fighter during that interval. This keeps all injected commands within one active round and makes **sent = accepted = independently audited vote events** a strict gate. The first few hundred messages form a burst, then all 1000 viewers become active as their initial schedules arrive. The optional `--seconds` can shorten the run, never extend it beyond 30 seconds.

Every injected chat command has a correlation ID carried through EventSub/Twurple into the server audit. The consumer records every receipt, deduplicates the tally/tick copies and calculates p50/p95/p99 from server receive time to HUD WebSocket receipt. This measures delivery over the HUD WebSocket, **not browser layout or paint**, and excludes Twitch's external ingress latency. No message text or real identity is included in the report.

The independent audit mirrors latest accepted vote per viewer, compares each completed beat's actual selected-vote map and accepted event total, and checks live HUD raw counts, voter total and effective weighted bars. Current-beat events are checked against the actual current HUD state; stale unresolved beat maps fail. Commands ignored outside an active round and accepted commands discarded at round end are forbidden in this benchmark.

Pass requires all requests delivered once, no missing/unexpected receipts, no telemetry overflow/unhandled service errors, sent=server accepted=audited events, zero ignored/terminal events, valid HUD tally snapshots, p95 < 250 ms and maximum observed beat drift < 50 ms. Reports retain p50/p99 as well. A failing threshold is reported as FAIL rather than changing the gate.

## Soak protocol

The default soak has **zero chatters**: the boss uses normal autopilot and the streamer remains idle. It still runs actual CLI/shim/EventSub connectivity, the server and the HUD WebSocket. Matches restart back-to-back after valid best-of-three results. This targets retained service state and lifecycle cleanup separately from the 1000-viewer load.

Time is actual wall time without an accelerated clock. The 30-minute requested window is followed by draining the final started match (bounded 160 seconds) and flushing result messages (bounded 12 seconds). Each started match must complete. Round identities, KO/timeout HP evidence, percentage tiebreaks, scores and final winner/HP are checked; the result-message count must equal the completed-round count. Existing session tests cover one result per actual round; queue tests cover spacing and bounded backlog. Zero driver and service unhandled errors are required.

After a 60-second warmup (half the duration for runs shorter than 2 minutes), the server runs explicit GC and reports its own `process.memoryUsage().heapUsed` every 15 seconds. The gate uses the maximum post-warmup heap, including the final sample, versus the first post-warmup baseline: growth must remain below 20%. This is service heap, not driver heap or a mocked measurement. GC availability is mandatory. Archives retain aggregate session totals and the current match rather than all past reducer states; exact MVP credit still costs space proportional to distinct session identities.

## Measurement record

Measured on Mac arm64, Node 22.23.4 and Twitch CLI 1.1.24 on 28 October 2026. All input was simulated and all services were local.

| Check | Result | Evidence |
| --- | --- | --- |
| 1,000-viewer load, 30 s | **PASS**: 13,119 sent = received = accepted; zero missing/failed/ignored/terminal votes | [Full report](hardening/load.json) |
| Ingest → HUD WebSocket | p50 **61 ms**, p95 **104 ms**, p99 **107 ms**; p95 gate <250 ms | 285 audited HUD snapshots |
| Beat drift | maximum **12 ms**, gate <50 ms | 12 audited beats; nominal 2,400 ms deadlines |
| Latest-per-viewer | exact agreement with independent receipt maps, raw counts, voter totals and weighted bars | zero audit issues; burst scheduler maximum 300 |
| 30-minute soak | **PASS**, 30.4908 min including drain; 33/33 valid matches, 66 rounds/results, zero errors | [118 heap samples](hardening/soak-30m.json) |
| 30-minute heap | peak growth **6.3182%**, final growth 6.1431%; gate <20% | baseline 20,506,840 bytes; final 21,766,600 |
| Two-minute CI variant, run locally | **PASS**, 2.0779 min including drain; 2/2 valid matches, 4 rounds/results, zero errors | [Report](hardening/soak-2m.json) |
| CLI disconnect/restart | **PASS**: reload snapshot in **19.8 ms**, accepted vote/pending tell preserved, new chat accepted after reconnect, zero errors | [Report](hardening/recovery.json) |
| Two-minute heap | peak/final growth **1.6488%**, gate <20% | baseline 20,430,208 bytes; final 20,767,064 |

The load injector limits simultaneous HTTP requests to 32, with a FIFO queue that preserves every scheduled message and drains before judging the run. It does not retry failed requests. The measured run reached 32 concurrent requests and 275 queued requests during the burst; the scheduled chatter cadence and 300-viewer burst limit remain unchanged.

The [initial unbounded load failed](hardening/load-initial-failed.json): 13,105 scheduled commands, 12,894 received and 211 HTTP failures/missing votes. A [10-second diagnostic](hardening/load-unbounded-diagnostic.json) reproduced 211 failures with 317 concurrent requests, including 210 ECONNRESET errors. This establishes connection resets under the unbounded HTTP fanout; a file-descriptor-limit cause was not established. The bounded queue fixes the driver without weakening any server latency, drift or conservation gate. Failed runs are not counted as passing evidence.

See [the hardening review](queue11b-review.md) for recovery, independent review, balance results and physical checks still needing Kash. The two-minute result above is a local execution of the CI variant, not a claim about a future GitHub Actions run.
