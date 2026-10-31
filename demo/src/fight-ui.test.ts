import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';
import {mountFightUi} from './fight-ui';
import {createGame,step} from '../../shared/src/engine';
import {InputTutorial} from './tutorial';
const windows:JSDOM[]=[];afterEach(()=>{for(const window of windows)window.window.close();windows.length=0;vi.restoreAllMocks();});
function setup(offline=true){const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'));windows.push(dom);const doc=dom.window.document,actions={resume:vi.fn(),restart:vi.fn(),quit:vi.fn(),end:vi.fn(),next:vi.fn()};let at=0;const ui=mountFightUi(doc,{offline,...actions,now:()=>at});return {dom,doc,ui,actions,time:(value:number)=>{at=value;}};}
it('pauses before a game exists, gates touch/practice, and offers exactly resume/restart/quit',()=>{
 const {doc,ui,actions}=setup();ui.showStage();ui.setPaused(true);expect(doc.getElementById('pause-screen')!.hidden).toBe(false);expect(doc.getElementById('pause-screen')!.textContent).toContain('Chat can’t vote');
 const keys=vi.fn();doc.defaultView!.addEventListener('keydown',keys);doc.querySelector<HTMLButtonElement>('.practice-tap')!.click();expect(keys).not.toHaveBeenCalled();
 for(const action of ['resume','restart','quit'] as const)doc.querySelector<HTMLButtonElement>(`[data-pause=${action}]`)!.click();expect(actions.resume).toHaveBeenCalledOnce();expect(actions.restart).toHaveBeenCalledOnce();expect(actions.quit).toHaveBeenCalledOnce();ui.setPaused(false);doc.querySelector<HTMLButtonElement>('.practice-tap')!.click();expect(keys.mock.calls[0]![0].code).toBe('KeyK');
});
it('routes held K/A/D and J tap pads through keyboard events and releases on cancel',()=>{
 const {doc,dom,ui}=setup();ui.modes(true,false);const events:string[]=[];for(const type of ['keydown','keyup'])dom.window.addEventListener(type,event=>events.push(`${event.type}:${(event as KeyboardEvent).code}`));
 const guard=doc.querySelector<HTMLElement>('[data-tap=K]')!;guard.dispatchEvent(new dom.window.Event('pointerdown',{cancelable:true}));guard.dispatchEvent(new dom.window.Event('pointercancel'));expect(events).toEqual(['keydown:KeyK','keyup:KeyK']);ui.modes(true,true);expect(doc.querySelector<HTMLElement>('[data-tap=J]')!.hidden).toBe(true);ui.modes(false,true);expect(doc.querySelector<HTMLElement>('.tap-pads')!.hidden).toBe(true);
});
it('shows plain round results and advances once after 5s, freezing the countdown in pause',()=>{
 const {doc,ui,actions,time}=setup();let game=createGame();game.round.over=true;game.log.rounds=[{number:1,winner:'streamer',reason:'ko',at:100,streamer_hp:90,boss_hp:0,boss_max_hp:135,duration_ms:100} as any];ui.render(game);expect(doc.querySelector('[data-result-title]')!.textContent).toBe('You won Round 1');expect(doc.querySelectorAll('.plain-stats p')).toHaveLength(3);for(const jargon of ['MVP','REACTED','!forgetme','AUTOPILOT','Stats only'])expect(doc.getElementById('round-results')!.textContent).not.toContain(jargon);
 time(2000);ui.setPaused(true);time(12000);ui.tick();expect(actions.next).not.toHaveBeenCalled();ui.setPaused(false);time(14999);ui.tick();expect(actions.next).not.toHaveBeenCalled();time(15000);ui.tick();ui.tick();expect(actions.next).toHaveBeenCalledOnce();expect(doc.getElementById('playtest-opt-in')!.closest('#round-results')).not.toBeNull();
});
it('practice text names the next move and never consumes a game beat',()=>{
 const tutorial=new InputTutorial(),game=createGame({difficulty:'hard'});expect(tutorial.status(true)).toContain('Practice: press K to guard (1 of 3)');tutorial.input({kind:'pose',guard:true,lean:null,source:'keyboard',at:100});expect(tutorial.status(true)).toContain('press A to lean left (2 of 3)');expect(game.round.elapsed_ms).toBe(0);expect(step(game,{kind:'advance'},0).difficulty).toBe('hard');
});

it('keeps hosted NEXT ROUND available and only renders verified clip links',()=>{
 const {doc,ui,actions}=setup(false),game=createGame();game.round.over=true;game.log.rounds=[{number:1,winner:'boss',reason:'ko',at:100,streamer_hp:0,boss_hp:70,duration_ms:100} as any];
 ui.render(game,false,{mvp:'Viewer',clips:[{label:'Confirmed',url:'https://clips.twitch.tv/Confirmed'},{label:'Invalid',url:'https://evil.example/'}]});expect(doc.querySelector('[data-result-title]')!.textContent).toBe('Chat won Round 1');expect(doc.querySelectorAll('.plain-stats p')).toHaveLength(3);expect(doc.querySelectorAll('#round-results a')).toHaveLength(1);const link=doc.querySelector('#round-results a');ui.render(game,false,{mvp:'Viewer',clips:[{label:'Confirmed',url:'https://clips.twitch.tv/Confirmed'},{label:'Invalid',url:'https://evil.example/'}]});expect(doc.querySelector('#round-results a')).toBe(link);doc.querySelector<HTMLButtonElement>('[data-result-next]')!.click();expect(actions.next).toHaveBeenCalledOnce();
});
it('gives pause Resume a large primary target and secondary exits',()=>{
 const{doc,dom}=setup();const style=doc.createElement('style');style.textContent=readFileSync(new URL('./style.css',import.meta.url),'utf8');doc.head.append(style);const computed=dom.window.getComputedStyle;
 expect(computed(doc.querySelector('[data-pause=resume]')!).minHeight).toBe('56px');expect(doc.querySelector('[data-pause=resume]')!.classList.contains('primary')).toBe(true);for(const action of ['restart','quit'])expect(computed(doc.querySelector(`[data-pause=${action}]`)!).minHeight).toBe('44px');
});
it('clears the previous round countdown when the match ends',()=>{
 const {doc,ui,time}=setup();const round=(number:number)=>({number,winner:'streamer',reason:'ko',at:100,streamer_hp:90,boss_hp:0,boss_max_hp:135,duration_ms:100} as any);
 let game=createGame();game.round.over=true;game.log.rounds=[round(1)];ui.render(game);time(5000);ui.tick();expect(doc.querySelector('[data-result-countdown]')!.textContent).toBe('Next round in 0 s');
 game=structuredClone(game);game.round.number=2;game.match.winner='streamer';game.log.rounds=[round(1),round(2)];ui.render(game);
 expect(doc.querySelector('[data-result-next]')!.textContent).toBe('NEW MATCH');expect(doc.querySelector('[data-result-countdown]')!.textContent).toBe('');
});
it('stacks the pause dialog above the round results so Resume stays reachable between rounds',()=>{
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');const z=(selector:string)=>Number(new RegExp(`${selector.replace(/[.#]/g,'\\$&')}\\{[^}]*z-index:(\\d+)`).exec(css)?.[1]);
 expect(z('#pause-screen')).toBeGreaterThan(z('.fight-dialog'));
});
it('keeps Tab focus inside the aria-modal pause dialog',()=>{
 const {doc,ui}=setup();ui.showStage();ui.setPaused(true);
 const [resume,,quit]=[...doc.querySelectorAll<HTMLButtonElement>('#pause-screen button')];
 const tab=(shiftKey=false)=>{const event=new doc.defaultView!.KeyboardEvent('keydown',{key:'Tab',shiftKey,bubbles:true,cancelable:true});(doc.activeElement??doc.body).dispatchEvent(event);return event.defaultPrevented;};
 expect(doc.activeElement).toBe(resume);expect(tab(true)).toBe(true);expect(doc.activeElement).toBe(quit);
 expect(tab()).toBe(true);expect(doc.activeElement).toBe(resume);
 doc.getElementById('stop-input')!.focus();expect(tab()).toBe(true);expect(doc.activeElement).toBe(resume);
 ui.setPaused(false);doc.getElementById('stop-input')!.focus();expect(tab()).toBe(false);
});
