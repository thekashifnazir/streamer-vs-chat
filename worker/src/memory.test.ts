import {describe,it,expect} from 'vitest';
import {HostedMemory} from './memory';
import type {MemoryStorage,MemoryTransaction} from './memory-storage';
import type {MemoryEvent} from '../../shared/src/memory-events';
import {validateMemoryBatch} from '../../shared/src/memory-events';
class Storage implements MemoryStorage {
 async flush():Promise<void>{}
 data:unknown;seen=new Map<string,number>();fail=false;
 transaction<T>(work:(storage:MemoryTransaction)=>T):T {
  let data=structuredClone(this.data);const seen=new Map(this.seen);
  const result=work({forgetVotes:user=>{for(const key of seen.keys())if(JSON.parse(key)[2]===user)seen.delete(key);},load:()=>data,save:value=>{data=structuredClone(value);},vote:(session,beat,user,at)=>{const key=JSON.stringify([session,beat,user]);if(seen.has(key))return false;seen.set(key,at);return true;},prune:before=>{for(const [key,at]of seen)if(at<before)seen.delete(key);}});
  if(this.fail)throw new Error('storage failed');this.data=data;this.seen=seen;return result;
 }
}
const vote=(beatId='b1',userId='2',displayName='Two'):MemoryEvent=>({kind:'vote',sessionId:'s1',beatId,userId,displayName,move:'JAB'});
const round:MemoryEvent={kind:'round',sessionId:'s1',roundId:'r1',winner:'boss',reason:'ko',koMove:'JAB',koSupporters:['2','2']};
function setup(){let at=1_800_000_000_000;const storage=new Storage();let enabled=true;const acks:string[]=[];const create=()=>new HostedMemory(storage,()=>at,()=>enabled,async channel=>{acks.push(channel);});return {storage,acks,create,advance:(ms:number)=>{at+=ms;},disable:()=>{enabled=false;}};}
describe('durable hosted viewer memory',()=>{
 it('deduplicates old beat retries and round/finalize across eviction, preserving replacement name/activity',async()=>{
  const s=setup();await s.create().events('1',[vote(),vote('b2'),round,{kind:'finalize',sessionId:'s1',mvpId:'2'}]);
  s.advance(1000);const result=await s.create().events('1',[vote('b1','2','Renamed'),round,{kind:'finalize',sessionId:'s1',mvpId:'2'}]);
  expect(result.view.record).toEqual({streams:1,bossesKo:0,timesKo:1});expect(result.view.hallOfFame[0]).toEqual({name:'Renamed',koVotes:1,favMove:'JAB'});
  const raw=s.storage.data as {data:{channels:Record<string,{viewers:Record<string,{votes:number;streams:number;mvpCount:number}>}>}};
  expect(raw.data.channels['1'].viewers['2']).toMatchObject({votes:2,streams:1,mvpCount:1});
 });
 it('commits forget before acknowledging, survives queue failures and never revives opt-outs',async()=>{
  const s=setup();await s.create().events('1',[vote()]);
  const failingBot=new HostedMemory(s.storage,()=>1_800_000_000_001,()=>true,async()=>{expect((s.storage.data as {data:{channels:Record<string,{optOut:string[]}>}}).data.channels['1'].optOut).toContain('2');throw new Error('queue failed');});
  const result=await failingBot.events('1',[{kind:'forget',sessionId:'s1',userId:'2'}]);expect(result.forgotten).toEqual(['2']);expect(result.optOut).toEqual(['2']);
  s.advance(91*86400000);expect((await s.create().events('1',[vote('b3')])).view.hallOfFame).toEqual([]);expect((await s.create().snapshot('1')).optOut).toEqual(['2']);expect(s.acks).toEqual([]);
 });
 it('rolls back data and dedup together on failed commit without acknowledging',async()=>{
  const s=setup();await s.create().events('1',[vote()]);s.storage.fail=true;
  await expect(s.create().events('1',[vote('b2'),{kind:'forget',sessionId:'s1',userId:'2'}])).rejects.toThrow('storage failed');expect(s.acks).toEqual([]);
  s.storage.fail=false;await s.create().events('1',[vote('b2')]);const raw=s.storage.data as {data:{channels:Record<string,{viewers:Record<string,{votes:number}>}>}};expect(raw.data.channels['1'].viewers['2'].votes).toBe(2);
 });
 it('rewrites stale records on snapshot while retaining permanent opt-outs',async()=>{
  const s=setup();await s.create().events('1',[vote(),{kind:'forget',sessionId:'s1',userId:'3'}]);s.advance(90*86400000+1);
  const result=await s.create().snapshot('1');expect(result.view.hallOfFame).toEqual([]);expect(result.optOut).toEqual(['3']);expect(s.storage.seen.size).toBe(0);
  expect(JSON.stringify(s.storage.data)).not.toContain('Two');
 });
 it('handles viewer populations larger than the KV value limit',async()=>{
  const s=setup();for(let batch=0;batch<6;batch++)await s.create().events('1',Array.from({length:100},(_,i)=>vote('b1',String(1000+batch*100+i),'N'.repeat(100))));
  expect(JSON.stringify(s.storage.data).length).toBeGreaterThan(128*1024);expect((await s.create().snapshot('1')).view.hallOfFame).toHaveLength(4);
 });
 it('fails closed while disabled and rejects nonnumeric channels',async()=>{
  const s=setup();await expect(s.create().snapshot('victim')).rejects.toThrow('invalid-channel');s.disable();await expect(s.create().events('1',[vote()])).rejects.toThrow('hosted-memory-off');expect(s.storage.data).toBeUndefined();
 });
});
it('memory protocol rejects raw text, sources, submitted channels and malformed numeric IDs',()=>{
 expect(validateMemoryBatch({events:[vote()]})).toEqual([vote()]);
 for(const extra of [{text:'private'},{channel:'3'},{source:'sim'},{source:'booth'},{userId:'someone'},{displayName:'bad\nname'},{beatId:'x'.repeat(101)}])expect(validateMemoryBatch({events:[{...vote(),...extra}]})).toBeNull();
 expect(validateMemoryBatch({events:Array(101).fill(vote())})).toBeNull();expect(validateMemoryBatch({events:[],channel:'3'})).toBeNull();
});

it('malformed stored envelopes fail closed and are never rewritten',async()=>{
 for(const raw of [null,false,0,[],{}, {channel:'1',data:{version:1,channels:{}},runtime:null,extra:'text'}]){
  const s=setup();s.storage.data=raw;await expect(s.create().snapshot('1')).rejects.toThrow();expect(s.storage.data).toEqual(raw);
 }
});

it('forget deletes prior dedup activity and opted-out later votes never create markers',async()=>{
 const s=setup();await s.create().events('1',[vote(),vote('b2'),vote('b1','3','Three')]);expect(s.storage.seen.size).toBe(3);
 await s.create().events('1',[{kind:'forget',sessionId:'s1',userId:'2'}]);expect([...s.storage.seen.keys()].map(key=>JSON.parse(key)[2])).toEqual(['3']);
 await s.create().events('1',[vote('b3'),vote('b4')]);expect([...s.storage.seen.keys()].map(key=>JSON.parse(key)[2])).toEqual(['3']);
 const raw=s.storage.data as {data:{channels:Record<string,{optOut:string[];viewers:Record<string,unknown>}>}};expect(raw.data.channels['1'].viewers['2']).toBeUndefined();expect(raw.data.channels['1'].optOut).toEqual(['2']);
});
