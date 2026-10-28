import {expect,it,vi} from 'vitest';
import {DEFAULT_BOSS,type BossDef} from '../../shared/src/boss-def';
import {BossForge,forgeCommand,type ForgeOptions} from './forge';
import {createOpenAIForgeClient,type ForgeClient,type ForgeResponseRequest} from './forge-client';
const boss=():BossDef=>({...structuredClone(DEFAULT_BOSS),name:'Copper Crab',moves:structuredClone(DEFAULT_BOSS.moves.slice(0,4))});
const gate={pass:true,viewers:[0,3,50,500],table:{casual:[50,50,50,50],nopunch:[40,40,40,40]},rounds:4000,seed:2026};
function rig(overrides:Partial<ForgeOptions>={}){
 const moderation=vi.fn(async({input}:{input:string[]})=>({results:input.map(()=>({flagged:false}))})),responses=vi.fn(async(_body:ForgeResponseRequest,_options:{signal:AbortSignal})=>({status:'completed',output_text:JSON.stringify(boss()),usage:{input_tokens:100,output_tokens:25}}));
 const client:ForgeClient={moderations:{create:moderation},responses:{create:responses}},accepted=vi.fn(),changed=vi.fn(),log=vi.fn(),check=vi.fn(()=>gate),tune=vi.fn(()=>({factor:.5,def:boss(),before:{...gate,pass:false},after:gate}));let between=true;
 const service=new BossForge({client,isBetweenRounds:()=>between,protectedNames:()=>[],onAccepted:accepted,onChange:changed,gate:check,tune,log,...overrides});return{service,moderation,responses,accepted,changed,log,check,tune,phase:(value:boolean)=>{between=value;service.observePhase();}};
}
it('uses strict Responses BossDef schema and low reasoning, repairs invalid output only once, moderates all strings',async()=>{
 const r=rig();r.responses.mockResolvedValueOnce({status:'completed',output_text:JSON.stringify({...boss(),hp:999}),usage:{input_tokens:100,output_tokens:25}});await r.service.submit({viewerId:'one',idea:'A copper crab'});const result=await r.service.generate();expect(result?.name).toBe('Copper Crab');expect(r.responses).toHaveBeenCalledTimes(2);
 const request=r.responses.mock.calls[0]![0] as unknown as ForgeResponseRequest;expect(request).toMatchObject({model:'gpt-6-luna',reasoning:{effort:'low'},store:false,text:{format:{type:'json_schema',name:'boss_def',strict:true}}});expect(JSON.stringify(r.responses.mock.calls[1])).toContain('hp');expect(r.moderation.mock.calls.flatMap(([input])=>input.input)).toContain('Copper Crab');expect(r.service.snapshot()).toMatchObject({status:'accepted',factor:1,ai:{repair:true,inputTokens:200,outputTokens:50,costUsd:null}});expect(r.accepted).toHaveBeenCalledOnce();expect(JSON.stringify(r.log.mock.calls)).not.toContain('A copper crab');expect(r.log.mock.calls.some(([entry])=>entry.operation==='repair')).toBe(true);
});
it('rejects a second invalid repair and a moderation failure without accepting or running a gate',async()=>{
 const r=rig();r.responses.mockImplementation(async()=>({status:'completed',output_text:JSON.stringify({...boss(),hp:999}),usage:{input_tokens:100,output_tokens:25}}));await r.service.submit({viewerId:'one',idea:'A crab'});expect(await r.service.generate()).toBeNull();expect(r.responses).toHaveBeenCalledTimes(2);expect(r.accepted).not.toHaveBeenCalled();expect(r.check).not.toHaveBeenCalled();
 const blocked=rig();await blocked.service.submit({viewerId:'one',idea:'A crab'});blocked.moderation.mockImplementation(async({input})=>({results:input.map(()=>({flagged:true}))}));expect(await blocked.service.generate()).toBeNull();expect(blocked.service.snapshot().boss).toBeNull();expect(blocked.check).not.toHaveBeenCalled();
});
it('admits one moderated idea per viewer/bout and counts each latest endorsement once for a stable top3',async()=>{
 const r=rig();for(const [viewerId,idea]of [['a','Alpha'],['b','Beta'],['c','Gamma'],['d','Delta']])await r.service.submit({viewerId:viewerId!,idea:idea!});expect(await r.service.submit({viewerId:'a',idea:'Another'})).toBe(false);expect(r.service.snapshot().ideas.map(i=>i.idea)).toEqual(['Alpha','Beta','Gamma']);
 expect(forgeCommand(r.service,{viewerId:'voter',text:'!forge +1'})).toBe(true);expect(r.service.snapshot().ideas[0]).toMatchObject({idea:'Delta',votes:1});expect(forgeCommand(r.service,{viewerId:'voter',text:'!FORGE +1 2'})).toBe(true);expect(r.service.snapshot().ideas[0]).toMatchObject({idea:'Alpha',votes:1});expect(r.service.snapshot().ideas.reduce((n,i)=>n+i.votes,0)).toBe(1);r.service.resetBout();await r.service.submit({viewerId:'a',idea:'New bout'});expect(forgeCommand(r.service,{viewerId:'voter',text:'!forge +1 3'})).toBe(false);
});
it('fails closed on missing/failed idea moderation, absent credentials, and incomplete model responses',async()=>{
 const noKey=rig({client:null});expect(await noKey.service.submit({viewerId:'a',idea:'A crab'})).toBe(false);expect(await noKey.service.generate()).toBeNull();expect(noKey.service.snapshot().status).toBe('unavailable');
 const r=rig();r.moderation.mockResolvedValueOnce({results:[]});expect(await r.service.submit({viewerId:'a',idea:'Unclassified'})).toBe(false);expect(r.service.snapshot().ideas).toEqual([]);
 await r.service.submit({viewerId:'b',idea:'A crab'});r.responses.mockResolvedValueOnce({status:'incomplete',output_text:'',usage:{input_tokens:0,output_tokens:0}});expect(await r.service.generate()).toBeNull();expect(r.responses).toHaveBeenCalledOnce();expect(r.accepted).not.toHaveBeenCalled();
});
it('never generates within a round or overlaps generation, and veto retires deferred output',async()=>{
 const r=rig();await r.service.submit({viewerId:'a',idea:'A crab'});r.phase(false);expect(await r.service.generate()).toBeNull();expect(r.responses).not.toHaveBeenCalled();r.phase(true);
 let release!:(value:any)=>void;r.responses.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));const pending=r.service.generate();expect(await r.service.generate()).toBeNull();r.service.veto();release({status:'completed',output_text:JSON.stringify(boss())});expect(await pending).toBeNull();expect(r.accepted).not.toHaveBeenCalled();expect(r.service.snapshot().status).toBe('vetoed');
});
it('automatically retires generation on combat start and ignores late moderated ideas after bout reset',async()=>{
 const r=rig();let release!:(value:any)=>void;r.moderation.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));const old=r.service.submit({viewerId:'a',idea:'Old idea'});r.service.resetBout();release({results:[{flagged:false}]});expect(await old).toBe(false);expect(r.service.snapshot().ideas).toEqual([]);
 await r.service.submit({viewerId:'b',idea:'New idea'});let generated!:(value:any)=>void;r.responses.mockImplementationOnce(()=>new Promise(resolve=>{generated=resolve;}));const pending=r.service.generate();r.phase(false);generated({status:'completed',output_text:JSON.stringify(boss())});expect(await pending).toBeNull();expect(r.service.snapshot().betweenRounds).toBe(false);expect(r.accepted).not.toHaveBeenCalled();
});
it('tunes only a failing gate and rejects tuning that still fails',async()=>{
 const r=rig();r.check.mockReturnValue({...gate,pass:false});await r.service.submit({viewerId:'a',idea:'A crab'});expect(await r.service.generate()).not.toBeNull();expect(r.tune).toHaveBeenCalledOnce();expect(r.service.snapshot()).toMatchObject({status:'accepted',factor:.5,before:{pass:false},after:{pass:true}});
 const bad=rig();bad.check.mockReturnValue({...gate,pass:false});bad.tune.mockReturnValue({factor:.5,def:boss(),before:gate,after:{...gate,pass:false}});await bad.service.submit({viewerId:'a',idea:'A crab'});expect(await bad.service.generate()).toBeNull();expect(bad.accepted).not.toHaveBeenCalled();
});
it('fetch client uses fixed endpoints, sends no stored response, propagates abort and sanitizes errors',async()=>{
 const fetcher=vi.fn(async(_url:RequestInfo|URL,_options?:RequestInit)=>new Response(JSON.stringify({results:[{flagged:false}]}),{status:200}));const client=createOpenAIForgeClient({apiKey:'test-only',mode:'mock',fetcher});const controller=new AbortController();await client.moderations.create({model:'omni-moderation-latest',input:['Crab']},{signal:controller.signal});expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.openai.com/v1/moderations');expect(fetcher.mock.calls[0]?.[1]).toMatchObject({signal:controller.signal,redirect:'error'});
 fetcher.mockResolvedValueOnce(new Response('sensitive upstream body',{status:401}));await expect(client.moderations.create({model:'omni-moderation-latest',input:['Crab']},{signal:controller.signal})).rejects.toThrow('Forge API request failed (401)');expect(()=>createOpenAIForgeClient({apiKey:'test-only',mode:'mock'})).toThrow('injected');
});
