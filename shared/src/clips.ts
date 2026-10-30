import type { HighlightCandidate } from './highlights';

/** Transport returns only data; a Create Clip response is never confirmation. */
export type ClipTransport={
  getStream:()=>Promise<{startedAt:number}|null>;
  createClip:()=>Promise<string|null>;
  getClip:(id:string)=>Promise<{id:string;url:string}|null>;
};
export type ReplayRequest={highlightId:string;at:number};
export type HighlightEntry={highlight:HighlightCandidate;status:'queued'|'pending'|'replay-pending'|'confirmed'|'replay'|'stats-only'|'skipped'|'dropped';clipId?:string;url?:string;reason?:string};
export class ServerHighlightCoordinator {
  private entries:HighlightEntry[]=[];
  private seen=new Set<string>();
  private queue:HighlightEntry[]=[];
  private enqueuedAt=new WeakMap<HighlightEntry,number>();
  private running:Promise<void>|null=null;
  private active:HighlightEntry|null=null;
  private stopped=false;
  private lastCreate=-Infinity;
  private abort=new AbortController();
  constructor(private options:{transport:ClipTransport;onReplayRequest?:(request:ReplayRequest)=>void;onChange?:()=>void;now?:()=>number;sleep?:(ms:number)=>Promise<void>;cooldownMs?:number}){}
  private now(){return this.options.now?.()??Date.now();}
  private sleep(ms:number){return this.options.sleep?.(ms)??new Promise<void>(resolve=>{
    const done=()=>{clearTimeout(timer);this.abort.signal.removeEventListener('abort',done);resolve();};
    const timer=setTimeout(done,ms);this.abort.signal.addEventListener('abort',done,{once:true});
  });}
  private request<T>(promise:Promise<T>,timeoutMs:number):Promise<T>{
    return new Promise<T>((resolve,reject)=>{
      const finish=(action:()=>void)=>{clearTimeout(timer);this.abort.signal.removeEventListener('abort',cancel);action();};
      const cancel=()=>finish(()=>reject(new Error('closed')));
      const timer=setTimeout(()=>finish(()=>reject(new Error('request-timeout'))),timeoutMs);
      this.abort.signal.addEventListener('abort',cancel,{once:true});
      promise.then(value=>finish(()=>resolve(value)),error=>finish(()=>reject(error)));
      if(this.stopped)cancel();
    });
  }
  snapshot():HighlightEntry[]{return this.entries.map(entry=>({...entry,highlight:{...entry.highlight}}));}
  enqueue(highlight:HighlightCandidate):void {
    if(this.stopped||this.seen.has(highlight.id))return;
    this.seen.add(highlight.id);
    const entry:HighlightEntry={highlight:{...highlight},status:'queued'};
    this.enqueuedAt.set(entry,this.now());
    this.entries.push(entry);
    if(this.entries.length>100)this.entries.shift();
    this.queue.push(entry);this.queue.sort((a,b)=>b.highlight.priority-a.highlight.priority||a.highlight.at-b.highlight.at);
    if(this.queue.length+(this.active?1:0)>3){const dropped=this.queue.pop()!;dropped.status='dropped';dropped.reason='queue-full';}
    this.changed();
    if(!this.running)this.running=this.drain().finally(()=>{this.running=null;});
  }
  async idle():Promise<void>{await this.running;}
  ackReplay(highlightId:string,available:boolean):void {
    const entry=this.entries.find(item=>item.highlight.id===highlightId);
    if(entry?.status!=='replay-pending')return;
    entry.status=available?'replay':'stats-only';entry.reason=available?'local-replay':'replay-unavailable';this.changed();
  }
  close():void{this.stopped=true;this.abort.abort();for(const entry of this.queue){entry.status='dropped';entry.reason='closed';}this.queue=[];}
  private changed(){this.options.onChange?.();}
  private async drain(){
    while(!this.stopped&&this.queue.length){
      // Wait before selecting: a KO arriving during cooldown outranks PERFECTs.
      const wait=this.lastCreate+(this.options.cooldownMs??30000)-this.now();
      if(wait>0)await this.sleep(wait);
      if(this.stopped)break;
      const entry=this.queue.shift()!;
      this.active=entry;
      try{await this.process(entry);}catch{entry.status=this.stopped?'dropped':'stats-only';entry.reason=this.stopped?'closed':'unavailable';}
      this.active=null;
      this.changed();
    }
  }
  private async process(entry:HighlightEntry){
    if(this.stopped){entry.status='dropped';entry.reason='closed';return;}
    const stream=await this.request(this.options.transport.getStream(),5000);
    if(!stream){entry.status='stats-only';entry.reason='offline';return;}
    if(!Number.isFinite(stream.startedAt)||this.now()-stream.startedAt<60000){entry.status='skipped';entry.reason='stream-first-minute';return;}
    // Create Clip captures the current stream. A queued moment must use its
    // already-saved local snapshot rather than label later footage as that moment.
    if(this.now()-this.enqueuedAt.get(entry)!>10000){this.replay(entry,'stale-request');return;}
    this.lastCreate=this.now();
    const id=await this.request(this.options.transport.createClip(),5000);
    if(!id){entry.status='stats-only';entry.reason='create-failed';return;}
    entry.status='pending';this.changed();
    const deadline=this.now()+15000;
    while(!this.stopped){
      let clip:Awaited<ReturnType<ClipTransport['getClip']>>;
      try{clip=await this.request(this.options.transport.getClip(id),Math.max(1,deadline-this.now()));}
      catch{break;}
      if(clip?.id===id&&clip.url&&this.now()<=deadline){entry.status='confirmed';entry.clipId=clip.id;entry.url=clip.url;return;}
      const remaining=deadline-this.now();if(remaining<=0)break;
      await this.sleep(Math.min(250,remaining));
    }
    if(this.stopped){entry.status='dropped';entry.reason='closed';return;}
    this.replay(entry,'confirmation-timeout');
  }
  private replay(entry:HighlightEntry,reason:string){
    entry.status=this.options.onReplayRequest?'replay-pending':'stats-only';entry.reason=reason;
    this.options.onReplayRequest?.({highlightId:entry.highlight.id,at:entry.highlight.at});
  }
}
