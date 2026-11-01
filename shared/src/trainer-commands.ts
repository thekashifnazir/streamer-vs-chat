import {COMBOS,type TrainerVote} from './trainer.js';
/** Crowd Trainer chat: first word, case-insensitive, `!` required. Parse only while Trainer mode runs. */
const COMMANDS:Record<string,TrainerVote>=Object.fromEntries([
 ...COMBOS.map(combo=>[combo.command,{kind:'combo',combo:combo.id}] as const),
 ['!faster',{kind:'pace',pace:'faster'}],['!slower',{kind:'pace',pace:'slower'}],
]);
export function parseTrainerCommand(text:string):TrainerVote|null{
 const command=text.trim().split(/\s+/,1)[0]?.toLowerCase()??'';
 return Object.hasOwn(COMMANDS,command)?COMMANDS[command]!:null;
}
/** Mod and broadcaster `!stop` ends the workout; `!pause`/`!resume` reuse the Boss Fight control path. */
export function isTrainerStop(text:string,privileged:boolean):boolean{return privileged&&text.trim().split(/\s+/,1)[0]?.toLowerCase()==='!stop';}
export function trainerCommandLegend():string{return COMBOS.map(combo=>`${combo.command} ${combo.name}`).join(' · ')+' · !faster / !slower pace';}
