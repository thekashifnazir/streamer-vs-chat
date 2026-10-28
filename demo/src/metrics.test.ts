import {expect,it,vi} from 'vitest';
import {PlayMetrics} from './metrics';
function rig(){let now=0;const salt=new Uint8Array([7,3,1]);const hash=vi.fn(async(bytes:Uint8Array,id:string)=>`${Array.from(bytes).join('-')}:${id}`);const metrics=new PlayMetrics({now:()=>now,randomBytes:()=>salt,hash});return {metrics,hash,salt,at:(value:number)=>{now=value;}};}
it('counts only the rolling ten minutes preceding the first fight and freezes baseline',async()=>{
  const{metrics,at}=rig();await metrics.observeChat('old');at(120000);await metrics.observeChat('a');at(660000);await metrics.observeChat('b');await metrics.observeChat('b');
  metrics.startFight();expect(metrics.snapshot().baseline).toEqual({messages:3,uniqueChatters:2,observedMinutes:10,messagesPerMinute:.3,frozen:true});
  at(720000);await metrics.observeChat('new');expect(metrics.snapshot().baseline.messages).toBe(3);expect(metrics.snapshot().fights[0]?.messages).toBe(1);
});
it('normalizes a shorter baseline by actual observed minutes and avoids zero-duration rates',async()=>{
  const{metrics,at}=rig();await metrics.observeChat('a');expect(metrics.snapshot().baseline.messagesPerMinute).toBe(0);at(120000);metrics.startFight();expect(metrics.snapshot().baseline.messagesPerMinute).toBe(.5);expect(metrics.snapshot().baseline.observedMinutes).toBe(2);
});
it('counts messages, unique chatters and accepted voters independently for each fight',async()=>{
  const{metrics,at}=rig();await metrics.acceptedVote('before');metrics.startFight();
  for(const id of ['a','a','b'])await metrics.observeChat(id);for(const id of ['a','a'])await metrics.acceptedVote(id);
  at(60000);metrics.endFight();await metrics.observeChat('between');await metrics.acceptedVote('between');at(120000);metrics.startFight();await metrics.observeChat('c');await metrics.acceptedVote('c');at(150000);metrics.endFight();
  expect(metrics.snapshot().fights).toEqual([{fight:1,messages:3,uniqueChatters:2,acceptedVoters:1,minutes:1,messagesPerMinute:3,completed:true},{fight:2,messages:1,uniqueChatters:1,acceptedVoters:1,minutes:.5,messagesPerMinute:2,completed:true}]);
  expect(metrics.snapshot()).toMatchObject({fightsPlayed:2,sessionMinutes:2.5});
});
it('attributes asynchronous hashes to receive-time destinations across fight boundaries',async()=>{
  const callbacks:(()=>void)[]=[];const metrics=new PlayMetrics({now:()=>0,randomBytes:()=>new Uint8Array([1]),hash:async(_salt,id)=>await new Promise<string>(resolve=>callbacks.push(()=>resolve(`hashed:${id}`)))});
  const baseline=metrics.observeChat('before');metrics.startFight();const firstChat=metrics.observeChat('during'),firstVote=metrics.acceptedVote('during');metrics.endFight();metrics.startFight();
  await Promise.resolve();for(const finish of callbacks)finish();await Promise.all([baseline,firstChat,firstVote]);
  expect(metrics.snapshot().baseline.uniqueChatters).toBe(1);expect(metrics.snapshot().fights.map(f=>[f.uniqueChatters,f.acceptedVoters])).toEqual([[1,1],[0,0]]);
});
it('exports counts only, without IDs, hashes, salt, names or chat text',async()=>{
  const{metrics,hash,salt}=rig();metrics.startFight();await metrics.observeChat('private-viewer-id');await metrics.acceptedVote('private-viewer-id');
  expect(hash).toHaveBeenCalledWith(salt,'private-viewer-id');const json=JSON.stringify(await metrics.exportSnapshot());
  for(const forbidden of ['private-viewer-id','7-3-1','chatText','username','salt','hash'])expect(json).not.toContain(forbidden);
});
it('uses SHA-256 with the session salt prepended to the encoded viewer ID',async()=>{
  const digest=vi.spyOn(globalThis.crypto.subtle,'digest');const metrics=new PlayMetrics({randomBytes:()=>new Uint8Array([7,8])});metrics.startFight();await metrics.observeChat('42');
  expect(digest).toHaveBeenCalledWith('SHA-256',new Uint8Array([7,8,52,50]));digest.mockRestore();
});
it('session salts differ and dispose suppresses pending identity results',async()=>{
  const first=new PlayMetrics(),second=new PlayMetrics();expect((first as any).salt).not.toEqual((second as any).salt);first.dispose();second.dispose();
  let finish!:(value:string)=>void;const metrics=new PlayMetrics({hash:()=>new Promise(resolve=>{finish=resolve;})});metrics.startFight();const pending=metrics.observeChat('gone');await Promise.resolve();metrics.dispose();finish('hashed-gone');await pending;expect(metrics.snapshot().fights[0]?.uniqueChatters).toBe(0);
});
