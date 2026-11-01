import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';
import {mountLandingHistory,PLAY_ENTRY} from './landing-history';
const windows:JSDOM[]=[];
afterEach(()=>{for(const dom of windows)dom.window.close();windows.length=0;});
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));
/** A page with a fake fight: the body classes are what the real stage and webcam setup toggle. */
function page(url='https://example.test/?mode=trainer'){
 const dom=new JSDOM('<body></body>',{url});windows.push(dom);const win=dom.window as unknown as Window,body=win.document.body;
 const game={mid:false,paused:false};
 const options={away:()=>body.classList.contains('fight-started')||body.classList.contains('webcam-open'),midFight:()=>game.mid,paused:()=>game.paused,pause:vi.fn(()=>{game.paused=true;}),home:vi.fn(()=>{game.mid=false;game.paused=false;body.classList.remove('fight-started','webcam-open');})};
 const history=mountLandingHistory(win,options);
 return {win,body,game,options,history,back:async()=>{win.history.back();await settle();}};
}
it('entering a fight pushes one #play entry on the same URL; Back mid-round pauses and re-pushes; Back again goes home and stays on the site',async()=>{
 const p=page(),start=p.win.history.length;
 p.body.classList.add('fight-started');p.game.mid=true;await settle();
 expect(p.win.history.length).toBe(start+1);expect(p.win.history.state).toEqual(PLAY_ENTRY);expect(p.win.location.search).toBe('?mode=trainer');expect(p.win.location.hash).toBe('#play');
 await p.back();expect(p.options.pause).toHaveBeenCalledOnce();expect(p.options.home).not.toHaveBeenCalled();expect(p.win.history.state).toEqual(PLAY_ENTRY);
 await p.back();expect(p.options.home).toHaveBeenCalledOnce();expect(p.win.location.href).toBe('https://example.test/?mode=trainer');expect(p.win.history.state).toBeNull();
 // Home again: the next Back is a normal one (no entry of ours left to spend it on).
 await settle();expect(p.win.history.state).toBeNull();
});
it('Back from results, a summary or webcam setup goes straight home; one entry however often the classes change',async()=>{
 const p=page(),start=p.win.history.length;
 p.body.classList.add('webcam-open');await settle();p.body.classList.add('fight-started');p.body.classList.remove('webcam-open');await settle();
 expect(p.win.history.length).toBe(start+1);
 await p.back();expect(p.options.pause).not.toHaveBeenCalled();expect(p.options.home).toHaveBeenCalledOnce();expect(p.body.className).toBe('');
});
it('Back while already paused goes home',async()=>{
 const p=page();p.body.classList.add('fight-started');p.game.mid=true;p.game.paused=true;await settle();
 await p.back();expect(p.options.pause).not.toHaveBeenCalled();expect(p.options.home).toHaveBeenCalledOnce();
});
it('leaving in-page (Quit to setup) steps off the entry, so the next Back leaves the site as normal; playing again pushes a fresh one',async()=>{
 const p=page(),start=p.win.history.length;
 p.body.classList.add('fight-started');await settle();expect(p.win.history.state).toEqual(PLAY_ENTRY);
 p.body.classList.remove('fight-started');await settle();await settle();
 expect(p.win.history.state).toBeNull();expect(p.win.location.hash).toBe('');expect(p.options.home).not.toHaveBeenCalled();
 p.body.classList.add('fight-started');await settle();expect(p.win.history.state).toEqual(PLAY_ENTRY);expect(p.win.history.length).toBe(start+1);
});
it('a reload on #play starts on the hero without the stale entry marker',()=>{
 const dom=new JSDOM('<body></body>',{url:'https://example.test/#play'});windows.push(dom);dom.window.history.replaceState({...PLAY_ENTRY},'','/#play');
 mountLandingHistory(dom.window as unknown as Window,{away:()=>false,midFight:()=>false,paused:()=>false,pause:vi.fn(),home:vi.fn()});
 expect(dom.window.history.state).toBeNull();expect(dom.window.location.href).toBe('https://example.test/');
});
it('main.ts wires it on the offline demo only, and never on /play',()=>{
 const main=readFileSync(new URL('./main.ts',import.meta.url),'utf8');expect(main).toContain('if(!liveMode)mountLandingHistory(window,');
});
