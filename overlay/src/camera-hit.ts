import type {GameState,Side} from '../../shared/src/engine';
/** One beat of "on my side" feedback on the camera circle (Kash, 2 Nov: while fighting on webcam the player watches their own circle, not
 * the boss). punch: a landed Boss Fight punch (yellow, with the hand and the damage) or a Crowd Trainer punch (no amount); dodge, block,
 * perfect: a clean defence (cyan); hit: an attack landed on the player (a short red ring). */
export type CameraCue={kind:'punch'|'dodge'|'block'|'perfect'|'hit';side?:Side;amount?:number};
export type BadgeSpot='left'|'right'|'top';
export const CAMERA_HIT={ringMs:250,hitRingMs:200,badgeMs:700,colors:{punch:'#ffdc43',defence:'#2ef2ff',hit:'#ff3b30'}} as const;
/** Where a hand or lean shows on the circle. Both pages draw the camera mirrored, so the player's own left is on screen left. */
export function screenSide(side:Side,mirrored=true):'left'|'right'{return (side==='L')===mirrored?'left':'right';}
export function cameraCueRing(cue:CameraCue):'punch'|'defence'|'hit'{return cue.kind==='punch'?'punch':cue.kind==='hit'?'hit':'defence';}
/** The badge for a cue, or null for a ring-only cue (a hit taken). Arrows point the way the player moved on screen. */
export function cameraCueBadge(cue:CameraCue,mirrored=true):{spot:BadgeSpot;text:string}|null{
 if(cue.kind==='hit')return null;
 if(cue.kind==='punch'){const side=cue.side??'L';return {spot:screenSide(side,mirrored),text:cue.amount===undefined?side:`${side}\n−${Number(cue.amount.toFixed(2))}`};}
 if(cue.kind==='block'||!cue.side)return {spot:'top',text:cue.kind==='perfect'?'PERFECT 🛡':'BLOCKED 🛡'};
 const spot=screenSide(cue.side,mirrored),word=cue.kind==='perfect'?'PERFECT':'DODGED';
 return {spot,text:spot==='left'?`${word} ←`:`→ ${word}`};
}
/** New cues between two engine snapshots: landed punches (log.bossDamage), and each resolved attack or SUPER step. A new match, round or
 * rewind gives nothing, so a reconnect never replays old hits. */
export function cameraCues(before:GameState|undefined,after:GameState):CameraCue[]{
 if(!before||before.match.seed!==after.match.seed||before.round.number!==after.round.number||after.round.elapsed_ms<before.round.elapsed_ms)return [];
 const cues:CameraCue[]=[];
 for(const hit of after.log.bossDamage.slice(before.log.bossDamage.length))if(hit.kind==='punch'&&hit.damage>0)cues.push({kind:'punch',amount:hit.damage});
 const defence=(outcome:string,lean:Side|null,leaned:boolean)=>{
  if(outcome==='HIT')cues.push({kind:'hit'});
  else if(outcome==='DODGE')cues.push({kind:'dodge',...(lean?{side:lean}:{})});
  else if(outcome==='BLOCK')cues.push({kind:'block'});
  else if(outcome==='PERFECT')cues.push({kind:'perfect',...(leaned&&lean?{side:lean}:{})});
 };
 for(const result of after.log.resolved.slice(before.log.resolved.length))if(!result.super_steps)defence(result.outcome,result.lean,result.defence==='lean');
 for(const step of after.log.superSteps.slice(before.log.superSteps.length))defence(step.outcome,step.lean,step.defence!=='guard');
 return cues;
}
/**
 * The feedback layer over the stage's camera circle (the demo's pose preview, or the /play stream bubble), above both so viewers see it
 * too. It copies the circle's box on each cue and stays inside the camera lane: side badges sit beside the circle, the top badge on its
 * top edge. With no circle on screen (keyboard play) it shows nothing. Calm FX: fades only.
 */
