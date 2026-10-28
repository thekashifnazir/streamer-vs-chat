/** Counts only. Viewer identities are salted and hashed in memory, never exported. */
type Fight={start:number;end:number|null;messages:number;chatters:Set<string>;voters:Set<string>};
type BaselineMessage={at:number;hash:string|null};
export type PlayMetricsSnapshot={
  baseline:{messages:number;uniqueChatters:number;observedMinutes:number;messagesPerMinute:number;frozen:boolean};
  fights:{fight:number;messages:number;uniqueChatters:number;acceptedVoters:number;minutes:number;messagesPerMinute:number;completed:boolean}[];
  fightsPlayed:number;sessionMinutes:number;
};
const WINDOW=10*60*1000;
async function saltedHash(salt:Uint8Array,userId:string):Promise<string>{
  const identity=new TextEncoder().encode(userId),bytes=new Uint8Array(salt.length+identity.length);
  bytes.set(salt);bytes.set(identity,salt.length);
  const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export class PlayMetrics {
  private salt:Uint8Array;
  private began:number;
  private firstFightAt:number|null=null;
  private baseline:BaselineMessage[]=[];
  private fights:Fight[]=[];
  private active:Fight|null=null;
  private pending=new Set<Promise<void>>();
  private disposed=false;
  constructor(private options:{now?:()=>number;randomBytes?:()=>Uint8Array;hash?:(salt:Uint8Array,userId:string)=>Promise<string>}={}){
    this.began=this.now();
    this.salt=options.randomBytes?.().slice()??globalThis.crypto.getRandomValues(new Uint8Array(32));
  }
  private now(){return this.options.now?.()??Date.now();}
  private prune(at:number){this.baseline=this.baseline.filter(message=>message.at>=at-WINDOW&&message.at<=at);}
  private track(userId:string,receive:(hash:string)=>void):Promise<void>{
    if(this.disposed||!userId)return Promise.resolve();
    // No raw ID cache: even repeated viewers are hashed separately with this
    // session's random salt. Capture destinations before the asynchronous digest.
    const task=Promise.resolve().then(()=> (this.options.hash??saltedHash)(this.salt.slice(),userId)).then(hash=>{
      if(!this.disposed)receive(hash);
    }).catch(()=>{/* A failed digest contributes no fabricated unique identity. */});
    this.pending.add(task);void task.then(()=>this.pending.delete(task));return task;
  }
  observeChat(userId:string,at=this.now()):Promise<void>{
    if(this.disposed||!userId)return Promise.resolve();
    const fight=this.active;
    let baselineMessage:BaselineMessage|undefined;
    if(this.firstFightAt===null){baselineMessage={at,hash:null};this.baseline.push(baselineMessage);this.prune(at);}
    if(fight)fight.messages++;
    if(!fight&&!baselineMessage)return Promise.resolve();
    return this.track(userId,hash=>{if(fight)fight.chatters.add(hash);if(baselineMessage)baselineMessage.hash=hash;});
  }
  acceptedVote(userId:string,_at=this.now()):Promise<void>{
    const fight=this.active;
    return fight?this.track(userId,hash=>fight.voters.add(hash)):Promise.resolve();
  }
  startFight(at=this.now()):number{
    if(this.disposed)return this.fights.length;
    if(this.active)this.endFight(at);
    if(this.firstFightAt===null){this.firstFightAt=at;this.prune(at);}
    this.active={start:at,end:null,messages:0,chatters:new Set(),voters:new Set()};
    this.fights.push(this.active);return this.fights.length;
  }
  endFight(at=this.now()):void{if(this.active){this.active.end=Math.max(this.active.start,at);this.active=null;}}
  snapshot(at=this.now()):PlayMetricsSnapshot{
    const baselineEnd=this.firstFightAt??at;
    if(this.firstFightAt===null)this.prune(at);
    const observedMinutes=Math.max(0,Math.min(WINDOW,baselineEnd-this.began))/60000;
    const rate=(messages:number,minutes:number)=>minutes>0?messages/minutes:0;
    return {baseline:{messages:this.baseline.length,uniqueChatters:new Set(this.baseline.flatMap(message=>message.hash===null?[]:[message.hash])).size,observedMinutes,messagesPerMinute:rate(this.baseline.length,observedMinutes),frozen:this.firstFightAt!==null},
      fights:this.fights.map((fight,index)=>{const minutes=Math.max(0,(fight.end??at)-fight.start)/60000;return {fight:index+1,messages:fight.messages,uniqueChatters:fight.chatters.size,acceptedVoters:fight.voters.size,minutes,messagesPerMinute:rate(fight.messages,minutes),completed:fight.end!==null};}),
      fightsPlayed:this.fights.length,sessionMinutes:Math.max(0,at-this.began)/60000};
  }
  /** Await hashes already received before taking a download snapshot. */
  async exportSnapshot():Promise<PlayMetricsSnapshot>{await Promise.all([...this.pending]);return this.snapshot();}
  dispose():void{this.disposed=true;this.salt.fill(0);this.baseline=[];for(const fight of this.fights){fight.chatters.clear();fight.voters.clear();}}
}
