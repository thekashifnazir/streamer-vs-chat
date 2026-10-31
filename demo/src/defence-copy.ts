/**
 * Player-facing help copy that depends on how the streamer defends. A webcam
 * player never sees key letters: every prompt names the body move instead.
 * Presentation only; the reducer reads the same guard/lean input either way.
 */
export type DefenceCopyMode={pose:boolean;seated:boolean;noPunch:boolean};
export function poseWords(seated:boolean){const verb=seated?'Tilt':'Lean';return {guard:'Guard up',left:`${verb} left`,right:`${verb} right`} as const;}
/** In-fight status line (the screen-reader status under the stage). */
export function fightHelp(mode:DefenceCopyMode,bossName?:string):string{
 const verb=mode.seated?'tilt':'lean';
 if(!mode.pose)return bossName?`${bossName} · Follow each move’s defence cue. K guard · A/D ${verb}${mode.noPunch?'':' · J bonus'}`:`Straight attacks → K guard · HOOK LEFT → D ${verb} · HOOK RIGHT → A ${verb} · SUPER → follow all three GUARD / LEAN steps${mode.noPunch?' · NO PUNCHES':''}`;
 const words=poseWords(mode.seated);
 return bossName?`${bossName} · Follow each move’s defence cue: ${words.guard.toLowerCase()}, ${words.left.toLowerCase()} or ${words.right.toLowerCase()}${mode.noPunch?'':' · punch for bonus'}`:`Straight attacks → ${words.guard.toLowerCase()} · HOOK LEFT → ${words.right.toLowerCase()} · HOOK RIGHT → ${words.left.toLowerCase()} · SUPER → follow all three steps: ${words.guard.toLowerCase()}, ${words.left.toLowerCase()} or ${words.right.toLowerCase()}${mode.noPunch?' · NO PUNCHES':''}`;
}
export function finisherHelp(pose:boolean):string{return pose?'FINISHER READY: hold your guard up for 1 s; no punches required.':'FINISHER READY: hold K (guard) for 1 s; no punches required.';}
/** The "!super" bonus line on the how-to-play strip. */
export function superHelp(mode:Pick<DefenceCopyMode,'pose'|'seated'>):string{
 if(!mode.pose)return ' Super when hype is full: 3 hits, follow the steps on screen.';
 const words=poseWords(mode.seated);
 return ` Super when hype is full: 3 hits. Follow each step on screen: ${words.guard}, ${words.left} or ${words.right}.`;
}
/** Bottom control guide during a webcam fight (the keyboard guide keeps its keycaps). */
export function poseGuide(mode:Pick<DefenceCopyMode,'seated'|'noPunch'>):string{
 const words=poseWords(mode.seated);
 return `${words.guard} · ${words.left} · ${words.right}${mode.noPunch?'':' · Punch for bonus'}`;
}
