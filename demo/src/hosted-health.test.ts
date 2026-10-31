import {describe,it,expect,vi} from 'vitest';
import {createHostedHealth} from './hosted-health';
import {createHostedResults} from './hosted-results';
import {createHostedClips} from './hosted-clips';
import {createHostedForge} from './hosted-forge';
import {createHostedMemory} from './hosted-memory';
describe('one hosted feature health snapshot',()=>{
 it('shares one request across all four observers and refreshes once after Connect',async()=>{
  const request=vi.fn(async()=>Response.json({bot:true,clips:true,forge:true,memory:true}));
  const health=createHostedHealth(request),auth={authenticated:false,account:null,request:vi.fn(),backendRequest:vi.fn()},onStatus=vi.fn();
  const features=[createHostedResults({auth,getHealth:health.get,onStatus}),createHostedClips({auth,getHealth:health.get,onStatus}),createHostedForge({auth,getHealth:health.get,onStatus,betweenRounds:()=>true,onAccepted:vi.fn(),onSnapshot:vi.fn(),balance:{gate:vi.fn(),tune:vi.fn(),cancel:vi.fn()}}),createHostedMemory({auth,getHealth:health.get,onStatus,getState:()=>null})];
  await Promise.all(features.map(feature=>feature.initialize()));expect(request).toHaveBeenCalledTimes(1);expect(features.every(feature=>feature.available)).toBe(true);
  await health.refresh();await Promise.all(features.map(feature=>feature.initialize()));expect(request).toHaveBeenCalledTimes(2);
  for(const feature of features)await feature.dispose();
 });
 it('caches a failed load until explicit connect refresh',async()=>{const request=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(Response.json({bot:true}));const health=createHostedHealth(request);expect((await health.get()).bot).toBe(false);expect((await health.get()).bot).toBe(false);expect(request).toHaveBeenCalledTimes(1);expect((await health.refresh()).bot).toBe(true);});
});
it('old in-flight callers join the refreshed generation instead of publishing stale capabilities',async()=>{
 const replies:Array<(value:Response)=>void>=[];
 const request=vi.fn<typeof fetch>(()=>new Promise(resolve=>replies.push(resolve)));
 const health=createHostedHealth(request),initial=health.get(),refreshed=health.refresh();
 expect(request).toHaveBeenCalledTimes(2);
 replies[1]!(Response.json({bot:true,clips:true,forge:true,memory:true}));
 expect((await refreshed).bot).toBe(true);
 replies[0]!(Response.json({bot:false,clips:false,forge:false,memory:false}));
 expect(await initial).toEqual(await refreshed);expect(await health.get()).toEqual(await refreshed);
 expect(request).toHaveBeenCalledTimes(2);
});
