/** Opt-in camera-only replay segments. Blobs/URLs never leave this browser. */
export class LocalReplay {
  private recorder:MediaRecorder|null=null;
  private generation=0;
  private stream:MediaStream|null=null;
  private parts:Blob[]=[];
  private timer:ReturnType<typeof setInterval>|undefined;
  private pending=Promise.resolve<Blob|null>(null);
  private clips=new Map<string,{blob:Blob;url:string}>();
  private latest:{at:number;blob:Blob}|null=null;
  constructor(private options:{create?:(stream:MediaStream)=>MediaRecorder;now?:()=>number;createURL?:(blob:Blob)=>string;revokeURL?:(url:string)=>void}={}){}
  private now(){return this.options.now?.()??Date.now();}
  start(stream:MediaStream):boolean {
    this.stop();this.stream=stream;
    if(!this.options.create&&typeof MediaRecorder==='undefined'){this.stream=null;return false;}
    try{this.begin();this.timer=setInterval(()=>{void this.capture();},90000);return true;}
    catch{this.stop();return false;}
  }
  private begin(){
    if(!this.stream)return;
    this.parts=[];
    const recorder=this.options.create?.(this.stream)??new MediaRecorder(this.stream,{videoBitsPerSecond:1000000});
    this.recorder=recorder;
    const parts=this.parts;
    recorder.ondataavailable=event=>{if(event.data.size)parts.push(event.data);};
    recorder.start(1000);
  }
  private capture():Promise<Blob|null> {
    const generation=this.generation;
    this.pending=this.pending.catch(()=>null).then(()=>new Promise<Blob|null>(resolve=>{
      const recorder=this.recorder,parts=this.parts;
      if(generation!==this.generation||!recorder||recorder.state==='inactive'){resolve(null);return;}
      this.recorder=null;
      let settled=false;
      const finish=(blob:Blob|null)=>{
        if(settled)return;settled=true;clearTimeout(timeout);
        recorder.onstop=null;recorder.onerror=null;recorder.ondataavailable=null;
        if(generation===this.generation&&this.stream){try{this.begin();}catch{this.stream=null;}}
        resolve(generation===this.generation?blob:null);
      };
      const timeout=setTimeout(()=>{try{if(recorder.state!=='inactive')recorder.stop();}catch{}finish(null);},3000);
      recorder.onerror=()=>finish(null);
      recorder.onstop=()=>{const blob=new Blob(parts,{type:recorder.mimeType||'video/webm'});finish(blob.size?blob:null);};
      try{recorder.stop();}catch{finish(null);}
    }));
    return this.pending;
  }
  async save(id:string):Promise<boolean> {
    if(this.clips.has(id))return true;
    const generation=this.generation;
    const recent=this.latest&&this.now()-this.latest.at<500?this.latest.blob:null;
    const blob=recent??await this.capture();
    if(!blob||generation!==this.generation)return false;
    this.latest={blob,at:this.now()};
    const url=(this.options.createURL??URL.createObjectURL)(blob);
    this.clips.set(id,{blob,url});
    while(this.clips.size>6||[...this.clips.values()].reduce((sum,item)=>sum+item.blob.size,0)>32000000){
      const oldest=this.clips.keys().next().value!;this.drop(oldest);
    }
    return this.clips.has(id);
  }
  has(id:string){return this.clips.has(id);}
  entries(){return [...this.clips].map(([id,{url}])=>({id,url}));}
  private drop(id:string){const item=this.clips.get(id);if(item)(this.options.revokeURL??URL.revokeObjectURL)(item.url);this.clips.delete(id);}
  stop(){
    this.generation++;this.stream=null;clearInterval(this.timer);this.timer=undefined;
    if(this.recorder?.state!=='inactive')this.recorder?.stop();this.recorder=null;this.parts=[];
    this.latest=null;
  }
  dispose(){this.stop();for(const id of this.clips.keys())this.drop(id);}
}
