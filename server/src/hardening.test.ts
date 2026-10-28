import{expect,it}from'vitest';
import{createGame,step}from'../../shared/src/engine';
import{HardeningTelemetry}from'./hardening';
it('keeps per-message receipt/sequence evidence, audits consumed latest votes, and drains only explicitly',()=>{
 const telemetry=new HardeningTelemetry();let state=createGame();
 for(const [seq,move]of [[1,'JAB'],[2,'HOOK_L']] as const){state=step(state,{kind:'vote',user:'same',move,at:seq,simulated:true},seq);telemetry.message({user:'same',text:move==='JAB'?'!jab':'!hookl',messageId:`m${seq}`,simulated:true,role:'viewer'},state,1,seq);}
 const previous=state;state=step(state,{kind:'advance'},2400);telemetry.state(previous,state,1,2412);expect(telemetry.snapshot().receipts.map(item=>item.seq)).toEqual([1,2]);
 expect(telemetry.snapshot(true).beats).toMatchObject([{beat:0,at:2400,observedAt:2412,votes:{same:'HOOK_L'},acceptedEvents:2}]);expect(telemetry.snapshot().receipts).toEqual([]);expect(telemetry.status()).toMatchObject({ingested:2,countedVoteEvents:2,drift:{maxMs:12},unhandledErrors:0});
});
