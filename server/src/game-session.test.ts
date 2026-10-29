import { expect, it, vi } from 'vitest';
import { GameSession } from './game-session';
function rig(mock=true) {
  let now=0;const send=vi.fn(async(_text:string,_simulated:boolean)=>{});
  const game=new GameSession({mock,now:()=>now,seed:1,sendResult:send});
  return {game,send,at:(time:number)=>{now=time;}};
}
it('waits for explicit start but accepts preview votes, then resets votes each2.4s beat',()=>{
  const {game,at,send}=rig();
  game.chat({user:'a',text:'!jab',simulated:true,role:'viewer'});
  expect(game.tally().tally.JAB).toBe(1);
  at(100000);game.advance();expect(game.state.history).toHaveLength(0);expect(send).not.toHaveBeenCalled();
  game.command({kind:'session',action:'start'});
  game.chat({user:'a',text:'!jab',simulated:true,role:'viewer'});
  at(102400);game.advance();expect(game.state.history).toEqual(['JAB']);expect(game.tally().voters).toBe(0);
  game.close();
});
it('takes input at receive time, instantly freezes/vetoes on authorized chat, and ignores viewer controls',()=>{
  const {game,at}=rig();game.command({kind:'session',action:'start'});
  at(2400);game.advance();expect(game.state.activeAttack).not.toBeNull();
  at(2500);game.chat({user:'v',text:'!veto',simulated:true,role:'viewer'});expect(game.state.paused).toBe(false);
  game.input({kind:'pose',guard:true,lean:null,at:123,source:'keyboard'},2500);
  expect(game.state.input.guard_at).toBe(2500);
  expect(game.state.log.inputs.at(-1)).toMatchObject({at:2500,capture_at:123,source:'keyboard',guard:true});
  game.chat({user:'m',text:'!veto',simulated:true,role:'mod'});expect(game.state.activeAttack).toBeNull();
  at(10000);game.advance();expect(game.state.streamer.hp).toBe(100);expect(game.state.paused).toBe(true);
  game.chat({user:'b',text:'!resume',simulated:true,role:'broadcaster'});expect(game.state.paused).toBe(false);
  game.chat({user:'b',text:'stop',simulated:true,role:'broadcaster'});expect(game.frozen).toBe(true);game.close();
});
it('sends one result per actual round only, pauses between rounds, and refuses simulated live votes',async()=>{
  const {game,at,send}=rig(false);game.command({kind:'session',action:'start'});
  game.chat({user:'fake',text:'!jab',simulated:true,role:'viewer'});expect(game.state.voters).toBe(0);
  // Test-only HP override, equivalent to golden initial state; no network/Twitch is used.
  game.state.boss.hp=1;
  at(100);game.input({kind:'punch',side:'L',at:0,source:'keyboard'});
  await new Promise(resolve=>setTimeout(resolve,0));
  expect(send).toHaveBeenCalledTimes(1);expect(send.mock.calls[0]?.[1]).toBe(false);
  game.input({kind:'control',action:'stop',by:'capture'});
  at(5000);game.advance();expect(game.state.round.number).toBe(1);
  game.input({kind:'control',action:'resume',by:'capture'});game.advance();expect(game.state.round.number).toBe(2);
  expect(send).toHaveBeenCalledTimes(1);game.close();
});

it('does not resurrect stale held defence after pause, capture loss and moderator resume',()=>{
  const {game,at}=rig();game.command({kind:'session',action:'start'});
  at(100);game.input({kind:'pose',guard:true,lean:'R',at:0,source:'keyboard'});
  at(200);game.chat({user:'m',text:'!pause',simulated:true,role:'mod'});
  at(300);game.input({kind:'pose',guard:false,lean:null,at:0,source:'keyboard'}); // disconnect release
  at(2000);game.chat({user:'m',text:'!resume',simulated:true,role:'mod'});
  expect(game.state.input).toMatchObject({guard:false,lean:null});game.close();
});
it('uses fresh paused input, but expires it when capture heartbeats disappear',()=>{
  const {game,at}=rig();game.command({kind:'session',action:'start'});
  at(100);game.input({kind:'pose',guard:true,lean:'R',at:0,source:'pose'});
  at(200);game.chat({user:'m',text:'!pause',simulated:true,role:'mod'});
  at(300);game.input({kind:'pose',guard:true,lean:'L',at:0,source:'pose'});
  at(400);game.chat({user:'m',text:'!resume',simulated:true,role:'mod'});
  expect(game.state.input).toMatchObject({guard:true,lean:'L'});
  at(500);game.chat({user:'m',text:'!pause',simulated:true,role:'mod'});
  at(1500);game.chat({user:'m',text:'!resume',simulated:true,role:'mod'});
  expect(game.state.input).toMatchObject({guard:false,lean:null});game.close();
});

