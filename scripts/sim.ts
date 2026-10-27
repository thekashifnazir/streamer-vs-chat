import { createGame,step,mulberry32,type GameState,type EngineEvent,type Side } from '../shared/src/engine.js';
import {createCrowd,crowdVoteCounts}from '../shared/src/crowd.js';
import {fileURLToPath}from 'node:url';
import {resolve}from 'node:path';
export const PLAYERS={
  casual:{p:.55,perfect:.15,lean:.75,punch:.6},
  good:{p:.75,perfect:.35,lean:.75,punch:1.2},
  seated:{p:.60,perfect:.20,lean:.75,punch:.4},
  nopunch:{p:.55,perfect:.15,lean:.75,punch:0},
  keyboard:{p:.70,perfect:.30,lean:.6,punch:.8},
}as const;
export type Player=keyof typeof PLAYERS;
export type SimulationOptions={roundNumber?:number;dodges?:Side[]};
/** One75s round, driven exclusively through the production reducer and held inputs. */
export function simulateRound(player:Player,viewers:number,seed:number,options:SimulationOptions={}):GameState{
  let initial=createGame({seed,viewers,roundNumber:options.roundNumber??1});
  if(options.dodges)initial={...initial,scouting:{...initial.scouting,dodges:[...options.dodges]}};
  initial=step(initial,{kind:'advance'},initial.now);
  return playRound(initial,player,seed);
}
/** A second single-round sample, carrying the actual first-round scouting log. */
export function simulateScoutingRound(player:Player,viewers:number,seed:number):GameState{
  const warmup=simulateRound(player,viewers,seed);
  const initial=step(warmup,{kind:'next-round'},warmup.now+3000);
  return playRound(initial,player,seed^0x16D439A7);
}
function playRound(initial:GameState,player:Player,seed:number):GameState{
  const model=PLAYERS[player],random=mulberry32(seed^0xA53140F9),crowd=createCrowd(initial.viewers,seed^0x7A917D21);
  let state=initial;
  const start=initial.clock.started_at;
  const apply=(event:EngineEvent,at:number)=>{state=step(state,event,at);};
  const pose=(at:number,guard:boolean,lean:'L'|'R'|null=null)=>apply({kind:'pose',guard,lean,at,source:player==='keyboard'?'keyboard':'pose'},at);
  for(let beat=0;beat<30&&!state.round.over;beat++){
    const draw=start+(beat+1)*2400;
    apply({kind:'crowd-votes',counts:crowdVoteCounts(crowd,state)},draw-1);
    apply({kind:'advance'},draw);
    const attack=state.activeAttack;
    if(!attack||state.round.over)break;
    const landing=attack.lands_at,straight=attack.move==='JAB'||attack.move==='COMBO';
    const reads=random()<model.p*(attack.exploit?.7:1);
    let guard=false,lean:'L'|'R'|null=null,perfect=false;
    if(reads){
      if(straight){guard=true;perfect=random()<model.perfect;}
      // The lean-side bias applies where either side is a valid dodge (SUPER).
      // Hook misses must remain misses under the stated30% CHIP/otherwise HIT model.
      else lean=attack.move==='SUPER'?(random()<model.lean?'L':'R'):attack.move==='HOOK_L'?'R':'L';
    }else if(!straight){
      // A miss cannot accidentally become a correct dodge. Thirty percent chip.
      guard=random()<.3;
      lean=guard?null:attack.move==='HOOK_L'?'L':attack.move==='HOOK_R'?'R':null;
    }
    // Clear between tells, then raise early enough for BLOCK or late for PERFECT.
    pose(draw+1,false,null);
    pose(landing-(perfect?300:500),guard,lean);
    apply({kind:'advance'},landing+(attack.move==='COMBO'?300:0));
    if(state.round.over)break;
    const resolution=state.log.resolved.at(-1)!;
    if(state.counter.open&&model.punch>0){
      const punches=Math.min(2,Math.max(0,Math.round(model.punch+random()-.5)));
      for(let i=0;i<punches&&!state.round.over;i++)apply({kind:'punch',side:i?'R':'L',at:resolution.at+100+i*450,source:player==='keyboard'?'keyboard':'pose'},resolution.at+100+i*450);
    }
    if(!state.round.over&&model.punch>0&&random()<.25){
      const at=resolution.at+1100;
      apply({kind:'punch',side:'L',at,source:player==='keyboard'?'keyboard':'pose'},at);
    }
  }
  if(!state.round.over)apply({kind:'advance'},start+75000);
  return state;
}
export function runBalance(rounds=4000,seed=2026){
  const viewers=[0,3,50,500],table:Record<string,number[]>={};
  for(const [index,player]of (Object.keys(PLAYERS)as Player[]).entries()){
    table[player]=viewers.map((count,column)=>{
      let wins=0;
      for(let i=0;i<rounds;i++)if(simulateRound(player,count,(seed+index*1_000_000+column*100_000+i)>>>0).round.winner==='streamer')wins++;
      return wins/rounds*100;
    });
    console.log(`${player.padEnd(10)} ${table[player]!.map(value=>value.toFixed(1).padStart(6)).join(' ')}`);
  }
  const pass=table.casual!.every(p=>p>=30&&p<=70)&&table.nopunch!.every(p=>p>=30);
  return {rounds,seed,viewers,table,pass};
}
/** Scouting diagnostic:4k second rounds/cell after genuine R1 warmups, same player/crowd models. */
export function runScouting(rounds=4000,seed=2026){
  const viewers=[0,3,50,500],table:Record<string,number[]>={},coverage:Record<string,{cards:number;exploits:number;fixes:number}[]>={};
  for(const [index,player]of(Object.keys(PLAYERS)as Player[]).entries()){
    coverage[player]=[];
    table[player]=viewers.map((count,column)=>{
      let wins=0,cards=0,exploits=0,fixes=0;
      for(let i=0;i<rounds;i++){
        const state=simulateScoutingRound(player,count,(seed+index*1_000_000+column*100_000+i)>>>0);
        if(state.round.winner==='streamer')wins++;
        const fixed=state.log.fixes.filter(f=>f.round===2).length;
        fixes+=fixed;cards+=fixed+(state.scouting.card?1:0);
        exploits+=state.log.telegraphs.filter(t=>t.round===2&&t.exploit).length;
      }
      coverage[player]!.push({cards,exploits,fixes});
      return wins/rounds*100;
    });
    console.log(`${player.padEnd(10)} ${table[player]!.map(value=>value.toFixed(1).padStart(6)).join(' ')} · cards/exploits/fixes ${coverage[player]!.map(c=>`${c.cards}/${c.exploits}/${c.fixes}`).join(' ')}`);
  }
  const total=Object.values(coverage).flat().reduce((sum,c)=>({cards:sum.cards+c.cards,exploits:sum.exploits+c.exploits,fixes:sum.fixes+c.fixes}),{cards:0,exploits:0,fixes:0});
  const balancePass=table.casual!.every(p=>p>=30&&p<=70)&&table.nopunch!.every(p=>p>=30);
  const coveragePass=total.cards>0&&total.exploits>0&&total.fixes>0;
  return {rounds,seed,viewers,table,coverage,total,balancePass,coveragePass,pass:balancePass&&coveragePass};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  console.log('bossHp=135 ·4000 single R1 rounds/cell ·seed2026 ·production reducer');
  console.log('player        v=0    v=3   v=50  v=500');
  const result=runBalance();
  console.log(result.pass?'PASS: casual30–70%, no-punch≥30%':'FAIL: casual30–70%, no-punch≥30%');
  console.log('Scouting diagnostic ·4000 R2 rounds/cell after actual R1 warmups ·same models ·same balance gates as R1');
  const scouting=runScouting();
  console.log(scouting.pass?`PASS: scouting exercised ${scouting.total.cards} cards /${scouting.total.exploits} exploits /${scouting.total.fixes} fixes`:'FAIL: scouting balance or coverage gate');
  if(!result.pass||!scouting.pass)process.exitCode=1;
}
