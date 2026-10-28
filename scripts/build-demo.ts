import { readFile, mkdir, copyFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { build } from 'vite';
import { assertSimulationAllowed } from '../demo/src/safety.js';
import { auditOfflineBuild } from './offline-check.js';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export async function buildDemo(options: {mock?:boolean} = {}) {
  // The static builder never loads the server's .env or token store.
  assertSimulationAllowed({liveTokenLoaded:false,mock:options.mock});
  const output = resolve(projectRoot,'dist-demo');
  const modelPath = join(projectRoot,'capture/public/models/pose_landmarker_lite.task');
  const model = await readFile(modelPath);
  if (createHash('sha256').update(model).digest('hex') !== '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a') {
    throw new Error('Vendored lite model checksum does not match capture/public/models/README.md.');
  }
  await build({
    configFile:false, root:join(projectRoot,'demo'), publicDir:false, envDir:false, envPrefix:[], base:'/',
    define:{'import.meta.env.VITE_TWITCH_CLIENT_ID':JSON.stringify(process.env.VITE_TWITCH_CLIENT_ID??'')},
    build:{outDir:output,emptyOutDir:true,target:'es2022',manifest:true,rollupOptions:{input:{index:join(projectRoot,'demo/index.html'),play:join(projectRoot,'demo/play/index.html')}}},
  });
  const poseOutput=join(output,'assets/pose');
  await mkdir(poseOutput,{recursive:true});
  // Chrome supports SIMD; use an explicit fileset so no unused no-SIMD binary ships.
  for (const filename of ['vision_wasm_internal.js','vision_wasm_internal.wasm']) {
    await copyFile(join(projectRoot,'node_modules/@mediapipe/tasks-vision/wasm',filename),join(poseOutput,filename));
  }
  await copyFile(modelPath,join(poseOutput,'pose_landmarker_lite.task'));
  const credits=join(output,'credits');await mkdir(credits,{recursive:true});
  for(const [source,name]of [
    ['CREDITS.md','CREDITS.txt'],['assets/fonts/anton-OFL.txt','anton-OFL.txt'],
    ['assets/fonts/barlowcondensed-OFL.txt','barlowcondensed-OFL.txt'],
    ['assets/licences/Apache-2.0.txt','Apache-2.0.txt'],
    ['assets/SOUNDS.md','sound-provenance.txt'],['assets/voice/README.md','voice-provenance.txt'],
    ['assets/boss/README.md','boss-provenance.txt'],['capture/public/models/README.md','model-provenance.txt'],
  ])await copyFile(join(projectRoot,source!),join(credits,name!));
  for(const file of await readdir(join(projectRoot,'assets/licences')))if(file.startsWith('kenney-'))await copyFile(join(projectRoot,'assets/licences',file),join(credits,file));
  await auditOfflineBuild(output);
  let rawBytes=0;let gzipBytes=0;
  async function measure(directory:string) {
    for(const filename of await readdir(directory)) {
      const path=join(directory,filename);
      if((await stat(path)).isDirectory()) await measure(path);
      else {const bytes=await readFile(path);rawBytes+=bytes.length;gzipBytes+=gzipSync(bytes).length;}
    }
  }
  await measure(output);
  console.log(`[demo] Offline dist-demo ready: ${(rawBytes/1e6).toFixed(1)} MB raw / ${(gzipBytes/1e6).toFixed(1)} MB gzip. No server credentials included; offline demo and optional Twitch play are separate routes.`);
  return output;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  await buildDemo({mock:process.argv.includes('--mock')});
}
