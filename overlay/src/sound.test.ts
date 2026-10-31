import {expect,it,vi} from 'vitest';
import {GameSound,MIX} from './sound';
class Param{value=0;calls:{value:number;at:number}[]=[];setValueAtTime(value:number,at:number){this.value=value;this.calls.push({value,at});}cancelScheduledValues=vi.fn();}
class Context{
 currentTime=0;state:AudioContextState='running';destination={};gains:{gain:Param;connect:ReturnType<typeof vi.fn>}[]=[];sources:{start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;connect:ReturnType<typeof vi.fn>;buffer:unknown;loop:boolean}[]=[];
 compressor={threshold:new Param(),ratio:new Param(),connect:vi.fn()};
 resume=vi.fn(async()=>{});close=vi.fn(async()=>{});decodeAudioData=vi.fn(async()=>({duration:2}));
 createGain(){const node={gain:new Param(),connect:vi.fn()};this.gains.push(node);return node;}
 createDynamicsCompressor(){return this.compressor;}
 createBufferSource(){const source={start:vi.fn(),stop:vi.fn(),connect:vi.fn(),buffer:null as unknown,loop:false};this.sources.push(source);return source;}
}
function setup(defaultEnabled=false){const context=new Context(),fetch=vi.fn<typeof globalThis.fetch>(async()=>new Response(new Uint8Array([1,2])));const sound=new GameSound({defaultEnabled,context:()=>context as unknown as AudioContext,fetch});return{sound,context,fetch};}
it('predecodes locally, keeps demo off, uses exact limiter/music mix and fetches nothing at a cue',async()=>{
 const {sound,context,fetch}=setup();await sound.prepare();expect(sound.enabled).toBe(false);expect(context.decodeAudioData).toHaveBeenCalled();expect(context.compressor.threshold.value).toBe(-6);expect(context.compressor.ratio.value).toBe(12);expect(context.gains[1]!.gain.value).toBe(MIX.musicGain);
 await sound.toggle();expect(sound.enabled).toBe(true);await vi.waitFor(()=>expect(context.sources.filter(source=>source.loop)).toHaveLength(1));const count=fetch.mock.calls.length;sound.play('telegraph');sound.play('handsVoice',true);expect(fetch).toHaveBeenCalledTimes(count);expect(context.gains[1]!.gain.calls.at(-2)?.value).toBe(MIX.duckGain);expect(context.sources.filter(source=>source.loop)).toHaveLength(1);sound.dispose();
});
it('throttles voices and extends ducking across overlapping priority announcements',async()=>{
 const {sound,context}=setup();await sound.toggle();await vi.waitFor(()=>expect(sound.canPlay('blockedVoice')).toBe(true));sound.play('handsVoice',true);const n=context.sources.length;context.currentTime=.5;sound.play('blockedVoice',true);expect(context.sources).toHaveLength(n);sound.play('fixed',true,true);expect(context.gains[1]!.gain.calls.at(-1)).toEqual({value:MIX.musicGain,at:2.5});expect(context.gains[1]!.gain.cancelScheduledValues).toHaveBeenCalledWith(.5);sound.dispose();
});
it('OBS requests sound by default without locking controls on a pending autoplay resume',async()=>{
 const {sound,context}=setup(true);context.state='suspended';context.resume.mockImplementation(()=>new Promise<void>(()=>{}));expect(await sound.unlock()).toBe(false);expect(sound.requested).toBe(true);expect(sound.enabled).toBe(false);expect(await sound.toggle()).toBe(false);expect(sound.requested).toBe(false);expect(await sound.toggle()).toBe(false);expect(sound.requested).toBe(true);
 sound.dispose();expect(context.close).toHaveBeenCalledOnce();expect(sound.requested).toBe(false);expect(await sound.toggle()).toBe(false);
});
it('a disposed pending resume cannot restart music or sound',async()=>{
 const {sound,context}=setup(true);let resume!:()=>void;context.state='suspended';context.resume.mockImplementation(()=>new Promise<void>(resolve=>{resume=resolve;}));await sound.unlock();sound.dispose();context.state='running';resume();await Promise.resolve();await Promise.resolve();expect(sound.enabled).toBe(false);expect(context.sources).toHaveLength(0);
});
it('M can cancel requested OBS sound before the autoplay resume resolves',async()=>{
 const {sound,context}=setup(true);let resume!:()=>void;context.state='suspended';context.resume.mockImplementation(()=>new Promise<void>(resolve=>{resume=resolve;}));await sound.unlock();await sound.toggle();expect(sound.requested).toBe(false);context.state='running';resume();await Promise.resolve();await Promise.resolve();expect(sound.enabled).toBe(false);expect(context.sources).toHaveLength(0);sound.dispose();
});

it('critical warning readiness does not await optional music and late music starts once enabled',async()=>{
 const {sound,context}=setup(true);let music!:()=>void;
 const request=vi.fn<typeof fetch>(async url=>{if(String(url).includes('music-battle-loop'))await new Promise<void>(resolve=>{music=resolve;});return new Response(new Uint8Array([1]));});
 const audio=new GameSound({defaultEnabled:true,context:()=>context as unknown as AudioContext,fetch:request});
 expect(request).not.toHaveBeenCalled();await audio.unlock();expect(audio.canPlay('telegraph')).toBe(true);expect(audio.canPlay('handsVoice')).toBe(true);expect(context.sources.some(source=>source.loop)).toBe(false);
 await vi.waitFor(()=>expect(music).toBeTypeOf('function'));music();await vi.waitFor(()=>expect(context.sources.filter(source=>source.loop)).toHaveLength(1));audio.dispose();sound.dispose();
});
