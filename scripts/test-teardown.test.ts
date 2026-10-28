import {expect,it,vi} from 'vitest';
import {boundedTeardown} from './test-teardown';
it('reports the exact hanging teardown phase before the outer hook timeout',async()=>{
 vi.useFakeTimers();try{const result=boundedTeardown('Vite middleware server.close()',()=>new Promise(()=>{}));const error=expect(result).rejects.toThrow('Vite middleware server.close() teardown exceeded 750ms');await vi.advanceTimersByTimeAsync(750);await error;expect(vi.getTimerCount()).toBe(0);}finally{vi.useRealTimers();}
});
it('preserves real close failures and removes the guard on success',async()=>{
 await boundedTeardown('HTTP',async()=>{});
 await expect(boundedTeardown('Vite',async()=>{throw new Error('actual close error');})).rejects.toThrow('actual close error');
});
