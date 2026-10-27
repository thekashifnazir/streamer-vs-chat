import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
/** Build-time audit: only local runtime assets, exactly the SIMD fileset in use. */
export async function auditOfflineBuild(root:string):Promise<string[]> {
  const files:string[]=[];
  async function visit(directory:string){for(const name of await readdir(directory)){const path=join(directory,name);if((await stat(path)).isDirectory())await visit(path);else files.push(relative(root,path).replaceAll('\\','/'));}}
  await visit(root);
  if(files.some(path=>/(^|\/)(\.env(?:\.|$)|tokens\.json|node_modules|\.git)/.test(path)))throw new Error('Credential/development files must not ship in the demo');
  const wasm=files.filter(path=>path.endsWith('.wasm'));
  if(wasm.length!==1||wasm[0]!=='assets/pose/vision_wasm_internal.wasm')throw new Error('Offline demo must ship exactly its single SIMD WASM binary');
  for(const path of ['index.html','assets/pose/vision_wasm_internal.js','assets/pose/pose_landmarker_lite.task'])if(!files.includes(path))throw new Error(`Missing offline asset: ${path}`);
  const html=await readFile(join(root,'index.html'),'utf8');
  if(!html.includes("connect-src 'self'")||!html.includes("script-src 'self'"))throw new Error('Demo must keep runtime connections/scripts same-origin');
  for(const file of files.filter(path=>/\.(js|css|html)$/.test(path))) {
    const text=await readFile(join(root,file),'utf8');
    if(/(?:src|href)\s*=\s*["']https?:\/\//i.test(text)||/\b(?:import|export)[^;\n]*?from\s*["']https?:\/\//.test(text))throw new Error(`External runtime dependency in ${file}`);
    const references=[...text.matchAll(/["'`](\/assets\/[\w@./-]+)["'`]/g),...text.matchAll(/url\(\s*["']?(\/assets\/[\w@./-]+)["']?\s*\)/g)];
    for(const match of references) {
      const asset=match[1]!.slice(1);
      if(!files.includes(asset))throw new Error(`Unbundled runtime asset ${asset} referenced by ${file}`);
    }
  }
  return files;
}
