import {mulberry32} from '../../shared/src/engine';
import {DEFAULT_CHAT_COMMANDS} from '../../shared/src/chat-commands';
import {isDefaultBoss,type BossDef} from '../../shared/src/boss-def';
import {MOVES,type Move} from '../../shared/src/index';
/** The hosted bot's Twitch login (see BOT_POST_HINT); the demo only shows what it would post. */
export const SIM_BOT='streamervschatbot';
export type SimChatLine={id:number;kind:'viewer'|'bot'|'you';user:string;text:string;note?:string};
export type SimChatMode='boss'|'trainer'|'trainer-done';
/** 'sim-17' becomes 'sim_viewer_17': plainly fake, never a real-looking chat name. */
export function simHandle(user:string):string{const n=/^sim-(\d{1,6})$/.exec(user)?.[1];return n?`sim_viewer_${n}`:'sim_viewer';}
/** What a simulated viewer types for a vote: the real command for this boss (short or long alias). */
export function simVoteText(move:Move,boss:BossDef|null|undefined,roll:number):string{
 if(boss&&!isDefaultBoss(boss))return boss.moves[MOVES.indexOf(move)]?.command??'!vote';
 const command=DEFAULT_CHAT_COMMANDS[move];return roll<.55?command.short:command.primary;
}
/** Offline demo only. Presentation: it samples what the simulated crowd already sent and never feeds the game. */
export function createSimChatFeed(options:{seed?:number;gapMs?:number;queue?:number;keep?:number}={}){
 const random=mulberry32(options.seed??20261101),gap=Math.max(250,options.gapMs??400),queueMax=options.queue??6,keep=options.keep??6;
 let pending:{user:string;text:string}[]=[],lines:SimChatLine[]=[],lastAt=-Infinity,id=0,version=0;
 const push=(line:Omit<SimChatLine,'id'>)=>{lines=[...lines.slice(-(keep-1)),{...line,id:++id}];version++;};
 return {
  /** One beat of votes or one trainer tick: keeps a small random sample, so 500 viewers stay readable. */
  offer(batch:readonly {user:string;text:string}[]){
   if(!batch.length)return;const pool=[...batch],sample:{user:string;text:string}[]=[];
   while(pool.length&&sample.length<queueMax){const index=Math.floor(random()*pool.length);sample.push(pool.splice(index,1)[0]!);}
   pending=[...pending,...sample].slice(-queueMax);
  },
  /** Releases at most one queued viewer line per gap (400 ms: 2.5 lines a second). */
  tick(at:number){if(pending.length&&at-lastAt>=gap){lastAt=at;const next=pending.shift()!;push({kind:'viewer',user:simHandle(next.user),text:next.text});}},
  bot(text:string){push({kind:'bot',user:SIM_BOT,text,note:'BOT · what your bot would post'});},
  you(text:string,note:string){push({kind:'you',user:'you',text,note});},
  /** Pending votes from an ended round never trickle into the next one. */
  drop(){pending=[];},
  clear(){pending=[];if(lines.length){lines=[];version++;}},
  random:()=>random(),
  get lines(){return lines;},get version(){return version;},
 };
}
export type SimChatFeed=ReturnType<typeof createSimChatFeed>;
/** Stage panel (desktop, sized in container units) plus a two-line strip under the stage (phone, in the controls row). */
export function mountSimChat(doc:Document,stage:HTMLElement){
 const layer=doc.createElement('div');layer.className='sim-chat-layer';layer.hidden=true;
 layer.innerHTML='<aside class="sim-chat" aria-label="Simulated chat"><h3>● SIMULATED CHAT <small>not real viewers</small></h3><ol role="log" aria-live="off"></ol></aside>';stage.append(layer);
 const strip=doc.createElement('aside');strip.className='sim-chat-strip';strip.hidden=true;strip.setAttribute('aria-label','Simulated chat');
 strip.innerHTML='<h3>● SIMULATED CHAT</h3><ol role="log" aria-live="off"></ol>';
 // First row of the controls under the stage: the compact fight view keeps that row on screen.
 const controls=doc.querySelector('.demo-controls');if(controls)controls.prepend(strip);else stage.after(strip);
 let shown=-1;
 const fill=(list:HTMLOListElement,lines:readonly SimChatLine[])=>{list.replaceChildren(...lines.map(line=>{const item=doc.createElement('li');item.dataset.kind=line.kind;const name=doc.createElement('b');name.textContent=line.user;item.append(name);if(line.note){const note=doc.createElement('small');note.textContent=line.note;item.append(' ',note);}item.append(' ',line.text);return item;}));};
 return {
  render(feed:SimChatFeed,mode:SimChatMode|null){
   layer.hidden=strip.hidden=!mode;if(!mode)return;layer.dataset.mode=mode;
   if(shown===feed.version)return;shown=feed.version;
   fill(layer.querySelector('ol')!,feed.lines.slice(-4));fill(strip.querySelector('ol')!,feed.lines.slice(-2));
  },
 };
}
