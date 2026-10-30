import {describe,it,expect,vi} from 'vitest';
import {HostedResultsQueue,type QueueStorage,type QueueOperations} from './queue.js';
class Storage implements QueueStorage {
  data=new Map<string,unknown>(); alarm:number|null=null;
  async get<T>(key:string):Promise<T|undefined>{return structuredClone(this.data.get(key)) as T|undefined;}
  async put<T>(key:string,value:T){this.data.set(key,structuredClone(value));}
  async setAlarm(at:number){this.alarm=at;}
  async deleteAlarm(){this.alarm=null;}
  async transaction<T>(work:(storage:QueueOperations)=>Promise<T>):Promise<T>{return work(this);}
}
function setup(){let now=100000;let enabled=true;const storage=new Storage();const send=vi.fn(async(_channel:string,_message:string)=>({dropReason:null as string|null}));const queue=new HostedResultsQueue(storage,()=>now,()=>enabled,send);return {queue,storage,send,time:(value:number)=>{now=value;},off:()=>{enabled=false;}};}
describe('ChannelHub persistent result queue',()=>{
  it('flushes through alarms, spaces attempts 10 seconds and drops oldest beyond three pending',async()=>{
    const s=setup();await s.queue.enqueue('123','first');expect(s.send).not.toHaveBeenCalled();await s.queue.alarm();
    for(const message of ['old','two','three','four'])await s.queue.enqueue('123',message);
    expect(await s.queue.status('123')).toEqual({dropReason:null,pending:3});
    s.time(109999);await s.queue.alarm();expect(s.send).toHaveBeenCalledTimes(1);
    s.time(110000);await s.queue.alarm();expect(s.send.mock.calls[1]).toEqual(['123','two']);
    s.time(120000);await s.queue.alarm();s.time(130000);await s.queue.alarm();
    expect(s.send.mock.calls.map(call=>call[1])).toEqual(['first','two','three','four']);expect(s.storage.alarm).toBeNull();
  });
  it('survives eviction and alarm redelivery without resending a consumed message',async()=>{
    const s=setup();await s.queue.enqueue('123','one');await s.queue.enqueue('123','two');await s.queue.alarm();
    const recovered=new HostedResultsQueue(s.storage,()=>105000,()=>true,s.send);await recovered.alarm();expect(s.send).toHaveBeenCalledTimes(1);
    expect(await recovered.status('123')).toEqual({dropReason:null,pending:1});
  });
  it('does not block enqueue on a slow upstream and reserves before sending',async()=>{
    const s=setup();let finish!:(value:{dropReason:string|null})=>void;
    const sender=vi.fn(()=>new Promise<{dropReason:string|null}>(resolve=>{finish=resolve;}));
    const queue=new HostedResultsQueue(s.storage,()=>100000,()=>true,sender);
    await queue.enqueue('123','one');const attempt=queue.alarm();await vi.waitFor(()=>expect(sender).toHaveBeenCalledOnce());
    await queue.enqueue('123','two');expect((await queue.status('123')).pending).toBe(1);
    await queue.alarm();expect(sender).toHaveBeenCalledOnce();finish({dropReason:null});await attempt;
  });
  it('keeps spacing after slow token or chat requests complete',async()=>{
    const s=setup();let finish!:(value:{dropReason:string|null})=>void;
    let calls=0;const sender=vi.fn((_channel:string,_message:string)=>++calls===1?new Promise<{dropReason:string|null}>(resolve=>{finish=resolve;}):Promise.resolve({dropReason:null}));
    const queue=new HostedResultsQueue(s.storage,()=>clock,()=>true,sender);let clock=100000;
    await queue.enqueue('123','one');const attempt=queue.alarm();await vi.waitFor(()=>expect(sender).toHaveBeenCalledOnce());await queue.enqueue('123','two');
    clock=125000;finish({dropReason:null});await attempt;await queue.alarm();expect(sender).toHaveBeenCalledOnce();
    clock=135000;await queue.alarm();expect(sender).toHaveBeenCalledTimes(2);
  });
  it('remembers only the failure code, clears it on success and holds the channel identity',async()=>{
    const s=setup();s.send.mockResolvedValueOnce({dropReason:'forbidden'});await s.queue.enqueue('123','one');await s.queue.alarm();expect((await s.queue.status('123')).dropReason).toBe('forbidden');
    await expect(s.queue.enqueue('456','wrong')).rejects.toThrow('channel-mismatch');
    await expect(s.queue.status('456')).rejects.toThrow('channel-mismatch');
    await s.queue.enqueue('123','two');s.time(110000);await s.queue.alarm();expect((await s.queue.status('123')).dropReason).toBeNull();
  });
  it('discards pending messages when the flag switches off before an alarm',async()=>{
    const s=setup();await s.queue.enqueue('123','one');s.off();await s.queue.alarm();expect(s.send).not.toHaveBeenCalled();expect(s.storage.alarm).toBeNull();expect((await s.queue.status('123')).pending).toBe(0);
    await expect(s.queue.enqueue('123','two')).rejects.toThrow('hosted-bot-off');
  });
  it('consumes a failed attempt without unhandled failures or unsafe retries',async()=>{
    const s=setup();s.send.mockRejectedValueOnce(new Error('sensitive upstream body'));await s.queue.enqueue('123','one');await s.queue.alarm();expect(await s.queue.status('123')).toEqual({dropReason:'send_failed',pending:0});expect(JSON.stringify([...s.storage.data])).not.toContain('sensitive');
  });
});
