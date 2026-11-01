import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame,step,type GameState} from '../../shared/src/engine';
import {mountFightUi} from './fight-ui';
import {workoutStats,workoutText} from './workout';
const windows:JSDOM[]=[];afterEach(()=>{for(const dom of windows)dom.window.close();windows.length=0;vi.restoreAllMocks();});
it('counts punches the fight registered and active fight time, excluding a pause',()=>{
 let game=createGame({seed:7,viewers:0,now:0});
 game=step(game,{kind:'pose',guard:true,lean:null,source:'keyboard',at:0},0);
 // Ten punches 500 ms apart register; a second press 100 ms later is inside the 450 ms gap and does not.
 for(let i=0;i<10;i++){const at=1000+i*500;game=step(game,{kind:'punch',side:'L',at,source:'keyboard'},at);game=step(game,{kind:'punch',side:'R',at:at+100,source:'keyboard'},at+100);}
 game=step(game,{kind:'control',action:'stop',by:'capture'},12000);
 game=step(game,{kind:'advance'},72000);
 game=step(game,{kind:'control',action:'resume',by:'capture'},72000);
 game=step(game,{kind:'advance'},90000);
 const stats=workoutStats(game),summary=game.log.resolved;
 expect(stats.punches).toBe(10);
 expect(stats.defences).toBe(summary.filter(hit=>['BLOCK','PERFECT','DODGE'].includes(hit.outcome)).length);
 // 12 s before the pause plus 18 s after it: 30 s is 0.5 min; the 60 s pause never counts.
 expect(game.round.elapsed_ms).toBe(30000);expect(stats.activeMinutes).toBe(.5);
});
it('sums every round of the match and leaves between-round time out',()=>{
 const game=createGame({seed:1,now:0});game.round.over=true;game.round.number=2;game.match.winner='streamer';
 game.log.rounds=[{number:1,winner:'streamer',reason:'ko',at:70000,streamer_hp:80,boss_hp:0,boss_max_hp:135,duration_ms:61000},{number:2,winner:'streamer',reason:'ko',at:200000,streamer_hp:60,boss_hp:0,boss_max_hp:135,duration_ms:65000}] as GameState['log']['rounds'];
 const hit=(round:number,outcome:string)=>({round,beat:1,move:'JAB',at:0,outcome,dmg:0,counter_dmg:0,guard:true,lean:null,defence:'guard',reaction_ms:null,reaction_kind:'held',capture_at:null,received_at:null});
 game.log.resolved=[hit(1,'BLOCK'),hit(1,'PERFECT'),hit(1,'HIT'),hit(2,'DODGE'),hit(2,'CHIP'),hit(2,'BLOCK')] as unknown as GameState['log']['resolved'];
 game.log.bossDamage=[{round:1,beat:1,at:0,kind:'punch',damage:1},{round:1,beat:2,at:0,kind:'counter',damage:4},{round:2,beat:1,at:0,kind:'punch',damage:1},{round:2,beat:3,at:0,kind:'finisher',damage:9}];
 // 126 s of fight clock = 2.1 min, one decimal.
 expect(workoutStats(game)).toEqual({punches:2,defences:4,activeMinutes:2.1});
 expect(workoutText({punches:1,defences:1,activeMinutes:0})).toBe('1 punch · 1 clean defence · 0.0 active min');
 expect(workoutText(workoutStats(game))).toBe('2 punches · 4 clean defences · 2.1 active min');
});
it('shows the Workout row on the match result only, with no health claims',()=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'));windows.push(dom);const doc=dom.window.document;
 const ui=mountFightUi(doc,{offline:true,resume:vi.fn(),restart:vi.fn(),quit:vi.fn(),end:vi.fn(),next:vi.fn(),now:()=>0});
 const game=createGame({seed:3,now:0});game.round.over=true;game.log.rounds=[{number:1,winner:'streamer',reason:'ko',at:100,streamer_hp:90,boss_hp:0,boss_max_hp:135,duration_ms:45000}] as GameState['log']['rounds'];
 ui.render(game);const row=doc.querySelector<HTMLElement>('#round-results .workout-row')!;expect(row.hidden).toBe(true);
 expect(doc.querySelectorAll('.plain-stats p')).toHaveLength(3);
 const won={...game,round:{...game.round,number:2},match:{...game.match,winner:'streamer' as const,round_wins:{streamer:2,boss:0}}};
 ui.render(won);expect(row.hidden).toBe(false);expect(row.textContent).toBe('Workout 0 punches · 0 clean defences · 0.8 active min');
 expect(row.previousElementSibling!.classList.contains('plain-stats')).toBe(true);
 expect(doc.getElementById('round-results')!.textContent).not.toMatch(/calorie|kcal|burn|health|fitness/i);
 // An early End fight is also the end of the match.
 ui.reset();const ended={...game,round:{...game.round,over:false},log:{...game.log,rounds:[]}};ended.round.elapsed_ms=12000;ui.render(ended,true);expect(row.hidden).toBe(false);expect(row.textContent).toContain('0.2 active min');
});
