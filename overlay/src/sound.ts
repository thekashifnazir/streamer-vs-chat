// Explicit asset URLs keep the offline demo self-contained after Vite bundles it.
const urls = {
  telegraph:new URL('../../assets/sfx-ready/hands-up.wav',import.meta.url).href,
  handsVoice:new URL('../../assets/voice/ready/hands-up.wav',import.meta.url).href,
  block:new URL('../../assets/sfx-ready/block.wav',import.meta.url).href,
  blockedVoice:new URL('../../assets/voice/ready/blocked.wav',import.meta.url).href,
  perfect:new URL('../../assets/sfx-ready/perfect.wav',import.meta.url).href,
  perfectVoice:new URL('../../assets/voice/ready/perfect.wav',import.meta.url).href,
  dodge:new URL('../../assets/sfx-ready/dodge.wav',import.meta.url).href,
  hit:new URL('../../assets/sfx-ready/hit-taken.wav',import.meta.url).href,
  counter:new URL('../../assets/sfx-ready/counter.wav',import.meta.url).href,
  counterAccent:new URL('../../assets/sfx-ready/counter-accent.wav',import.meta.url).href,
  counterVoice:new URL('../../assets/voice/ready/counter.wav',import.meta.url).href,
  bonus:new URL('../../assets/sfx-ready/punch-bonus.wav',import.meta.url).href,
  round1:new URL('../../assets/voice/ready/round-1-fight.wav',import.meta.url).href,
  round2:new URL('../../assets/voice/ready/round-2.wav',import.meta.url).href,
  round3:new URL('../../assets/voice/ready/final-round.wav',import.meta.url).href,
  fight:new URL('../../assets/sfx-ready/fight.wav',import.meta.url).href,
  streamerWins:new URL('../../assets/voice/ready/streamer-wins.wav',import.meta.url).href,
  chatWins:new URL('../../assets/voice/ready/chat-wins.wav',import.meta.url).href,
  ko:new URL('../../assets/sfx-ready/ko-bell.wav',import.meta.url).href,
  koVoice:new URL('../../assets/voice/ready/ko.wav',import.meta.url).href,
  super:new URL('../../assets/sfx-ready/super-charge.wav',import.meta.url).href,
  weakness:new URL('../../assets/voice/ready/weakness-found.wav',import.meta.url).href,
  fixed:new URL('../../assets/voice/ready/fixed-it.wav',import.meta.url).href,
  cheer:new URL('../../assets/sfx-ready/hype-cheer.wav',import.meta.url).href,
  vote:new URL('../../assets/sfx-ready/vote-tick.wav',import.meta.url).href,
  music:new URL('../../assets/sfx-ready/music-battle-loop.wav',import.meta.url).href,
};
type Sound=keyof typeof urls;
export class GameSound {
  enabled=false;
  private context?:AudioContext;
  private master?:GainNode;
  private musicGain?:GainNode;
  private buffers=new Map<Sound,AudioBuffer>();
  private music?:AudioBufferSourceNode;
  private loading?:Promise<void>;
  private dead=false;
  private lastVoiceAt=-Infinity;
  async toggle():Promise<boolean> {
    if(this.dead)return false;
    if(this.enabled){this.enabled=false;this.master?.gain.setValueAtTime(0,this.context!.currentTime);return false;}
    if(!this.context) {
      const context=this.context=new AudioContext();
      this.master=context.createGain();this.master.gain.value=0;
      const limiter=context.createDynamicsCompressor();limiter.threshold.value=-6;limiter.ratio.value=12;
      this.master.connect(limiter);limiter.connect(context.destination);
      this.musicGain=context.createGain();this.musicGain.gain.value=.5;this.musicGain.connect(this.master);
      this.loading=Promise.all(Object.entries(urls).map(async([name,url])=>{
        try {const response=await fetch(url);if(response.ok)this.buffers.set(name as Sound,await context.decodeAudioData(await response.arrayBuffer()));}catch{/* Audio failure never blocks gameplay. */}
      })).then(()=>{});
    }
    await this.context.resume();await this.loading;
    if(this.dead)return false;
    this.enabled=true;this.master!.gain.setValueAtTime(1,this.context.currentTime);
    if(!this.music&&this.buffers.has('music')) {
      this.music=this.context.createBufferSource();this.music.buffer=this.buffers.get('music')!;this.music.loop=true;this.music.connect(this.musicGain!);this.music.start();
    }
    return true;
  }
  play(name:Sound,voice=false):void {
    const context=this.context,buffer=this.buffers.get(name);
    if(!this.enabled||!context||!buffer||this.dead)return;
    if(voice) {
      if(context.currentTime-this.lastVoiceAt<2)return;
      this.lastVoiceAt=context.currentTime;
      this.musicGain!.gain.cancelScheduledValues(context.currentTime);
      this.musicGain!.gain.setValueAtTime(.25,context.currentTime);
      this.musicGain!.gain.setValueAtTime(.5,context.currentTime+buffer.duration);
    }
    const source=context.createBufferSource();source.buffer=buffer;source.connect(this.master!);source.start();
  }
  dispose(){this.dead=true;this.enabled=false;this.music?.stop();void this.context?.close();}
}
