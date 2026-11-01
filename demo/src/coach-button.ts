import type {HealthReader} from './hosted-health';
import type {BrowserAuth} from './twitch/auth';
import type {GameState} from '../../shared/src/engine';
import type {CoachView} from './corner-coach';
type Auth=Pick<BrowserAuth,'authenticated'|'backendRequest'>;
/** Allowed only while no attack can be coming: the round is over or the fight is paused. */
export const coachAllowed=(state:GameState|null)=>!!state&&(state.round.over||state.paused);
/** Shared button and session wiring for /play (signed in) and the offline demo (no login). */
function createCoachButtons(doc:Document,options:{note:string;allowed:()=>boolean;getState:()=>GameState|null;requestToken:(coach:typeof import('./corner-coach'))=>Promise<string>;tokenMessage?:(reason:'daily-cap'|'unavailable')=>string;failMessage?:string;onActive?:(active:boolean)=>void;load?:()=>Promise<typeof import('./corner-coach')>}){
 let controller:ReturnType<typeof import('./corner-coach').createCornerCoach>|null=null,loading=false,disposed=false,active=false;
 const hosts=()=>[...doc.querySelectorAll<HTMLElement>('.corner-coach')];
 function render(view:CoachView){
  const on=view.status!=='idle';if(on!==active){active=on;options.onActive?.(on);}
  for(const host of hosts()){const button=host.querySelector('button')!;button.setAttribute('aria-pressed',String(on));host.classList.toggle('coach-live',on);
   button.textContent=view.status==='connecting'?'Connecting… tap to cancel':view.status==='live'?`End corner talk · ${view.remainingS} s`:'Talk to your corner';
   host.querySelector('[data-coach-status]')!.textContent=view.message;}
 }
 async function toggle(){
  if(controller?.active){controller.end('Corner talk ended.');return;}
  if(loading||disposed)return;loading=true;
  try{
   if(!controller){const coach=await (options.load??(()=>import('./corner-coach')))();if(disposed)return;
    controller=coach.createCornerCoach({allowed:()=>!disposed&&options.allowed()&&coachAllowed(options.getState()),facts:()=>{const state=options.getState();return state?coach.coachFacts(state):null;},onChange:render,tokenMessage:options.tokenMessage,requestToken:()=>options.requestToken(coach)});}
   void controller.start();
  }catch{render({status:'idle',message:options.failMessage??'Your corner is unavailable right now. The fight is not affected.',remainingS:0});}
  finally{loading=false;}
 }
 function remove(){controller?.end();for(const host of hosts())host.remove();}
 return {
  mount(){
   if(disposed||hosts().length)return;
   for(const dialog of ['#round-results','#pause-screen']){const parent=doc.querySelector(dialog);if(!parent)continue;const host=doc.createElement('div');host.className='corner-coach';
    host.innerHTML='<button type="button" aria-pressed="false">Talk to your corner</button><p data-coach-status aria-live="polite"></p><small></small>';host.querySelector('small')!.textContent=options.note;
    host.querySelector('button')!.addEventListener('click',()=>{void toggle();});const anchor=parent.querySelector('[data-result-quit],[data-pause=quit]');if(anchor)anchor.before(host);else parent.append(host);}
  },
  /** Called on every game step: the session ends at once when the next round or resume starts. */
  observe(){controller?.check();},
  reset:remove,
  dispose(){disposed=true;remove();},
 };
}
/** /play only. No DOM until health.coach is on; the voice code loads on the first click. */
export function mountCornerCoach(doc:Document,options:{auth:Auth;getHealth:HealthReader;getState:()=>GameState|null;onActive?:(active:boolean)=>void;load?:()=>Promise<typeof import('./corner-coach')>}){
 const buttons=createCoachButtons(doc,{note:'Voice AI coach. Hears you, never chat. Max 60 s.',allowed:()=>options.auth.authenticated,getState:options.getState,onActive:options.onActive,load:options.load,
  requestToken:async coach=>{const response=await options.auth.backendRequest('/api/coach/token',{method:'POST'});if(response.status===429)throw new coach.CoachTokenError('daily-cap');const data=response.ok?await response.json().catch(()=>null):null;if(typeof data?.token!=='string')throw new coach.CoachTokenError('unavailable');return data.token;}});
 let disposed=false;
 return {
  async initialize(){let on=false;try{on=(await options.getHealth()).coach;}catch{/* Coach failures never block play. */}
   if(disposed)return;if(!on||!options.auth.authenticated){buttons.reset();return;}buttons.mount();
  },
  observe:buttons.observe,reset:buttons.reset,
  dispose(){disposed=true;buttons.dispose();},
 };
}
export const DEMO_COACH_RESTING='The corner coach is resting. Try it on /play or later.';
/** Offline demo (/). Shown at once, with no request at page load: the first click asks for the mic, then
 * POSTs /api/coach/demo-token (no login; per-IP and global caps). Any refusal shows a resting line. */
export function mountDemoCornerCoach(doc:Document,options:{getState:()=>GameState|null;onActive?:(active:boolean)=>void;fetch?:typeof fetch;load?:()=>Promise<typeof import('./corner-coach')>}){
 const buttons=createCoachButtons(doc,{note:'Real voice AI coach · 60 s · limited per day',allowed:()=>true,getState:options.getState,onActive:options.onActive,load:options.load,tokenMessage:()=>DEMO_COACH_RESTING,failMessage:DEMO_COACH_RESTING,
  requestToken:async coach=>{let response:Response;try{response=await (options.fetch??globalThis.fetch.bind(globalThis))('/api/coach/demo-token',{method:'POST'});}catch{throw new coach.CoachTokenError('unavailable');}
   if(response.status===429)throw new coach.CoachTokenError('daily-cap');const data=response.ok?await response.json().catch(()=>null):null;if(typeof data?.token!=='string')throw new coach.CoachTokenError('unavailable');return data.token;}});
 buttons.mount();
 return {observe:buttons.observe,reset:buttons.reset,dispose:buttons.dispose};
}
