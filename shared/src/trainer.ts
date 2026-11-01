import type {Difficulty} from './tempo.js';
/** Crowd Trainer: chat calls the combo, the streamer throws it. Pure reducer; callers pass the clock. */
export type Token='1'|'2'|'S'|'G';
export type ComboId='12'|'112'|'121'|'1212'|'12s'|'s12'|'12g'|'2s2';
export type Pace='faster'|'slower';
export type TrainerVote={kind:'combo';combo:ComboId}|{kind:'pace';pace:Pace};
export type ComboDef={id:ComboId;command:string;name:string;tokens:readonly Token[];cue:string};
/** Only what a front webcam reads reliably: which hand punched, a lean (slip) and a held guard. */
export const COMBOS:readonly ComboDef[]=[
 {id:'12',command:'!12',name:'One-two',tokens:['1','2'],cue:'combo-12'},
 {id:'112',command:'!112',name:'One-one-two',tokens:['1','1','2'],cue:'combo-112'},
 {id:'121',command:'!121',name:'One-two-one',tokens:['1','2','1'],cue:'combo-121'},
 {id:'1212',command:'!1212',name:'One-two-one-two',tokens:['1','2','1','2'],cue:'combo-1212'},
 {id:'12s',command:'!12s',name:'One-two, slip',tokens:['1','2','S'],cue:'combo-12s'},
 {id:'s12',command:'!s12',name:'Slip, one-two',tokens:['S','1','2'],cue:'combo-s12'},
 {id:'12g',command:'!12g',name:'One-two, guard',tokens:['1','2','G'],cue:'combo-12g'},
 {id:'2s2',command:'!2s2',name:'Two, slip, two',tokens:['2','S','2'],cue:'combo-2s2'},
];
for(const combo of COMBOS)Object.freeze(combo);Object.freeze(COMBOS);
export const COMBO_IDS=COMBOS.map(combo=>combo.id);
export function comboDef(id:ComboId):ComboDef{return COMBOS.find(combo=>combo.id===id)!;}
/** The only Crowd Trainer timing constants. */
export const TRAINER={
 rounds:3,workMs:60_000,restMs:20_000,tenSecondsMs:10_000,guardHoldMs:500,firstCallMs:2_500,
 // Gap between one combo's end and the next call; chat's !faster/!slower nudge it inside these bounds.
 pace:{stepMs:500,minMs:1_200,maxMs:5_000},
 gapMs:{easy:3_000,medium:2_500,hard:2_000,expert:1_600} as Record<Difficulty,number>,
 // Time to throw a combo: base plus per token; Easy is generous. A guard token adds its hold time.
 window:{easy:{baseMs:2_000,tokenMs:1_200},medium:{baseMs:1_500,tokenMs:900},hard:{baseMs:1_200,tokenMs:700},expert:{baseMs:1_000,tokenMs:550}} as Record<Difficulty,{baseMs:number;tokenMs:number}>,
} as const;
export type TrainerCue='round-start'|'rest'|'ten-seconds'|'time'|'clean'|'partial'|'missed'|'faster'|'slower'|'workout-done'|ComboDef['cue'];
export type ComboResult='clean'|'partial'|'missed';
export type Mark='hit'|'skip'|null;
export type TrainerOptions={difficulty:Difficulty;southpaw:boolean;anyHand:boolean;seed:number};
export type ActiveCombo={id:ComboId;tokens:readonly Token[];calledAt:number;endsAt:number;index:number;marks:Mark[];tokenSince:number;voted:boolean};
export type TrainerState={
 now:number;options:TrainerOptions;rng:number;
 phase:'work'|'rest'|'done';round:number;phaseEndsAt:number;workStartedAt:number;tenWarned:boolean;
 paused:boolean;pausedAt:number|null;
 combo:ActiveCombo|null;nextCallAt:number|null;gapMs:number;
 votes:Record<string,ComboId>;paceVotes:Record<string,Pace>;tally:Record<ComboId,number>;history:ComboId[];
 last:{id:ComboId;result:ComboResult;marks:Mark[];at:number}|null;
 pose:{guard:boolean;lean:'L'|'R'|null;guardSince:number|null;guardCounted:boolean};
 stats:{clean:number;partial:number;missed:number;punchesL:number;punchesR:number;slips:number;guards:number;activeMs:number;comboVotes:Record<ComboId,number>;voters:Record<string,true>};
 /** Cues raised by the latest step only; the view plays them and never stores them. */
 cues:TrainerCue[];
};
export type TrainerEvent={kind:'advance'}|{kind:'vote';user:string;vote:TrainerVote}|{kind:'pose';guard:boolean;lean:'L'|'R'|null}|{kind:'punch';side:'L'|'R'}|{kind:'pause'}|{kind:'resume'}|{kind:'stop'};
const emptyTally=()=>Object.fromEntries(COMBO_IDS.map(id=>[id,0])) as Record<ComboId,number>;
/** Same unsigned mulberry32 step as the Boss Fight engine; the state carries the seed. */
function randomStep(seed:number):{seed:number;value:number}{
 const next=(seed+0x6D2B79F5)>>>0;let t=Math.imul(next^(next>>>15),1|next);t=(t+Math.imul(t^(t>>>7),61|t))^t;
 return {seed:next,value:((t^(t>>>14))>>>0)/4294967296};
}
/** Boss Fight vote rules: weighted by counted votes, uniform autopilot with none, never the same combo three times running. */
export function drawCombo(counts:Partial<Record<ComboId,number>>,history:readonly ComboId[],rng:()=>number):ComboId{
 const total=COMBO_IDS.reduce((sum,id)=>sum+(counts[id]??0),0);let combo:ComboId;
 if(total===0)combo=COMBO_IDS[Math.floor(rng()*COMBO_IDS.length)]!;
 else{let x=rng()*total;combo=COMBO_IDS.at(-1)!;for(const id of COMBO_IDS){const count=counts[id]??0;if(x<count){combo=id;break;}x-=count;}}
 if(history.length>=2&&history.at(-1)===combo&&history.at(-2)===combo){const others=COMBO_IDS.filter(id=>id!==combo);combo=others[Math.floor(rng()*others.length)]!;}
 return combo;
}
export function comboWindowMs(tokens:readonly Token[],difficulty:Difficulty):number{
 const timing=TRAINER.window[difficulty];return timing.baseMs+timing.tokenMs*tokens.length+(tokens.includes('G')?TRAINER.guardHoldMs:0);
}
/** Net pace votes move the gap one step, clamped. Ties keep it. */
export function nudgePace(gapMs:number,faster:number,slower:number):number{
 const {stepMs,minMs,maxMs}=TRAINER.pace,next=faster>slower?gapMs-stepMs:slower>faster?gapMs+stepMs:gapMs;
 return Math.min(maxMs,Math.max(minMs,next));
}
/** Which token a detected punch fills. `1` is the lead hand: left for orthodox, right for southpaw. Any-hand punches fill either number. */
export function punchToken(side:'L'|'R',options:Pick<TrainerOptions,'southpaw'|'anyHand'>):Token|'P'{
 if(options.anyHand)return 'P';return (side==='L')!==options.southpaw?'1':'2';
}
const fits=(token:Token|undefined,detected:Token|'P')=>token===detected||detected==='P'&&(token==='1'||token==='2');
/** In-order matching. Unexpected moves are ignored; a move that fits the token after the current one
 * skips the current token (the webcam may have missed it), so lenient scoring keeps up. */
