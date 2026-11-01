import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';
import {mountFightSetup} from './setup-ui';
import {mountDemoLanding} from './demo-landing';
import {mountHostedFlow} from './hosted-flow';
import {createPrefs,PREFS_KEY} from './prefs';
import {bindSetupPrefs,VISIT_MODE_KEY} from './setup-prefs';
import {mountTrainer} from './trainer-ui';
const windows:JSDOM[]=[];
afterEach(()=>{for(const dom of windows)dom.window.close();windows.length=0;vi.unstubAllGlobals();});
function memoryStorage():Storage{const data=new Map<string,string>();return {get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,String(value));},removeItem:key=>{data.delete(key);},clear:()=>data.clear()};}
/** One page load: fresh DOM, the same storage. */
function load(storage:Storage,{page='index.html',search='',trainer:withTrainer=false,session}:{page?:'index.html'|'play/index.html';search?:string;trainer?:boolean;session?:Storage}={}){
 const dom=new JSDOM(readFileSync(new URL(`../${page}`,import.meta.url),'utf8'));windows.push(dom);vi.stubGlobal('Event',dom.window.Event);
 const doc=dom.window.document;if(page==='index.html')mountDemoLanding(doc);else mountHostedFlow(doc);
 // Same order as main.ts: Trainer mounts its mode choice before the preferences bind.
 const trainer=withTrainer?mountTrainer(doc,{live:page!=='index.html',stage:doc.getElementById('stage')!,difficulty:()=>'medium',keyboard:()=>true,viewers:()=>0,liveTokenLoaded:()=>false,onAgain:vi.fn(),onExit:vi.fn(),now:()=>0,search}):null;
 const setup=mountFightSetup(doc,{onStart:vi.fn(),onWebcamStart:vi.fn(),now:()=>0,simplifiedCalibration:page!=='index.html',workout:()=>!!trainer?.selected});
 const label=doc.createElement('label'),plain=doc.createElement('input');plain.type='checkbox';label.append(plain);doc.body.append(label);
 const target=new dom.window.EventTarget();let on=true;const sound={get:()=>on,set:(value:boolean)=>{on=value;target.dispatchEvent(new dom.window.Event('rails-sound-change'));},target};
 const prefs=bindSetupPrefs(doc,{store:createPrefs(()=>storage),search,setup,sound,plain,visit:()=>session});
 const byId=<T extends HTMLElement>(id:string)=>doc.getElementById(id) as T;
 const value=(id:string)=>byId<HTMLSelectElement>(id).value;
 const click=(selector:string)=>doc.querySelector<HTMLButtonElement>(selector)!.click();
 const change=(id:string,next:string|boolean)=>{const element=byId<HTMLInputElement&HTMLSelectElement>(id);if(typeof next==='boolean')element.checked=next;else element.value=next;element.dispatchEvent(new dom.window.Event('change'));};
 return {doc,prefs,sound,plain,byId,value,click,change,setup,trainer:trainer!};
}
it.each(['index.html','play/index.html'] as const)('%s: a reload restores difficulty, input, posture, defence only, sound, crowd and plain',page=>{
 const storage=memoryStorage(),first=load(storage,{page});
 first.click('[data-option-for=start-difficulty][data-value=expert]');first.change('input-source','pose');first.change('posture','seated');first.change('no-punch',true);first.change('crowd-size','500');first.sound.set(false);first.plain.checked=true;first.plain.dispatchEvent(new first.doc.defaultView!.Event('change'));
 const again=load(storage,{page});
 expect([again.value('start-difficulty'),again.value('input-source'),again.value('posture'),again.value('crowd-size')]).toEqual(['expert','pose','seated','500']);
 expect(again.byId<HTMLInputElement>('no-punch').checked).toBe(true);expect(again.sound.get()).toBe(false);expect(again.plain.checked).toBe(true);
 expect(again.doc.querySelector('[data-option-for=start-difficulty][data-value=expert]')!.getAttribute('aria-pressed')).toBe('true');
 expect(again.setup.difficultyByHand).toBe(true);
 // The clear-space safety check is never remembered.
 expect(again.byId<HTMLInputElement>('clear-space').checked).toBe(false);
});
it('webcam still preselects Easy when no level was ever picked, and the auto Easy is not saved',()=>{
 const storage=memoryStorage(),first=load(storage);
 first.click('#demo-webcam');expect(first.value('start-difficulty')).toBe('easy');
 expect(JSON.parse(storage.getItem(PREFS_KEY)!)).toEqual({input:'pose'});
 const again=load(storage);expect(again.value('input-source')).toBe('pose');expect(again.value('start-difficulty')).toBe('easy');expect(again.setup.difficultyByHand).toBe(false);
 again.change('input-source','keyboard');expect(again.value('start-difficulty')).toBe('medium');
});
it('a saved explicit level wins over the webcam Easy default, including a re-confirmed Medium',()=>{
 const storage=memoryStorage(),first=load(storage);
 first.click('[data-option-for=start-difficulty][data-value=medium]');expect(JSON.parse(storage.getItem(PREFS_KEY)!).difficulty).toBe('medium');
 const again=load(storage);again.click('#demo-webcam');expect(again.value('start-difficulty')).toBe('medium');
 const play=load(storage,{page:'play/index.html'});play.click('[data-defend=pose]');expect(play.value('start-difficulty')).toBe('medium');
});
it('URL values win for the visit without overwriting what was saved',()=>{
 const storage=memoryStorage(),first=load(storage);first.click('[data-option-for=start-difficulty][data-value=hard]');first.change('crowd-size','3');
 const linked=load(storage,{search:'?difficulty=easy&crowd=0&scout=fast'});expect(linked.value('start-difficulty')).toBe('easy');expect(linked.value('crowd-size')).toBe('0');
 linked.click('#demo-webcam');expect(linked.value('start-difficulty')).toBe('easy');
 expect(JSON.parse(storage.getItem(PREFS_KEY)!)).toMatchObject({difficulty:'hard',crowd:3});
 const plain=load(storage);expect(plain.value('start-difficulty')).toBe('hard');expect(plain.value('crowd-size')).toBe('3');
});
it.each(['index.html','play/index.html'] as const)('%s: Reset settings sits in the options panel and restores defaults',page=>{
 const storage=memoryStorage(),first=load(storage,{page});
 first.click('[data-option-for=start-difficulty][data-value=expert]');first.change('no-punch',true);first.change('posture','seated');first.sound.set(false);first.change('input-source','pose');
 const again=load(storage,{page}),button=again.byId<HTMLButtonElement>('reset-settings');
 expect(button.closest(page==='index.html'?'#demo-more-options':'#play-more-options')).not.toBeNull();expect(button.textContent).toBe('Reset settings');
 button.click();
 expect(storage.getItem(PREFS_KEY)).toBeNull();expect(again.byId<HTMLInputElement>('no-punch').checked).toBe(false);expect(again.value('posture')).toBe('standing');expect(again.sound.get()).toBe(true);
 // Input stays put (a running camera is not switched off) and difficulty goes back to its webcam default.
 expect(again.value('input-source')).toBe('pose');expect(again.value('start-difficulty')).toBe('easy');expect(again.setup.difficultyByHand).toBe(false);
 expect(button.nextElementSibling!.textContent).toBe('Settings reset.');
 const fresh=load(storage,{page});expect(fresh.value('input-source')).toBe('keyboard');expect(fresh.value('start-difficulty')).toBe('medium');
});
it('blocked storage leaves the setup on its defaults and fully usable',()=>{
 const blocked=()=>{throw new DOMException('denied','SecurityError');},storage={getItem:blocked,setItem:blocked,removeItem:blocked,key:blocked,get length():number{return blocked();}} as unknown as Storage;
 const page=load(storage);expect(page.value('start-difficulty')).toBe('medium');page.click('[data-option-for=start-difficulty][data-value=hard]');expect(page.value('start-difficulty')).toBe('hard');page.byId<HTMLButtonElement>('reset-settings').click();expect(page.value('start-difficulty')).toBe('medium');
});
it.each(['index.html','play/index.html'] as const)('%s: the game mode and Trainer options survive a reload; Boss Fight is the clean default',page=>{
 const storage=memoryStorage(),first=load(storage,{page,trainer:true});expect(first.trainer.mode).toBe('boss');first.change('clear-space',true);expect(first.byId('start-fight').textContent).toBe('START FIGHT');
 first.click('[data-trainer-mode=trainer]');first.change('trainer-southpaw',true);first.change('trainer-any-hand',true);
 expect(JSON.parse(storage.getItem(PREFS_KEY)!)).toEqual({mode:'trainer',southpaw:true,anyHand:true});
 const again=load(storage,{page,trainer:true});expect(again.trainer.mode).toBe('trainer');expect(again.doc.body.classList.contains('trainer-mode')).toBe(true);
 expect(again.byId<HTMLInputElement>('trainer-southpaw').checked).toBe(true);expect(again.byId<HTMLInputElement>('trainer-any-hand').checked).toBe(true);
 again.trainer.start(0);expect(again.trainer.state!.options).toMatchObject({southpaw:true,anyHand:true});
 again.byId<HTMLButtonElement>('reset-settings').click();expect(again.trainer.mode).toBe('trainer');again.trainer.stop(1);again.byId<HTMLButtonElement>('reset-settings').click();expect(again.trainer.mode).toBe('boss');expect(storage.getItem(PREFS_KEY)).toBeNull();
});
it('?mode= wins for the visit without overwriting the saved mode, and a running workout refuses a mode switch',()=>{
 const storage=memoryStorage(),first=load(storage,{trainer:true});first.click('[data-trainer-mode=trainer]');
 const linked=load(storage,{trainer:true,search:'?mode=boss'});expect(linked.trainer.mode).toBe('boss');expect(JSON.parse(storage.getItem(PREFS_KEY)!).mode).toBe('trainer');
 const odd=load(storage,{trainer:true,search:'?mode=arcade'});expect(odd.trainer.mode).toBe('trainer');
 const running=load(storage,{trainer:true});running.trainer.start(0);running.click('[data-trainer-mode=boss]');expect(running.trainer.mode).toBe('trainer');expect(JSON.parse(storage.getItem(PREFS_KEY)!).mode).toBe('trainer');
});
it('/play: a ?mode=trainer link survives the Twitch login round trip in this tab; a picked mode replaces it',()=>{
 const storage=memoryStorage(),session=memoryStorage(),page='play/index.html' as const;
 const linked=load(storage,{page,trainer:true,session,search:'?mode=trainer'});expect(linked.trainer.mode).toBe('trainer');expect(storage.getItem(PREFS_KEY)).toBeNull();
 // Twitch redirects back to plain /play/ with no query.
 const back=load(storage,{page,trainer:true,session});expect(back.trainer.mode).toBe('trainer');back.change('clear-space',true);expect(back.byId('start-fight').textContent).toBe('START WORKOUT');
 back.click('[data-trainer-mode=boss]');expect(session.getItem(VISIT_MODE_KEY)).toBeNull();expect(load(storage,{page,trainer:true,session}).trainer.mode).toBe('boss');
 // A new tab has no link held: the saved choice applies.
 expect(load(storage,{page,trainer:true,session:memoryStorage()}).trainer.mode).toBe('boss');
});
