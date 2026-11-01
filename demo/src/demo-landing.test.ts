import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
import {defaultLandingInput,mountDemoLanding,PHONE_QUERY,VIDEO_URL} from './demo-landing';
it('has one TRY THE DEMO that follows the keyboard/webcam choice and moves the single safety checkbox to webcam setup',()=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8')),doc=dom.window.document;mountDemoLanding(doc);
 expect(doc.getElementById('demo-intro')!.textContent).toContain('A boxing game for your Twitch stream. Your chat picks the punches. You dodge them on your webcam.');expect(doc.getElementById('demo-intro')!.textContent).not.toMatch(/![a-z]/);expect(doc.querySelectorAll('#play-now')).toHaveLength(1);expect(doc.querySelectorAll('#clear-space')).toHaveLength(1);expect(doc.getElementById('clear-space')!.closest('#webcam-settings')).not.toBeNull();expect(doc.getElementById('start-difficulty')!.closest('#demo-more-options')).not.toBeNull();expect(VIDEO_URL).toBe('');expect(doc.getElementById('demo-intro')!.textContent).not.toContain('Watch the');
 const start=vi.fn(),webcam=vi.fn();doc.getElementById('start-fight')!.removeAttribute('disabled');doc.getElementById('start-fight')!.addEventListener('click',start);doc.getElementById('open-webcam')!.addEventListener('click',webcam);expect(doc.getElementById('play-now')!.textContent).toBe('TRY THE DEMO · KEYBOARD');doc.getElementById('play-now')!.click();expect(start).toHaveBeenCalledOnce();
 // Webcam is a choice, not an action: TRY THE DEMO then opens webcam setup.
 doc.getElementById('demo-webcam')!.click();expect(webcam).not.toHaveBeenCalled();expect(doc.getElementById('demo-webcam')!.getAttribute('aria-pressed')).toBe('true');expect(doc.getElementById('demo-keyboard')!.getAttribute('aria-pressed')).toBe('false');expect(doc.getElementById('play-now')!.textContent).toBe('TRY THE DEMO · WEBCAM');
 doc.getElementById('play-now')!.click();expect(webcam).toHaveBeenCalledOnce();expect(start).toHaveBeenCalledOnce();doc.getElementById('demo-keyboard')!.click();doc.getElementById('play-now')!.click();expect(start).toHaveBeenCalledTimes(2);expect(webcam).toHaveBeenCalledOnce();expect(doc.getElementById('stage')!.hidden).toBe(true);dom.window.close();
});
it('does not seed memory and stops even a pending camera when keyboard is selected',()=>{
 const main=readFileSync(new URL('./main.ts',import.meta.url),'utf8');expect(main).not.toContain('createDemoViewerMemory');expect(main).toContain("if(source.value==='keyboard'){camera.stop();");expect(main).toContain('difficulty.addEventListener');
});
it('offers one visible Options control with an accessible disclosure state',()=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'));try{const doc=dom.window.document;mountDemoLanding(doc);const button=doc.getElementById('demo-options')!,details=doc.getElementById('demo-more-options') as HTMLDetailsElement;
 expect(details.querySelector('summary')!.hidden).toBe(true);expect(button.getAttribute('aria-expanded')).toBe('false');button.click();expect(details.open).toBe(true);expect(button.getAttribute('aria-expanded')).toBe('true');button.click();expect(details.open).toBe(false);expect(button.getAttribute('aria-expanded')).toBe('false');
 }finally{dom.window.close();}
});
import {startLandingLoop} from './demo-landing';
import {statSync} from 'node:fs';
function loopDom(reduce:boolean){
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{pretendToBeVisual:true}),win=dom.window;
 const listeners:(()=>void)[]=[];const query={matches:reduce,addEventListener:(_:string,fn:()=>void)=>listeners.push(fn)};
 const loadListeners:(()=>void)[]=[];
 const fakeWin={matchMedia:()=>query,document:{readyState:'loading'},setTimeout:(fn:()=>void,ms:number)=>setTimeout(fn,ms),addEventListener:(_:string,fn:()=>void)=>loadListeners.push(fn)};
 const video=win.document.querySelector<HTMLVideoElement>('#landing-loop video')!;const play=vi.fn(()=>Promise.resolve());video.play=play;video.pause=vi.fn();
 const load=()=>{fakeWin.document.readyState='complete';for(const fn of loadListeners)fn();};
 return {dom,win:fakeWin,video,play,query,listeners,load};
}
it('ships a muted, looping, inline gameplay loop with a poster, labelled as simulated chat',()=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'));try{const doc=dom.window.document;mountDemoLanding(doc);
 const loop=doc.getElementById('landing-loop')!,video=loop.querySelector('video')!;
 expect(loop.closest('#demo-intro')).not.toBeNull();expect(loop.parentElement!.classList.contains('landing-side')).toBe(true);expect(loop.previousElementSibling!.classList.contains('landing-try')).toBe(true);
 for(const attribute of ['muted','loop','playsinline'])expect(video.hasAttribute(attribute)).toBe(true);
 expect(video.hasAttribute('autoplay')).toBe(false);expect(video.getAttribute('preload')).toBe('none');
 expect(video.getAttribute('aria-label')).toBe('Gameplay loop with simulated chat');expect(video.getAttribute('poster')).toMatch(/gameplay-loop-SIMULATED-poster\.webp$/);
 expect([...video.querySelectorAll('source')].map(source=>source.getAttribute('type'))).toEqual(['video/webm','video/mp4']);
 expect(loop.querySelector('figcaption')!.textContent).toContain('SIMULATED CHAT');
 let total=0;for(const file of ['gameplay-loop-SIMULATED.webm','gameplay-loop-SIMULATED.mp4','gameplay-loop-SIMULATED-poster.webp'])total+=statSync(new URL(`../../assets/landing/${file}`,import.meta.url)).size;
 expect(total).toBeLessThanOrEqual(1.2e6);
 }finally{dom.window.close();}
});
it('starts the loop only after load, and never under reduced motion',async()=>{
 vi.useFakeTimers();try{
  const motion=loopDom(false);startLandingLoop(motion.win as unknown as Window,motion.video,{delayMs:600});
  vi.advanceTimersByTime(5000);expect(motion.play).not.toHaveBeenCalled();motion.load();vi.advanceTimersByTime(599);expect(motion.play).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);expect(motion.play).toHaveBeenCalledOnce();expect(motion.video.preload).toBe('auto');motion.dom.window.close();
  const still=loopDom(true);startLandingLoop(still.win as unknown as Window,still.video,{delayMs:600});still.load();vi.advanceTimersByTime(5000);
  expect(still.play).not.toHaveBeenCalled();expect(still.video.getAttribute('preload')).toBe('none');
  still.query.matches=false;for(const fn of still.listeners)fn();expect(still.play).toHaveBeenCalledOnce();
  still.query.matches=true;for(const fn of still.listeners)fn();expect(still.video.pause).toHaveBeenCalled();still.dom.window.close();
 }finally{vi.useRealTimers();}
});
it('puts the mode cards under CHOOSE YOUR FIGHT; Crowd Trainer swaps the pitch line and the TRY THE DEMO word',async()=>{
 const {mountTrainer}=await import('./trainer-ui');
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'));try{const doc=dom.window.document;mountDemoLanding(doc);
 mountTrainer(doc,{live:false,stage:doc.getElementById('stage')!,difficulty:()=>'medium',keyboard:()=>true,viewers:()=>0,liveTokenLoaded:()=>false,onAgain:vi.fn(),onExit:vi.fn(),now:()=>0,search:''});
 const slot=doc.getElementById('landing-modes')!,play=doc.getElementById('play-now')!,line=doc.querySelector('.landing-lede')!;
 expect(slot.querySelector('h3')!.textContent).toBe('CHOOSE YOUR FIGHT');expect(slot.querySelectorAll('[data-trainer-mode]')).toHaveLength(2);expect(doc.querySelector('.landing-mark')!.textContent).toBe('STREAMER VS CHAT');
 slot.querySelector<HTMLButtonElement>('[data-trainer-mode=trainer]')!.click();
 expect(play.textContent).toBe('TRY THE WORKOUT · KEYBOARD');expect(line.textContent).toBe('A workout game for your Twitch stream. Your chat calls the combos. You throw them on your webcam.');expect(doc.querySelector('.landing-mark')!.textContent).toBe('STREAMER VS CHAT');
 expect(slot.querySelector<HTMLElement>('.trainer-options')!.hidden).toBe(false);expect(slot.querySelectorAll('.trainer-options input[role=switch]')).toHaveLength(2);
 slot.querySelector<HTMLButtonElement>('[data-trainer-mode=boss]')!.click();expect(play.textContent).toBe('TRY THE DEMO · KEYBOARD');expect(line.textContent).toContain('Your chat picks the punches.');
 }finally{dom.window.close();}
});
it('leads with PLAY ON YOUR TWITCH STREAM; the demo sits in its own fake-chat box with Webcam first; MORE TO TRY is off the homepage',()=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'));try{const doc=dom.window.document;mountDemoLanding(doc);
 const twitch=doc.getElementById('play-twitch') as HTMLAnchorElement,tryBox=doc.querySelector('.landing-try')!;
 expect(twitch.tagName).toBe('A');expect(twitch.getAttribute('href')).toBe('/play');expect(twitch.querySelector('.twitch-main')!.textContent).toBe('PLAY ON YOUR TWITCH STREAM →');expect(twitch.textContent).toContain('Needs a computer');
 expect(doc.querySelector('.landing-live-note')!.textContent).toMatch(/Connect Twitch.*viewers vote in chat.*Free.*Chrome on a computer/);
 // Twitch first, then the labelled try-it box, then the clip.
 expect(twitch.compareDocumentPosition(tryBox)&dom.window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();expect(tryBox.querySelector('h2')!.textContent).toBe('Try it now · fake chat, no login');
 for(const id of ['play-now','demo-webcam','demo-keyboard','demo-options','landing-mode-label'])expect(doc.getElementById(id)!.closest('.landing-try')).not.toBeNull();
 const inputs=[...tryBox.querySelectorAll<HTMLElement>('[data-landing-input]')];expect(inputs.map(button=>button.id)).toEqual(['demo-webcam','demo-keyboard']);
 expect(inputs[0]!.textContent).toContain('with your real body');expect(inputs[1]!.textContent).toContain('No webcam? Use the keyboard');
 expect(doc.querySelectorAll('a[href="/play"]')).toHaveLength(1);expect(doc.getElementById('more-to-try')!.hidden).toBe(true);
 // The panels still exist (hidden), so nothing that mounts into them breaks.
 for(const id of ['demo-forge-host','copy-demo-link','cold-open'])expect(doc.getElementById(id)).not.toBeNull();
 }finally{dom.window.close();}
});
it('starts a computer on webcam and a phone, tablet or unknown screen on keyboard; the CSS uses the same phone query',()=>{
 const asked:string[]=[];const media=(matches:boolean)=>({matchMedia:(query:string)=>{asked.push(query);return {matches} as MediaQueryList;}});
 expect(defaultLandingInput(media(false))).toBe('pose');expect(defaultLandingInput(media(true))).toBe('keyboard');expect(defaultLandingInput({} as Pick<Window,'matchMedia'>)).toBe('keyboard');
 expect(asked).toEqual([PHONE_QUERY,PHONE_QUERY]);expect(readFileSync(new URL('./style.css',import.meta.url),'utf8')).toContain(`@media ${PHONE_QUERY}{`);
});
it('keeps the small hero text in the readable body face, not the condensed display face',()=>{
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8'),block=css.slice(css.indexOf('/* ── Landing hero'),css.indexOf('/* ── end landing hero'));
 for(const selector of ['#landing-modes [data-trainer-mode] small{','#landing-modes .trainer-options label{','.offline-demo-page #landing-loop figcaption{','.offline-demo-page .landing-input button{','.landing-how li>span{','.offline-demo-page #demo-intro .landing-live-note{','.offline-demo-page #demo-intro .landing-options{','.offline-demo-page #demo-intro .landing-lede{']){
  const rule=block.slice(block.indexOf(selector),block.indexOf('}',block.indexOf(selector)));expect(rule,selector).toContain('system-ui');expect(rule,selector).not.toContain('Barlow');
 }
 expect(block).toMatch(/\.trainer-options strong\{font-size:17px;font-weight:600/);
});
