import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';
import {defaultCueSound,initialMode,mountTrainer,onTrainerCue} from './trainer-ui';
import {TRAINER} from '../../shared/src/trainer';
const windows:JSDOM[]=[];
afterEach(()=>{for(const dom of windows)dom.window.close();windows.length=0;});
function mount(page:'index.html'|'play/index.html',search='',live=page!=='index.html'){
 const dom=new JSDOM(readFileSync(new URL(`../${page}`,import.meta.url),'utf8'),{url:`http://localhost/${search}`});windows.push(dom);
 const doc=dom.window.document;let clock=0;const cues:string[]=[];
 const trainer=mountTrainer(doc,{live,stage:doc.getElementById('stage')!,difficulty:()=>'medium',keyboard:()=>true,viewers:()=>0,liveTokenLoaded:()=>false,onCue:cue=>cues.push(cue),onAgain:vi.fn(),onExit:vi.fn(),now:()=>clock});
 return {dom,doc,trainer,cues,at:(ms:number)=>{clock=ms;}};
}
it('reads ?mode=trainer and defaults to Boss Fight',()=>{expect(initialMode('?mode=trainer')).toBe('trainer');expect(initialMode('')).toBe('boss');expect(initialMode('?mode=boss')).toBe('boss');});
it('adds a two-option mode choice on both setup screens',()=>{
 for(const page of ['index.html','play/index.html'] as const){const {doc,trainer}=mount(page);
  const buttons=[...doc.querySelectorAll<HTMLButtonElement>('[data-trainer-mode]')];expect(buttons.map(b=>b.textContent)).toEqual(['Boss FightChat votes attacks · you defend','Crowd TrainerChat calls combos · you throw them']);
  expect(trainer.selected).toBe(false);buttons[1]!.click();expect(trainer.selected).toBe(true);expect(doc.body.classList.contains('trainer-mode')).toBe(true);
  expect(doc.querySelector<HTMLElement>('.trainer-options')!.hidden).toBe(false);
 }
});
it('runs a keyboard workout: F is the left hand, J the right, and chips light in order',()=>{
 const {doc,dom,trainer,cues,at}=mount('play/index.html','?mode=trainer');expect(trainer.selected).toBe(true);
 trainer.start(0);expect(cues).toEqual(['round-start']);expect(doc.querySelector<HTMLElement>('.trainer-stage')!.hidden).toBe(false);
 expect(doc.querySelector('.trainer-badge')!.textContent).toBe('LIVE · YOUR TWITCH CHAT');
 trainer.chat({userId:'u1',text:'!12'},10);trainer.chat({userId:'u2',text:'!jab'},20);
 at(TRAINER.firstCallMs);trainer.tick(TRAINER.firstCallMs);expect(cues).toContain('combo-12');
 expect([...doc.querySelectorAll<HTMLElement>('.trainer-chip')].map(c=>c.dataset.mark)).toEqual(['next','']);
 at(TRAINER.firstCallMs+200);dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'KeyF'}));
 expect([...doc.querySelectorAll<HTMLElement>('.trainer-chip')].map(c=>c.dataset.mark)).toEqual(['hit','next']);
 // A keyboard J reaches the Boss Fight input path as a punch; Trainer ignores that copy.
 trainer.input({kind:'punch',side:'L',source:'keyboard',at:0},TRAINER.firstCallMs+300);expect(trainer.state!.stats.punchesL).toBe(1);
 at(TRAINER.firstCallMs+400);dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'KeyJ'}));
 expect(cues).toContain('clean');expect(doc.querySelector('.trainer-result')!.textContent).toBe('CLEAN!');
});
it('pauses on a control stop, stops on a mod !stop and shows the summary',()=>{
 const {doc,trainer,cues}=mount('play/index.html','?mode=trainer');trainer.start(0);
 trainer.input({kind:'control',action:'stop',by:'capture'},100);expect(trainer.paused).toBe(true);
 trainer.input({kind:'control',action:'resume',by:'capture'},200);expect(trainer.paused).toBe(false);
 trainer.chat({userId:'viewer',text:'!stop'},300);expect(trainer.running).toBe(true);
 trainer.chat({userId:'mod',text:'!stop',isMod:true},30_200);expect(trainer.running).toBe(false);expect(cues.at(-1)).toBe('workout-done');
 expect(doc.querySelector<HTMLElement>('.trainer-summary')!.hidden).toBe(false);
 expect(doc.querySelector('.trainer-summary dl')!.textContent).toContain('Active minutes0.5');
 trainer.exit();expect(doc.querySelector<HTMLElement>('.trainer-stage')!.hidden).toBe(true);
});
it('ignores trainer chat in Boss Fight mode',()=>{const {trainer}=mount('play/index.html');trainer.start(0);trainer.chat({userId:'u',text:'!12'},5);expect(trainer.state!.tally['12']).toBe(0);});
it('maps cues to existing sounds and lets a listener subscribe',()=>{
 expect(defaultCueSound('round-start')).toBe('fight');expect(defaultCueSound('combo-12')).toBe('telegraph');expect(defaultCueSound('workout-done')).toBe('ko');
 const heard:string[]=[];const off=onTrainerCue(cue=>heard.push(cue));const {trainer}=mount('index.html','?mode=trainer');trainer.start(0);off();trainer.stop(10);expect(heard).toEqual(['round-start']);
});
