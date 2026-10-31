import {readFileSync,readdirSync} from 'node:fs';
import {expect,it} from 'vitest';
import {RULES} from '../shared/src/engine';
function wavInfo(bytes:Buffer){
 expect(bytes.toString('ascii',0,4)).toBe('RIFF');expect(bytes.toString('ascii',8,12)).toBe('WAVE');
 let format:Buffer|undefined,dataBytes:number|undefined;
 for(let offset=12;offset+8<=bytes.length;){const id=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4);expect(offset+8+size).toBeLessThanOrEqual(bytes.length);if(id==='fmt ')format=bytes.subarray(offset+8,offset+8+size);if(id==='data')dataBytes=size;offset+=8+size+(size%2);}
 expect(format).toBeDefined();expect(dataBytes).toBeDefined();
 return {pcm:format!.readUInt16LE(0),channels:format!.readUInt16LE(2),sampleRate:format!.readUInt32LE(4),bits:format!.readUInt16LE(14),durationMs:dataBytes!/format!.readUInt32LE(8)*1000};
}
it('retains the same 14 ready names as local PCM and fits hands-up inside the telegraph',()=>{
 const directory=new URL('../assets/voice/ready/',import.meta.url);
 const names=['blocked','chat-wins','counter','draw','final-round','fixed-it','hands-up','ko','perfect','round-1-fight','round-2','streamer-wins','super-incoming','weakness-found'].map(name=>`${name}.wav`).sort();
 expect(readdirSync(directory).filter(name=>name.endsWith('.wav')).sort()).toEqual(names);
 for(const name of names){const info=wavInfo(readFileSync(new URL(name,directory)));expect(info,name).toMatchObject({pcm:1,channels:1,sampleRate:44100,bits:16});expect(info.durationMs).toBeGreaterThan(0);if(name==='hands-up.wav')expect(info.durationMs).toBeLessThan(RULES.telegraph);}
});
