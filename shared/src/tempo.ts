export const DIFFICULTIES=['easy','medium','hard','expert'] as const;
export type Difficulty=typeof DIFFICULTIES[number];
/** The only tempo constants. Stored BossDef timing is in hard-tempo milliseconds. */
export const TEMPO={
 easy:{tempo:1.5,beat:3600,telegraph:1200,comboGap:450},
 medium:{tempo:1.25,beat:3000,telegraph:1000,comboGap:375},
 hard:{tempo:1,beat:2400,telegraph:800,comboGap:300},
 expert:{tempo:.8125,beat:1950,telegraph:650,comboGap:244},
} as const;
for(const value of Object.values(TEMPO))Object.freeze(value);Object.freeze(TEMPO);
export function isDifficulty(value:unknown):value is Difficulty{return typeof value==='string'&&Object.hasOwn(TEMPO,value);}
export function tempoFor(difficulty:Difficulty='hard'){return TEMPO[difficulty];}
export function scaleTelegraph(storedMs:number,difficulty:Difficulty='hard'){return Math.round(storedMs*tempoFor(difficulty).tempo);}
export function difficultyName(difficulty:Difficulty){return difficulty[0]!.toUpperCase()+difficulty.slice(1);}
