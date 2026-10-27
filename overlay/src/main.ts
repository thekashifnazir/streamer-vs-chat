import './style.css';
import type { TallySnapshot } from '@svc/shared';
import type { GameState } from '../../shared/src/engine';
import { createRailsHud } from './hud';
const hud=createRailsHud(document.querySelector<HTMLElement>('#hud')!);
let disposed=false;
let reconnect:number|undefined;
let socket:WebSocket;
function connect(){
  socket=new WebSocket(`ws://${location.hostname||'localhost'}:3000/ws`);
  socket.addEventListener('open',()=>hud.setConnection('● CHAT LINK CONNECTED'));
  socket.addEventListener('message',event=>{
    try {
      const message=JSON.parse(String(event.data)) as {kind:string;state?:GameState;simulated?:boolean;tally?:TallySnapshot['tally']};
      if(message.kind==='tick'&&message.state)hud.render(message.state,!!message.simulated);
      else if(message.kind==='tally'&&message.tally)hud.renderTally(message as TallySnapshot);
    }catch{/* Ignore malformed network messages; the next server snapshot replaces them. */}
  });
  socket.addEventListener('close',()=>{hud.setConnection('CHAT LINK LOST · RECONNECTING');if(!disposed)reconnect=window.setTimeout(connect,1000);});
  socket.addEventListener('error',()=>socket.close());
}
window.addEventListener('beforeunload',()=>{disposed=true;window.clearTimeout(reconnect);socket?.close();hud.dispose();});
connect();
