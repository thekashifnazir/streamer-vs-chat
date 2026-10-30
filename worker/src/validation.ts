import type {ResultRoundData} from '../../shared/src/result-text';
import {isDifficulty} from '../../shared/src/tempo';
export type ResultRequest=({kind:'round'}&ResultRoundData)|{kind:'hype-full'};
const command=/^![a-z0-9]{1,20}$/;
const name=/^[\p{L}\p{N}\p{P} ]{1,40}$/u;
const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const bounded=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const integer=(value:unknown,min:number,max:number):value is number=>bounded(value,min,max)&&Number.isInteger(value);
export function validateResult(value:unknown):ResultRequest|null{
 if(!record(value))return null;
 // A supplied channel is ignored; only authenticated identity may select it.
 if(value.kind==='hype-full')return Object.keys(value).every(key=>key==='kind'||key==='broadcaster_id')?{kind:'hype-full'}:null;
 const keys=['kind','number','winner','streamerHp','bossHp','bossMaxHp','bossName','score','matchOver','difficulty','hookL','hookR','broadcaster_id'];
 if(value.kind!=='round'||Object.keys(value).some(key=>!keys.includes(key)))return null;
 const {number,winner,streamerHp,bossHp,bossMaxHp,bossName,score,matchOver,difficulty,hookL,hookR}=value;
 if(!integer(number,1,3)||(winner!=='streamer'&&winner!=='boss')||!bounded(streamerHp,0,100)||!bounded(bossMaxHp,90,200)||!bounded(bossHp,0,bossMaxHp)||typeof bossName!=='string'||!name.test(bossName)||!bossName.trim()||!record(score)||Object.keys(score).some(key=>key!=='streamer'&&key!=='boss')||!integer(score.streamer,0,2)||!integer(score.boss,0,2)||score.streamer+score.boss!==number||score[winner]===0||typeof matchOver!=='boolean'||matchOver!==(score.streamer===2||score.boss===2)||!isDifficulty(difficulty)||typeof hookL!=='string'||!command.test(hookL)||typeof hookR!=='string'||!command.test(hookR))return null;
 return {kind:'round',number,winner,streamerHp,bossHp,bossMaxHp,bossName,score:{streamer:score.streamer,boss:score.boss},matchOver,difficulty,hookL,hookR};
}
/** Minimal browser/Workers-compatible body surface; neither runtime's DOM declarations leak across it. */
export interface JsonRequest {
 body:{getReader():{
  read():Promise<{done:boolean;value?:Uint8Array}>;
  cancel():Promise<unknown>;
  releaseLock():void;
 }}|null;
}
/** Bounded streaming read: Content-Length alone is not trusted. No request body is logged. */
export async function readJson(request:JsonRequest,limit=4096):Promise<unknown>{
 if(!request.body)throw new Error('invalid-body');
 const reader=request.body.getReader();let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const chunk=await reader.read();if(chunk.done)break;if(!chunk.value)throw new Error('invalid-body');size+=chunk.value.byteLength;if(size>limit){await reader.cancel();throw new Error('invalid-body');}chunks.push(chunk.value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
