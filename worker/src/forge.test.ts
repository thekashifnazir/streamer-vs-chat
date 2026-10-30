import {describe,it,expect,vi} from 'vitest';
import {ForgeCaps,repairDigest,type CapStorage} from './forge-caps';
import {HostedForgeService,safeForgeResponse} from './forge-service';
import {validateForgeRespond,validateModeration} from './forge-validation';
import type {ForgeClient} from '../../shared/src/forge-client';
import {forgeResponseRequest,forgeModerationRequest} from '../../shared/src/forge-request';
class Store implements CapStorage {
 data=new Map<string,unknown>();tail:Promise<unknown>=Promise.resolve();
 transaction<T>(work:(storage:{get<T>(key:string):Promise<T|undefined>;put<T>(key:string,value:T):Promise<unknown>})=>Promise<T>):Promise<T>{
  const operation=this.tail.then(()=>work({get:async<T>(key:string)=>structuredClone(this.data.get(key)) as T|undefined,put:async<T>(key:string,value:T)=>{this.data.set(key,structuredClone(value));}}));this.tail=operation.catch(()=>{});return operation;
 }
}
function setup(){let now=Date.UTC(2026,9,30,23,59);let enabled=true,configured=true;
 const store=new Store(),caps=new ForgeCaps(store,()=>now),global=new ForgeCaps(new Store(),()=>now);
 const responses=vi.fn<ForgeClient['responses']['create']>(async()=>({id:'response',status:'completed',output_text:'{"name":"Fictional"}',usage:{input_tokens:100,output_tokens:20}}));
 const moderations=vi.fn<ForgeClient['moderations']['create']>(async body=>({results:body.input.map(()=>({flagged:false}))}));
 const reserveGlobal=vi.fn(async()=>{try{await global.reserveGlobal();return {ok:true as const,value:null};}catch{return {ok:false as const,reason:'daily-cap' as const};}});
 const service=new HostedForgeService({caps,enabled:()=>enabled,configured:()=>configured,client:()=>({responses:{create:responses},moderations:{create:moderations}}),reserveGlobal});
 return {store,caps,global,service,responses,moderations,reserveGlobal,time:(value:number)=>{now=value;},off:()=>{enabled=false;},unconfigured:()=>{configured=false;}};
}
describe('hosted Forge validation and server-built requests',()=>{
 it('bounds body fields and rejects model/prompt/schema overrides',()=>{
  expect(validateModeration({input:['x'.repeat(8000)]})).not.toBeNull();expect(validateModeration({input:['']})).toEqual({input:['']});expect(validateModeration({input:['x'.repeat(8000),'x']})).toBeNull();expect(validateModeration({input:Array(21).fill('x')})).toBeNull();expect(validateModeration({input:['x'],model:'other'})).toBeNull();
  expect(validateForgeRespond({idea:'x'.repeat(300),repair:{previous:'x'.repeat(32768),errors:Array(20).fill('x'.repeat(200))}})).not.toBeNull();
  for(const body of [{idea:'x'.repeat(301)},{idea:'x',model:'other'},{idea:'x',prompt:'override'},{idea:'x',schema:{}},{idea:'x',repair:{previous:'x',errors:['x'],extra:1}},{idea:'x',repair:{previous:'x'.repeat(32769),errors:['x']}},{idea:'x',repair:{previous:'x',errors:Array(21).fill('x')}},{idea:'x',repair:{previous:'x',errors:['x'.repeat(201)]}}])expect(validateForgeRespond(body)).toBeNull();
 });
 it('constructs only exact shared request bodies and strips unused upstream fields',async()=>{
  const s=setup();await s.service.moderate('123',['idea']);const result=await s.service.respond('123',{idea:'fiction'});
  expect(s.moderations.mock.calls[0]?.[0]).toEqual(forgeModerationRequest(['idea']));expect(s.responses.mock.calls[0]?.[0]).toEqual(forgeResponseRequest('fiction'));expect(result.ok).toBe(true);
  const projected=safeForgeResponse({id:'unused-upstream-id',output_text:'{}',output:[{type:'message',content:[{type:'output_text',text:'{}'}]}],usage:{input_tokens:1},...{secret:'private'}});expect(projected).not.toHaveProperty('secret');expect(projected).not.toHaveProperty('id');expect(projected.output?.[0]).not.toHaveProperty('type');
 });
});
describe('durable UTC Forge caps and single-use repair receipts',()=>{
 it('permits five generations and one matching repair per generation without charging another generation',async()=>{
  const s=setup();const first=await s.service.respond('123',{idea:'fiction'});expect(first.ok).toBe(true);
  const repaired=await s.service.respond('123',{idea:'fiction',repair:{previous:'{"name":"Fictional"}',errors:['missing moves']}});expect(repaired.ok).toBe(true);expect(s.reserveGlobal).toHaveBeenCalledTimes(1);
  expect(await s.service.respond('123',{idea:'fiction',repair:{previous:'{"name":"Fictional"}',errors:['again']}})).toEqual({ok:false,reason:'invalid-repair'});
  for(let i=0;i<4;i++)expect((await s.service.respond('123',{idea:`idea${i}`})).ok).toBe(true);
  expect(await s.service.respond('123',{idea:'six'})).toEqual({ok:false,reason:'daily-cap'});expect(s.responses).toHaveBeenCalledTimes(6);
  const saved=JSON.stringify([...s.store.data]);expect(saved).not.toContain('fiction');expect(saved).not.toContain('Fictional');
 });
 it('rejects arbitrary/mismatched prior output or idea and prevents concurrent duplicate repairs',async()=>{
  const s=setup();await s.service.respond('123',{idea:'original'});
  for(const body of [{idea:'other',repair:{previous:'{"name":"Fictional"}',errors:['x']}},{idea:'original',repair:{previous:'invented',errors:['x']}}])expect(await s.service.respond('123',body)).toEqual({ok:false,reason:'invalid-repair'});
  const results=await Promise.all([s.service.respond('123',{idea:'original',repair:{previous:'{"name":"Fictional"}',errors:['x']}}),s.service.respond('123',{idea:'original',repair:{previous:'{"name":"Fictional"}',errors:['x']}})]);
  expect(results.filter(result=>result.ok)).toHaveLength(1);expect(s.responses).toHaveBeenCalledTimes(2);
 });
 it('atomically caps concurrent moderation and global generations and resets at UTC midnight',async()=>{
  const s=setup();const moderation=await Promise.all(Array.from({length:205},()=>s.service.moderate('123',['x'])));expect(moderation.filter(result=>result.ok)).toHaveLength(200);expect(s.moderations).toHaveBeenCalledTimes(200);
  const global=await Promise.allSettled(Array.from({length:110},()=>s.global.reserveGlobal()));expect(global.filter(result=>result.status==='fulfilled')).toHaveLength(100);
  s.time(Date.UTC(2026,9,31));expect((await s.service.moderate('123',['x'])).ok).toBe(true);await expect(s.global.reserveGlobal()).resolves.toBeUndefined();
 });
 it('persists initial leases, allows recovery after expiry, ignores stale completions and invalidates old-day repairs',async()=>{
  const s=setup();const first=await s.caps.reserveInitial('123');await expect(s.caps.reserveInitial('123')).rejects.toThrow('generation-busy');
  s.time(Date.UTC(2026,9,30,23,59,59));await expect(s.caps.reserveInitial('123')).rejects.toThrow('generation-busy');
  s.time(Date.UTC(2026,9,31));const second=await s.caps.reserveInitial('123');await s.caps.finish('123',first,await repairDigest('x','old'));await expect(s.caps.reserveInitial('123')).rejects.toThrow('generation-busy');
  await s.caps.finish('123',second);await expect(s.caps.reserveRepair('123',await repairDigest('x','old'))).rejects.toThrow('invalid-repair');
 });
 it('fails closed before quota or fetch when off or missing a key; upstream failures are safe and spent attempts stay spent',async()=>{
  const off=setup();off.off();expect(await off.service.respond('123',{idea:'private'})).toEqual({ok:false,reason:'feature-off'});expect(off.store.data.size).toBe(0);
  const missing=setup();missing.unconfigured();expect(await missing.service.moderate('123',['private'])).toEqual({ok:false,reason:'unavailable'});expect(missing.store.data.size).toBe(0);
  const failed=setup();failed.responses.mockRejectedValue(new Error('private upstream text'));expect(await failed.service.respond('123',{idea:'private'})).toEqual({ok:false,reason:'unavailable'});expect((await failed.caps.reserveInitial('123')).lease).toContain(':initial:2');
 });
});

