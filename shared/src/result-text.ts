import {difficultyName,type Difficulty} from './tempo';

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

export function formatRoundResult(result:ResultRoundData):string {
 return `Streamer vs Chat · Round ${result.number}: ${result.winner==='streamer'?'STREAMER':result.bossName} wins (${Math.round(result.streamerHp)}/100 vs ${Math.round(result.bossHp)}/${result.bossMaxHp} HP) · ${result.score.streamer}–${result.score.boss}${result.matchOver?' · MATCH OVER':''} · ${difficultyName(result.difficulty)} · Chat: ${result.hookL} / ${result.hookR}`;
}

export function formatHypeFull():string {return 'HYPE is full! Type !s for the SUPER';}