it('routes optional buffs by mode and infers raiders from all first messages, not just votes',()=>{
 const {game,at}=rig();
 const chat=(user:string,text:string)=>game.chat({user,text,simulated:true,role:'viewer'});
 chat('regular-a','hello');chat('regular-b','hello');chat('regular-c','hello');
 game.command({kind:'session',action:'start'});
 game.state.streamer.hp=82; // Test-only initial damage, not a client protocol.
 at(100);game.twist({kind:'cheer',bits:10,simulated:true});game.twist({kind:'subscribe',simulated:true});
 expect(game.state.hype).toBe(10);expect(game.state.streamer.hp).toBe(90);
 game.twist({kind:'cheer',bits:25,simulated:false});expect(game.state.hype).toBe(10);
 at(200);game.twist({kind:'raid',viewers:2,simulated:true});
 chat('regular-a','!jab');chat('regular-b','!jab');chat('regular-c','!jab');
 chat('new-hello','hello');chat('new-vote','!hookl');chat('extra','!jab');
 chat('new-hello','!hookr');
 expect(game.tally()).toMatchObject({voters:6,tally:{JAB:4,HOOK_L:1,HOOK_R:1},weights:{JAB:4,HOOK_L:2,HOOK_R:2}});
 chat('new-hello','!combo');
 expect(game.tally()).toMatchObject({voters:6,tally:{JAB:4,HOOK_L:1,HOOK_R:0,COMBO:1},weights:{JAB:4,HOOK_L:2,HOOK_R:0,COMBO:2}});
 // A later raid must not classify these same chatters as first-time arrivals again.
 at(300);game.twist({kind:'raid',viewers:10,simulated:true});chat('new-vote','!hookl');chat('new-hello','!combo');
 expect(game.tally().weights).toEqual(game.tally().tally);game.close();
});
it('keeps optional buffs frozen on pause and rejects simulated events in live sessions',()=>{
 const {game,at}=rig(false);game.command({kind:'session',action:'start'});
 game.twist({kind:'raid',viewers:10,simulated:true});expect(game.state.raid.ends_at).toBe(null);
 game.twist({kind:'cheer',bits:20,simulated:true});expect(game.state.hype).toBe(0);
 game.input({kind:'control',action:'pause',by:'capture'});at(100);
 game.twist({kind:'cheer',bits:20,simulated:false});game.twist({kind:'raid',viewers:10,simulated:false});
 expect(game.state.hype).toBe(0);expect(game.state.raid.ends_at).toBe(null);game.close();
});
it('server no-punch mode rejects bonuses but preserves automatic defence counters and session summary',()=>{
 const{game,at}=rig();game.configure({kind:'capture-options',seated:true,noPunch:true});game.command({kind:'session',action:'start'});
 game.state.moves=['JAB'];at(100);game.input({kind:'punch',side:'L',source:'keyboard',at:100});expect(game.state.boss.hp).toBe(135);
 at(2900);game.input({kind:'pose',guard:true,lean:null,source:'keyboard',at:2900});at(3200);game.advance();
 expect(game.state.boss.hp).toBe(124);expect(game.state.streamer.hp).toBe(100);
 game.command({kind:'session',action:'summary'});expect(game.frozen).toBe(true);expect(game.summaryVisible).toBe(true);
 expect(game.summary().stats.perfects).toBe(1);game.command({kind:'session',action:'start'});
 expect(game.runId).toBe(2);expect(game.summaryVisible).toBe(false);expect(game.summary().stats.perfects).toBe(1);game.close();
});
it('caches unchanged summary evidence while frozen and updates duration, new damage and names',()=>{
 const{game,at}=rig();game.command({kind:'session',action:'start'});
 game.chat({user:'a',text:'!jab',simulated:true,role:'viewer'});at(3200);game.advance();
 const first=game.summary();expect(first.stats.damageTaken).toBe(8);
 expect(game.summary().stats).toBe(first.stats);
 at(3300);game.advance();expect(game.summary().stats.durationMs).toBe(3300);expect(game.summary().stats).not.toBe(first.stats);
 game.input({kind:'control',action:'stop',by:'capture'});const stopped=game.summary();
 at(10000);game.advance();game.chat({user:'a',text:'hello',displayName:'Viewer A',simulated:true,role:'viewer'});
 expect(game.summary().stats).toBe(stopped.stats);expect(game.summary().chatMvp).toMatchObject({user:'a',displayName:'Viewer A'});
 game.input({kind:'control',action:'resume',by:'capture'});game.chat({user:'a',text:'!jab',simulated:true,role:'viewer'});at(12300);game.advance();
 expect(game.summary().stats.damageTaken).toBeGreaterThan(8);game.close();
});
it('applies the selected difficulty only at START and includes it in the result line',async()=>{
 const {game,at,send}=rig();
 game.configure({kind:'capture-options',seated:false,noPunch:false,difficulty:'medium'});
 expect(game.state.difficulty).toBe('hard');
 game.command({kind:'session',action:'start'});expect(game.state.difficulty).toBe('medium');
 game.configure({kind:'capture-options',seated:false,noPunch:false,difficulty:'easy'});
 expect(game.state.difficulty).toBe('medium');
 game.state.boss.hp=1;at(100);game.input({kind:'punch',side:'L',at:100,source:'keyboard'});
 await new Promise(resolve=>setTimeout(resolve,0));expect(send.mock.calls[0]?.[0]).toContain('· Medium');expect(send.mock.calls[0]?.[0]).toContain('!left (!l) / !right (!r)');
 game.command({kind:'session',action:'start'});expect(game.state.difficulty).toBe('easy');game.close();
});
it('retains individual presentation receipts for punches between routine HUD broadcasts',()=>{
 const{game,at}=rig();game.command({kind:'session',action:'start'});
 for(const time of [100,550]){at(time);game.input({kind:'punch',side:'L',source:'keyboard',at:time});}
 expect(game.bossImpacts.entries.map(item=>[item.kind,item.amount,item.at])).toEqual([['punch',1,100],['punch',1,550]]);game.close();
});
it('queues one SUPER unlock chat notice per round through the result rate limit',async()=>{
 const {game,at,send}=rig();game.command({kind:'session',action:'start'});game.state.hype=99;game.twist({kind:'cheer',bits:1,simulated:true});await new Promise(resolve=>setTimeout(resolve,0));
 expect(send.mock.calls.filter(call=>call[0]==='HYPE is full! Type !s for the SUPER')).toHaveLength(1);
 game.state.hype=99;at(100);game.twist({kind:'cheer',bits:1,simulated:true});await new Promise(resolve=>setTimeout(resolve,0));expect(send).toHaveBeenCalledTimes(1);
 game.queueNotice('second queued notice');await new Promise(resolve=>setTimeout(resolve,0));expect(send).toHaveBeenCalledTimes(1);
 at(10000);game.advance();await new Promise(resolve=>setTimeout(resolve,0));expect(send.mock.calls[1]?.[0]).toBe('second queued notice');game.close();
});
it('keeps a locked !s dropped and exposes at most one hint per beat, clearing preview hints at START',()=>{
 const {game,at}=rig();expect(game.chat({user:'A',text:'!s',simulated:true,role:'viewer'})).toBeNull();expect(game.state.tally.SUPER).toBe(0);const first=game.superNotices.deniedAt;
 at(10);game.chat({user:'A',text:'!s',simulated:true,role:'viewer'});expect(game.superNotices.deniedAt).toBe(first);
 game.command({kind:'session',action:'start'});expect(game.superNotices.deniedAt).toBeNull();game.chat({user:'A',text:'!s',simulated:true,role:'viewer'});expect(game.superNotices.deniedAt).toBe(10);game.close();
});
