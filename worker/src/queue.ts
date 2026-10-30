import type {ChatSendResult} from './app-token.js';
export interface QueueOperations {
  get<T>(key:string):Promise<T|undefined>;
  put<T>(key:string,value:T):Promise<unknown>;
  setAlarm(at:number):Promise<unknown>;
  deleteAlarm():Promise<unknown>;
}
export interface QueueStorage extends QueueOperations {
  transaction<T>(work:(storage:QueueOperations)=>Promise<T>):Promise<T>;
}
interface QueueState {channel:string; pending:string[]; lastAttempt:number|null; dropReason:string|null}
export interface QueueStatus {dropReason:string|null;pending:number}
/** One persistent queue per authenticated broadcaster; all writes precede external sends. */
export class HostedResultsQueue {
  private tail:Promise<unknown>=Promise.resolve();
  private sending=false;
  constructor(private storage:QueueStorage,private now:()=>number,private enabled:()=>boolean,private send:(channel:string,message:string)=>Promise<ChatSendResult>) {}
  private serial<T>(work:()=>Promise<T>):Promise<T> {
    const result=this.tail.then(work);this.tail=result.catch(()=>{});return result;
  }
  private async state(channel:string):Promise<QueueState> {
    if(!/^[0-9]{1,30}$/.test(channel))throw new Error('invalid-channel');
    const state=await this.storage.get<QueueState>('results');
    if(state && state.channel!==channel)throw new Error('channel-mismatch');
    return state??{channel,pending:[],lastAttempt:null,dropReason:null};
  }
  private async save(state:QueueState):Promise<void> {
    const alarm=state.pending.length && this.enabled()?Math.max(this.now()+(this.sending?10000:1),(state.lastAttempt??-10000)+10000):null;
    // Queue state and its wake-up are one durable commit, including across an isolate crash.
    await this.storage.transaction(async storage=>{
      await storage.put('results',state);
      if(alarm!==null)await storage.setAlarm(alarm);else await storage.deleteAlarm();
    });
  }
  enqueue(channel:string,message:string):Promise<void> {
    return this.serial(async()=>{
      if(!this.enabled())throw new Error('hosted-bot-off');
      // Only the Worker calls this with its own formatter output. Never a general chat relay.
      if(!message || message.length>500)throw new Error('invalid-result-text');
      const state=await this.state(channel);state.pending.push(message);state.pending=state.pending.slice(-3);
      await this.save(state);
    });
  }
  status(channel:string):Promise<QueueStatus> {return this.serial(async()=>{const state=await this.state(channel);return {dropReason:state.dropReason,pending:state.pending.length};});}
  async alarm():Promise<void> {
    const reserved=await this.serial(async()=>{
      const state=await this.storage.get<QueueState>('results');
      if(!state)return null;
      if(!this.enabled()){state.pending=[];await this.save(state);return null;}
      if(this.sending || !state.pending.length || state.lastAttempt!==null && this.now()-state.lastAttempt<10000){await this.save(state);return null;}
      const message=state.pending.shift()!;state.lastAttempt=this.now();
      // Consume before fetch: at-least-once alarm delivery must not duplicate a chat post.
      await this.save(state);this.sending=true;
      return {channel:state.channel,message};
    });
    if(!reserved)return;
    let result:ChatSendResult;
    try{result=await this.send(reserved.channel,reserved.message);}catch{result={dropReason:'send_failed'};}
    await this.serial(async()=>{
      this.sending=false;
      const state=await this.state(reserved.channel);state.dropReason=result.dropReason;state.lastAttempt=this.now();
      await this.save(state);
    });
  }
}
