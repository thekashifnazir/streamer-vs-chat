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
