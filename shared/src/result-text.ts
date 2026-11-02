import {difficultyName,type Difficulty} from './tempo';
import {chatCommand} from './chat-commands.js';
import type {GameState} from './engine.js';

/** Structured results only; callers validate untrusted input before formatting. */
export type ResultRoundData={
 number:number;
 winner:'streamer'|'boss';
 streamerHp:number;
 bossHp:number;
 bossMaxHp:number;
 bossName:string;
 score:{streamer:number;boss:number};
 matchOver:boolean;
 difficulty:Difficulty;
 /** Commands are display strings so the local bot retains its existing aliases. */
 hookL:string;
 hookR:string;
};

/** The structured round result /play sends for the Worker's bot to format; the offline demo formats the same body locally. */
export function roundResultBody(state:GameState,round:GameState['log']['rounds'][number]):ResultRoundData&{kind:'round'}{return {kind:'round',number:round.number,winner:round.winner,streamerHp:round.streamer_hp,bossHp:round.boss_hp,bossMaxHp:round.boss_max_hp??state.boss.max_hp,bossName:state.bossDef?.name??'CHAT GOLEM',score:{streamer:state.match.round_wins.streamer,boss:state.match.round_wins.boss},matchOver:state.match.winner!==null,difficulty:state.difficulty,hookL:chatCommand('HOOK_L',state.bossDef).split(/[ /]/)[0]!,hookR:chatCommand('HOOK_R',state.bossDef).split(/[ /]/)[0]!};}

export function formatRoundResult(result:ResultRoundData):string {
 return `Streamer vs Chat · Round ${result.number}: ${result.winner==='streamer'?'STREAMER':result.bossName} wins (${Math.round(result.streamerHp)}/100 vs ${Math.round(result.bossHp)}/${result.bossMaxHp} HP) · ${result.score.streamer}–${result.score.boss}${result.matchOver?' · MATCH OVER':''} · ${difficultyName(result.difficulty)} · Chat: ${result.hookL} / ${result.hookR}`;
}

export function formatHypeFull():string {return 'HYPE is full! Type !s for the SUPER';}

/** Boss Forge: a chat-built boss passed the balance gate and fights next round. */
export function formatForgeReady(bossName:string):string {return `Boss Forge: chat built ${bossName}! It fights next round.`;}
