import {describe,it,expect} from 'vitest';
import {assetHeaders} from './asset-headers';
import {readFile} from 'node:fs/promises';
describe('static asset cache headers',()=>{
 it('makes fingerprinted assets immutable without overlapping HTML or unversioned pose rules',()=>{
  const text=assetHeaders(['assets/index-AbCd_123.js','assets/sheet-z_3abcde.webp','assets/pose/vision_wasm_internal.wasm','assets/pose/pose_landmarker_lite.task']);
  const rules=text.split('\n\n').filter(block=>!block.startsWith('#')).map(block=>{const [path,...lines]=block.trim().split('\n');return {path:path!,value:lines.join('\n')};});
  const headers=(url:string)=>rules.filter(rule=>new RegExp('^'+rule.path.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replaceAll('*','.*')+'$').test(url)).map(rule=>rule.value);
  for(const url of ['/assets/index-AbCd_123.js','/assets/sheet-z_3abcde.webp'])expect(headers(url)).toEqual(['  Cache-Control: public, max-age=31536000, immutable']);
  for(const url of ['/','/play','/play/','/index.html','/play/index.html'])expect(headers(url)).toEqual(['  Cache-Control: no-cache']);
  expect(headers('/assets/pose/vision_wasm_internal.wasm')).toEqual([]);expect(headers('/assets/pose/pose_landmarker_lite.task')).toEqual([]);
 });
 it('uses static assets headers because only API routes run the worker first',async()=>{const config=await readFile('wrangler.toml','utf8');expect(config).toContain('run_worker_first = ["/api/*"]');const builder=await readFile('scripts/build-demo.ts','utf8');expect(builder).toContain('writeAssetHeaders(output)');});
});
