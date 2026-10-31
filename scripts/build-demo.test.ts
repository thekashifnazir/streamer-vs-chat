import {expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {buildDemo} from './build-demo';
import {auditOfflineBuild,hasInlinedAudio} from './offline-check';
it('builds dist-demo without data:audio URLs and emits the compressed audio as files',async()=>{
 const output=await buildDemo();
 const files=await auditOfflineBuild(output);
 for(const notice of ['anton-OFL.txt','barlowcondensed-OFL.txt','Bungee-OFL.txt','RussoOne-OFL.txt','inter-OFL.txt'])expect(files).toContain(`credits/${notice}`);
 expect(files.some(file=>/vote-tick-[^/]+\.mp3$/.test(file))).toBe(true);
 expect(files.filter(file=>/\.(wav|ogg|m4a|mp3)$/i.test(file))).toHaveLength(26);
 expect(files.some(file=>/\.(wav|ogg)$/i.test(file))).toBe(false);
 expect(files.some(file=>/boss-sheet@1x-[^/]+\.webp$/.test(file))).toBe(true);
 for(const file of files){const bytes=await readFile(join(output,file));expect(hasInlinedAudio(bytes.toString('utf8')),file).toBe(false);if(file.endsWith('.mp3')){expect(bytes.subarray(0,4).toString(),file).not.toBe('RIFF');expect(bytes.subarray(0,3).toString()==='ID3'||bytes[0]===0xff&&(bytes[1]!&0xe0)===0xe0,file).toBe(true);}}
},30000);
