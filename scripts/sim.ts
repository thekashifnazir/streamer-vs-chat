import {tempoFor,type Difficulty} from '../shared/src/tempo.js';
import {defenceReadProbability} from '../shared/src/sim-model.js';
import {type BossDef} from '../shared/src/boss-def.js';
import { createGame,step,mulberry32,type GameState,type EngineEvent,type Side,type Counts,bossMove } from '../shared/src/engine.js';
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
export type CrowdProfile='ordinary'|'coordinated';
export const READ_MODEL={attempt:.35,hold:.85,earlyFraction:(difficulty:Difficulty='hard')=>1000/tempoFor(difficulty).beat,coordinatedFraction:.35} as const;
export type SimulationOptions={roundNumber?:number;dodges?:Side[];profile?:CrowdProfile;braceRate?:number;bossDef?:BossDef;difficulty?:Difficulty};
/** One75s round, driven exclusively through the production reducer and held inputs. */
export function simulateRound(player:Player,viewers:number,seed:number,options:SimulationOptions={}):GameState{
  let initial=createGame({seed,viewers,roundNumber:options.roundNumber??1,bossDef:options.bossDef,difficulty:options.difficulty});
  if(options.dodges)initial={...initial,scouting:{...initial.scouting,dodges:[...options.dodges]}};
  initial=step(initial,{kind:'advance'},initial.now);
  return playRound(initial,player,seed,options);
}
/** A second single-round sample, carrying the actual first-round scouting log. */
export function simulateScoutingRound(player:Player,viewers:number,seed:number,options:SimulationOptions={}):GameState{
  const warmup=simulateRound(player,viewers,seed,options);
  const initial=step(warmup,{kind:'next-round'},warmup.now+3000);
  return playRound(initial,player,seed^0x16D439A7,options);
}
function playRound(initial:GameState,player:Player,seed:number,options:SimulationOptions={}):GameState{
  const model=PLAYERS[player],random=mulberry32(seed^0xA53140F9),timing=mulberry32(seed^0x64A24F17),prediction=mulberry32(seed^0x42A291B7);
  const group=Math.floor(initial.viewers*READ_MODEL.coordinatedFraction);
  const coordinated=options.profile==='coordinated'&&group>=8?group:0;
  const crowd=createCrowd(initial.viewers-coordinated,seed^0x7A917D21);
  let state=initial;
  const start=initial.clock.started_at,tempo=tempoFor(initial.difficulty),beatLimit=Math.floor((75000-1-tempo.telegraph)/tempo.beat);
  let earlyBeat=0,finalCounts:Counts|undefined;
  const pending:{event:EngineEvent;at:number}[]=[];
  // Early voting overlaps the previous attack's telegraph/COMBO. Interleave it
  // chronologically before any pose/punch that crosses that window, never backdate.
  const apply=(event:EngineEvent,at:number)=>{
    while(!state.round.over){
      const earlyAt=earlyBeat<beatLimit?start+earlyBeat*tempo.beat+999:Infinity;
      const pendingAt=pending[0]?.at??Infinity;
      if(Math.min(earlyAt,pendingAt)>at)break;
      if(pendingAt<=earlyAt){const next=pending.shift()!;state=step(state,next.event,next.at);continue;}
      state=step(state,{kind:'advance'},earlyAt);
      const full=crowdVoteCounts(crowd,state),early={...full};
      for(const move of Object.keys(full) as (keyof Counts)[]){early[move]=0;for(let i=0;i<full[move];i++)if(timing()<READ_MODEL.earlyFraction(initial.difficulty))early[move]++;}
      // A persistent coordinated JAB preference is public, learnable pressure;
      // the unchanged no-triple rule still replaces a third drawn JAB.
      full.JAB+=coordinated;early.JAB+=coordinated;
      finalCounts=full;
      state=step(state,{kind:'crowd-votes',counts:early},earlyAt);
      earlyBeat++;
    }
    state=step(state,event,at);
  };
  const pose=(at:number,guard:boolean,lean:'L'|'R'|null=null)=>apply({kind:'pose',guard,lean,at,source:player==='keyboard'?'keyboard':'pose'},at);
  const bonus=(event:EngineEvent,at:number,nextInputAt:number)=>{if(at>nextInputAt){pending.push({event,at});pending.sort((a,b)=>a.at-b.at);}else apply(event,at);};
  for(let beat=0;beat<beatLimit&&!state.round.over;beat++){
    const draw=start+(beat+1)*tempo.beat;
    if(draw>=start+75000)break;
    // Flush the early cohort before the final tally, then optionally read the card.
    pose(draw-101,false,null);
    const card=state.chatScouting.card;
    const attempt=!!card&&prediction()<(options.braceRate??READ_MODEL.attempt);
    if(attempt)pose(draw-100,card==='JAB'||card==='COMBO',card==='HOOK_L'?'R':card==='HOOK_R'?'L':card==='SUPER'?(prediction()<model.lean?'L':'R'):null);
    apply({kind:'crowd-votes',counts:finalCounts!},draw-1);
    apply({kind:'advance'},draw);
    const attack=state.activeAttack;
    if(!attack||state.round.over)break;
    const spec=bossMove(state,attack.move),landing=attack.lands_at,straight=spec.defence==='guard';
    const read= random()<defenceReadProbability(model.p,landing-draw)*(attack.exploit?.7:1);
    const holdRead=!!attack.brace&&prediction()<READ_MODEL.hold;
    let guard=false,lean:'L'|'R'|null=null,perfect=false;
    if(holdRead){guard=straight;lean=straight?null:state.input.lean;}
    else if(read){
      if(straight){guard=true;perfect=random()<model.perfect;}
      else lean=spec.defence==='lean_any'?(random()<model.lean?'L':'R'):spec.defence==='lean_right'?'R':'L';
    }else if(!straight){guard=random()<.3;lean=guard?null:spec.defence==='lean_right'?'L':spec.defence==='lean_left'?'R':null;}
    if(!holdRead){pose(draw+1,false,null);pose(Math.max(draw+2,landing-(perfect?300:500)),guard,lean);}
    apply({kind:'advance'},landing+(spec.hits-1)*tempo.comboGap);
    if(state.round.over)break;
    const resolution=state.log.resolved.at(-1)!;
    if(state.counter.open&&model.punch>0){
      const punches=Math.min(2,Math.max(0,Math.round(model.punch+random()-.5)));
      for(let i=0;i<punches&&!state.round.over;i++)bonus({kind:'punch',side:i?'R':'L',at:resolution.at+100+i*450,source:player==='keyboard'?'keyboard':'pose'},resolution.at+100+i*450,draw+tempo.beat-101);
    }
    if(!state.round.over&&model.punch>0&&random()<.25){const at=resolution.at+1100,event:EngineEvent={kind:'punch',side:'L',at,source:player==='keyboard'?'keyboard':'pose'};bonus(event,at,draw+tempo.beat-101);}
  }
  if(!state.round.over)apply({kind:'advance'},start+75000);
  return state;
}
export function runBalance(rounds=4000,seed=2026,options:SimulationOptions={}){
  const viewers=[0,3,50,500],table:Record<string,number[]>={};
  for(const [index,player]of (Object.keys(PLAYERS)as Player[]).entries()){
    table[player]=viewers.map((count,column)=>{
      let wins=0;
      for(let i=0;i<rounds;i++)if(simulateRound(player,count,(seed+index*1_000_000+column*100_000+i)>>>0,options).round.winner==='streamer')wins++;
      return wins/rounds*100;
    });
    console.log(`${player.padEnd(10)} ${table[player]!.map(value=>value.toFixed(1).padStart(6)).join(' ')}`);
  }
  const pass=table.casual!.every(p=>p>=30&&p<=70)&&table.nopunch!.every(p=>p>=30);
  return {rounds,seed,viewers,table,pass};
}
/** Scouting diagnostic:4k second rounds/cell after genuine R1 warmups, same player/crowd models. */
export function runScouting(rounds=4000,seed=2026,options:SimulationOptions={}){
  const viewers=[0,3,50,500],table:Record<string,number[]>={},coverage:Record<string,{cards:number;exploits:number;fixes:number;braces:number}[]>={};
  for(const [index,player]of(Object.keys(PLAYERS)as Player[]).entries()){
    coverage[player]=[];
    table[player]=viewers.map((count,column)=>{
      let wins=0,cards=0,exploits=0,fixes=0,braces=0;
      for(let i=0;i<rounds;i++){
        const state=simulateScoutingRound(player,count,(seed+index*1_000_000+column*100_000+i)>>>0,options);
        if(state.round.winner==='streamer')wins++;
        const fixed=state.log.fixes.filter(f=>f.round===2).length;
        fixes+=fixed;cards+=fixed+(state.scouting.card?1:0);
        exploits+=state.log.telegraphs.filter(t=>t.round===2&&t.exploit).length;
        braces+=state.log.resolved.filter(t=>t.round===2&&t.braced).length;
      }
      coverage[player]!.push({cards,exploits,fixes,braces});
      return wins/rounds*100;
    });
    console.log(`${player.padEnd(10)} ${table[player]!.map(value=>value.toFixed(1).padStart(6)).join(' ')} · cards/exploits/fixes ${coverage[player]!.map(c=>`${c.cards}/${c.exploits}/${c.fixes} brace=${c.braces}`).join(' ')}`);
  }
  const total=Object.values(coverage).flat().reduce((sum,c)=>({cards:sum.cards+c.cards,exploits:sum.exploits+c.exploits,fixes:sum.fixes+c.fixes,braces:sum.braces+c.braces}),{cards:0,exploits:0,fixes:0,braces:0});
  const balancePass=table.casual!.every(p=>p>=30&&p<=70)&&table.nopunch!.every(p=>p>=30);
  const coveragePass=total.cards>0&&total.exploits>0&&total.fixes>0&&total.braces>0;
  return {rounds,seed,viewers,table,coverage,total,balancePass,coveragePass,pass:balancePass&&coveragePass};
}
export function runDifficulty(rounds=4000,seed=2026){
  const viewers=[0,3,50,500],table:Record<string,Record<string,number[]>>={};
  console.log('Difficulty model INFERRED: p=min(.95,p+.08*(effective telegraph_ms-800)/400); perfect/punch unchanged.');
  for(const difficulty of ['easy','medium','hard','expert'] as const){
    table[difficulty]={};
    for(const player of ['casual','nopunch'] as const){
      const index=(Object.keys(PLAYERS) as Player[]).indexOf(player);
      table[difficulty]![player]=viewers.map((count,column)=>{
        let wins=0;for(let i=0;i<rounds;i++)if(simulateRound(player,count,(seed+index*1_000_000+column*100_000+i)>>>0,{difficulty}).round.winner==='streamer')wins++;
        return wins/rounds*100;
      });
      console.log(`${difficulty.padEnd(7)} ${player.padEnd(8)} ${table[difficulty]![player]!.map(p=>p.toFixed(1).padStart(6)).join(' ')}`);
    }
  }
  const failures:string[]=[];
  for(const player of ['casual','nopunch'])for(let col=0;col<viewers.length;col++){
    const rates=['easy','medium','hard','expert'].map(level=>table[level]![player]![col]!);
    for(let i=0;i<3;i++)if(rates[i]!+2<rates[i+1]!)failures.push(`${player} v=${viewers[col]} ordering ${rates.join(' / ')}`);
    if(player==='casual'&&rates[0]!>90)failures.push(`easy casual v=${viewers[col]} ${rates[0]} >90%`);
    if(player==='casual'&&rates[3]!<15)failures.push(`expert casual v=${viewers[col]} ${rates[3]} <15%`);
    if(player==='nopunch'&&rates[1]!<40)failures.push(`medium nopunch v=${viewers[col]} ${rates[1]} <40%`);
  }
  for(const failure of failures)console.error(`FAIL difficulty: ${failure}`);
  return {rounds,seed,viewers,table,failures,pass:failures.length===0};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let pass=true;
  for(const profile of ['ordinary','coordinated'] as const){
    console.log(`bossHp=135 ·4000 rounds/cell ·seed2026 ·${profile} · R1`);
    console.log('player        v=0    v=3   v=50  v=500');
    const result=runBalance(4000,2026,{profile});console.log(result.pass?'PASS: casual30–70%, no-punch≥30%':'FAIL: casual30–70%, no-punch≥30%');
    console.log(`${profile} R2 after real R1 warmups · brace attempt ${READ_MODEL.attempt},hold ${READ_MODEL.hold}`);
    const scouting=runScouting(4000,2026,{profile});
    console.log(scouting.pass?`PASS: cards=${scouting.total.cards},exploits=${scouting.total.exploits},fixes=${scouting.total.fixes},braces=${scouting.total.braces}`:'FAIL: scouting balance or coverage gate');
    pass=pass&&result.pass&&scouting.pass;
  }
  const difficulty=runDifficulty();pass=pass&&difficulty.pass;
  const {gateBoss}=await import('../shared/src/boss-forge.js');
  const {readFileSync,readdirSync}=await import('node:fs');
  for(const file of readdirSync(new URL('../fixtures/bosses/',import.meta.url)).filter(file=>file.endsWith('.json'))){
    const def=JSON.parse(readFileSync(new URL('../fixtures/bosses/'+file,import.meta.url),'utf8'));
    const gate=gateBoss(def);console.log(`Forge ${file}: ${JSON.stringify(gate.table)} ${gate.pass?'PASS':'FAIL'}`);pass=pass&&gate.pass;
  }
  if(!pass)process.exitCode=1;
}
