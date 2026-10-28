import{expect,it}from'vitest';
import{createGame,step,type GameState}from'../../shared/src/engine';
import{summarizeSession}from'../../shared/src/highlights';
import{SessionArchive}from'./session-archive';
it('matches full-state session reference across100matches including ties, interruptedCOMBO, reactions, durations and top3',()=>{
 const states:GameState[]=[],archive=new SessionArchive();
 for(let i=0;i<100;i++){
  let state=createGame({now:i*100000,moves:[i%2?'JAB':'COMBO']});const start=state.now;
  state=step(state,{kind:'vote-batch',votes:['a','b',`viewer${i%5}`].map(user=>({kind:'vote',user,move:i%2?'JAB':'COMBO',at:start,simulated:true}))},start);
  if(i%3===0)state=step(state,{kind:'pose',guard:true,lean:null,source:'keyboard',at:start+2900},start+2900);
  state=step(state,{kind:'advance'},start+3200);
  if(i%2===0&&i%3!==0)state=step(state,{kind:'control',action:'veto',by:'mod'},start+3300);
  else state=step(state,{kind:'advance'},start+3500);
  states.push(state);expect(archive.summary(state,i+1)).toEqual(summarizeSession(states));archive.add(state,i+1);
 }
 expect(archive.matches).toBe(100);expect(archive.retainedStates).toBe(0);expect(archive.identities).toBeLessThanOrEqual(7);
});
