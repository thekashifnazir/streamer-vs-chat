# Capture delegate measurement

Status: **Needs Kash — physical-camera CPU/GPU comparison has not been run in this agent session.** No hardware timings or winner are claimed. CPU remains the default until a completed local comparison selects a delegate.

Run `npm run dev:mock`, open `http://localhost:5173/capture/` in normal Chrome on the Mac, confirm clear space, then choose **Compare CPU and GPU**. Camera access is required. Keep your head, shoulders and wrists in frame with the same posture and lighting for both runs. This stops game inputs and local replay recording during measurement. Stop a fixture recording first. The Stop camera button cancels the comparison; Resume inputs is explicit after completion.

Each delegate loads the same lite model, discards 30 warmup frames, then measures 90 valid real camera frames. Each attempt has a 20-second ceiling, including permission/model startup. The page reports nearest-rank FPS p50/p95 and inference p50/p95 in milliseconds. It selects the lower inference p50, then p95, then higher FPS p50 to break ties. An unsupported or timed-out delegate is reported as an error; it does not receive invented timing samples. If both fail, the existing selection stays unchanged.

The delegate selector also supports a normal CPU or GPU camera session. Stop the camera before changing it. The classifier and calibration formulas are identical for both delegates. Restarting after a benchmark keeps input stopped until Resume inputs.

Record the browser version, Mac model, capture resolution, ambient lighting, both rows of timings, and selected delegate here after running on the physical camera. Do not substitute mocked unit-test timings or earlier prep measurements for this comparison.

| Delegate | FPS p50 / p95 | Inference ms p50 / p95 | Valid measured frames |
| --- | --- | --- | --- |
| CPU | Needs Kash | Needs Kash | Not run |
| GPU | Needs Kash | Needs Kash | Not run |
