/** /play only: what viewers see on the captured stage while nothing runs (setup, webcam calibration, back at setup after a match). CSS shows it whenever the body is not .fight-started. */
export type StartingSoon={streamer:string;versus:string;commands:string};
export function startingSoonCopy(options:{login?:string|null;boss?:string|null;trainer:boolean}):StartingSoon{
 const streamer=(options.login||'YOUR STREAMER').toUpperCase();
 return options.trainer?{streamer,versus:'CHAT',commands:'!12 · !12s · !faster'}:{streamer,versus:(options.boss||'Chat Golem').toUpperCase(),commands:'!jab · !left · !right · !combo'};
}
export function mountStartingSoon(stage:HTMLElement){
 const doc=stage.ownerDocument,card=doc.createElement('section');card.id='starting-soon';card.className='starting-soon';card.setAttribute('aria-label','Starting soon card shown on stream');
 card.innerHTML='<div><p class="starting-soon-title">STARTING SOON</p><p class="starting-soon-versus"><b data-ss="streamer"></b> <i>vs</i> <b data-ss="versus"></b></p><p class="starting-soon-chat">Chat, get ready: type <em data-ss="commands"></em></p><p class="starting-soon-warm">Warming up…</p></div>';
 stage.append(card);
 let key='';
 return {update(copy:StartingSoon){const next=JSON.stringify(copy);if(next===key)return;key=next;for(const name of ['streamer','versus','commands'] as const)card.querySelector(`[data-ss=${name}]`)!.textContent=copy[name];}};
}
