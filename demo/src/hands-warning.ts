import type {Landmark} from '../../capture/src/classifier';
/** Leans and punches need both wrists (Kash, 1 Nov: leans failed whenever a wrist left the frame). Shown in the prompt lane during a
 * webcam fight or workout once either wrist has been untracked for longer than HANDS_OUT_MS. */
export const HANDS_OUT_MS=500;
/** Setup step 1, both pages. */
export const HANDS_SETUP_RULE='Stand back until both wrists show ✓ — leans and punches only work when your hands are in view.';
const tracked=(p:Landmark|undefined)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&(p.visibility??1)>=.5;
export function createHandsWatch(){
 let lostSince:number|null=null,lastFrame=-Infinity;
 return {
  /** One pose frame; `at` on the same clock as `out`. */
  frame(landmarks:readonly Landmark[],at:number){lastFrame=at;if(tracked(landmarks[15])&&tracked(landmarks[16]))lostSince=null;else lostSince??=at;},
  /** True once a wrist has been lost for longer than HANDS_OUT_MS, or no pose frame has arrived for that long. */
  out(at:number){return at-lastFrame>HANDS_OUT_MS&&lastFrame>-Infinity||lostSince!==null&&at-lostSince>HANDS_OUT_MS;},
  reset(){lostSince=null;lastFrame=-Infinity;},
 };
}
