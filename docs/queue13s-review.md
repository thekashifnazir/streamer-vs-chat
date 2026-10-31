# Queue 13s — Go live from /play

31 October 2026. Hosted setup and browser broadcast transport only. No engine, reducer, damage, timing, balance, classifier or calibration-maths changes. Demo `/` markup, the Rails HUD and local server/Worker implementations are unchanged. No dependencies added; no deployment.

## Flow

- Three-step bar: Twitch → Go live → Fight, with cyan completed/yellow current states. The disconnected screen contains the requested pitch, commands, Connect action and small demo link. Setup/extras/OBS remain hidden until connected.
- Go live is primary; an outlined Advanced disclosure retains the existing Mac/Windows OBS steps and explicit tab-local completion. Skip and OBS completion advance to the defence choice. Unsupported browsers see OBS with an explanation.
- Webcam and Keyboard are the defence choices. More options holds difficulty (unchanged Medium default), defence-only, sound and extras. Bot/clips retain allowed-on defaults; Forge now starts off, memory stays off. Privacy copy separates counts-only metrics from optional names/90-day memory.
- Only hosted keyboard setup bypasses the webcam safety tick; offline demo defaults remain unchanged. Hosted Webcam retains the one tick, all five measurements, fresh-frame safety and 13r countdown. Three presentation groups show Get in frame (including relaxed/waist instructions), Guard up, then both leans. No measurement thresholds/durations changed. Eight seconds without a visible head/shoulders shows framing/light tips. Redo/Turn off camera stay hidden until on.
- Connected WebRTC transport shows a pink LIVE header/bar with channel, elapsed time and End stream; the existing fight controls gain a LIVE dot. Ending/failing a live broadcast freezes existing play through its existing STOP input, releases capture and returns to setup/retry.

## Browser transport

- Initial Twitch scopes are unchanged. Clicking Go live without `channel:read:stream_key` reveals the existing Reconnect once flow with that added scope. A later click invokes the display picker synchronously before network awaits. No stream key is stored, logged, exported, placed in a URL or sent to our server.
- Capture requests the current tab, 1280×720/30 fps and tab audio. Non-tab choices are rejected. Element Capture is attempted first, CropTarget second; full-tab fallback has a visible warning. The stage is rendered while preparing and has isolation:isolate. Hosted CSP allows only the additional fixed WHIP origin.
- Browser-only peer connection uses max-bundle, sendonly, H.264 packetization-mode=1 (42e01f first), Opus, 3.5 Mbps/30 fps, bounded ICE gathering and request/connection timeouts. Only WHIP 201 proceeds to the SDP answer; actual connected state supplies LIVE. No Location header is required. Sharing-ended, failure, disconnect and teardown release owned media/peer resources.
- The optional captured camera bubble is inside the stage. It reuses pose video when available; keyboard asks for a separate camera only when enabled. Ending it never stops pose-owned camera tracks. Late permission results after cancellation/off are released. Camera privacy copy now acknowledges the optional broadcast.
- Twitch 403 stream-key messages are rendered as text; other browser/network failures use plain retry/OBS wording. WHIP is undocumented by Twitch. Kash's supplied **MEASURED 31 Oct prep test** (201, connected under one second, visible on kashruns) is documented as prior evidence, not a new run here. No prep source code copied.

Implementation references: [Chrome Element Capture](https://developer.chrome.com/docs/web-platform/element-capture), [getDisplayMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia), [codec preferences](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpTransceiver/setCodecPreferences).

## Checks

- `npx vitest run`: 970/970 tests across 125 files, exit 0 (18.85 s). Fakes cover WHIP headers/codecs/201/403, capture fallback order, stream/key cleanup, camera ownership, scope upgrade, flow transitions, keyboard/webcam safety split, and no-body tips. Existing offline isolation and compact Rails tests pass. Two layout fixtures were updated for the new hosted vertical flow/connected Fight phase, retaining their existing visibility assertions.
- `npx tsc --noEmit`: exit 0 (2.62 s).
- `npm run build:demo`: exit 0 (1.52 s), including offline/audio/header audits.
- `npx wrangler deploy --dry-run`: exit 0 (2.48 s), flags remain off; no deploy.
- `npm run sim`: exit 0 (549.33 s). All production/scouting/difficulty and five Forge gates pass. Full output byte-identical to 0be805d (3,652 bytes; SHA-256 `b1fac984b5bad9b5ceea6c5fb1bd9680fbff80d87a56a0ef88708891b3d64527`). No golden/protected implementation changes.
- Subagent review skipped per the explicit Queue 13s instruction to save usage. Claude reviews the diff in a fresh clone and real browser.

## Needs Claude / Kash

Verify the actual Connect → permission upgrade → tab picker flow, tab-audio announcer, H.264 ingest on kashruns, both crop fallbacks, camera off/on and pose reuse, End stream, Chrome sharing Stop, and the OBS fallback on the Mac. No real Twitch requests, stream key, camera or broadcast were used here. The new layout has DOM/CSS regression coverage, not a claimed rendered/live measurement.
