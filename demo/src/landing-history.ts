/** Offline demo `/` only. Entering a fight, a workout or webcam setup pushes one history entry (same URL plus #play,
 * so ?mode= and other prefs params stay), so browser Back returns to the homepage hero instead of leaving the site.
 * Back mid-round pauses first and re-pushes the entry; Back again (or from results, a summary or webcam setup) goes home.
 * These are same-document entries, so the leave guard's beforeunload never fires for them. */
export const PLAY_ENTRY={svc:'play'} as const;
export type LandingHistoryOptions={
 /** The fight stage or webcam setup is showing (the hero is not). */away():boolean;
 /** A round, practice or workout is running and could be paused. */midFight():boolean;
 paused():boolean;pause():void;
 /** Same as Quit to setup / ← Back to fight setup. */home():void;
};
export function mountLandingHistory(win:Window,options:LandingHistoryOptions){
 const history=win.history,ours=()=>(history.state as {svc?:unknown}|null)?.svc===PLAY_ENTRY.svc;
 const base=()=>`${win.location.pathname}${win.location.search}`,push=()=>history.pushState({...PLAY_ENTRY},'',`${base()}#play`);
 // Waiting for our own history.back() after an in-page exit (Quit to setup, End fight, ← Back).
 let dropping=false;
 // A reload on #play starts on the hero: drop the stale marker so the first Back is not spent on it.
 if(ours())history.replaceState(null,'',base());
 function sync(){
  if(dropping)return;
  if(options.away()){if(!ours())push();}
  // Left in-page: step off our entry so the next Back leaves the site as normal.
  else if(ours()){dropping=true;history.back();}
 }
 win.addEventListener('popstate',()=>{
  if(dropping){dropping=false;sync();return;}
  if(ours()){sync();return;}
  if(!options.away())return;
  if(options.midFight()&&!options.paused()){options.pause();push();return;}
  options.home();
 });
 const observer=new (win as Window&typeof globalThis).MutationObserver(sync);observer.observe(win.document.body,{attributes:true,attributeFilter:['class']});
 return {sync,dispose(){observer.disconnect();}};
}
