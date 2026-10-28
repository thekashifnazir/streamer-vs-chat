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
let attempts=0;
let transport='connecting';
const badge=()=>hud.setConnection(transport==='connected'?'● CHAT CONNECTED':transport==='reconnecting'?'TWITCH RECONNECTING':'TWITCH CONNECTING…');
function connect(){
  if(disposed)return;
  const connection=new WebSocket(`ws://${location.hostname||'localhost'}:3000/ws`);socket=connection;
  let retired=false;
  const current=()=>!disposed&&!retired&&socket===connection;
  connection.addEventListener('open',()=>{if(!current()){connection.close();return;}attempts=0;badge();});
  connection.addEventListener('message',event=>{
    if(!current())return;
    try {
      const message=JSON.parse(String(event.data)) as {kind:string;state?:GameState;simulated?:boolean;tally?:TallySnapshot['tally'];modes?:HudModes;summary?:GameSummary;entries?:HighlightEntry[];visible?:boolean;transport?:string};
      if(message.kind==='tick'&&message.state){if(message.transport){transport=message.transport;badge();}if(message.modes)hud.setModes(message.modes);hud.render(message.state,!!message.simulated);}
      else if(message.kind==='highlights')hud.setEndcard(message.visible&&message.summary?message.summary:null,[...(message.entries??[])].sort((a,b)=>b.highlight.priority-a.highlight.priority||a.highlight.at-b.highlight.at).flatMap(entry=>entry.status==='confirmed'&&entry.url?[{id:entry.highlight.id,label:`${entry.highlight.kind.toUpperCase()} · ROUND ${entry.highlight.round}`,url:entry.url,status:'confirmed' as const}]:[]));
      else if(message.kind==='tally'&&message.tally)hud.renderTally(message as TallySnapshot);
    }catch{/* Ignore malformed network messages; the next server snapshot replaces them. */}
  });
  connection.addEventListener('close',()=>{if(!current())return;retired=true;hud.setConnection('RECONNECTING');reconnect=window.setTimeout(connect,Math.min(30000,1000*2**Math.min(attempts++,5)));});
  connection.addEventListener('error',()=>{if(current())connection.close();});
}
window.addEventListener('beforeunload',()=>{disposed=true;window.clearTimeout(reconnect);socket?.close();hud.dispose();});
connect();
