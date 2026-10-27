# Offline demo and static deployment

`npm run build:demo` creates `dist-demo/`; `npm run demo` builds and serves it at http://localhost:4173/. No `.env`, account login or Twitch connection is needed. Existing ignored server tokens may stay on disk: neither the static builder nor preview reads them, and no server/auth module is included in the browser graph.

Confirm clear space and press K, A, J to start. The same production reducer owns the local demo game; the server owns state in the Twitch version. Both use the same defence rules, clock, weighted crowd votes and best-of-three lifecycle. Source generation refuses an explicitly loaded live token unless mock mode is specified, and the live server refuses simulated votes/results. The static demo has no credential transport with which to connect to a live channel.

The webcam loads local Pose Landmarker lite with CPU delegate and exactly one SIMD WASM fileset. Normal Chrome supports the required SIMD/video frame APIs. No unused no-SIMD WASM binary, server secrets or auth code is shipped. WASM+model are approximately 17.2 MB raw /8.4 MB gzip; the full selected visual/audio bundle is approximately 25 MB raw /15.2 MB gzip. The model checksum is verified at build time. Fonts, sprites, audio and atlas JSON use local bundled URLs. CSP limits connections to the same origin.

Sound is off by default. Enabling it is an explicit user gesture; the pass wires basic atlas clips, cues, SFX and voices, without day-6 feel effects or mix tuning.

## Deployment handoff

The requested `wrangler.toml` has the custom-domain route above `[assets]`, `workers_dev=true`, and `dist-demo` with SPA handling. Wrangler 4.154.0 is installed locally for reproducible Mac commands. Configuration was checked against the installed schema and [Cloudflare's configuration reference](https://developers.cloudflare.com/workers/wrangler/configuration/).

Primary intended URL: **https://streamervschat.kashifnazir.com**. Zone/account availability is still inferred and needs verification on Kash's Cloudflare account. Keep the generated `https://streamer-vs-chat.<account>.workers.dev` URL as fallback; take the actual account suffix from Wrangler output.

Kash runs `npx wrangler login` once; Claude runs `npx wrangler deploy` from the Mac after `npm run build:demo`. No login, deployment, account mutation or zone verification was performed here.

The intended hosted-connect redirect registrations are `https://streamervschat.kashifnazir.com/` and `http://localhost:5173/`. The current static demo needs no connect flow. The existing local two-account Authorization Code server continues using `http://localhost:3000/callback`; a future hosted connect backend must handle the hosted callbacks rather than exposing secrets in this static build.
