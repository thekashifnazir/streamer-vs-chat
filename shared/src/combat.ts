/** Shared arithmetic for the reducer and the Forge R1 batch evaluator. No clocks or RNG. */
export function hitDamage(hp:number,amount:number):number{return amount*(hp<30?.6:1);}
export function counterDamage(outcome:'HIT'|'BLOCK'|'PERFECT'|'DODGE'|'CHIP'):number{return outcome==='PERFECT'?11:outcome==='BLOCK'?8:outcome==='DODGE'?9:0;}
