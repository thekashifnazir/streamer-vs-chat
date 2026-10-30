/** Presentation-only viewport budget shared by the compact chrome and layout test. */
export const STREAM_CHROME={bar:44,controls:64,status:0} as const;
export function streamFrame(width:number,height:number){
 const available=Math.max(0,height-STREAM_CHROME.bar-STREAM_CHROME.controls-STREAM_CHROME.status);
 const frameWidth=Math.min(width,available*16/9);
 return {width:frameWidth,height:frameWidth*9/16,bottom:STREAM_CHROME.bar+frameWidth*9/16};
}
export function mountStreamLayout(options:{live:boolean;onEnd:()=>void},doc:Document=document){
 const bar=doc.createElement('section');bar.className='stream-bar';bar.hidden=true;bar.setAttribute('aria-label','Stream controls');
 bar.innerHTML='<span class="stream-status" role="status"></span><label><input type="checkbox" class="stream-green"> Green background</label><button class="stream-end">End session</button><button class="stream-expand" aria-expanded="false">Expand</button>';
 doc.querySelector('main')!.prepend(bar);
 const status=bar.querySelector<HTMLElement>('.stream-status')!,green=bar.querySelector<HTMLInputElement>('.stream-green')!,expand=bar.querySelector<HTMLButtonElement>('.stream-expand')!;
 let compact=false;
 const setCompact=(value:boolean)=>{compact=value;if(value){bar.hidden=false;const controls=doc.querySelector<HTMLElement>('.demo-controls');if(controls)controls.hidden=false;}doc.body.classList.toggle('stream-compact',value);expand.textContent=value?'Expand':'Collapse';expand.setAttribute('aria-expanded',String(!value));};
 bar.querySelector('.stream-end')!.addEventListener('click',()=>{options.onEnd();setCompact(false);});
 expand.addEventListener('click',()=>setCompact(!compact));
 green.addEventListener('change',()=>{doc.getElementById('stage')!.classList.toggle('chroma-green',green.checked);const original=doc.getElementById('green-background') as HTMLInputElement|null;if(original){original.checked=green.checked;original.dispatchEvent(new Event('change'));}});
 status.textContent=options.live?'LIVE · CONNECT TWITCH':'SIMULATED · NO LOGIN';
 setCompact(false);
 return {collapse:()=>setCompact(true),expand:()=>setCompact(false),status:(text:string)=>{status.textContent=text;},green:(checked:boolean)=>{green.checked=checked;}};
}
