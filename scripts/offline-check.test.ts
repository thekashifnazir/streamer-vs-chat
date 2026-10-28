import { expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditOfflineBuild } from './offline-check';
it('rejects unused WASM, missing local assets and credentials in the distributable',async()=>{
  const root=await mkdtemp(join(tmpdir(),'svc-offline-'));
  try {
    await mkdir(join(root,'assets/pose'),{recursive:true});
    for(const name of ['vision_wasm_internal.js','vision_wasm_internal.wasm','pose_landmarker_lite.task'])await writeFile(join(root,'assets/pose',name),'');
    const html=`<meta http-equiv="Content-Security-Policy" content="script-src 'self'; connect-src 'self'"><script src="/assets/app.js"></script>`;
    await writeFile(join(root,'index.html'),html);
    await expect(auditOfflineBuild(root)).rejects.toThrow('Unbundled runtime asset');
    await writeFile(join(root,'assets/app.js'),'');expect(await auditOfflineBuild(root)).toContain('assets/app.js');
    await writeFile(join(root,'assets/style.css'),'@font-face{src:url(/assets/font.woff2)}');
    await expect(auditOfflineBuild(root)).rejects.toThrow('font.woff2');
    await writeFile(join(root,'assets/font.woff2'),'');
    await writeFile(join(root,'assets/pose/unused.wasm'),'');await expect(auditOfflineBuild(root)).rejects.toThrow('single SIMD');
    await rm(join(root,'assets/pose/unused.wasm'));
    await writeFile(join(root,'tokens.json'),'{}');await expect(auditOfflineBuild(root)).rejects.toThrow('Credential');
  }finally{await rm(root,{recursive:true,force:true});}
});

it('follows the whole no-login dependency graph while isolating dynamic live branches',async()=>{
  const {offlineDependencyFiles}=await import('./offline-check');
  const manifest={
    'index.html':{file:'assets/entry.js',imports:['_shared.js'],dynamicImports:['src/main.ts','src/twitch/auth.ts']},
    '_shared.js':{file:'assets/shared.js'},
    'src/main.ts':{file:'assets/main.js',dynamicImports:['src/play.ts'],imports:['_engine.js']},
    '_engine.js':{file:'assets/engine.js'},
    'src/play.ts':{file:'assets/play.js',imports:['src/twitch/auth.ts']},
    'src/twitch/auth.ts':{file:'assets/auth.js'},
  };
  expect([...offlineDependencyFiles(manifest)].sort()).toEqual(['assets/engine.js','assets/entry.js','assets/main.js','assets/shared.js']);
});
it('rejects Twitch endpoints hidden in any no-login dynamic dependency',async()=>{
  const root=await mkdtemp(join(tmpdir(),'svc-offline-graph-'));
  try{
    await mkdir(join(root,'assets/pose'),{recursive:true});await mkdir(join(root,'.vite'));
    for(const name of ['vision_wasm_internal.js','vision_wasm_internal.wasm','pose_landmarker_lite.task'])await writeFile(join(root,'assets/pose',name),'');
    await writeFile(join(root,'index.html'),`<meta content="script-src 'self'; connect-src 'self'">`);
    await writeFile(join(root,'assets/entry.js'),'');
    await writeFile(join(root,'assets/main.js'),'const endpoint="https://api.twitch.tv/helix";');
    await writeFile(join(root,'assets/play.js'),'new WebSocket("wss://eventsub.wss.twitch.tv/ws")');
    await writeFile(join(root,'.vite/manifest.json'),JSON.stringify({'index.html':{file:'assets/entry.js',dynamicImports:['src/main.ts']},'src/main.ts':{file:'assets/main.js',dynamicImports:['src/play.ts']},'src/play.ts':{file:'assets/play.js'}}));
    await expect(auditOfflineBuild(root)).rejects.toThrow('offline graph: assets/main.js');
    await writeFile(join(root,'assets/main.js'),'');await expect(auditOfflineBuild(root)).resolves.toContain('assets/play.js');
  }finally{await rm(root,{recursive:true,force:true});}
});
