import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';
import {defaultCueSound,initialMode,mountTrainer,onTrainerCue} from './trainer-ui';
import {TRAINER} from '../../shared/src/trainer';
import {createKeyboard} from '../../capture/src/keyboard';
const windows:JSDOM[]=[];
afterEach(()=>{for(const dom of windows)dom.window.close();windows.length=0;});
function mount(page:'index.html'|'play/index.html',search='',live=page!=='index.html',keyboard=true){
 const dom=new JSDOM(readFileSync(new URL(`../${page}`,import.meta.url),'utf8'),{url:`http://localhost/${search}`});windows.push(dom);
 const doc=dom.window.document;let clock=0;const cues:string[]=[];
 const trainer=mountTrainer(doc,{live,stage:doc.getElementById('stage')!,difficulty:()=>'medium',keyboard:()=>keyboard,viewers:()=>0,liveTokenLoaded:()=>false,onCue:cue=>cues.push(cue),onAgain:vi.fn(),onExit:vi.fn(),now:()=>clock});
 const key=(code:string,type:'keydown'|'keyup'='keydown')=>dom.window.dispatchEvent(new dom.window.KeyboardEvent(type,{code}));
 const skip=()=>doc.querySelector<HTMLButtonElement>('[data-t=practice-go]')!.click();
 return {dom,doc,trainer,cues,key,skip,at:(ms:number)=>{clock=ms;}};
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
 const {doc,dom,trainer,cues,at,skip}=mount('play/index.html','?mode=trainer');expect(trainer.selected).toBe(true);
 trainer.start(0);expect(cues).toEqual([]);skip();expect(cues).toEqual(['round-start']);expect(doc.querySelector<HTMLElement>('.trainer-stage')!.hidden).toBe(false);
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
 const {doc,trainer,cues,skip}=mount('play/index.html','?mode=trainer');trainer.start(0);skip();
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
 const heard:string[]=[];const off=onTrainerCue(cue=>heard.push(cue));const {trainer,skip}=mount('index.html','?mode=trainer');trainer.start(0);skip();off();trainer.stop(10);expect(heard).toEqual(['round-start']);
});
const chipMarks=(doc:Document)=>[...doc.querySelectorAll<HTMLElement>('.trainer-chip')].map(c=>c.dataset.mark);
/** Starts a keyboard workout past the keys card and calls `combo` (one vote) at the first call. */
function called(combo:string,southpaw=false){
 const m=mount('index.html','?mode=trainer');if(southpaw){const box=m.doc.querySelector<HTMLInputElement>('[data-trainer-option=southpaw]')!;box.checked=true;box.dispatchEvent(new m.dom.window.Event('change'));}
 m.trainer.start(0);m.skip();m.trainer.chat({userId:'u',text:combo},10);m.at(TRAINER.firstCallMs);m.trainer.tick(TRAINER.firstCallMs);return m;
}
it('accepts 1, 2, S and G as well as F, J, A/D and K in Crowd Trainer',()=>{
 const m=called('!12s');m.at(TRAINER.firstCallMs+100);m.key('Digit1');m.key('Numpad2');expect(chipMarks(m.doc)).toEqual(['hit','hit','next']);
 m.at(TRAINER.firstCallMs+200);m.key('KeyS');expect(m.cues).toContain('clean');expect(m.trainer.state!.stats.slips).toBe(1);
 const g=called('!12g');g.at(TRAINER.firstCallMs+100);g.key('KeyF');g.key('KeyJ');g.key('KeyG');
 // G is held like K: it fills the token after 0.5 s, and letting go drops the guard.
 g.at(TRAINER.firstCallMs+100+TRAINER.guardHoldMs);g.trainer.tick(TRAINER.firstCallMs+100+TRAINER.guardHoldMs);expect(g.cues).toContain('clean');
 g.key('KeyG','keyup');expect(g.trainer.state!.pose.guard).toBe(false);
 // A K pose while G is held keeps the guard up.
 g.key('KeyG');g.trainer.input({kind:'pose',guard:false,lean:'L',source:'keyboard',at:0},TRAINER.firstCallMs+700);expect(g.trainer.state!.pose.guard).toBe(true);
});
it('keeps 1 on the lead hand for Southpaw: 1 and J throw the right hand',()=>{
 const m=called('!12',true);m.at(TRAINER.firstCallMs+100);m.key('Digit1');expect(m.trainer.state!.stats.punchesR).toBe(1);expect(chipMarks(m.doc)).toEqual(['hit','next']);
 m.key('KeyF');expect(m.trainer.state!.stats.punchesL).toBe(1);expect(m.cues).toContain('clean');
 expect(m.doc.querySelector('.trainer-keys')!.textContent).toBe('1/J lead · 2/F rear · S/A/D slip · G/K guard · Esc pause');
 expect([...m.doc.querySelectorAll('.trainer-chip i')].map(i=>i.textContent)).toEqual(['1 / J','2 / F']);
});
it('shows the key under each chip and the full key strip',()=>{
 const m=called('!12s');expect([...m.doc.querySelectorAll('.trainer-chip i')].map(i=>i.textContent)).toEqual(['1 / F','2 / J','S / A·D']);
 expect(m.doc.querySelector('.trainer-keys')!.textContent).toBe('1/F lead · 2/J rear · S/A/D slip · G/K guard · Esc pause');
});
it('ignores the new keys in text inputs and outside a workout (Boss Fight keeps K, A, D, J)',()=>{
 const m=called('!12');const input=m.doc.createElement('input');m.doc.body.append(input);
 input.dispatchEvent(new m.dom.window.KeyboardEvent('keydown',{code:'Digit1',bubbles:true}));expect(chipMarks(m.doc)).toEqual(['next','']);
 // Boss Fight: no workout runs, so the Trainer handler stays out, and the Boss Fight keyboard ignores the new keys.
 const boss=mount('index.html'),emitted:unknown[]=[],keyboard=createKeyboard({emit:event=>emitted.push(event),target:boss.dom.window,now:()=>0});keyboard.setEnabled(true);emitted.length=0;
 for(const code of ['Digit1','Digit2','Numpad1','KeyS','KeyG']){const event=new boss.dom.window.KeyboardEvent('keydown',{code,cancelable:true});boss.dom.window.dispatchEvent(event);expect(event.defaultPrevented).toBe(false);}
 expect(emitted).toEqual([]);for(const code of ['KeyK','KeyA','KeyJ'])boss.key(code);expect(emitted.length).toBe(3);keyboard.dispose();
 const idle=mount('index.html','?mode=trainer');const event=new idle.dom.window.KeyboardEvent('keydown',{code:'Digit1',cancelable:true});idle.dom.window.dispatchEvent(event);expect(event.defaultPrevented).toBe(false);
});
it('holds the clock and chat behind the keys card until each move is pressed once',()=>{
 const m=mount('index.html','?mode=trainer');m.trainer.start(0);const card=m.doc.querySelector<HTMLElement>('.trainer-practice')!;
 expect(card.hidden).toBe(false);expect(m.trainer.practising).toBe(true);expect(m.doc.querySelector('.trainer-stage')!.getAttribute('data-phase')).toBe('practice');
 expect([...card.querySelectorAll('li')].map(li=>li.textContent)).toEqual(['1lead punchpress 1 or F','2cross (rear hand)press 2 or J','Sslippress S, A or D','Gguardhold G or K']);
 expect(card.textContent).toContain('Chat calls combos like 1-2-slip. Throw them in order.');expect(card.querySelector('button')!.textContent).toBe('Skip');
 m.trainer.chat({userId:'u',text:'!12'},50);m.at(10_000);m.trainer.tick(10_000);expect(m.cues).toEqual([]);expect(m.trainer.state!.combo).toBeNull();expect(m.trainer.state!.tally['12']).toBe(0);
 m.key('Digit1');m.key('KeyJ');m.trainer.input({kind:'pose',guard:false,lean:'R',source:'keyboard',at:0},10_000);
 expect([...card.querySelectorAll('li.done')].map(li=>li.getAttribute('data-token'))).toEqual(['1','2','S']);expect(card.textContent).toContain('3 of 4');expect(m.trainer.state!.stats.punchesL).toBe(0);
 m.at(12_000);m.key('KeyG');expect(card.hidden).toBe(true);expect(m.cues).toEqual(['round-start']);
 // The clock starts at the last practice move, not at start().
 expect(m.trainer.state!.phaseEndsAt).toBe(12_000+TRAINER.workMs);m.key('KeyG','keyup');
 m.at(12_000+TRAINER.firstCallMs);m.trainer.tick(12_000+TRAINER.firstCallMs);expect(m.trainer.state!.combo).not.toBeNull();
});
it('Skip starts the workout at once; pausing on the card holds it; a mod !stop ends with zero active time',()=>{
 const m=mount('index.html','?mode=trainer');m.trainer.start(0);
 m.trainer.input({kind:'control',action:'stop',by:'capture'},100);expect(m.trainer.paused).toBe(true);m.key('KeyF');expect(m.doc.querySelectorAll('.trainer-practice li.done')).toHaveLength(0);
 m.skip();expect(m.trainer.practising).toBe(true);
 m.trainer.input({kind:'control',action:'resume',by:'capture'},200);expect(m.trainer.paused).toBe(false);
 m.at(3_000);m.skip();expect(m.trainer.practising).toBe(false);expect(m.trainer.state!.phaseEndsAt).toBe(3_000+TRAINER.workMs);
 const s=mount('play/index.html','?mode=trainer');s.trainer.start(0);s.trainer.chat({userId:'mod',text:'!stop',isMod:true},30_000);expect(s.trainer.running).toBe(false);expect(s.cues).toEqual(['workout-done']);
 expect(s.doc.querySelector('.trainer-summary dl')!.textContent).toContain('Active minutes0.0');
});
it('webcam shows the body moves and an I’m ready button, with Southpaw hand wording',()=>{
 const m=mount('index.html','?mode=trainer',false,false);const box=m.doc.querySelector<HTMLInputElement>('[data-trainer-option=southpaw]')!;box.checked=true;box.dispatchEvent(new m.dom.window.Event('change'));
 m.trainer.start(0);const card=m.doc.querySelector<HTMLElement>('.trainer-practice')!;
 expect(card.querySelector('button')!.textContent).toBe('I’m ready');expect(card.textContent).toContain('YOUR MOVES');
 expect([...card.querySelectorAll('li')].map(li=>li.textContent)).toEqual(['1jabwith your lead hand (right)','2crosswith your rear hand (left)','Ssliplean either way','Gguardfists up to your face and hold']);
 // No forced practice: moves do not start it, and keyboard keys do nothing on webcam.
 m.trainer.move({kind:'punch',side:'R'},100);m.key('KeyF');expect(m.trainer.practising).toBe(true);expect(m.trainer.state!.stats.punchesR).toBe(0);
 m.at(500);card.querySelector('button')!.click();expect(m.trainer.practising).toBe(false);expect(m.cues).toEqual(['round-start']);
 m.at(TRAINER.firstCallMs+500);m.trainer.tick(TRAINER.firstCallMs+500);expect([...m.doc.querySelectorAll('.trainer-chip i')].map(i=>i.textContent).length).toBeGreaterThan(0);
 for(const hint of m.doc.querySelectorAll('.trainer-chip i'))expect(['jab','cross','lean','fists up']).toContain(hint.textContent);
});
it('webcam: holding a guard for 1 s also counts as ready',()=>{
 const m=mount('index.html','?mode=trainer',false,false);m.trainer.start(0);
 m.trainer.input({kind:'pose',guard:true,lean:null,source:'pose',at:0},100);m.trainer.tick(900);expect(m.trainer.practising).toBe(true);
 m.trainer.tick(1_100);expect(m.trainer.practising).toBe(false);expect(m.trainer.state!.phaseEndsAt).toBe(1_100+TRAINER.workMs);
});
