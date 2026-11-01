import { readFile, writeFile, mkdir, copyFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { build } from 'vite';
import { assertSimulationAllowed } from '../demo/src/safety.js';
import { writeAssetHeaders } from './asset-headers.js';
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
    build:{assetsInlineLimit:file=>/\.(?:wav|mp3|m4a|ogg)$/i.test(file)?false:undefined,outDir:output,emptyOutDir:true,target:'es2022',manifest:true,rollupOptions:{input:{index:join(projectRoot,'demo/index.html'),play:join(projectRoot,'demo/play/index.html')}}},
  });
  const poseOutput=join(output,'assets/pose');
  await mkdir(poseOutput,{recursive:true});
  // Chrome supports SIMD; use an explicit fileset so no unused no-SIMD binary ships.
  for (const filename of ['vision_wasm_internal.js','vision_wasm_internal.wasm']) {
    await copyFile(join(projectRoot,'node_modules/@mediapipe/tasks-vision/wasm',filename),join(poseOutput,filename));
  }
  await copyFile(modelPath,join(poseOutput,'pose_landmarker_lite.task'));
  // The recorded voice bank (about 870 short MP3s) is copied, not bundled: the player fetches only the chosen voice, a line at a time.
  const bank=join(projectRoot,'assets/voice/bank');
  for(const voice of await readdir(bank,{withFileTypes:true}))if(voice.isDirectory()){
    await mkdir(join(output,'assets/voice-bank',voice.name),{recursive:true});
    for(const file of await readdir(join(bank,voice.name)))if(file.endsWith('.mp3'))await copyFile(join(bank,voice.name,file),join(output,'assets/voice-bank',voice.name,file));
  }
  const credits=join(output,'credits');await mkdir(credits,{recursive:true});
  const creditText=(await readFile(join(projectRoot,'CREDITS.md'),'utf8')).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  await writeFile(join(credits,'index.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Streamer vs Chat · Credits</title><style>body{font:16px system-ui;background:#0c0912;color:#f5f2fa;padding:24px}a{color:#2ef2ff}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><a href="/">Back to Streamer vs Chat</a><h1>Credits</h1><pre>'+creditText+'</pre>','utf8');
  for(const [source,name]of [
    ['CREDITS.md','CREDITS.txt'],['assets/fonts/anton-OFL.txt','anton-OFL.txt'],
    ['assets/fonts/barlowcondensed-OFL.txt','barlowcondensed-OFL.txt'],
    ['assets/fonts/Bungee-OFL.txt','Bungee-OFL.txt'],['assets/fonts/RussoOne-OFL.txt','RussoOne-OFL.txt'],['assets/fonts/inter-OFL.txt','inter-OFL.txt'],
    ['assets/licences/Apache-2.0.txt','Apache-2.0.txt'],
    ['assets/SOUNDS.md','sound-provenance.txt'],['assets/voice/README.md','voice-provenance.txt'],['assets/voice/bank/README.md','voice-bank-provenance.txt'],
    ['assets/boss/README.md','boss-provenance.txt'],['capture/public/models/README.md','model-provenance.txt'],
  ])await copyFile(join(projectRoot,source!),join(credits,name!));
  for(const file of await readdir(join(projectRoot,'assets/licences')))if(file.startsWith('kenney-'))await copyFile(join(projectRoot,'assets/licences',file),join(credits,file));
  await writeAssetHeaders(output);
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
