// Explicit asset URLs keep the offline demo self-contained after Vite bundles it.
const urls = {
  telegraph:new URL('../../assets/sfx-ready/hands-up.mp3',import.meta.url).href,
  handsVoice:new URL('../../assets/voice/ready/hands-up.mp3',import.meta.url).href,
  block:new URL('../../assets/sfx-ready/block.mp3',import.meta.url).href,
  blockedVoice:new URL('../../assets/voice/ready/blocked.mp3',import.meta.url).href,
  perfect:new URL('../../assets/sfx-ready/perfect.mp3',import.meta.url).href,
  perfectVoice:new URL('../../assets/voice/ready/perfect.mp3',import.meta.url).href,
  dodge:new URL('../../assets/sfx-ready/dodge.mp3',import.meta.url).href,
  hit:new URL('../../assets/sfx-ready/hit-taken.mp3',import.meta.url).href,
  counter:new URL('../../assets/sfx-ready/counter.mp3',import.meta.url).href,
  counterAccent:new URL('../../assets/sfx-ready/counter-accent.mp3',import.meta.url).href,
  counterVoice:new URL('../../assets/voice/ready/counter.mp3',import.meta.url).href,
  bonus:new URL('../../assets/sfx-ready/punch-bonus.mp3',import.meta.url).href,
  round1:new URL('../../assets/voice/ready/round-1-fight.mp3',import.meta.url).href,
  round2:new URL('../../assets/voice/ready/round-2.mp3',import.meta.url).href,
  round3:new URL('../../assets/voice/ready/final-round.mp3',import.meta.url).href,
  fight:new URL('../../assets/sfx-ready/fight.mp3',import.meta.url).href,
  streamerWins:new URL('../../assets/voice/ready/streamer-wins.mp3',import.meta.url).href,
  chatWins:new URL('../../assets/voice/ready/chat-wins.mp3',import.meta.url).href,
  ko:new URL('../../assets/sfx-ready/ko-bell.mp3',import.meta.url).href,
  koVoice:new URL('../../assets/voice/ready/ko.mp3',import.meta.url).href,
  super:new URL('../../assets/sfx-ready/super-charge.mp3',import.meta.url).href,
  weakness:new URL('../../assets/voice/ready/weakness-found.mp3',import.meta.url).href,
  fixed:new URL('../../assets/voice/ready/fixed-it.mp3',import.meta.url).href,
  cheer:new URL('../../assets/sfx-ready/hype-cheer.mp3',import.meta.url).href,
  vote:new URL('../../assets/sfx-ready/vote-tick.mp3',import.meta.url).href,
  music:new URL('../../assets/sfx-ready/music-battle-loop.mp3',import.meta.url).href,
};
export type Sound=keyof typeof urls;
export const MIX={thresholdDb:-6,ratio:12,musicGain:10**(-6/20),duckGain:10**(-12/20),voiceGapSeconds:2} as const;
/** All cues use decoded buffers. Playback never starts a fetch. */
export class GameSound {
  enabled=false;
  requested:boolean;
  private context?:AudioContext;
  private master?:GainNode;
  private musicGain?:GainNode;
  private buffers=new Map<Sound,AudioBuffer>();
  private music?:AudioBufferSourceNode;
  private loading?:Promise<void>;
  private dead=false;
  private lastVoiceAt=-Infinity;
  private duckUntil=0;
  constructor(private options:{defaultEnabled?:boolean;context?:()=>AudioContext;fetch?:typeof fetch;onChange?:()=>void}={}){this.requested=!!options.defaultEnabled;}
  async prepare():Promise<void> {
    if(this.dead)return;
    if(!this.context) {
      try {
        const context=this.context=this.options.context?.()??new AudioContext();
        this.master=context.createGain();this.master.gain.value=0;
        const limiter=context.createDynamicsCompressor();limiter.threshold.value=MIX.thresholdDb;limiter.ratio.value=MIX.ratio;
        this.master.connect(limiter);limiter.connect(context.destination);
        this.musicGain=context.createGain();this.musicGain.gain.value=MIX.musicGain;this.musicGain.connect(this.master);
        const load=async(name:Sound)=>{
          try {const response=await (this.options.fetch??fetch)(urls[name]);if(response.ok){const buffer=await context.decodeAudioData(await response.arrayBuffer());if(!this.dead){this.buffers.set(name,buffer);if(name==='music')this.startMusic();}}}catch{/* Audio failure never blocks gameplay. */}
        };
        // The warning must not wait for optional music or later-round announcements.
        this.loading=Promise.all([load('telegraph'),load('handsVoice')]).then(()=>{});
        void this.loading.then(()=>{if(!this.dead)void Promise.all((Object.keys(urls) as Sound[]).filter(name=>name!=='telegraph'&&name!=='handsVoice').map(load));});
      }catch{return;}
    }
    await this.loading;
  }
  /** Call from a trusted gesture, or try once for an OBS source allowing autoplay. */
  async unlock():Promise<boolean>{
    if(!this.requested||this.dead)return false;
    const ready=this.prepare(),context=this.context;
    if(!this.requested||!context||this.dead){await ready;return false;}
    const activate=()=>{
      if(this.dead||!this.requested||context.state!=='running')return false;
      this.enabled=true;this.master!.gain.setValueAtTime(1,context.currentTime);
      this.startMusic();
      this.options.onChange?.();return true;
    };
    // Autoplay-blocked resume may remain pending forever. It must never lock UI.
    try{void Promise.all([context.resume(),ready]).then(activate).catch(()=>{});}catch{}
    await ready;return activate();
  }
  private startMusic():void {
    const context=this.context;
    if(!context||!this.enabled||this.dead||this.music||!this.buffers.has('music'))return;
    this.music=context.createBufferSource();this.music.buffer=this.buffers.get('music')!;this.music.loop=true;this.music.connect(this.musicGain!);this.music.start();
  }
  canPlay(name:Sound):boolean{return this.enabled&&!this.dead&&this.buffers.has(name);}
  async setRequested(enabled:boolean,activate=true):Promise<boolean>{
    if(this.dead)return false;
    this.requested=enabled;
    if(!enabled){this.enabled=false;this.master?.gain.setValueAtTime(0,this.context!.currentTime);}
    this.options.onChange?.();
    return enabled&&activate?this.unlock():this.enabled;
  }
  async toggle():Promise<boolean>{return this.setRequested(!this.requested);}
  play(name:Sound,voice=false,priority=false):void {
    const context=this.context,buffer=this.buffers.get(name);
    if(!this.enabled||!context||!buffer||this.dead)return;
    if(voice){
      if(!priority&&context.currentTime-this.lastVoiceAt<MIX.voiceGapSeconds)return;
      this.lastVoiceAt=context.currentTime;this.duckUntil=Math.max(this.duckUntil,context.currentTime+buffer.duration);
      this.musicGain!.gain.cancelScheduledValues(context.currentTime);
      this.musicGain!.gain.setValueAtTime(MIX.duckGain,context.currentTime);
      this.musicGain!.gain.setValueAtTime(MIX.musicGain,this.duckUntil);
    }
    const source=context.createBufferSource();source.buffer=buffer;source.connect(this.master!);source.start();
  }
  dispose(){this.dead=true;this.requested=false;this.enabled=false;try{this.music?.stop();}catch{}void this.context?.close();this.buffers.clear();}
}
