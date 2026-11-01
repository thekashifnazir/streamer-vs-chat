import type {GameState} from '../../shared/src/engine';
import {COACH_BASE_PROMPT,COACH_FIRST_MESSAGE,COACH_MAX_SECONDS} from './coach-prompt';
import {GAME_UPDATED_COACH,isStaleChunkError} from './stale-chunk';
/** Numbers and fixed labels only. Nothing typed by viewers (votes, names, Forge boss text) can reach this shape. */
export type CoachFacts={round:number;phase:'between-rounds'|'paused'|'match-over';roundWinner:'you'|'chat'|null;matchWinner:'you'|'chat'|null;wins:{you:number;chat:number};hp:{you:number;youMax:number;boss:number;bossMax:number};defence:{attacks:number;hits:number;chips:number;blocks:number;perfects:number;dodges:number};favourite:{move:string;defence:string|null;share:number}|null;dodgeHabit:{side:'left'|'right';share:number;n:number}|null;difficulty:string|null;customBoss:boolean};
const MOVE_ORDER=['JAB','HOOK_L','HOOK_R','COMBO','SUPER'] as const;
const MOVE_NAMES:Record<string,string>={JAB:'jab',HOOK_L:'left hook',HOOK_R:'right hook',COMBO:'combo',SUPER:'super'};
const DEFENCE_NAMES:Record<string,string>={guard:'guard',lean_left:'lean left',lean_right:'lean right',lean_any:'lean either way'};
const DEFAULT_DEFENCE:Record<string,string>={JAB:'guard',HOOK_L:'lean_right',HOOK_R:'lean_left',COMBO:'guard',SUPER:'lean_any'};
const DIFFICULTY=['easy','medium','hard','expert'];
const num=(value:unknown,max=1e6)=>typeof value==='number'&&Number.isFinite(value)?Math.round(Math.min(max,Math.max(0,value))):0;
const winner=(value:unknown)=>value==='streamer'?'you' as const:value==='boss'?'chat' as const:null;
/** Picks allowlisted fields out of the reducer state; anything else on the object is ignored. */
export function coachFacts(state:GameState):CoachFacts{
 const resolved=Array.isArray(state.log?.resolved)?state.log.resolved:[],count=(outcome:string)=>resolved.filter(item=>item?.outcome===outcome).length;
 const history=(Array.isArray(state.chatScouting?.history)?state.chatScouting.history:[]).filter(move=>MOVE_ORDER.includes(move));
 let favourite:CoachFacts['favourite']=null;
 if(history.length){const tally=new Map<string,number>();for(const move of history)tally.set(move,(tally.get(move)??0)+1);const [move,times]=[...tally].sort((a,b)=>b[1]-a[1]||MOVE_ORDER.indexOf(a[0] as never)-MOVE_ORDER.indexOf(b[0] as never))[0]!;
  const index=MOVE_ORDER.indexOf(move as never),custom=!!state.bossDef,defence=custom?state.bossDef?.moves?.[index]?.defence:DEFAULT_DEFENCE[move];
  favourite={move:custom?`attack ${index+1}`:MOVE_NAMES[move]!,defence:typeof defence==='string'&&DEFENCE_NAMES[defence]?DEFENCE_NAMES[defence]!:null,share:Math.round(times/history.length*100)};}
 const dodges=(Array.isArray(state.scouting?.dodges)?state.scouting.dodges:[]).filter(side=>side==='L'||side==='R'),left=dodges.filter(side=>side==='L').length;
 const side=left*2>=dodges.length?'left' as const:'right' as const,share=dodges.length?Math.round(Math.max(left,dodges.length-left)/dodges.length*100):0;
 return {round:num(state.round?.number,9),phase:state.match?.winner?'match-over':state.round?.over?'between-rounds':'paused',roundWinner:state.round?.over?winner(state.round.winner):null,matchWinner:winner(state.match?.winner),
  wins:{you:num(state.match?.round_wins?.streamer,9),chat:num(state.match?.round_wins?.boss,9)},hp:{you:num(state.streamer?.hp,999),youMax:num(state.streamer?.max_hp,999),boss:num(state.boss?.hp,999),bossMax:num(state.boss?.max_hp,999)},
  defence:{attacks:resolved.length,hits:count('HIT'),chips:count('CHIP'),blocks:count('BLOCK'),perfects:count('PERFECT'),dodges:count('DODGE')},favourite,
  dodgeHabit:dodges.length>=4&&share>=60?{side,share,n:dodges.length}:null,difficulty:DIFFICULTY.includes(state.difficulty)?state.difficulty:null,customBoss:!!state.bossDef};
}
/** Rebuilds every line from the typed facts (re-clamped), so a stray string never reaches the agent. */
export function coachPrompt(facts:CoachFacts):string{
 const f=facts,lines=[`Round ${num(f.round,9)} of 3 (first to 2 wins). Score: streamer ${num(f.wins?.you,9)}, chat ${num(f.wins?.chat,9)}.`,
  f.phase==='match-over'?`The match is over. ${f.matchWinner==='you'?'The streamer won it.':'Chat won it.'}`:f.phase==='between-rounds'?`Between rounds. ${f.roundWinner==='you'?'The streamer won the last round.':f.roundWinner==='chat'?'Chat won the last round.':''}`.trim():'The fight is paused mid-round.',
  `Health: streamer ${num(f.hp?.you,999)} of ${num(f.hp?.youMax,999)}, boss ${num(f.hp?.boss,999)} of ${num(f.hp?.bossMax,999)}.`,
  `This match so far: ${num(f.defence?.attacks)} attacks, ${num(f.defence?.blocks)} blocks, ${num(f.defence?.perfects)} perfect blocks, ${num(f.defence?.dodges)} dodges, ${num(f.defence?.chips)} chip hits, ${num(f.defence?.hits)} clean hits taken.`];
 const move=f.favourite&&(Object.values(MOVE_NAMES).includes(f.favourite.move)||/^attack [1-5]$/.test(f.favourite.move))?f.favourite.move:null,defence=f.favourite?.defence&&Object.values(DEFENCE_NAMES).includes(f.favourite.defence)?f.favourite.defence:null;
 if(move)lines.push(`Chat's most picked attack lately: ${move} (${num(f.favourite!.share,100)}% of picks)${defence?`, which you beat with ${defence}`:''}.`);
 if(f.dodgeHabit&&(f.dodgeHabit.side==='left'||f.dodgeHabit.side==='right'))lines.push(`Dodge habit: ${num(f.dodgeHabit.share,100)}% of the last ${num(f.dodgeHabit.n,99)} dodges went ${f.dodgeHabit.side}, so chat may start reading it.`);
 if(f.difficulty&&DIFFICULTY.includes(f.difficulty))lines.push(`Difficulty: ${f.difficulty}.`);
 if(f.customBoss)lines.push('This is a custom boss; refer to it only as "the boss".');
 return `${COACH_BASE_PROMPT}\n\nFight facts (game numbers only, never chat):\n${lines.join('\n')}`;
}
export type CoachSession={endSession():Promise<void>};
export type CoachStartOptions={conversationToken:string;connectionType:'webrtc';overrides:{agent:{prompt:{prompt:string};firstMessage:string}};onConnect:()=>void;onDisconnect:()=>void;onError:(message:string)=>void};
export type StartCoachSession=(options:CoachStartOptions)=>Promise<CoachSession>;
export type CoachView={status:'idle'|'connecting'|'live';message:string;remainingS:number};
export class CoachTokenError extends Error{constructor(readonly reason:'daily-cap'|'unavailable'){super(reason);}}
const startElevenLabs:StartCoachSession=async options=>{const {Conversation}=await import('@elevenlabs/client');return Conversation.startSession(options);};
const openMic=async()=>{const stream=await navigator.mediaDevices.getUserMedia({audio:true});for(const track of stream.getTracks())track.stop();};
/** One voice session at a time; it ends the moment play may resume, at the hard maximum, or on any error. */
export function createCornerCoach(options:{requestToken:()=>Promise<string>;/** Replaces the token-refusal wording (the demo points to /play). */tokenMessage?:(reason:'daily-cap'|'unavailable')=>string;allowed:()=>boolean;facts:()=>CoachFacts|null;onChange:(view:CoachView)=>void;startSession?:StartCoachSession;requestMic?:()=>Promise<void>;maxMs?:number;connectMs?:number;now?:()=>number}){
 const now=options.now??(()=>Date.now()),maxMs=Math.min(options.maxMs??COACH_MAX_SECONDS*1000,COACH_MAX_SECONDS*1000),connectMs=options.connectMs??15000;
 let epoch=0,status:CoachView['status']='idle',startedAt=0,connectFrom=0,session:CoachSession|null=null,timer:ReturnType<typeof setInterval>|null=null;
 const emit=(message='')=>options.onChange({status,message,remainingS:status==='idle'?0:Math.max(0,Math.ceil((startedAt+maxMs-now())/1000))});
 function end(message=''){epoch++;if(timer!==null)clearInterval(timer);timer=null;const live=session;session=null;status='idle';void live?.endSession().catch(()=>{});emit(message);}
 // The hard limit counts from the click, connecting included; the connect timeout starts after the mic prompt.
 function check(){if(status==='idle')return;if(!options.allowed())end('Round starting. Corner talk ended.');else if(now()-startedAt>=maxMs)end('Time. Back to the fight.');else if(status==='connecting'&&connectFrom&&now()-connectFrom>=connectMs)end('Your corner could not connect. Try again.');else emit();}
 async function start(){
  if(status!=='idle')return;if(!options.allowed()){emit('Your corner opens between rounds or while paused.');return;}
  const turn=++epoch,stale=()=>{if(turn!==epoch)return true;if(options.allowed())return false;end('Round starting. Corner talk ended.');return true;};status='connecting';startedAt=now();connectFrom=0;timer=setInterval(check,250);emit('Connecting to your corner…');
  try{
   await (options.requestMic??openMic)();if(stale())return;connectFrom=now();
   const token=await options.requestToken();if(stale())return;
   const facts=options.facts();if(!facts){end();return;}
   const started=await (options.startSession??startElevenLabs)({conversationToken:token,connectionType:'webrtc',overrides:{agent:{prompt:{prompt:coachPrompt(facts)}, firstMessage:COACH_FIRST_MESSAGE}},
    onConnect:()=>{if(turn!==epoch)return;status='live';emit('Your corner is listening.');},onDisconnect:()=>{if(turn===epoch)end('Corner talk ended.');},onError:()=>{if(turn===epoch)end('Corner talk dropped. Try again.');}});
   if(turn!==epoch){void started.endSession().catch(()=>{});return;}
   session=started;if(stale())return;
   if(status==='connecting'){status='live';emit('Your corner is listening.');}
  }catch(error){
   if(turn!==epoch)return;const name=error instanceof Error?error.name:'';
   end(name==='NotAllowedError'||name==='PermissionDeniedError'||name==='SecurityError'?'Microphone blocked. Allow the mic for this site in your browser, then try again.':name==='NotFoundError'?'No microphone found. Plug one in, then try again.':error instanceof CoachTokenError&&options.tokenMessage?options.tokenMessage(error.reason):error instanceof CoachTokenError&&error.reason==='daily-cap'?'Your corner is resting: today\'s coach limit is used up.':isStaleChunkError(error)?GAME_UPDATED_COACH:'Your corner is unavailable right now. The fight is not affected.');
  }
 }
 return {get active(){return status!=='idle';},get status(){return status;},start,end,check};
}
