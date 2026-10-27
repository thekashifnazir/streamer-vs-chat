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
