import {mulberry32} from '../../shared/src/engine';
import {COMBOS} from '../../shared/src/trainer';
import {hasLiveCredentials} from './credentials';
import {assertSimulationAllowed} from './safety';
/** SIMULATED chat for the offline Crowd Trainer: typed commands that go through the real parser. */
export function createTrainerCrowd(options:{viewers:number;seed:number;liveTokenLoaded:boolean}){
 assertSimulationAllowed({liveTokenLoaded:options.liveTokenLoaded||hasLiveCredentials()});
 const random=mulberry32(options.seed),count=Math.max(0,Math.floor(options.viewers));
 // Each simulated viewer has a favourite combo and a chat rate; a crowd leans towards the classics.
 const popular=['!12','!12','!12','!121','!12s','!s12','!112'];
 const viewers=Array.from({length:count},(_,i)=>({user:`sim-${i+1}`,favourite:random()<.6?popular[Math.floor(random()*popular.length)]!:COMBOS[Math.floor(random()*COMBOS.length)]!.command,rate:random()<.2?.004:.03}));
 return {messages(tickMs:number):{user:string;text:string}[]{
  const out:{user:string;text:string}[]=[],scale=tickMs/100;
  for(const viewer of viewers){
   if(random()>=viewer.rate*scale)continue;
   const roll=random(),text=roll<.03?'!faster':roll<.06?'!slower':roll<.75?viewer.favourite:COMBOS[Math.floor(random()*COMBOS.length)]!.command;
   out.push({user:viewer.user,text:random()<.2?text.toUpperCase():text});
  }
  return out;
 }};
}
