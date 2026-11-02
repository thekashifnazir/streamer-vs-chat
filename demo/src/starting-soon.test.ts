import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it} from 'vitest';
import {mountStartingSoon,startingSoonCopy} from './starting-soon';
const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
it('maps every holding state to its card: before the first fight, after a match, Crowd Trainer, Boss Forge',()=>{
 const hint='!jab · !left · !right · !combo',base={login:'kashruns',boss:'Chat Golem',trainer:false};
 // (a) setup and webcam calibration before the first fight.
 expect(startingSoonCopy(base)).toEqual({title:'STARTING SOON',streamer:'KASHRUNS',versus:'CHAT GOLEM',commands:hint,note:''});
 expect(startingSoonCopy({login:null,boss:null,trainer:false}).versus).toBe('CHAT GOLEM');
 // (b) back at setup after a match (End fight, back to setup, a mode or boss change): the last result and the same hint.
 expect(startingSoonCopy({...base,fought:true,lastMatch:{winner:'streamer',streamer:2,boss:0}})).toEqual({title:'NEXT FIGHT SOON',streamer:'KASHRUNS',versus:'CHAT GOLEM',commands:hint,note:'Last match: KASHRUNS won 2–0'});
 expect(startingSoonCopy({...base,fought:true,lastMatch:{winner:'boss',streamer:1,boss:2}}).note).toBe('Last match: CHAT won 2–1');
 expect(startingSoonCopy({...base,fought:true})).toMatchObject({title:'NEXT FIGHT SOON',note:''});
 // (c) Crowd Trainer before the start and after the summary closes, whatever happened before.
 expect(startingSoonCopy({...base,trainer:true,fought:true,lastMatch:{winner:'streamer',streamer:2,boss:1}})).toEqual({title:'WORKOUT STARTING SOON',streamer:'KASHRUNS',versus:'CHAT',commands:'!12 · !12s · !faster',note:''});
 // (d) Boss Forge between fights: forging first, then the new boss by name.
 expect(startingSoonCopy({...base,fought:true,forging:true})).toMatchObject({title:'CHAT IS FORGING A BOSS…',versus:'???'});
 expect(startingSoonCopy({...base,boss:'Pixel Hydra',fought:true,forged:true,lastMatch:{winner:'streamer',streamer:2,boss:0}})).toEqual({title:'NEXT FIGHT SOON',streamer:'KASHRUNS',versus:'PIXEL HYDRA',commands:hint,note:'New boss: PIXEL HYDRA'});
});
it('mounts inside the captured stage and keeps the 36px HUD floor at a 1920 stage',()=>{
 const dom=new JSDOM('<div id="stage"></div>'),stage=dom.window.document.getElementById('stage')!;
 const card=mountStartingSoon(stage);card.update(startingSoonCopy({login:'kashruns',boss:'Forged Boss',trainer:false}));expect(stage.querySelector<HTMLElement>('[data-ss=note]')!.hidden).toBe(true);
 expect(stage.querySelector('#starting-soon')!.textContent).toContain('STARTING SOON');expect(stage.querySelector('[data-ss=versus]')!.textContent).toBe('FORGED BOSS');
 expect(stage.querySelector('.starting-soon-chat')!.textContent).toBe('Chat, get ready: type !jab · !left · !right · !combo');
 // Every card font is in container units of the stage; at 1920 px wide 1cqw is 19.2 px, so 36 px needs at least 1.875cqw.
 const block=css.slice(css.indexOf('.starting-soon{position'),css.indexOf('.stage-preview{display:none}'));
 const sizes=[...block.matchAll(/font:\d+ ([\d.]+)cqw/g)].map(match=>Number(match[1]));expect(sizes.length).toBeGreaterThanOrEqual(4);for(const size of sizes)expect(size*19.2).toBeGreaterThanOrEqual(36);
 // Shown only while nothing runs; the camera bubble (z-index 6) stays above it.
 expect(css).toContain('.hosted-flow:not(.fight-started) #stage>.starting-soon{display:grid}');expect(block).toContain('z-index:5');
});
it('shrinks the stage with a transform, never hides it, while setup shows (Element Capture keeps the element)',()=>{
 const rule=css.slice(css.indexOf('.hosted-flow:is([data-play-step=live],[data-play-step=fight]):not(.stream-compact):not(.fight-started)>main>#stage{'));
 const body=rule.slice(0,rule.indexOf('}'));expect(body).toContain('display:block!important');expect(body).toContain('transform:scale(var(--pv-s))');expect(body).toContain('width:1280px!important');expect(body).not.toMatch(/visibility:hidden|display:none|zoom/);
 expect(css).not.toContain(':not([data-broadcast-preparing=true]) #stage');
});
