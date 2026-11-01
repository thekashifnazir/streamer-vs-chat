import {readFileSync,readdirSync,statSync} from 'node:fs';
import {expect,it} from 'vitest';
// Recorded voice bank: every voice speaks every line of its bank, shipped as small mono MP3s that match lines.json.
const root=new URL('../assets/voice/bank/',import.meta.url);
type Voice={id:string;name:string;voice_id:string;model_id:string};
const lines=JSON.parse(readFileSync(new URL('lines.json',root),'utf8')) as {voices:Record<'boss'|'coach',Voice[]>;lines:Record<'boss'|'coach',Record<string,string[]>>;sfx:Record<string,unknown>};
const durations=JSON.parse(readFileSync(new URL('durations.json',root),'utf8')) as Record<string,Record<string,number[]>>;
/** First MPEG audio frame header after any ID3 tag: version, layer, sample rate and channel mode. */
function mp3Format(bytes:Buffer){
 let offset=bytes.toString('latin1',0,3)==='ID3'?10+((bytes[6]!&127)<<21|(bytes[7]!&127)<<14|(bytes[8]!&127)<<7|(bytes[9]!&127)):0;
 while(offset<bytes.length-4&&!(bytes[offset]===0xff&&(bytes[offset+1]!&0xe0)===0xe0))offset++;
 const b1=bytes[offset+1]!,b2=bytes[offset+2]!,b3=bytes[offset+3]!;
 return {mpeg1:(b1>>3&3)===3,layer3:(b1>>1&3)===1,sampleRate:[44100,48000,32000][b2>>2&3],mono:(b3>>6)===3};
}
it('ships exactly one file per line for every voice, in eleven_v4, mono 44.1 kHz MP3',()=>{
 for(const bank of ['boss','coach'] as const)for(const voice of lines.voices[bank]){
  expect(voice.voice_id,voice.id).toMatch(/^\w{20}$/);expect(voice.model_id).toBe('eleven_v4');
  const expected=Object.entries(lines.lines[bank]).flatMap(([cue,texts])=>texts.map((_,index)=>`${cue}-${index+1}.mp3`)).sort();
  const files=readdirSync(new URL(`${voice.id}/`,root)).filter(name=>name.endsWith('.mp3')).sort();
  expect(files,voice.id).toEqual(expected);
  const qc=JSON.parse(readFileSync(new URL(`${voice.id}/qc.json`,root),'utf8')) as {files:Record<string,{text:string;voice_id:string;model_id:string;peak_db:number}>};
  for(const [cue,texts] of Object.entries(lines.lines[bank]))texts.forEach((text,index)=>{const entry=qc.files[`${cue}-${index+1}.mp3`]!;expect(entry.text,`${voice.id} ${cue}-${index+1}`).toBe(text);expect(entry.voice_id).toBe(voice.voice_id);expect(entry.model_id).toBe(voice.model_id);});
  for(const name of files){const format=mp3Format(readFileSync(new URL(`${voice.id}/${name}`,root)));expect(format,`${voice.id}/${name}`).toEqual({mpeg1:true,layer3:true,sampleRate:44100,mono:true});}
  expect(Object.keys(durations[voice.id]!)).toEqual(Object.keys(lines.lines[bank]));
  for(const [cue,list] of Object.entries(durations[voice.id]!)){expect(list).toHaveLength(lines.lines[bank][cue]!.length);for(const seconds of list)expect(seconds).toBeGreaterThan(.3);}
 }
 expect(readdirSync(new URL('sfx/',root)).filter(name=>name.endsWith('.mp3')).sort()).toEqual(Object.keys(lines.sfx).map(name=>`${name}.mp3`).sort());
});
it('keeps the whole bank on disk under 15 MB (only the chosen voice is ever fetched)',()=>{
 let bytes=0;for(const folder of readdirSync(root)){const path=new URL(`${folder}/`,root);try{for(const name of readdirSync(path))if(name.endsWith('.mp3'))bytes+=statSync(new URL(name,path)).size;}catch{/* lines.json and other files */}}
 expect(bytes).toBeLessThan(15e6);
});
