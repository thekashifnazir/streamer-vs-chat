import { defineConfig } from 'vite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const poseFiles:Record<string,[string,string]>={
  '/assets/pose/vision_wasm_internal.js':['./node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js','application/javascript'],
  '/assets/pose/vision_wasm_internal.wasm':['./node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm','application/wasm'],
  '/assets/pose/pose_landmarker_lite.task':['./capture/public/models/pose_landmarker_lite.task','application/octet-stream'],
};

export default defineConfig({
  envDir:false,envPrefix:[],
  define:{'import.meta.env.VITE_TWITCH_CLIENT_ID':JSON.stringify(process.env.VITE_TWITCH_CLIENT_ID??'')},
  plugins: [{
    name: 'page-trailing-slashes',
    configureServer(server) {
      server.middlewares.use(async(req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const pose=poseFiles[url.pathname];
        if(pose){try{const bytes=await readFile(fileURLToPath(new URL(pose[0],import.meta.url)));res.writeHead(200,{'Content-Type':pose[1]});res.end(bytes);}catch(error){next(error);}return;}
        if (url.pathname === '/overlay' || url.pathname === '/capture' || url.pathname === '/play') {
          res.writeHead(302, { Location: `${url.pathname}/${url.search}` });
          res.end();
          return;
        }
        if(url.pathname==='/')req.url=`/demo/index.html${url.search}`;
        else if(url.pathname.startsWith('/play/'))req.url=`/demo${url.pathname}${url.search}`;
        else if(url.pathname.startsWith('/src/'))req.url=`/demo${url.pathname}${url.search}`;
        next();
      });
    },
  }],
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    fs: { deny: ['**/.env', '**/.env.*', '**/tokens.json*', '**/.git/**'] },
  },
});