export function matchToken(combo:ActiveCombo,detected:Token|'P',at:number):ActiveCombo{
 const i=combo.index;if(i>=combo.tokens.length)return combo;
 const marks=[...combo.marks];
 if(fits(combo.tokens[i],detected)){marks[i]='hit';return {...combo,marks,index:i+1,tokenSince:at};}
 if(fits(combo.tokens[i+1],detected)){marks[i]='skip';marks[i+1]='hit';return {...combo,marks,index:i+2,tokenSince:at};}
 return combo;
}
export function scoreCombo(marks:readonly Mark[]):ComboResult{const hits=marks.filter(mark=>mark==='hit').length;return hits===marks.length?'clean':hits>0?'partial':'missed';}
export function createTrainer(options:TrainerOptions,now:number):TrainerState{
 return {now,options:{...options},rng:options.seed>>>0,phase:'work',round:1,phaseEndsAt:now+TRAINER.workMs,workStartedAt:now,tenWarned:false,paused:false,pausedAt:null,
  combo:null,nextCallAt:now+TRAINER.firstCallMs,gapMs:TRAINER.gapMs[options.difficulty],votes:{},paceVotes:{},tally:emptyTally(),history:[],last:null,
  pose:{guard:false,lean:null,guardSince:null,guardCounted:false},
  stats:{clean:0,partial:0,missed:0,punchesL:0,punchesR:0,slips:0,guards:0,activeMs:0,comboVotes:emptyTally(),voters:{}},cues:['round-start']};
}
function finishCombo(s:TrainerState,at:number,discardEmpty=false){
 const combo=s.combo!;s.combo=null;
 if(discardEmpty&&combo.marks.every(mark=>mark===null))return;
 const marks=combo.marks.map(mark=>mark??'skip'),result=scoreCombo(combo.marks);
 s.stats={...s.stats,[result]:s.stats[result]+1};s.last={id:combo.id,result,marks,at};s.cues.push(result);
}
function call(s:TrainerState,at:number){
 const faster=Object.values(s.paceVotes).filter(pace=>pace==='faster').length,slower=Object.values(s.paceVotes).length-faster,gap=nudgePace(s.gapMs,faster,slower);
 if(gap<s.gapMs)s.cues.push('faster');else if(gap>s.gapMs)s.cues.push('slower');s.gapMs=gap;
 const id=drawCombo(s.tally,s.history,()=>{const r=randomStep(s.rng);s.rng=r.seed;return r.value;}),def=comboDef(id);
 const comboVotes={...s.stats.comboVotes};for(const key of COMBO_IDS)comboVotes[key]+=s.tally[key];
 s.stats={...s.stats,comboVotes};
 s.combo={id,tokens:def.tokens,calledAt:at,endsAt:at+comboWindowMs(def.tokens,s.options.difficulty),index:0,marks:def.tokens.map(()=>null),tokenSince:at,voted:s.tally[id]>0};
 s.history=[...s.history,id].slice(-12);s.votes={};s.paceVotes={};s.tally=emptyTally();s.nextCallAt=null;s.cues.push(def.cue);
}
/** When a held guard fills the current (or, skipping, the next) G token. */
function guardDue(s:TrainerState):number|null{
 const combo=s.combo;if(!combo||!s.pose.guard||s.pose.guardSince===null)return null;
 if(combo.tokens[combo.index]!=='G'&&combo.tokens[combo.index+1]!=='G')return null;
 return Math.max(s.pose.guardSince,combo.tokenSince)+TRAINER.guardHoldMs;
}
function countGuard(s:TrainerState,at:number){
 const p=s.pose;if(!p.guard||p.guardCounted||p.guardSince===null||at-p.guardSince<TRAINER.guardHoldMs)return;
 s.pose={...p,guardCounted:true};if(s.phase==='work')s.stats={...s.stats,guards:s.stats.guards+1};
}
function endWork(s:TrainerState,at:number){
 if(s.combo)finishCombo(s,at,true);
 s.stats={...s.stats,activeMs:s.stats.activeMs+(at-s.workStartedAt)};s.nextCallAt=null;s.cues.push('time');
 if(s.round<TRAINER.rounds){s.phase='rest';s.phaseEndsAt=at+TRAINER.restMs;s.cues.push('rest');}
 else{s.phase='done';s.cues.push('workout-done');}
}
/** Run every deadline due up to `now`, earliest first. */
function advance(s:TrainerState,now:number){
 for(let guard=0;guard<64;guard++){
  if(s.phase==='done')return;
  if(s.phase==='rest'){
   if(s.phaseEndsAt>now)return;
   const at=s.phaseEndsAt;s.round++;s.phase='work';s.workStartedAt=at;s.phaseEndsAt=at+TRAINER.workMs;s.tenWarned=false;s.nextCallAt=at+TRAINER.firstCallMs;s.cues.push('round-start');continue;
  }
  const g=guardDue(s),ten=s.tenWarned?Infinity:s.phaseEndsAt-TRAINER.tenSecondsMs;
  const due=Math.min(s.phaseEndsAt,ten,s.combo?Math.min(s.combo.endsAt,g!==null&&g<=s.combo.endsAt?g:Infinity):Infinity,s.nextCallAt??Infinity);
  if(due>now)return;
  if(due===ten&&ten<s.phaseEndsAt){s.tenWarned=true;s.cues.push('ten-seconds');continue;}
  if(due===s.phaseEndsAt){s.tenWarned=true;endWork(s,due);continue;}
  if(s.combo&&g===due){s.combo=matchToken(s.combo,'G',due);if(s.combo.index>=s.combo.tokens.length){finishCombo(s,due);s.nextCallAt=due+s.gapMs;}continue;}
  if(s.combo&&s.combo.endsAt===due){finishCombo(s,due);s.nextCallAt=due+s.gapMs;continue;}
  if(s.nextCallAt===due){call(s,due);continue;}
  return;
 }
}
function detect(s:TrainerState,detected:Token|'P',at:number){
 if(!s.combo||s.phase!=='work')return;
 s.combo=matchToken(s.combo,detected,at);
 if(s.combo.index>=s.combo.tokens.length){finishCombo(s,at);s.nextCallAt=at+s.gapMs;}
}
function shift(s:TrainerState,by:number,pausedAt:number){
 s.phaseEndsAt+=by;s.workStartedAt+=by;if(s.nextCallAt!==null)s.nextCallAt+=by;
 if(s.combo)s.combo={...s.combo,endsAt:s.combo.endsAt+by,tokenSince:s.combo.tokenSince+by,calledAt:s.combo.calledAt+by};
 // A guard raised during the pause starts its hold on resume.
 if(s.pose.guardSince!==null)s.pose={...s.pose,guardSince:s.pose.guardSince<=pausedAt?s.pose.guardSince+by:s.now};
}
/** Pure reducer: no clock calls. Pauses freeze every deadline. */
export function trainerStep(state:TrainerState,event:TrainerEvent,now:number):TrainerState{
 if(!Number.isFinite(now)||now<state.now)throw new Error('Trainer time must be finite and monotonic');
 const s:TrainerState={...state,cues:[]};
 if(!s.paused)advance(s,now);
 s.now=now;
 if(event.kind==='pause'){if(!s.paused&&s.phase!=='done'){s.paused=true;s.pausedAt=now;}return s;}
 if(event.kind==='resume'){if(s.paused){shift(s,now-s.pausedAt!,s.pausedAt!);s.paused=false;s.pausedAt=null;}return s;}
 if(event.kind==='stop'){
  if(s.phase==='done')return s;
  if(s.paused){shift(s,now-s.pausedAt!,s.pausedAt!);s.paused=false;s.pausedAt=null;}
  if(s.phase==='work'){if(s.combo)finishCombo(s,now,true);s.stats={...s.stats,activeMs:s.stats.activeMs+(now-s.workStartedAt)};}
  s.phase='done';s.nextCallAt=null;s.cues.push('workout-done');return s;
 }
 if(event.kind==='vote'){
  if(s.phase==='done'||s.paused)return s;
  const user=event.user;s.stats={...s.stats,voters:{...s.stats.voters,[user]:true}};
  if(event.vote.kind==='pace'){s.paceVotes={...s.paceVotes,[user]:event.vote.pace};return s;}
  // One counted vote per viewer per window; a later vote replaces the earlier one.
  const old=Object.hasOwn(s.votes,user)?s.votes[user]:undefined,combo=event.vote.combo;
  if(old===combo)return s;
  const tally={...s.tally};if(old)tally[old]--;tally[combo]++;s.tally=tally;s.votes={...s.votes,[user]:combo};return s;
 }
 if(event.kind==='punch'){
  if(s.paused||s.phase!=='work')return s;
  s.stats={...s.stats,[event.side==='L'?'punchesL':'punchesR']:s.stats[event.side==='L'?'punchesL':'punchesR']+1};
  detect(s,punchToken(event.side,s.options),now);return s;
 }
 if(event.kind==='pose'){
  const before=s.pose,slip=event.lean!==null&&event.lean!==before.lean;
  s.pose={guard:event.guard,lean:event.lean,guardSince:event.guard?before.guard?before.guardSince:now:null,guardCounted:event.guard&&before.guard?before.guardCounted:false};
  if(s.paused||s.phase!=='work')return s;
  if(slip){s.stats={...s.stats,slips:s.stats.slips+1};detect(s,'S',now);}
  countGuard(s,now);
  if(s.combo){const g=guardDue(s);if(g!==null&&g<=now)detect(s,'G',now);}
  return s;
 }
 if(!s.paused)countGuard(s,now);
 return s;
}
export type WorkoutSummary={clean:number;partial:number;missed:number;combos:number;punchesL:number;punchesR:number;punches:number;slips:number;guards:number;activeMinutes:number;favourite:ComboDef|null;voters:number};
export function trainerSummary(s:TrainerState):WorkoutSummary{
 const {stats}=s,live=s.phase==='work'?(s.paused?s.pausedAt!:s.now)-s.workStartedAt:0;
 let favourite:ComboDef|null=null,best=0;for(const combo of COMBOS){const votes=stats.comboVotes[combo.id]+(s.tally[combo.id]??0);if(votes>best){best=votes;favourite=combo;}}
 return {clean:stats.clean,partial:stats.partial,missed:stats.missed,combos:stats.clean+stats.partial+stats.missed,punchesL:stats.punchesL,punchesR:stats.punchesR,punches:stats.punchesL+stats.punchesR,slips:stats.slips,guards:stats.guards,activeMinutes:Math.round((stats.activeMs+Math.max(0,live))/6000)/10,favourite,voters:Object.keys(stats.voters).length};
}
/** One chat-safe line. Counts only: no calorie, heart-rate or medical claims. */
export function formatWorkoutSummary(summary:WorkoutSummary):string{
 return `Workout done: ${summary.clean} clean combo${summary.clean===1?'':'s'}, ${summary.punches} punch${summary.punches===1?'':'es'}.${summary.favourite?` Chat's favourite: ${summary.favourite.name.toLowerCase()}.`:''}`;
}
