import {readdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
/** Exact fingerprinted URLs avoid accidentally making unversioned pose files immutable.
 * Static asset requests bypass the API worker; Cloudflare consumes this _headers file.
 * https://developers.cloudflare.com/workers/static-assets/headers/
 */
export function assetHeaders(paths:string[]){
 const immutable=paths.filter(path=>/^assets\/[^/]+-[A-Za-z0-9_-]{8,}\.[^/]+$/.test(path)).sort();
 return ['# Generated: fingerprinted assets only; HTML must revalidate.','/\n  Cache-Control: no-cache','/play\n  Cache-Control: no-cache','/play/\n  Cache-Control: no-cache','/*.html\n  Cache-Control: no-cache',...immutable.map(path=>`/${path}\n  Cache-Control: public, max-age=31536000, immutable`)].join('\n\n')+'\n';
}
export async function writeAssetHeaders(output:string){
 const paths:string[]=[];
 async function walk(directory:string,prefix:string){for(const entry of await readdir(directory,{withFileTypes:true})){const path=prefix+entry.name;if(entry.isDirectory())await walk(join(directory,entry.name),path+'/');else paths.push(path);}}
 await walk(join(output,'assets'),'assets/');
 await writeFile(join(output,'_headers'),assetHeaders(paths));
}
