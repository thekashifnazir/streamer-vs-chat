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
it('shows plain round results and waits for NEXT ROUND instead of advancing on a timer',()=>{
 const {doc,ui,actions,time}=setup();let game=createGame();game.round.over=true;game.log.rounds=[{number:1,winner:'streamer',reason:'ko',at:100,streamer_hp:90,boss_hp:0,boss_max_hp:135,duration_ms:100} as any];ui.render(game);expect(doc.querySelector('[data-result-title]')!.textContent).toBe('You won Round 1');expect(doc.querySelectorAll('.plain-stats p')).toHaveLength(3);for(const jargon of ['MVP','REACTED','!forgetme','AUTOPILOT','Stats only'])expect(doc.getElementById('round-results')!.textContent).not.toContain(jargon);
 expect(doc.querySelector('[data-result-countdown]')!.textContent).toBe('Next round starts when you press NEXT ROUND');time(2000);ui.setPaused(true);time(12000);ui.tick();ui.setPaused(false);time(600000);ui.tick();expect(actions.next).not.toHaveBeenCalled();const copy=doc.getElementById('export-playtest') as HTMLButtonElement;expect(copy.closest('#round-results')).not.toBeNull();expect(copy.disabled).toBe(false);expect(copy.textContent).toBe('Copy my stats');expect(doc.querySelector('#round-results input[type=checkbox]')).toBeNull();
});
it('practice text names the next move and never consumes a game beat',()=>{
 const tutorial=new InputTutorial(),game=createGame({difficulty:'hard'});expect(tutorial.status(true)).toContain('Practice: press K to guard (1 of 3)');tutorial.input({kind:'pose',guard:true,lean:null,source:'keyboard',at:100});expect(tutorial.status(true)).toContain('press A and D to lean left and right (2 of 3)');expect(game.round.elapsed_ms).toBe(0);expect(step(game,{kind:'advance'},0).difficulty).toBe('hard');
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
 let game=createGame();game.round.over=true;game.log.rounds=[round(1)];ui.render(game);time(10000);ui.tick();expect(doc.querySelector('[data-result-countdown]')!.textContent).toBe('Next round starts when you press NEXT ROUND');
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
it('titles the match end with the match result and round score; round ends keep the round title',()=>{
 const round=(number:number,winner:'streamer'|'boss')=>({number,winner,reason:'ko',at:100*number,streamer_hp:winner==='streamer'?90:0,boss_hp:winner==='boss'?70:0,boss_max_hp:135,duration_ms:100} as any);
 const {doc,ui}=setup(),title=()=>doc.querySelector('[data-result-title]')!.textContent;
 let game=createGame({seed:1});game.round={...game.round,number:2,over:true,winner:'streamer'};game.match={...game.match,round_wins:{streamer:1,boss:1},winner:null};game.log.rounds=[round(1,'boss'),round(2,'streamer')];
 ui.render(game);expect(title()).toBe('You won Round 2');expect(doc.querySelector('[data-result-next]')!.textContent).toBe('NEXT ROUND');
 game={...game,round:{...game.round,number:3},match:{...game.match,round_wins:{streamer:2,boss:1},winner:'streamer'},log:{...game.log,rounds:[...game.log.rounds,round(3,'streamer')]}};
 ui.render(game);expect(title()).toBe('YOU WON THE MATCH 2–1');expect(doc.querySelector('[data-result-next]')!.textContent).toBe('NEW MATCH');
 const lost={...game,match:{...game.match,seed:2,round_wins:{streamer:0,boss:2},winner:'boss' as const},round:{...game.round,number:2,winner:'boss' as const},log:{...game.log,rounds:[round(1,'boss'),round(2,'boss')]}};
 ui.render(lost);expect(title()).toBe('CHAT WON THE MATCH 2–0');
 // End fight mid-round stays "Fight ended".
 const live=createGame({seed:3});ui.render(live,true);expect(title()).toBe('Fight ended');
});
it('reads as a scoreboard: eyebrow, winner colour hook, round score and big-number tiles, NEXT ROUND before End fight',()=>{
 const {doc,ui}=setup(),results=doc.getElementById('round-results')!;let game=createGame();game.round.over=true;game.match.round_wins={streamer:1,boss:0};game.log.rounds=[{number:1,winner:'streamer',reason:'ko',at:100,streamer_hp:90,boss_hp:0,boss_max_hp:135,duration_ms:100} as any];
 ui.render(game,false,{sim:{mvp:'sim_viewer_7'}});expect(results.dataset.resultWinner).toBe('streamer');expect(doc.querySelector('[data-result-eyebrow]')!.textContent).toBe('Round 1 of 3');
 expect([doc.querySelector('[data-score-you]')!.textContent,doc.querySelector('[data-score-chat]')!.textContent]).toEqual(['1','0']);
 expect([...doc.querySelectorAll('.plain-stats p')].map(tile=>[tile.querySelector('b')!.textContent,tile.textContent])).toEqual([['0','0 defences'],['135','135 damage dealt'],['0','0 damage taken']]);
 expect(doc.querySelector('[data-result-sim] .result-tile')!.textContent).toBe('sim_viewer_7 Chat MVP · SIMULATED');
 const actions=doc.querySelector('.result-actions')!;expect(actions.firstElementChild!.matches('[data-result-next]')).toBe(true);expect(actions.lastElementChild!.matches('[data-result-quit]')).toBe(true);
 game=structuredClone(game);game.round.number=2;game.round.winner='boss';game.match.round_wins={streamer:1,boss:1};game.log.rounds=[...game.log.rounds,{number:2,winner:'boss',reason:'ko',at:200,streamer_hp:0,boss_hp:70,boss_max_hp:135,duration_ms:100} as any];
 ui.render(game);expect(results.dataset.resultWinner).toBe('boss');expect(doc.querySelector('[data-score-chat]')!.textContent).toBe('1');
 game=structuredClone(game);game.match.winner='boss';game.match.seed++;ui.render(game);expect(doc.querySelector('[data-result-eyebrow]')!.textContent).toBe('Match over');
 ui.reset();ui.render(createGame({seed:9}),true);expect(results.dataset.resultWinner).toBe('none');expect(doc.querySelector('[data-result-eyebrow]')!.textContent).toBe('Fight over');
});
it('shows confirmed clips as a tile row under the stats, each opening in a new tab',()=>{
 const {doc,ui}=setup(false),game=createGame();game.round.over=true;game.log.rounds=[{number:1,winner:'streamer',reason:'ko',at:100,streamer_hp:50,boss_hp:0,duration_ms:100} as any];
 ui.render(game,false,{clips:[{label:'KO',url:'https://clips.twitch.tv/One'},{label:'PERFECT',url:'https://clips.twitch.tv/Two'},{label:'Bad',url:'javascript:alert(1)'}]});
 const tiles=[...doc.querySelectorAll<HTMLAnchorElement>('#round-results .result-clips a.result-clip')];expect(tiles.map(tile=>tile.textContent)).toEqual(['▶ KO clip','▶ PERFECT clip']);
 for(const tile of tiles){expect(tile.target).toBe('_blank');expect(tile.rel.split(' ')).toContain('noopener');expect(tile.querySelector('span')!.getAttribute('aria-hidden')).toBe('true');}
 ui.render(game,false,{clips:[]});expect(doc.querySelector('#round-results .result-clips')).toBeNull();
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');expect(css).toContain('.round-results .result-clips{order:4;');
});
it('bottom-bar End fight ends the fight from the results card, the match end and a between-rounds pause, like the card link',()=>{
 const {doc,ui,actions}=setup(false),game=createGame();
 ui.end();expect(actions.end).toHaveBeenCalledOnce();expect(actions.quit).not.toHaveBeenCalled();// mid-round: stop and show the Fight ended card
 game.round.over=true;game.log.rounds=[{number:1,winner:'boss',reason:'ko',at:100,streamer_hp:0,boss_hp:70,duration_ms:100} as any];ui.render(game);
 ui.end();expect(actions.quit).toHaveBeenCalledTimes(1);expect(actions.end).toHaveBeenCalledOnce();
 ui.setPaused(true,'Esc');ui.end();expect(actions.quit).toHaveBeenCalledTimes(2);
 ui.setPaused(false);game.match.winner='boss';ui.render(game);ui.end();expect(actions.quit).toHaveBeenCalledTimes(3);
 doc.querySelector<HTMLButtonElement>('[data-result-quit]')!.click();expect(actions.quit).toHaveBeenCalledTimes(4);
});
it('holds a round results card back for revealMs so the KO shows first; End fight from the bar still quits meanwhile',()=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'));windows.push(dom);const doc=dom.window.document,actions={resume:vi.fn(),restart:vi.fn(),quit:vi.fn(),end:vi.fn(),next:vi.fn()};let at=10000;
 const ui=mountFightUi(doc,{offline:true,...actions,now:()=>at,revealMs:1500}),game=createGame(),card=doc.getElementById('round-results')!;
 ui.render(game);expect(card.hidden).toBe(true);
 game.round.over=true;game.log.rounds=[{number:1,winner:'streamer',reason:'ko',at:100,streamer_hp:50,boss_hp:0,duration_ms:100} as any];
 ui.render(game);expect(card.hidden).toBe(true);at=11000;ui.render(game);expect(card.hidden).toBe(true);
 ui.end();expect(actions.quit).toHaveBeenCalledOnce();expect(actions.end).not.toHaveBeenCalled();
 at=11500;ui.render(game);expect(card.hidden).toBe(false);expect(doc.querySelector('[data-result-title]')!.textContent).toBe('You won Round 1');
 // End fight mid-round shows its card at once.
 game.round.over=false;ui.render(game);expect(card.hidden).toBe(true);ui.render(game,true);expect(card.hidden).toBe(false);
});
