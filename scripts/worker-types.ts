import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const temporary=await mkdtemp(join(tmpdir(),'svc-worker-types-'));
try {
 // No server dotenv, credentials or telemetry participate in generating public binding types.
 const env:NodeJS.ProcessEnv={PATH:process.env.PATH,TMPDIR:process.env.TMPDIR,
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false',WRANGLER_SEND_METRICS:'false',WRANGLER_SEND_ERROR_REPORTS:'false',
  WRANGLER_LOG_PATH:join(temporary,'wrangler.log'),CI:'true'};
 await new Promise<void>((resolve,reject)=>{
  const child=spawn(process.execPath,[join(root,'node_modules/wrangler/bin/wrangler.js'),'types','--include-runtime=false','--strict-vars=false','--env-interface=WorkerEnv','worker/bindings.d.ts'],{cwd:root,env,stdio:'inherit'});
  child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error(`Worker type generation exited ${code}`)));
 });
 const path=join(root,'worker/bindings.d.ts');
 const generated=await readFile(path,'utf8');
 // A module boundary keeps generated NodeJS.ProcessEnv and Cloudflare declarations local.
 // The platform shim imports only the Workers types this browser+Node monorepo needs.
 await writeFile(path,generated.replace(/\nexport type \{WorkerEnv\};\s*$/,'')+'\nexport type {WorkerEnv};\n');
} finally {await rm(temporary,{recursive:true,force:true});}
