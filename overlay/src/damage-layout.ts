import {FEEL} from '../../shared/src/feel';
/** Design-space coordinates from the rendered rail and final vote legend bounds. */
export function bossDamageLayout(railWidth:number,railHeight:number,votesBottom:number,seated:boolean){
 const top=Math.min(railHeight,Math.max(votesBottom+12,railHeight-(seated?310:486)*.72));
 const half=(seated?FEEL.bossHit.seatedNumberBoxPx:FEEL.bossHit.numberBoxPx)/2;
 const centers=Array.from({length:FEEL.bossHit.numberLanes},(_,lane)=>Math.min(railWidth-half,Math.max(half,railWidth/2+(lane-1)*FEEL.bossHit.numberLanePx)));
 return {top,centers,boxWidth:half*2};
}
