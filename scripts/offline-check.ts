import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
type ManifestChunk={file:string;imports?:string[];dynamicImports?:string[]};
type Manifest=Record<string,ManifestChunk>;
/** The OAuth callback and live controller are conditional dynamic branches.
 * Follow every other static/dynamic dependency, including the full no-login game. */
export function offlineDependencyFiles(manifest:Manifest,entries:string[]=['index.html']):Set<string> {
  const result=new Set<string>(),seen=new Set<string>();
  function visit(key:string) {
    if(seen.has(key))return;seen.add(key);
    const chunk=manifest[key];if(!chunk)throw new Error(`Missing manifest dependency: ${key}`);
    result.add(chunk.file);
    for(const dependency of chunk.imports??[])visit(dependency);
    for(const dependency of chunk.dynamicImports??[]) {
      if(/(?:^|\/)(?:play|twitch\/auth)\.ts$/.test(dependency))continue;
      visit(dependency);
    }
  }
  for(const entry of entries){const key=manifest[entry]?entry:Object.keys(manifest).find(key=>manifest[key]!.file===entry);if(!key)throw new Error(`Missing manifest entry: ${entry}`);visit(key);}return result;
}
/** Match complete inline audio URLs, not MediaPipe's unused dynamic MIME-prefix helper. */
export function hasInlinedAudio(text:string):boolean{return /data:audio\/[a-z0-9!#$&^_.+-]+(?:;[^,\s"'`<>]*)?,/i.test(text);}
/** Local runtime assets and a complete offline demo graph; Twitch is a conditional live branch. */
export async function auditOfflineBuild(root:string):Promise<string[]> {
  const files:string[]=[];
  async function visit(directory:string){for(const name of await readdir(directory)){const path=join(directory,name);if((await stat(path)).isDirectory())await visit(path);else files.push(relative(root,path).replaceAll('\\','/'));}}
  await visit(root);
  if(files.some(path=>/(^|\/)(\.env(?:\.|$)|tokens\.json|node_modules|\.git)/.test(path)))throw new Error('Credential/development files must not ship in the demo');
  const wasm=files.filter(path=>path.endsWith('.wasm'));
  if(wasm.length!==1||wasm[0]!=='assets/pose/vision_wasm_internal.wasm')throw new Error('Offline demo must ship exactly its single SIMD WASM binary');
  for(const path of ['index.html','assets/pose/vision_wasm_internal.js','assets/pose/pose_landmarker_lite.task'])if(!files.includes(path))throw new Error(`Missing offline asset: ${path}`);
  const manifestFile=files.find(path=>path==='.vite/manifest.json');
  const html=await readFile(join(root,'index.html'),'utf8');
  const manifest=manifestFile?JSON.parse(await readFile(join(root,manifestFile),'utf8')) as Manifest:null;
  // Identical multi-page entry scripts are emitted as shared chunks, not HTML keys.
  const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']\/(assets\/[^"']+\.js)["']/g)].map(match=>match[1]!);
  const offlineFiles=manifest?offlineDependencyFiles(manifest,scripts.length?scripts:['index.html']):new Set(files);
  if(!html.includes("connect-src 'self'")||!html.includes("script-src 'self'"))throw new Error('Demo must allow same-origin runtime connections/scripts');
  for(const file of files.filter(path=>/\.(js|css|html)$/.test(path))) {
    const text=await readFile(join(root,file),'utf8');
    if(hasInlinedAudio(text))throw new Error(`Inlined audio must not ship in the demo: ${file}`);
    if(/\.(?:css|html)$/.test(file)&&/url\(\s*["']?https?:\/\//i.test(text))throw new Error(`External CSS runtime dependency in ${file}`);
    if(/(?:src|href)\s*=\s*["']https?:\/\//i.test(text)||/\b(?:import|export)[^;\n]*?from\s*["']https?:\/\//.test(text))throw new Error(`External runtime dependency in ${file}`);
    if(offlineFiles.has(file)&&file.endsWith('.js')&&(/\b(?:fetch|WebSocket|EventSource|import)\s*\(\s*["'`]https?:\/\//.test(text)||/["'`]wss?:\/\//.test(text)||/https:\/\/(?:id|api)\.twitch\.tv/.test(text)))throw new Error(`Twitch/external network dependency in offline graph: ${file}`);
    const references=[...text.matchAll(/["'`](\/assets\/[\w@./-]+)["'`]/g),...text.matchAll(/url\(\s*["']?(\/assets\/[\w@./-]+)["']?\s*\)/g)];
    for(const match of references) {
      const asset=match[1]!.slice(1);
      if(!files.includes(asset))throw new Error(`Unbundled runtime asset ${asset} referenced by ${file}`);
    }
  }
  return files;
}
