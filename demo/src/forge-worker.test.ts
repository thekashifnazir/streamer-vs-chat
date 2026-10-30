import {afterEach,expect,it,vi} from 'vitest';
import {DEFAULT_BOSS} from '../../shared/src/boss-def';
const {tune,gate}=vi.hoisted(()=>({tune:vi.fn(),gate:vi.fn()}));
vi.mock('../../shared/src/boss-forge',()=>({tuneBoss:tune,gateBoss:gate}));
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();tune.mockReset();gate.mockReset();});
it('keeps parsing/validation ahead of the expensive worker gate and returns measured elapsed time',async()=>{
 const post=vi.fn();vi.stubGlobal('postMessage',post);vi.stubGlobal('onmessage',null);await import('./forge-worker');
 const handle=globalThis.onmessage as unknown as (event:MessageEvent)=>void;
 handle(new MessageEvent('message',{data:{id:1,json:'bad JSON'}}));
 expect(tune).not.toHaveBeenCalled();expect(post.mock.calls[0]![0]).toMatchObject({id:1,errors:[expect.any(String)],elapsedMs:expect.any(Number)});
 handle(new MessageEvent('message',{data:{id:2,json:JSON.stringify({...DEFAULT_BOSS,hp:900})}}));expect(tune).not.toHaveBeenCalled();
 tune.mockReturnValue({factor:1,def:DEFAULT_BOSS});handle(new MessageEvent('message',{data:{id:3,json:JSON.stringify(DEFAULT_BOSS)}}));
 expect(tune).toHaveBeenCalledOnce();expect(gate).not.toHaveBeenCalled();expect(post.mock.calls.at(-1)![0]).toMatchObject({id:3,result:{factor:1},errors:[],elapsedMs:expect.any(Number)});
});

it('dispatches an explicit gate operation to gateBoss without invoking tuneBoss',async()=>{const post=vi.fn();vi.stubGlobal('postMessage',post);vi.stubGlobal('onmessage',null);await import('./forge-worker');const result={pass:true,viewers:[0,3,50,500]};gate.mockReturnValue(result);const handle=globalThis.onmessage as unknown as (event:MessageEvent)=>void;handle(new MessageEvent('message',{data:{id:4,json:JSON.stringify(DEFAULT_BOSS),operation:'gate'}}));expect(gate).toHaveBeenCalledExactlyOnceWith(DEFAULT_BOSS);expect(tune).not.toHaveBeenCalled();expect(post).toHaveBeenCalledExactlyOnceWith({id:4,result,errors:[],elapsedMs:expect.any(Number)});});
