import './style.css';
import type { TallySnapshot } from '@svc/shared';
import type { GameState } from '../../shared/src/engine';
import { createRailsHud, type HudModes } from './hud';
import type { GameSummary } from '../../shared/src/highlights';
import type { HighlightEntry } from '../../server/src/clips';
const hud=createRailsHud(document.querySelector<HTMLElement>('#hud')!);
let disposed=false;
let reconnect:number|undefined;
let socket:WebSocket;
function connect(){
  socket=new WebSocket(`ws://${location.hostname||'localhost'}:3000/ws`);
  socket.addEventListener('open',()=>hud.setConnection('● CHAT LINK CONNECTED'));
  socket.addEventListener('message',event=>{
    try {
      const message=JSON.parse(String(event.data)) as {kind:string;state?:GameState;simulated?:boolean;tally?:TallySnapshot['tally'];modes?:HudModes;summary?:GameSummary;entries?:HighlightEntry[];visible?:boolean};
      if(message.kind==='tick'&&message.state){if(message.modes)hud.setModes(message.modes);hud.render(message.state,!!message.simulated);}
      else if(message.kind==='highlights')hud.setEndcard(message.visible&&message.summary?message.summary:null,[...(message.entries??[])].sort((a,b)=>b.highlight.priority-a.highlight.priority||a.highlight.at-b.highlight.at).flatMap(entry=>entry.status==='confirmed'&&entry.url?[{id:entry.highlight.id,label:`${entry.highlight.kind.toUpperCase()} · ROUND ${entry.highlight.round}`,url:entry.url,status:'confirmed' as const}]:[]));
      else if(message.kind==='tally'&&message.tally)hud.renderTally(message as TallySnapshot);
    }catch{/* Ignore malformed network messages; the next server snapshot replaces them. */}
  });
  socket.addEventListener('close',()=>{hud.setConnection('CHAT LINK LOST · RECONNECTING');if(!disposed)reconnect=window.setTimeout(connect,1000);});
  socket.addEventListener('error',()=>socket.close());
}
window.addEventListener('beforeunload',()=>{disposed=true;window.clearTimeout(reconnect);socket?.close();hud.dispose();});
connect();
