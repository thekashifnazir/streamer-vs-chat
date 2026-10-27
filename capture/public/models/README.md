# Pose Landmarker lite model

Official MediaPipe float16 lite task, version 1:
https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task

SHA-256: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`

The runtime is pinned to `@mediapipe/tasks-vision` 0.10.32. Vite serves its installed WASM files locally from `/node_modules/@mediapipe/tasks-vision/wasm`. The model is vendored here so starting capture needs no CDN/model download. Camera frames stay in the page; only input events go over the local WebSocket.
