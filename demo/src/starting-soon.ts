/** /play only: the holding card viewers see on the captured stage whenever nothing runs (setup, webcam calibration, back at setup after a match or workout, Boss Forge between fights). CSS shows it whenever the body is not .fight-started; pause and round results keep their own cards. */
export type StartingSoon={title:string;streamer:string;versus:string;commands:string;note:string};
export type HoldingState={login?:string|null;boss?:string|null;trainer:boolean;/** The last finished match this page load, if any. */lastMatch?:{winner:'streamer'|'boss';streamer:number;boss:number}|null;/** A fight has run this page load (a match may also have been ended early). */fought?:boolean;/** Boss Forge is making the next boss. */forging?:boolean;/** A forged boss is waiting for the next fight. */forged?:boolean};
const BOSS_COMMANDS='!jab · !left · !right · !combo',TRAINER_COMMANDS='!12 · !12s · !faster';
export function startingSoonCopy(state:HoldingState):StartingSoon{
 const streamer=(state.login||'YOUR STREAMER').toUpperCase(),boss=(state.boss||'Chat Golem').toUpperCase();
 if(state.trainer)return {title:'WORKOUT STARTING SOON',streamer,versus:'CHAT',commands:TRAINER_COMMANDS,note:''};
 if(state.forging)return {title:'CHAT IS FORGING A BOSS…',streamer,versus:'???',commands:BOSS_COMMANDS,note:'The new boss steps in for the next fight.'};
 const last=state.lastMatch,note=state.forged?`New boss: ${boss}`:last?`Last match: ${last.winner==='streamer'?streamer:'CHAT'} won ${Math.max(last.streamer,last.boss)}–${Math.min(last.streamer,last.boss)}`:'';
 return {title:state.fought||last?'NEXT FIGHT SOON':'STARTING SOON',streamer,versus:boss,commands:BOSS_COMMANDS,note};
}
export function mountStartingSoon(stage:HTMLElement){
 const doc=stage.ownerDocument,card=doc.createElement('section');card.id='starting-soon';card.className='starting-soon';card.setAttribute('aria-label','Holding card shown on stream');
 card.innerHTML='<div><p class="starting-soon-title" data-ss="title"></p><p class="starting-soon-versus"><b data-ss="streamer"></b> <i>vs</i> <b data-ss="versus"></b></p><p class="starting-soon-note" data-ss="note"></p><p class="starting-soon-chat">Chat, get ready: type <em data-ss="commands"></em></p><p class="starting-soon-warm">Warming up…</p></div>';
 stage.append(card);
 let key='';
 return {update(copy:StartingSoon){const next=JSON.stringify(copy);if(next===key)return;key=next;for(const name of ['title','streamer','versus','commands','note'] as const)card.querySelector(`[data-ss=${name}]`)!.textContent=copy[name];card.querySelector<HTMLElement>('[data-ss=note]')!.hidden=!copy.note;}};
}
