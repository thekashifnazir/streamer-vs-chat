import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {startHardeningStack,pause} from './hardening-stack';
import {ChatLoadSchedule,LoadAudit} from './load-model';
import {RequestQueue} from './request-queue';
const args=process.argv.slice(2);if(!args.includes('--mock')||!args.includes('--hardening'))throw new Error('Load requires explicit --mock --hardening; no live transport supported.');
const value=(name:string,fallback:number)=>{const i=args.indexOf(name),n=i<0?fallback:Number(args[i+1]);if(!Number.isFinite(n)||n<=0)throw new Error(`Invalid${name}`);return n;};
const seconds=value('--seconds',30),chatters=value('--chatters',1000),output=args.includes('--out')?args[args.indexOf('--out')+1]!:join(tmpdir(),'streamer-load.json');
if(seconds>30)throw new Error('Strict load is bounded to30s so held guard guarantees one active round with no discarded votes.');
if(!Number.isInteger(chatters))throw new Error('Chatters must be an integer');
const stack=await startHardeningStack(),audit=new LoadAudit();let state:any=null,lastTally:any=null,runId=0,runStartedAt=Infinity,lastBurst='',sent=0,failed=0,burstMax=0,stopped=false;const queue=new RequestQueue(32),ids=new Set<string>(),failureCategories:Record<string,number>={};
const failure=(category:string)=>{failed++;failureCategories[category]=(failureCategories[category]??0)+1;};
let guardTimer:ReturnType<typeof setInterval>|undefined;
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{stopped=true;});
stack.ws.on('message',raw=>{try{const message=JSON.parse(String(raw));audit.receive(message.hardening,Date.now());if(message.kind==='tally')lastTally=message;if(message.kind==='tick'){state=message.state;if(state.clock.started_at>=runStartedAt)audit.snapshot(runId,state,lastTally?.hardening?.emittedAt===message.hardening?.emittedAt?lastTally:undefined);}}catch{failure('hud-frame');}});
try{
 runStartedAt=Date.now();const started=await stack.start(chatters);runId=started.game.runId;const guard=()=>stack.ws.send(JSON.stringify({kind:'pose',guard:true,lean:null,source:'keyboard',at:Date.now()}));guard();guardTimer=setInterval(guard,250);const start=Date.now(),schedule=new ChatLoadSchedule(chatters,2026,0);
 console.log(`[load SIMULATED] ${chatters} chatters, ${seconds}s,1–4s intervals; rescheduled burst≤300 per beat;${new Date(start).toISOString()}`);
 let nextStatus=start,activeMs=0,lastLoop=start,wasActive=false;
 while(!stopped&&Date.now()-start<seconds*1000){const now=Date.now();
  if(now>=nextStatus){const status=await stack.status();if(status.game.matchWinner||status.game.roundOver)throw new Error('Strict load unexpectedly ended its round');nextStatus=now+250;}
  const active=!!state&&state.clock.started_at>=runStartedAt&&!state.round.over&&!state.paused;if(active&&wasActive)activeMs+=now-lastLoop;lastLoop=now;wasActive=active;
  if(active){const key=`${runId}:${state.round.number}:${state.clock.beat}`;if(key!==lastBurst){burstMax=Math.max(burstMax,schedule.burst(activeMs,300));lastBurst=key;}
   for(const message of schedule.due(activeMs)){const id=`load-${++sent}`;ids.add(id);queue.add(async()=>{try{const response=await fetch('http://127.0.0.1:8081/inject',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...message,id}),signal:AbortSignal.timeout(5000)});const result=await response.json();if(!response.ok)failure(`http-${response.status}`);else if(result.delivered!==1)failure('delivery-count');}catch(error){const code=(error as {cause?:{code?:unknown};name?:unknown})?.cause?.code??(error as {name?:unknown})?.name;failure(['ECONNRESET','ECONNREFUSED','EMFILE','ENFILE','UND_ERR_SOCKET','TimeoutError','AbortError','TypeError','SyntaxError'].includes(String(code))?String(code):'request-error');}});}
  }
  await pause(20);
 }
 await queue.idle();await pause(350);const status=await stack.status();if(state&&state.clock.started_at>=runStartedAt)audit.snapshot(runId,state,lastTally);audit.assertPendingBeat(runId,state);
 const missing=[...ids].filter(id=>!audit.seen.has(id)).length,unexpected=[...audit.seen].filter(id=>!ids.has(id)).length;
 const pass=!stopped&&queue.errors.length===0&&failed===0&&missing===0&&unexpected===0&&status.ingested===sent&&status.countedVoteEvents===sent&&audit.counted===sent&&audit.ignored===0&&audit.terminalEvents===0&&audit.issues.length===0&&audit.counted===audit.drawnEvents+audit.terminalEvents+audit.pendingEvents()&&audit.snapshots>0&&!status.overflow&&status.unhandledErrors===0&&audit.p95()<250&&Math.max(status.drift.maxMs,audit.maxDrift)<50&&audit.beats.size>0;
 const report={simulated:true,pass,startedAt:new Date(start).toISOString(),wallSeconds:(Date.now()-start)/1000,chatters,sent,received:audit.seen.size,countedVoteEvents:audit.counted,auditedDrawnVoteEvents:audit.drawnEvents,acceptedThenRoundEnded:audit.terminalEvents,currentBeatAcceptedEvents:audit.pendingEvents(),auditedHudSnapshots:audit.snapshots,streamerInput:'held guard, keyboard protocol heartbeat250ms; no punch/lean',activeVotingSeconds:activeMs/1000,intervalSemantics:'1–4 seconds of eligible active voting time; round intermissions excluded',classifiedOutsideRound:audit.ignored,failedRequests:failed,failureCategories,queueErrors:queue.errors.length,injectionConcurrency:queue.concurrency,maxConcurrentRequests:queue.maxActive,maxQueuedRequests:queue.maxQueued,missing,unexpected,p50IngestToHudWsMs:audit.percentile(.5),p95IngestToHudWsMs:audit.p95(),p99IngestToHudWsMs:audit.percentile(.99),maxBeatDriftMs:Math.max(status.drift.maxMs,audit.maxDrift),auditedBeats:audit.beats.size,burstMax,issues:audit.issues,status};
 await writeFile(output,JSON.stringify(report,null,2));console.log(`[load SIMULATED] ${pass?'PASS':'FAIL'} ${JSON.stringify({...report,status:undefined,out:output})}`);if(!pass)process.exitCode=1;
}finally{if(guardTimer)clearInterval(guardTimer);await stack.close();}
