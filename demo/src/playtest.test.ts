import {expect,it,vi} from 'vitest';
import {LocalPlaytestStats,PLAYTEST_NOTE} from './playtest';
import {createGame} from '../../shared/src/engine';
const finished=(number:number,winner:'streamer'|'boss')=>{const game=createGame({seed:number});game.round={...game.round,number,over:true,winner};game.log.rounds=[{number,winner,reason:'ko',at:100,streamer_hp:winner==='streamer'?90:0,boss_hp:winner==='boss'?70:0,boss_max_hp:135,duration_ms:100} as any];return game;};
it('counts from page load with no opt-in, and exports the fight numbers marked simulated',async()=>{
 let now=0;const hash=vi.fn(async(_salt:Uint8Array,user:string)=>`hashed:${user}`);const stats=new LocalPlaytestStats({now:()=>now,hash});
 expect(await stats.exportSnapshot()).toMatchObject({simulated:true,note:PLAYTEST_NOTE,rounds:0,votes:0});
 stats.startRound();stats.vote('private');now=60000;stats.endRound(finished(1,'streamer'));
 stats.startRound();stats.vote('other');now=120000;stats.endRound(finished(2,'boss'));
 const snapshot=await stats.exportSnapshot();
 expect(snapshot).toMatchObject({simulated:true,rounds:2,roundsWon:1,damageDealt:135+65,damageTaken:0,defences:0,votes:2,uniqueChatters:2,votesPerMinute:1});
 expect(snapshot?.roundStats.map(round=>[round.won,round.damageDealt,round.completed])).toEqual([[true,135,true],[false,65,true]]);
 expect(snapshot?.note).toMatch(/SIMULATED/);expect(snapshot?.note).toMatch(/nothing is sent or stored/);stats.dispose();
});
it('counts unique anonymous personas across rounds rather than summing duplicate identities',async()=>{
 let now=0;const stats=new LocalPlaytestStats({now:()=>now,hash:async(_salt,id)=>id});
 stats.startRound();stats.vote('anonymous-persona-a');stats.vote('anonymous-persona-a');stats.vote('anonymous-persona-b',false);now=60000;stats.endRound();
 now=120000;stats.startRound();stats.vote('anonymous-persona-a');now=180000;stats.endRound();
 const result=await stats.exportSnapshot();expect(result).toMatchObject({rounds:0,votes:4,uniqueChatters:2,acceptedVoters:1,votesPerMinute:4/3});
 expect(result?.roundStats.map(round=>[round.votesPerMinute,round.won])).toEqual([[3,null],[1,null]]);
 expect(JSON.stringify(result)).not.toMatch(/anonymous|hashed|salt|username|text/);stats.dispose();
});
it('a repeated round-over paint records the round once; dispose suppresses an in-flight export; votes outside rounds are ignored',async()=>{
 const counted=new LocalPlaytestStats({hash:async(_salt,id)=>id});counted.startRound();const game=finished(1,'streamer');counted.endRound(game);counted.endRound(game);counted.endRound(game);
 expect((await counted.exportSnapshot())?.rounds).toBe(1);counted.dispose();
 const resolvers:((value:string)=>void)[]=[];const stats=new LocalPlaytestStats({hash:()=>new Promise(resolve=>resolvers.push(resolve))});stats.vote('outside');
 expect((await stats.exportSnapshot())?.votes).toBe(0);stats.startRound();stats.vote('inside');const snapshot=stats.exportSnapshot();await Promise.resolve();stats.dispose();for(const resolve of resolvers)resolve('hashed');expect(await snapshot).toBeNull();
});
