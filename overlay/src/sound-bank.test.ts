import {expect,it,vi} from 'vitest';
import {GameSound,MIX} from './sound';
// Recorded voice-bank hooks on GameSound: same mute and music duck, announcer priority over taunts.
class Param{value=0;setValueAtTime=vi.fn((value:number)=>{this.value=value;});linearRampToValueAtTime=vi.fn();cancelScheduledValues=vi.fn();}
class Context{
 currentTime=0;state:AudioContextState='running';destination={};gains:{gain:Param;connect:ReturnType<typeof vi.fn>}[]=[];sources:{start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;connect:ReturnType<typeof vi.fn>;buffer:unknown;loop:boolean;onended:null|(()=>void)}[]=[];
 resume=vi.fn(async()=>{});close=vi.fn(async()=>{});decodeAudioData=vi.fn(async()=>({duration:1.5}));
 createGain(){const node={gain:new Param(),connect:vi.fn()};this.gains.push(node);return node;}
 createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:vi.fn()};}
 createBufferSource(){const source={start:vi.fn(),stop:vi.fn(),connect:vi.fn(),buffer:null as unknown,loop:false,onended:null as null|(()=>void)};this.sources.push(source);return source;}
}
async function ready(){const context=new Context(),fetch=vi.fn<typeof globalThis.fetch>(async()=>new Response(new Uint8Array([1])));const sound=new GameSound({defaultEnabled:true,context:()=>context as unknown as AudioContext,fetch});await sound.unlock();await vi.waitFor(()=>expect(sound.canPlay('blockedVoice')).toBe(true));return {sound,context,fetch};}

it('loads extra lines on demand, plays them only with sound on, ducks music and reports speaking',async()=>{
 const {sound,context,fetch}=await ready(),before=fetch.mock.calls.length;
 const buffer=await sound.loadBuffer('/bank/golem/taunt-hit-1.mp3');expect(fetch).toHaveBeenCalledTimes(before+1);expect(buffer?.duration).toBe(1.5);
 expect(sound.speaking()).toBe(false);
 const line=sound.playBuffer(buffer!,{yieldToVoice:true});expect(line).toBeDefined();expect(sound.speaking()).toBe(true);
 expect(context.gains[1]!.gain.setValueAtTime).toHaveBeenCalledWith(MIX.duckGain,0);expect(context.gains[1]!.gain.setValueAtTime).toHaveBeenLastCalledWith(MIX.musicGain,1.5);
 context.currentTime=1.6;expect(sound.speaking()).toBe(false);
 await sound.setRequested(false);expect(sound.playBuffer(buffer!)).toBeUndefined();expect(sound.speaking()).toBe(false);sound.dispose();
 expect(await sound.loadBuffer('/x.mp3')).toBeUndefined();
});
it('an announcer voice cuts a yielding taunt with a short fade but never a coach line',async()=>{
 const {sound,context}=await ready(),buffer=(await sound.loadBuffer('/b.mp3'))!;
 const taunt=sound.playBuffer(buffer,{yieldToVoice:true})!,tauntSource=context.sources.at(-1)!;
 const coach=sound.playBuffer(buffer)!,coachSource=context.sources.at(-1)!;
 let ended=false;void taunt.ended.then(()=>{ended=true;});
 context.currentTime=.2;sound.play('blockedVoice',true);await Promise.resolve();
 expect(tauntSource.stop).toHaveBeenCalledWith(.25);expect(ended).toBe(true);expect(coachSource.stop).not.toHaveBeenCalled();
 coach.stop();expect(coachSource.stop).toHaveBeenCalled();sound.dispose();
});
