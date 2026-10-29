import {expect,it} from 'vitest';
import {createGame,step,wilsonLower,type GameState} from '../../shared/src/engine';
import type {Move} from '../../shared/src/index';
const advance=(s:GameState,t:number)=>step(s,{kind:'advance'},t);
const pose=(s:GameState,t:number,guard:boolean,lean:'L'|'R'|null=null)=>step(s,{kind:'pose',guard,lean,source:'keyboard',at:t},t);
const vote=(s:GameState,user:string,move:Move,t=s.now)=>step(s,{kind:'vote',user,move,at:t,simulated:true},t);
function cohort(s:GameState,move:Move,t:number,n=8,prefix:string=move){for(let i=0;i<n;i++)s=vote(s,`${prefix}-${i}`,move,t);return s;}
function habit(history:Move[],round=2){let s=createGame({roundNumber:round});s.chatScouting.history=history;return advance(s,0);}
// Synthetic initial evidence is deliberate; each subsequent effect uses real reducer events.
it('requires12 voted picks,8/12 Wilson activation and round2; retains6/12 then clears5/12',()=>{
 expect(habit(Array(11).fill('JAB')).chatScouting.card).toBe(null);
 expect(habit([...Array(7).fill('JAB'),...Array(5).fill('HOOK_L')]).chatScouting.card).toBe(null);
 let s=habit([...Array(8).fill('JAB'),...Array(4).fill('HOOK_L')]);expect(wilsonLower(8,12)).toBeGreaterThanOrEqual(.4);expect(s.chatScouting.card).toBe('JAB');
 expect(habit(Array(12).fill('JAB'),1).chatScouting.card).toBe(null);
 s.chatScouting.history=[...Array(6).fill('JAB'),...Array(6).fill('HOOK_L')];s=advance(s,1);expect(s.chatScouting.card).toBe('JAB');
 s.chatScouting.history=[...Array(5).fill('JAB'),...Array(7).fill('HOOK_L')];s=advance(s,2);expect(s.chatScouting.card).toBe(null);expect(s.streamer.hp).toBe(100);
});
it('records final selected picks rather than plurality, ignores autopilot, retains vetoed picks and opening resets',()=>{
 let s=createGame({moves:['HOOK_L','JAB','COMBO']});s=vote(vote(vote(s,'a','JAB'),'b','JAB'),'c','HOOK_L');s=advance(s,2400);
 expect(s.chatScouting.history).toEqual(['HOOK_L']);expect(s.chatScouting.openings).toMatchObject([{move:'HOOK_L',voted:true,beat:0}]);
 s=step(s,{kind:'control',action:'veto',by:'mod'},2500);expect(s.chatScouting.history).toEqual(['HOOK_L']);s=step(s,{kind:'control',action:'resume',by:'mod'},2500);s=advance(s,4800);
 expect(s.chatScouting.history).toEqual(['HOOK_L']);expect(s.chatScouting.openings.map(o=>[o.beat,o.voted])).toEqual([[0,true],[1,false]]);
 s=step(s,{kind:'control',action:'pause',by:'mod'},4900);s=step(s,{kind:'control',action:'resume',by:'mod'},4900);s=advance(s,7200);expect(s.chatScouting.openings).toHaveLength(2);
});
it('carries the bounded pick window/opening evidence across rounds and restart clears it',()=>{
 let s=habit([...Array(8).fill('JAB'),...Array(4).fill('HOOK_L')],1);s.boss.hp=1;s=step(s,{kind:'punch',side:'L',at:1,source:'keyboard'},1);s=step(s,{kind:'next-round'},3001);expect(s.chatScouting.card).toBe('JAB');
 s=vote(s,'new','COMBO',3002);s={...s,moves:['COMBO']};s=advance(s,5401);expect(s.chatScouting.history).toHaveLength(12);expect(s.chatScouting.openings.at(-1)).toMatchObject({round:2,beat:0});expect(step(s,{kind:'restart'},6000).chatScouting.history).toEqual([]);
});
it('braces only the previously visible matching card with defence held strictly before tell',()=>{
 let s=pose(habit(Array(12).fill('JAB')),100,true);s=vote(s,'v','JAB',100);s=advance(s,3200);expect(s.log.resolved[0]).toMatchObject({outcome:'BLOCK',counter_dmg:10,braced:true});
 let late=vote(habit(Array(12).fill('JAB')),'v','JAB');late=pose(late,2400,true);late=advance(late,3200);expect(late.log.resolved[0]).toMatchObject({counter_dmg:8,braced:false});
 let fresh=pose(habit(['HOOK_L',...Array(7).fill('JAB'),...Array(4).fill('HOOK_L')]),100,true);fresh=vote(fresh,'v','JAB',100);fresh=advance(fresh,3200);expect(fresh.chatScouting.card).toBe('JAB');expect(fresh.log.resolved[0]?.braced).toBe(false);
});
it('applies all brace counter amounts once, including PERFECT/COMBO, while punches remain1.5',()=>{
 for(const [move,guard,lean,at,counter]of [['JAB',true,null,2100,10],['JAB',true,null,2300,10],['HOOK_L',false,'R',100,11.25],['HOOK_R',false,'L',100,11.25],['COMBO',true,null,100,10]] as const){
  let s=pose(habit(Array(12).fill(move)),at,guard,lean);s=vote(s,'v',move,at);s=advance(s,move==='COMBO'?3500:3200);expect(s.log.resolved[0]).toMatchObject({counter_dmg:counter,braced:true});const hp=s.boss.hp;s=step(s,{kind:'punch',side:'L',at:s.now+100,source:'keyboard'},s.now+100);expect(hp-s.boss.hp).toBe(1.5);
 }
 // A prior held JAB guard may be re-raised during the tell for PERFECT.
 let s=pose(habit(Array(12).fill('JAB')),100,true);s=vote(s,'v','JAB',100);s=pose(s,2600,false);s=pose(s,2900,true);s=advance(s,3200);expect(s.log.resolved[0]).toMatchObject({counter_dmg:13.75,braced:true});
 let combo=pose(habit(Array(12).fill('COMBO')),100,true);combo=vote(combo,'v','COMBO',100);combo=pose(combo,2600,false);combo=pose(combo,2900,true);combo=advance(combo,3500);expect(combo.log.resolved).toHaveLength(1);expect(combo.log.resolved[0]).toMatchObject({outcome:'PERFECT',counter_dmg:13.75,braced:true});expect(combo.counter.closes_at).toBe(4200);
});
it('does not reward broken COMBO, wrong lean, CHIP, veto or round1',()=>{
 let s=pose(habit(Array(12).fill('COMBO')),100,true);s=vote(s,'v','COMBO',100);s=advance(s,3200);s=pose(s,3300,false);s=advance(s,3500);expect(s.log.resolved[0]).toMatchObject({braced:false,counter_dmg:0});
 let chip=pose(habit(Array(12).fill('HOOK_L')),100,true,'L');chip=vote(chip,'v','HOOK_L',100);chip=advance(chip,3200);expect(chip.log.resolved[0]).toMatchObject({braced:false,outcome:'CHIP'});
 let first=habit(Array(12).fill('JAB'),1);first.chatScouting.card='JAB';first=pose(first,100,true);first=vote(first,'v','JAB',100);first=advance(first,3200);expect(first.log.resolved[0]?.braced).toBe(false);
});
it('eight early coordinated voters receive only standard damage after CHAT SYNC removal',()=>{
 for(const [move,guard,damage]of [['JAB',false,8],['HOOK_L',true,3],['COMBO',false,14]] as const){
  let s=cohort(createGame({moves:[move]}),move,0);s=pose(s,2000,guard);s=advance(s,move==='COMBO'?3500:3200);
  expect(s.log.resolved[0]?.dmg).toBe(damage);expect(s.log.resolved[0]).not.toHaveProperty('sync_count');expect(s.log.telegraphs[0]).not.toHaveProperty('sync');expect(s).not.toHaveProperty('sync');
 }
});
it('excludes zero-influence raider autopilot from chat evidence while recording descriptive opening picks',()=>{
 let s=step(createGame({moves:['JAB']}),{kind:'raid',viewers:8},0);for(let i=0;i<8;i++)s=step(s,{kind:'vote',user:`raider${i}`,move:'JAB',raider:true,at:0,simulated:true},0);s=advance(s,2400);expect(s.chatScouting.history).toEqual([]);expect(s.chatScouting.openings[0]?.voted).toBe(false);
});
