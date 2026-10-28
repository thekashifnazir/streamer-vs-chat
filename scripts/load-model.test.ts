import {expect,it} from 'vitest';
import {ChatLoadSchedule,LoadAudit} from './load-model';
import {matchIssues} from './soak-validation';
it('bursts reschedule at most300 distinct viewers without subsecond repeated messages',()=>{
 const schedule=new ChatLoadSchedule(1000,2026,0),last=new Map<string,number>();let total=0;
 for(let at=0;at<12000;at+=20){if(at%2400===0)expect(schedule.burst(at)).toBeLessThanOrEqual(300);for(const msg of schedule.due(at)){if(last.has(msg.user)){expect(at-last.get(msg.user)!).toBeGreaterThanOrEqual(1000);expect(at-last.get(msg.user)!).toBeLessThanOrEqual(4020);}last.set(msg.user,at);total++;}}
 expect(total).toBeGreaterThan(4000);expect(last.size).toBe(1000);
});
it('audits every receipt once and verifies latest-vote replacement against actual beat snapshots',()=>{
 const audit=new LoadAudit(),frame={receipts:[{messageId:'1',receivedAt:10,counted:true,runId:1,round:1,beat:0,user:'a',move:'JAB'},{messageId:'2',receivedAt:20,counted:true,runId:1,round:1,beat:0,user:'a',move:'HOOK_L'}],beats:[{runId:1,round:1,beat:0,at:2400,observedAt:2410,votes:{a:'HOOK_L'},acceptedEvents:2}]};
 audit.receive(frame,100);audit.receive(frame,101);expect(audit.counted).toBe(2);expect(audit.seen.size).toBe(2);expect(audit.issues).toEqual([]);expect(audit.p95()).toBe(90);expect(audit.maxDrift).toBe(10);
 const bad=new LoadAudit();bad.receive({...frame,beats:[{...frame.beats[0],votes:{a:'JAB'}}]},100);expect(bad.issues).toHaveLength(1);
});
it('requires consistent completed best-of-three scores, HP and result evidence',()=>{
 const game={matchWinner:'boss',roundOver:true,roundWins:{streamer:0,boss:2},streamerHp:0,bossHp:135,roundResults:[1,2].map(number=>({number,winner:'boss',reason:'ko',streamer_hp:0,boss_hp:135}))};
 expect(matchIssues(game)).toEqual([]);expect(matchIssues({...game,roundWins:{streamer:0,boss:1}})).not.toEqual([]);expect(matchIssues({...game,streamerHp:20})).not.toEqual([]);
});
it('verifies actual HUD counts, voter totals and effective weighted bars independently of audit counters',()=>{
 const make=()=>{const audit=new LoadAudit();audit.receive({receipts:[{messageId:'a',receivedAt:0,counted:true,runId:1,round:1,beat:0,user:'a',move:'JAB'},{messageId:'b',receivedAt:0,counted:true,runId:1,round:1,beat:0,user:'b',move:'HOOK_L'}]},100);return audit;};
 const tally={JAB:1,HOOK_L:1,HOOK_R:0,COMBO:0,SUPER:0},state={round:{number:1,over:false},clock:{beat:0,paused_at:null},now:100,votes:{a:'JAB',b:'HOOK_L'},tally,voters:2,raid:{ends_at:15000},raiders:{b:true}};
 const good=make();good.snapshot(1,state,{tally,voters:2,weights:tally});expect(good.issues).toEqual([]);expect(good.snapshots).toBe(1);
 const bad=make();bad.snapshot(1,state,{tally,voters:2,weights:{...tally,HOOK_L:2}});expect(bad.issues).toContain('HUD tally/weight mismatch');
 const badMap=make();badMap.snapshot(1,{...state,votes:{a:'JAB',b:'JAB'}});expect(badMap.issues).toContain('WS latest-viewer map mismatch');
});
it('classifies accepted votes discarded at round end separately from dropped ingestion',()=>{
 const audit=new LoadAudit();audit.receive({receipts:[{messageId:'a',receivedAt:0,counted:true,runId:1,round:1,beat:0,user:'a',move:'JAB'},{messageId:'b',receivedAt:0,counted:false,runId:1,round:1,beat:0,user:'b',move:'HOOK_L'}]},100);
 audit.snapshot(1,{round:{number:1,over:true}});expect(audit.counted).toBe(1);expect(audit.ignored).toBe(1);expect(audit.terminalEvents).toBe(1);expect(audit.pendingEvents()).toBe(0);expect(audit.issues).toEqual([]);
});
it('reports p50,p95,p99 on every receipt, without using only the latest watermark',()=>{
 const audit=new LoadAudit();audit.receive({receipts:Array.from({length:100},(_,i)=>({messageId:String(i),receivedAt:100-i,counted:false}))},100);
 expect(audit.percentile(.5)).toBe(49);expect(audit.percentile(.95)).toBe(94);expect(audit.percentile(.99)).toBe(98);
});
it('strict30s held-guard benchmark stays in one active round for every allowed move',async()=>{
 const {createGame,step}=await import('../shared/src/engine');
 for(const move of ['JAB','HOOK_L','HOOK_R','COMBO'] as const){let state=createGame({now:0,viewers:1000});state=step(state,{kind:'pose',guard:true,lean:null,source:'keyboard',at:0},0);
  for(let at=20;at<=30000;at+=20){state=step(state,{kind:'vote',user:'load',move,at,simulated:true},at);state=step(state,{kind:'advance'},at);}
  expect(state.round.over).toBe(false);expect(state.round.number).toBe(1);expect(state.streamer.hp).toBeGreaterThan(0);expect(state.boss.hp).toBeGreaterThan(0);
 }
});
it('rejects any unaccounted stale beat even if overall accepted-count sums balance',()=>{
 const audit=new LoadAudit();audit.receive({receipts:[{messageId:'a',receivedAt:0,counted:true,runId:1,round:1,beat:0,user:'a',move:'JAB'}]},100);audit.assertPendingBeat(1,{round:{number:1},clock:{beat:1}});expect(audit.issues).toContain('unresolved prior beat1:1:0');
});
