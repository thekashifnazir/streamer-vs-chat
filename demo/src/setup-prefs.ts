import {cleanPrefs,defaultPrefs,PREF_FIELDS,PREFS_PREFIX,urlPrefs,type Prefs,type PrefsStore} from './prefs';
type Control={id:string;key:'input'|'posture'|'noPunch'|'crowd'|'southpaw'|'anyHand'|'skeleton'};
// Input goes last so its webcam → Easy default sees whether a level was already restored.
const CONTROLS:Control[]=[{id:'posture',key:'posture'},{id:'no-punch',key:'noPunch'},{id:'crowd-size',key:'crowd'},{id:'trainer-southpaw',key:'southpaw'},{id:'trainer-any-hand',key:'anyHand'},{id:'show-skeleton',key:'skeleton'},{id:'input-source',key:'input'}];
// A ?mode= link also holds for this tab (sessionStorage), so Crowd Trainer survives the Twitch login round trip on /play.
export const VISIT_MODE_KEY=`${PREFS_PREFIX}visit-mode`;
/** Loads saved setup choices into the existing controls, saves later changes, and adds a Reset settings link. URL values win for the visit. */
export function bindSetupPrefs(doc:Document,options:{store:PrefsStore;search:string;/** Page defaults under anything saved, e.g. the landing's webcam-first input on a computer. */defaults?:Partial<Prefs>;setup:{readonly difficultyByHand:boolean;resetDifficulty():void};sound?:{get():boolean;set(on:boolean):void;target:EventTarget};plain?:HTMLInputElement|null;visit?:()=>Storage|null|undefined}){
 const {store,setup,sound,plain}=options,Event=doc.defaultView!.Event;
 const get=<T extends HTMLElement>(id:string)=>doc.getElementById(id) as T|null;
 const read=(control:Control):Prefs[Control['key']]|undefined=>{const element=get<HTMLInputElement&HTMLSelectElement>(control.id);if(!element)return undefined;return typeof PREF_FIELDS[control.key].fallback==='boolean'?element.checked:control.key==='crowd'?Number(element.value) as Prefs['crowd']:element.value as Prefs['input'];};
 // Programmatic changes go through the controls' own change listeners; saving is off while they run.
 let applying=false;
 // Game mode lives on trainer-ui's buttons; a click there is refused while a workout runs, so the pressed button is the truth.
 const mode=()=>doc.querySelector<HTMLElement>('[data-trainer-mode][aria-pressed=true]')?.dataset.trainerMode as Prefs['mode']|undefined;
 const forgetVisit=()=>{try{options.visit?.()?.removeItem(VISIT_MODE_KEY);}catch{/* Nothing held for this tab. */}};
 const set=(id:string,value:string|boolean,always=false)=>{const element=get<HTMLInputElement&HTMLSelectElement>(id);if(!element)return;if(typeof value==='boolean'){if(element.checked===value)return;element.checked=value;}else{if(element.value===value&&!always||![...(element.options??[])].some(option=>option.value===value))return;element.value=value;}element.dispatchEvent(new Event('change'));};
 function apply(prefs:Prefs){
  applying=true;
  try{
   // Always fire: a saved Medium must still count as picked by hand, or webcam would swap it for Easy.
   if(prefs.difficulty)set('start-difficulty',prefs.difficulty,true);
   if(mode()&&mode()!==prefs.mode)doc.querySelector<HTMLButtonElement>(`[data-trainer-mode="${prefs.mode}"]`)?.click();
   for(const control of CONTROLS)set(control.id,typeof prefs[control.key]==='boolean'?prefs[control.key] as boolean:String(prefs[control.key]));
   if(sound&&sound.get()!==prefs.sound)sound.set(prefs.sound);
   // The offline demo hides PLAIN, so a choice saved on /play never restyles it there.
   if(plain&&!plain.closest('label')?.hidden&&plain.checked!==prefs.plain){plain.checked=prefs.plain;plain.dispatchEvent(new Event('change'));}
  }finally{applying=false;}
 }
 const url=urlPrefs(options.search);let visit:Partial<Prefs>={};
 try{const session=options.visit?.();if(url.mode)session?.setItem(VISIT_MODE_KEY,url.mode);else visit=cleanPrefs({mode:session?.getItem(VISIT_MODE_KEY)});}catch{/* Blocked session storage: the link holds until the next page load. */}
 apply({...defaultPrefs(),...cleanPrefs(options.defaults),...store.stored(),...visit,...url});
 const save=(patch:Partial<Prefs>)=>{if(!applying)store.save(patch);};
 for(const control of CONTROLS)get(control.id)?.addEventListener('change',()=>{const value=read(control);if(value!==undefined)save({[control.key]:value});});
 // Clicking the already-selected level still counts as a choice, but fires no change event.
 const saveDifficulty=()=>{if(setup.difficultyByHand)save({difficulty:get<HTMLSelectElement>('start-difficulty')!.value as Prefs['difficulty']});};
 get('start-difficulty')?.addEventListener('change',saveDifficulty);
 for(const button of doc.querySelectorAll('[data-option-for=start-difficulty]'))button.addEventListener('click',saveDifficulty);
 // A picked mode replaces any ?mode= link held for this tab.
 for(const button of doc.querySelectorAll('[data-trainer-mode]'))button.addEventListener('click',()=>{const picked=mode();if(applying||!picked)return;save({mode:picked});forgetVisit();});
 sound?.target.addEventListener('rails-sound-change',()=>save({sound:sound.get()}));
 plain?.addEventListener('change',()=>save({plain:plain.checked}));
 const more=get('demo-more-options')??get('play-more-options');
 const row=doc.createElement('p');row.className='reset-settings-row';row.innerHTML='<button id="reset-settings" type="button" class="text-button">Reset settings</button> <span role="status"></span>';
 more?.append(row);
 row.querySelector('button')!.addEventListener('click',()=>{
  // Keyboard/webcam stays as it is so a running camera is not switched off; the next visit starts on the page default.
  store.reset();forgetVisit();const defaults=defaultPrefs();apply({...defaults,input:(read(CONTROLS.at(-1)!) as Prefs['input']|undefined)??defaults.input});setup.resetDifficulty();
  row.querySelector('[role=status]')!.textContent='Settings reset.';
 });
 return {reset:()=>row.querySelector('button')!.click()};
}
