import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
import {mountDemoLanding,VIDEO_URL} from './demo-landing';
it('has one immediate keyboard action and moves the single safety checkbox to webcam setup',()=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8')),doc=dom.window.document;mountDemoLanding(doc);
 expect(doc.getElementById('demo-intro')!.textContent).toContain('Chat picks the attacks. You dodge them.');expect(doc.querySelectorAll('#play-now')).toHaveLength(1);expect(doc.querySelectorAll('#clear-space')).toHaveLength(1);expect(doc.getElementById('clear-space')!.closest('#webcam-settings')).not.toBeNull();expect(doc.getElementById('start-difficulty')!.closest('#demo-more-options')).not.toBeNull();expect(VIDEO_URL).toBe('');expect(doc.getElementById('demo-intro')!.textContent).not.toContain('Watch the');
 const start=vi.fn(),webcam=vi.fn();doc.getElementById('start-fight')!.removeAttribute('disabled');doc.getElementById('start-fight')!.addEventListener('click',start);doc.getElementById('open-webcam')!.addEventListener('click',webcam);doc.getElementById('play-now')!.click();expect(start).toHaveBeenCalledOnce();doc.getElementById('demo-webcam')!.click();expect(webcam).toHaveBeenCalledOnce();expect(doc.getElementById('stage')!.hidden).toBe(true);dom.window.close();
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
 expect(loop.parentElement!.id).toBe('demo-intro');expect(loop.previousElementSibling!.id).toBe('demo-more-options');
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
