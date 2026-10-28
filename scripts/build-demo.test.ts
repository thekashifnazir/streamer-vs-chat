import {expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {buildDemo} from './build-demo';
import {auditOfflineBuild,hasInlinedAudio} from './offline-check';
it('builds dist-demo without data:audio URLs and emits the small vote tick as a file',async()=>{
 const output=await buildDemo();
 const files=await auditOfflineBuild(output);
 for(const notice of ['anton-OFL.txt','barlowcondensed-OFL.txt','Bungee-OFL.txt','RussoOne-OFL.txt','inter-OFL.txt'])expect(files).toContain(`credits/${notice}`);
 expect(files.some(file=>/vote-tick-[^/]+\.wav$/.test(file))).toBe(true);
 for(const file of files){const bytes=await readFile(join(output,file));expect(hasInlinedAudio(bytes.toString('utf8')),file).toBe(false);}
},30000);