it('uses manual redirects, a fixed OpenAI endpoint and bounded signals with the Worker client',async()=>{
 const {createOpenAIForgeClient}=await import('../../server/src/forge-client');
 const fetcher=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{expect(String(input)).toBe('https://api.openai.com/v1/responses');expect(init?.redirect).toBe('manual');expect(init?.signal).toBeInstanceOf(AbortSignal);expect(JSON.parse(String(init?.body))).toEqual(forgeResponseRequest('fiction'));return Response.json({output_text:'{}'});});
 const client=createOpenAIForgeClient({apiKey:'fake-key',mode:'mock',fetcher,redirect:'manual'});expect(await client.responses.create(forgeResponseRequest('fiction'),{signal:AbortSignal.timeout(30000)})).toEqual({output_text:'{}'});
 for(const status of [300,301,302,303,307,308]){fetcher.mockImplementation(async()=>new Response('private upstream body',{status,headers:{Location:'https://untrusted.invalid/'}}));await expect(client.responses.create(forgeResponseRequest('fiction'),{signal:AbortSignal.timeout(30000)})).rejects.toThrow(`Forge API request failed (${status})`);}
});
it('a same-day expired lease cannot clear a later reservation',async()=>{
 const s=setup();const first=await s.caps.reserveInitial('123');s.time(Date.UTC(2026,9,30,23,59)+60000-1);await expect(s.caps.reserveInitial('123')).rejects.toThrow('generation-busy');
 // Use an earlier day time so lease expiry and recovery both remain on one UTC day.
 const store=new Store();let now=100000;const caps=new ForgeCaps(store,()=>now);const old=await caps.reserveInitial('123');now+=60000;const fresh=await caps.reserveInitial('123');await caps.finish('123',old,await repairDigest('idea','old-output'));await expect(caps.reserveInitial('123')).rejects.toThrow('generation-busy');await caps.finish('123',fresh);await expect(caps.reserveRepair('123',await repairDigest('idea','old-output'))).rejects.toThrow('invalid-repair');
 expect(first.lease).toContain('initial:1');
});
it('invalid moderation and failed global reservations never call generation',async()=>{
 const s=setup();s.moderations.mockResolvedValue({results:[]});expect(await s.service.moderate('123',['private'])).toEqual({ok:false,reason:'unavailable'});
 s.reserveGlobal.mockResolvedValueOnce({ok:false,reason:'daily-cap'});expect(await s.service.respond('123',{idea:'fiction'})).toEqual({ok:false,reason:'daily-cap'});expect(s.responses).not.toHaveBeenCalled();expect((await s.caps.reserveInitial('123')).lease).toContain(':initial:2');
});

it('gives duplicate-output repair receipts distinct leases so stale completions cannot release a newer call',async()=>{
 const store=new Store();let now=100000;const caps=new ForgeCaps(store,()=>now),digest=await repairDigest('same idea','same output');
 const first=await caps.reserveInitial('123');await caps.finish('123',first,digest);const second=await caps.reserveInitial('123');await caps.finish('123',second,digest);
 const old=await caps.reserveRepair('123',digest);now+=60000;const current=await caps.reserveRepair('123',digest);expect(current.lease).not.toBe(old.lease);
 await caps.finish('123',old);await expect(caps.reserveInitial('123')).rejects.toThrow('generation-busy');await caps.finish('123',current);await expect(caps.reserveInitial('123')).resolves.toBeDefined();
});
