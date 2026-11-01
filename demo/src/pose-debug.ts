/** Live tuning readout, only with ?debug=pose: pose frames per second, the last 5 detected moves and (Crowd Trainer) the expected
 * token. A fixed top-left corner panel on the page, outside the broadcast stage, so it never reaches the stream without the flag. */
export type PoseDebugMove={kind:'PUNCH'|'SLIP'|'LEAN'|'GUARD';side?:'L'|'R'};
export function poseDebugEnabled(search:string):boolean{return new URLSearchParams(search).getAll('debug').some(value=>value.split(',').includes('pose'));}
/** "PUNCH L · 21:03:04.120": local wall clock with milliseconds. */
export function formatPoseMove(move:PoseDebugMove,wall:Date):string{
 const p=(n:number,w=2)=>String(n).padStart(w,'0');
 return `${move.kind}${move.side?` ${move.side}`:''} · ${p(wall.getHours())}:${p(wall.getMinutes())}:${p(wall.getSeconds())}.${p(wall.getMilliseconds(),3)}`;
}
export function mountPoseDebug(doc:Document,search:string,clock:()=>Date=()=>new Date()){
 if(!poseDebugEnabled(search))return null;
 const panel=doc.createElement('aside');panel.className='pose-debug';panel.setAttribute('aria-hidden','true');
 panel.innerHTML='<b data-d="fps">pose — fps</b><span data-d="expect"></span><ol data-d="moves"></ol>';doc.body.append(panel);
 const part=(name:string)=>panel.querySelector<HTMLElement>(`[data-d="${name}"]`)!;
 const frames:number[]=[];let shownFps='',shownExpect:string|null=null;
 return {
  /** One pose frame; `at` in ms on any monotonic clock. */
  frame(at:number){frames.push(at);while(frames.length&&frames[0]!<at-1000)frames.shift();const text=`pose ${frames.length} fps`;if(text!==shownFps){shownFps=text;part('fps').textContent=text;}},
  move(move:PoseDebugMove){const li=doc.createElement('li');li.textContent=formatPoseMove(move,clock());const list=part('moves');list.prepend(li);while(list.children.length>5)list.lastElementChild!.remove();},
  /** Crowd Trainer's expected token, or null outside a combo. */
  expect(text:string|null){if(text===shownExpect)return;shownExpect=text;const el=part('expect');el.textContent=text?`NEXT ${text}`:'';el.hidden=!text;},
 };
}