export function mountCameraHit(stage:HTMLElement,options:{calm:()=>boolean;mirrored?:boolean}){
 const doc=stage.ownerDocument,layer=doc.createElement('div');layer.className='camera-hit';layer.hidden=true;layer.setAttribute('aria-hidden','true');
 const ring=doc.createElement('i');ring.className='camera-hit-ring';layer.append(ring);stage.append(layer);
 const badges=new Map<BadgeSpot,HTMLElement>();let previous:GameState|undefined,pendingSide:Side|undefined,ringAnimation:Animation|undefined;
 const circle=()=>stage.querySelector<HTMLElement>(':scope>.stream-camera-bubble:not([hidden])')??stage.querySelector<HTMLElement>(':scope>.pose-preview:not([hidden]):not(.skeleton-only)');
 function show(cue:CameraCue){
  const target=circle();if(!target)return false;
  const calm=options.calm(),kind=cameraCueRing(cue),color=kind==='punch'?CAMERA_HIT.colors.punch:kind==='hit'?CAMERA_HIT.colors.hit:CAMERA_HIT.colors.defence;
  Object.assign(layer.style,{left:`${target.offsetLeft}px`,top:`${target.offsetTop}px`,width:`${target.offsetWidth}px`,height:`${target.offsetHeight}px`});layer.hidden=false;
  ring.dataset.kind=kind;ring.style.setProperty('--hit-color',color);ringAnimation?.cancel?.();
  const glow=`0 0 28px 8px ${color}`;
  ringAnimation=ring.animate(calm?[{opacity:0},{opacity:1,offset:.15},{opacity:0}]:[{opacity:1,transform:'scale(1.06)',boxShadow:glow},{opacity:1,transform:'scale(1)',boxShadow:glow,offset:.4},{opacity:0,transform:'scale(1)',boxShadow:'0 0 0 0 transparent'}],{duration:kind==='hit'?CAMERA_HIT.hitRingMs:CAMERA_HIT.ringMs,easing:'ease-out',fill:'forwards'});
  const badge=cameraCueBadge(cue,options.mirrored??true);
  if(badge){let node=badges.get(badge.spot);if(!node){node=doc.createElement('b');node.className='camera-hit-badge';node.dataset.spot=badge.spot;layer.append(node);badges.set(badge.spot,node);}
   const [main,...rest]=badge.text.split('\n');const big=doc.createElement('span');big.textContent=main!;node.replaceChildren(big);if(rest.length){const small=doc.createElement('small');small.textContent=rest.join(' ');node.append(small);}node.dataset.kind=cue.kind;node.style.setProperty('--hit-color',color);node.getAnimations?.().forEach(animation=>animation.cancel());
   node.animate(calm?[{opacity:0},{opacity:1,offset:.1},{opacity:1,offset:.75},{opacity:0}]:[{opacity:0,scale:'.5'},{opacity:1,scale:'1.15',offset:.12},{opacity:1,scale:'1',offset:.25},{opacity:1,scale:'1',offset:.75},{opacity:0,scale:'1'}],{duration:CAMERA_HIT.badgeMs,easing:'ease-out',fill:'forwards'});}
  return true;
 }
 return {
  /** The hand behind the next landed punch: the camera or J key reports it as it is thrown; the engine says whether it landed. */
  notePunch(side:Side){pendingSide=side;},
  /** Every painted snapshot; returns the cues it found (shown only while a circle is on screen). */
  observe(state:GameState|null):CameraCue[]{
   if(!state){previous=undefined;return [];}
   const cues=cameraCues(previous,state);previous=state;
   for(const cue of cues){if(cue.kind==='punch'&&pendingSide)cue.side=pendingSide;show(cue);}
   return cues;
  },
  /** Crowd Trainer punches from its own detector: the hand only, no damage. */
  trainerPunch(side:Side){show({kind:'punch',side});},
  show,
  dispose(){layer.remove();},
 };
}
