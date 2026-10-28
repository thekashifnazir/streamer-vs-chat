import {expect,it,vi} from 'vitest';
import {LocalPlaytestStats} from './playtest';
it('collects nothing before consent; disabling clears everything and a new opt-in starts fresh',async()=>{
 let now=0;const hash=vi.fn(async(_salt:Uint8Array,user:string)=>`hashed:${user}`);const stats=new LocalPlaytestStats({now:()=>now,hash});
 stats.startRound();stats.vote('private');expect(await stats.exportSnapshot()).toBeNull();expect(hash).not.toHaveBeenCalled();
 stats.setEnabled(true);stats.startRound();stats.vote('private');now=60000;stats.endRound();
 expect(await stats.exportSnapshot()).toMatchObject({simulated:true,rounds:1,votes:1,uniqueChatters:1,votesPerMinute:1});
 stats.setEnabled(false);expect(await stats.exportSnapshot()).toBeNull();stats.setEnabled(true);expect(await stats.exportSnapshot()).toMatchObject({rounds:0,votes:0,uniqueChatters:0});stats.dispose();
});
it('counts unique anonymous personas across rounds rather than summing duplicate identities',async()=>{
 let now=0;const stats=new LocalPlaytestStats({now:()=>now,hash:async(_salt,id)=>id});stats.setEnabled(true);
 stats.startRound();stats.vote('anonymous-persona-a');stats.vote('anonymous-persona-a');stats.vote('anonymous-persona-b',false);now=60000;stats.endRound();
 now=120000;stats.startRound();stats.vote('anonymous-persona-a');now=180000;stats.endRound();
 const result=await stats.exportSnapshot();expect(result).toMatchObject({rounds:2,votes:4,uniqueChatters:2,acceptedVoters:1,votesPerMinute:4/3});
 expect(result?.roundStats.map(round=>round.votesPerMinute)).toEqual([3,1]);
 expect(JSON.stringify(result)).not.toMatch(/anonymous|hashed|salt|username|text/);stats.dispose();
});
it('withdrawn consent suppresses an in-flight export and ignores votes outside rounds',async()=>{
 const resolvers:((value:string)=>void)[]=[];const stats=new LocalPlaytestStats({hash:()=>new Promise(resolve=>resolvers.push(resolve))});stats.setEnabled(true);stats.vote('outside');
 expect((await stats.exportSnapshot())?.votes).toBe(0);stats.startRound();stats.vote('inside');const snapshot=stats.exportSnapshot();await Promise.resolve();stats.setEnabled(false);for(const resolve of resolvers)resolve('hashed');expect(await snapshot).toBeNull();
});
