import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {startHardeningStack,pause} from './hardening-stack';
import {matchIssues} from './soak-validation';
const args=process.argv.slice(2);
if(!args.includes('--mock')||!args.includes('--hardening'))throw new Error('Soak requires explicit --mock --hardening; no live transport is supported.');
const number=(name:string,fallback:number)=>{const index=args.indexOf(name);const value=index<0?fallback:Number(args[index+1]);if(!Number.isFinite(value)||value<=0)throw new Error(`Invalid${name}`);return value;};
const minutes=number('--minutes',30),duration=minutes*60000,warmup=Math.min(60000,duration*.5);
const output=args.includes('--out')?args[args.indexOf('--out')+1]!:join(tmpdir(),'streamer-soak.json');
const stack=await startHardeningStack();let stopped=false,errors=0,startedMatches=0,matches=0,rounds=0,baseline:number|null=null;
const samples:{at:number;heapUsed:number}[]=[];const start=Date.now();const invalidMatches:string[][]=[];
const onUnhandled=()=>{errors++;};const onSignal=()=>{stopped=true;};
process.on('unhandledRejection',onUnhandled);process.on('uncaughtExceptionMonitor',onUnhandled);
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,onSignal);
console.log(`[soak SIMULATED] real-wall ${minutes} minutes plus current-match drain; zero chatters/autopilot; warmup ${warmup/1000}s; ${new Date(start).toISOString()}`);
try{
 const initial=await stack.status();if(initial.gcAvailable!==true||initial.unhandledErrors!==0)throw new Error('Soak requires explicit GC and zero-error service telemetry');
 await stack.start();startedMatches++;
 let nextSample=start+warmup,nextProgress=start+60000;
 while(!stopped){
  const status=await stack.status(),elapsed=Date.now()-start;
  if(status.game?.matchWinner){
   const issues=matchIssues(status.game);if(issues.length)invalidMatches.push(issues);matches++;rounds+=status.game.roundResults?.length??0;
   if(elapsed>=duration)break;
   const initial=await stack.status();if(initial.gcAvailable!==true||initial.unhandledErrors!==0)throw new Error('Soak requires explicit GC and zero-error service telemetry');
 await stack.start();startedMatches++;
  }
  if(elapsed>duration+160000)throw new Error('Current match did not finish within bounded drain');
  if(Date.now()>=nextSample){const memory=await stack.gc(),heap=memory.memory?.heapUsed??memory.heapUsed;if(!Number.isFinite(heap))throw new Error('Server must expose real GC heap measurements');if(baseline===null)baseline=heap;samples.push({at:Date.now()-start,heapUsed:heap});nextSample=Date.now()+15000;}
  if(Date.now()>=nextProgress){console.log(`[soak SIMULATED] ${(elapsed/60000).toFixed(1)}min, ${matches} completed matches, ${samples.length} GC samples`);nextProgress+=60000;}
  await pause(250);
 }
 let status=await stack.status();const resultDeadline=Date.now()+12000;
 while(!stopped&&status.resultsSent<rounds&&Date.now()<resultDeadline){await pause(100);status=await stack.status();}
 const memory=await stack.gc(),heap=memory.memory?.heapUsed??memory.heapUsed;
 const finalGrowth=baseline?heap/baseline-1:Infinity,maxGrowth=baseline?Math.max(heap,...samples.map(sample=>sample.heapUsed))/baseline-1:Infinity;
 const serverErrors=status.unhandledErrors,resultCount=status.resultsSent??0;
 const pass=!stopped&&Date.now()-start>=duration&&maxGrowth<.20&&errors===0&&serverErrors===0&&matches>0&&startedMatches===matches&&invalidMatches.length===0&&resultCount===rounds;
 const report={simulated:true,pass,startedAt:new Date(start).toISOString(),requestedMinutes:minutes,wallMinutes:(Date.now()-start)/60000,warmupSeconds:warmup/1000,chatters:0,startedMatches,matches,rounds,resultsSent:resultCount,invalidMatches,heapBaseline:baseline,heapFinal:heap,heapGrowthFraction:finalGrowth,heapMaxGrowthFraction:maxGrowth,driverUnhandled:errors,serverUnhandled:serverErrors,samples,status};
 await writeFile(output,JSON.stringify(report,null,2));console.log(`[soak SIMULATED] ${pass?'PASS':'FAIL'} ${JSON.stringify({matches,resultsSent:resultCount,heapMaxGrowthFraction:maxGrowth,wallMinutes:report.wallMinutes,out:output})}`);if(!pass)process.exitCode=1;
}finally{
 process.removeListener('unhandledRejection',onUnhandled);process.removeListener('uncaughtExceptionMonitor',onUnhandled);for(const signal of ['SIGINT','SIGTERM'] as const)process.removeListener(signal,onSignal);await stack.close();
}
