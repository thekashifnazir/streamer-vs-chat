import { preview } from 'vite';
import { join } from 'node:path';
import { buildDemo, projectRoot } from './build-demo.js';

await buildDemo({mock:process.argv.includes('--mock')});
const server=await preview({
  configFile:false,root:join(projectRoot,'demo'),envDir:false,publicDir:false,
  build:{outDir:join(projectRoot,'dist-demo')},
  preview:{host:'127.0.0.1',port:4173,strictPort:true},
});
console.log('[demo] / = SIMULATED CHAT, no login · /play/ = optional Twitch-connected play');
server.printUrls();
for(const signal of ['SIGINT','SIGTERM'] as const) process.once(signal,()=>server.httpServer.close());
