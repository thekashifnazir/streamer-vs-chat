import {TEMPO} from './tempo.js';
export const BOSS_DEFENCES=['guard','lean_left','lean_right','lean_any'] as const;
export type BossDefence=typeof BOSS_DEFENCES[number];
export type BossMoveDef={command:string;label:string;defence:BossDefence;damage:number;chip:number;telegraph_ms:number;hits:number};
export type BossDef={name:string;tagline:string;hp:number;moves:BossMoveDef[]};
export const RESERVED_BOSS_COMMANDS=['!pause','!stop','!super','!vote','!forge','!resume','!veto','!forgetme'] as const;
export const BOSS_DEF_SCHEMA={type:'object',additionalProperties:false,required:['name','tagline','hp','moves'],properties:{
 name:{type:'string',minLength:1,maxLength:24},tagline:{type:'string',minLength:1,maxLength:80},hp:{type:'number',minimum:90,maximum:200},
 moves:{type:'array',minItems:3,maxItems:5,items:{type:'object',additionalProperties:false,required:['command','label','defence','damage','chip','telegraph_ms','hits'],properties:{
  command:{type:'string',pattern:'^![a-z]{2,10}$'},label:{type:'string',minLength:1,maxLength:32},defence:{type:'string',enum:BOSS_DEFENCES},damage:{type:'number',minimum:4,maximum:30},chip:{type:'number',minimum:0,maximum:15},telegraph_ms:{type:'number',minimum:600,maximum:1200},hits:{type:'integer',minimum:1,maximum:3},
 }}}
}} as const;
/** Only this exact built-in definition may retain the game-rule reserved !super command. */
export const DEFAULT_BOSS:BossDef={name:'Chat Golem',tagline:'Chat is the boss. Your body is the defence.',hp:135,moves:[
 {command:'!jab',label:'JAB',defence:'guard',damage:8,chip:0,telegraph_ms:TEMPO.hard.telegraph,hits:1},
 {command:'!hookl',label:'HOOK LEFT',defence:'lean_right',damage:12,chip:3,telegraph_ms:TEMPO.hard.telegraph,hits:1},
 {command:'!hookr',label:'HOOK RIGHT',defence:'lean_left',damage:12,chip:3,telegraph_ms:TEMPO.hard.telegraph,hits:1},
 {command:'!combo',label:'COMBO',defence:'guard',damage:7,chip:0,telegraph_ms:TEMPO.hard.telegraph,hits:2},
 {command:'!super',label:'SUPER',defence:'lean_any',damage:25,chip:10,telegraph_ms:TEMPO.hard.telegraph,hits:1},
]};
for(const move of DEFAULT_BOSS.moves)Object.freeze(move);Object.freeze(DEFAULT_BOSS.moves);Object.freeze(DEFAULT_BOSS);
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const fields=['name','tagline','hp','moves'];
const moveFields=['command','label','defence','damage','chip','telegraph_ms','hits'];
const confusables:Record<string,string>={'а':'a','α':'a','е':'e','ε':'e','о':'o','ο':'o','р':'p','ρ':'p','с':'c','ϲ':'c','х':'x','χ':'x','у':'y','і':'i','ι':'i','к':'k','κ':'k','м':'m','т':'t','τ':'t','в':'b','н':'h','ѕ':'s','ӏ':'l'};
const normalized=(value:string)=>value.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[аαеεоοрρсϲхχуіικкмтτвнѕӏ]/g,c=>confusables[c]??c).replace(/[01345789]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','9':'g'}[c]!));
const compact=(value:string)=>normalized(value).replace(/[^\p{L}\p{N}]/gu,'');
function near(a:string,b:string){if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return edits+(a.length-i)+(b.length-j)<=1;}
const BAD_WORDS=['fuck','shit','bitch','cunt','nazi','hitler'];
function protectedMatch(value:string,protectedName:string){
 const target=compact(protectedName);if(!target)return false;const text=compact(value),tokens=normalized(value).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
 if(target.length<3)return tokens.includes(target);
 if(text.includes(target))return true;
 if(target.length<4)return false;
 // One edit catches runz/runs; prefixes also prevent disguising a name with a suffix.
 return tokens.some(token=>near(token,target))||[target.length-1,target.length,target.length+1].some(length=>{for(let offset=0;offset+length<=text.length;offset++)if(near(text.slice(offset,offset+length),target))return true;return false;});
}
export function isDefaultBoss(value:unknown):boolean{
 if(!object(value)||Object.keys(value).length!==fields.length||fields.some(key=>!Object.hasOwn(value,key)))return false;
 return value.name===DEFAULT_BOSS.name&&value.tagline===DEFAULT_BOSS.tagline&&value.hp===DEFAULT_BOSS.hp&&Array.isArray(value.moves)&&value.moves.length===DEFAULT_BOSS.moves.length&&value.moves.every((move,index)=>object(move)&&Object.keys(move).length===moveFields.length&&moveFields.every(key=>Object.hasOwn(move,key)&&move[key]===DEFAULT_BOSS.moves[index]![key as keyof BossMoveDef]));
}
/** Pure validation. No moderation/API call replaces these deterministic constraints.
 * allowDefault permits only the canonical built-in, never a forged !super move.
 */
export function validateBoss(value:unknown,protectedNames:readonly string[]=[],options:{allowDefault?:boolean}={}):string[]{
 const errors:string[]=[];if(!object(value))return ['Boss must be an object.'];
 const checkKeys=(record:Record<string,unknown>,allowed:string[],path:string)=>{for(const key of Object.keys(record))if(!allowed.includes(key))errors.push(`${path} has an unknown field: ${key.slice(0,40)}.`);for(const key of allowed)if(!Object.hasOwn(record,key))errors.push(`${path}.${key} is required.`);};
 checkKeys(value,fields,'Boss');
 const text=(entry:unknown,path:string,max:number)=>{if(typeof entry!=='string'||!entry.trim()||entry.length>max||/[\p{Cc}\p{Cf}]/u.test(entry)){errors.push(`${path} must contain 1–${max} printable characters.`);return;}const word=compact(entry);if(BAD_WORDS.some(bad=>word.includes(bad)))errors.push(`${path} contains a blocked word.`);if(protectedNames.some(name=>typeof name==='string'&&protectedMatch(entry,name)))errors.push(`${path} resembles a protected name.`);};
 text(value.name,'Boss.name',24);text(value.tagline,'Boss.tagline',80);
 if(!finite(value.hp)||value.hp<90||value.hp>200)errors.push('Boss.hp must be between 90 and 200.');
 if(!Array.isArray(value.moves))return [...errors,'Boss.moves must be an array of 3–5 moves.'];
 if(value.moves.length<3||value.moves.length>5)errors.push('Boss.moves must contain 3–5 moves.');
 const commands=new Set<string>();let guards=0,leans=0;const privileged=options.allowDefault===true&&isDefaultBoss(value);
 value.moves.slice(0,6).forEach((move,index)=>{const path=`Move ${index+1}`;if(!object(move)){errors.push(`${path} must be an object.`);return;}checkKeys(move,moveFields,path);
  if(typeof move.command!=='string'||!/^![a-z]{2,10}$/.test(move.command))errors.push(`${path}.command must match ! followed by 2–10 lowercase ASCII letters.`);
  else{if(commands.has(move.command))errors.push(`${path}.command must be unique.`);commands.add(move.command);if(RESERVED_BOSS_COMMANDS.includes(move.command as typeof RESERVED_BOSS_COMMANDS[number])&&!privileged)errors.push(`${path}.command is reserved.`);text(move.command,path+'.command',11);}
  text(move.label,path+'.label',32);
  if(!BOSS_DEFENCES.includes(move.defence as BossDefence))errors.push(`${path}.defence is invalid.`);else if(move.defence==='guard')guards++;else leans++;
  if(!finite(move.damage)||move.damage<4||move.damage>30)errors.push(`${path}.damage must be between 4 and 30.`);
  if(!finite(move.chip)||move.chip<0||finite(move.damage)&&move.chip>move.damage/2)errors.push(`${path}.chip must be nonnegative and at most half damage.`);
  if(!finite(move.telegraph_ms)||move.telegraph_ms<600||move.telegraph_ms>1200)errors.push(`${path}.telegraph_ms must be between 600 and 1200.`);
  if(!Number.isInteger(move.hits)||(move.hits as number)<1||(move.hits as number)>3)errors.push(`${path}.hits must be an integer from 1 to 3.`);
  if(finite(move.damage)&&finite(move.hits)&&move.damage*move.hits>36)errors.push(`${path} total hit damage must not exceed 36.`);
 });
 if(!guards)errors.push('Boss needs at least one guard move.');if(!leans)errors.push('Boss needs at least one lean move.');return errors;
}
