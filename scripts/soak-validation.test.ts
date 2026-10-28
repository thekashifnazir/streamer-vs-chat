import {expect,it} from 'vitest';
import {matchIssues} from './soak-validation';
const round=(number:number,winner='boss',reason='ko',streamer_hp=0,boss_hp=100)=>({number,winner,reason,streamer_hp,boss_hp});
function report(rounds=[round(1),round(2)]){return {matchWinner:'boss',roundOver:true,roundWins:{streamer:rounds.filter(r=>r.winner==='streamer').length,boss:rounds.filter(r=>r.winner==='boss').length},roundResults:rounds,streamerHp:rounds.at(-1)?.streamer_hp,bossHp:rounds.at(-1)?.boss_hp};}
it('accepts actual two/three-round best-of-three results, including percentage timeout and streamer tie break',()=>{
 expect(matchIssues(report())).toEqual([]);
 expect(matchIssues(report([round(1,'streamer','ko',50,0),round(2),round(3)]))).toEqual([]);
 const tie=report([round(1,'streamer','timeout',100,135),round(2,'streamer','ko',90,0)]);tie.matchWinner='streamer';expect(matchIssues(tie)).toEqual([]);
 expect(matchIssues(report([round(1,'boss','timeout',50,100),round(2)]))).toEqual([]);
});
it('rejects missing/malformed completion evidence without throwing',()=>{
 for(const value of [null,{},[],{...report(),roundOver:false},{...report(),roundOver:'true'},{...report(),matchWinner:'draw'},{...report(),roundResults:null},{...report(),roundResults:[null,null]},{...report(),roundWins:null}])expect(matchIssues(value).length).toBeGreaterThan(0);
});
it('enforces round identity, score, final HP and decisive last winner',()=>{
 for(const value of [{...report(),roundWins:{streamer:-1,boss:2}},{...report(),roundWins:{streamer:NaN,boss:2}},{...report(),roundWins:{streamer:0,boss:1}},{...report(),streamerHp:10},report([round(2),round(3)]),report([round(1,'draw'),round(2)]),report([round(1,'boss','unknown'),round(2)]),report([round(1),round(2),round(3,'streamer','ko',90,0)]),report([round(1)]),report([round(1),round(2),round(3),round(4)])])expect(matchIssues(value).length).toBeGreaterThan(0);
});
it('rejects invalid HP, a KO without zero defeated HP, and incorrect timeout percentages',()=>{
 for(const first of [round(1,'boss','ko',1,100),round(1,'streamer','ko',50,1),round(1,'boss','ko',0,136),round(1,'boss','ko',-1,100),round(1,'boss','ko',NaN,100),round(1,'boss','timeout',100,100),round(1,'boss','timeout',100,135)])expect(matchIssues(report([first,round(2)])).length).toBeGreaterThan(0);
});
