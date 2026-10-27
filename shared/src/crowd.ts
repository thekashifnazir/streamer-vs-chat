import type { ChatVote,Move } from './index.js';
import { emptyCounts,mulberry32,type Counts,type GameState } from './engine.js';
export type Persona='spammer'|'tactician'|'chaos'|'hype'|'lurker';
export type Crowd={viewers:number;personas:Persona[];random:()=>number};
const BASE:Move[]=['JAB','HOOK_L','HOOK_R','COMBO'];
/** Simulation data only. Callers must apply the live-token safety gate before use. */
export function createCrowd(viewers:number,seed:number):Crowd{
  const random=mulberry32(seed),count=Math.max(0,Math.floor(viewers));
  const personas=Array.from({length:count},():Persona=>{const p=random();return p<.25?'spammer':p<.45?'tactician':p<.70?'chaos':p<.85?'hype':'lurker';});
  return {viewers:count,personas,random};
}
function choose(crowd:Crowd,persona:Persona,state:GameState):Move|null{
  const random=()=>BASE[Math.floor(crowd.random()*4)]!;
  if(persona==='spammer')return 'JAB';
  if(persona==='tactician'&&state.scouting.card&&state.scouting.cooldown===0)return state.scouting.card==='L'?'HOOK_L':'HOOK_R';
  if(persona==='hype'&&state.hype===100&&state.supers_used<3)return 'SUPER';
  if(persona==='chaos'&&crowd.random()>=.7)return null;
  if(persona==='lurker'&&crowd.random()>=.15)return null;
  return random();
}
export function crowdVotes(crowd:Crowd,state:GameState,at:number):ChatVote[]{
  if(state.paused||state.round.over)return [];
  const votes:ChatVote[]=[];
  for(let i=0;i<crowd.personas.length;i++){
    const move=choose(crowd,crowd.personas[i]!,state);
    if(move)votes.push({kind:'vote',user:`sim-${i+1}`,move,at,simulated:true});
  }
  return votes;
}
/** Same persona draws as crowdVotes; aggregate only to avoid allocating80M vote objects in the balance run. */
export function crowdVoteCounts(crowd:Crowd,state:GameState):Counts{
  const counts=emptyCounts();
  if(state.paused||state.round.over)return counts;
  for(const persona of crowd.personas){const move=choose(crowd,persona,state);if(move)counts[move]++;}
  return counts;
}
