import {afterEach,expect,it,vi} from 'vitest';
import {CaptureBenchmark,percentile} from './benchmark';
afterEach(()=>vi.useRealTimers());
it('uses real frame samples after warmup and picks the lower measured inference delegate',async()=>{
  let bench:CaptureBenchmark;
  const stop=vi.fn();bench=new CaptureBenchmark({warmupFrames:2,sampleFrames:3,stop,start:async delegate=>{
    const values=delegate==='CPU'?[999,999,10,20,30]:[999,999,6,8,10];
    for(const inferenceMs of values)bench.frame({fps:30,inferenceMs});return true;
  }});
  const result=await bench.run();expect(result.selected).toBe('GPU');expect(stop).toHaveBeenCalledTimes(2);
  expect(result.measurements[0]).toMatchObject({samples:3,inferenceP50Ms:20,inferenceP95Ms:30,fpsP50:30});
  expect(result.measurements[1]).toMatchObject({samples:3,inferenceP50Ms:8,inferenceP95Ms:10});
});
it('bounds missing frames and a stuck startup; never manufactures a winner',async()=>{
  vi.useFakeTimers();const stop=vi.fn();const bench=new CaptureBenchmark({stop,start:()=>new Promise(()=>{}),timeoutMs:100});
  const pending=bench.run();await vi.advanceTimersByTimeAsync(200);const result=await pending;
  expect(result.selected).toBeNull();expect(result.measurements.every(value=>!!value.error&&value.samples===0)).toBe(true);expect(stop).toHaveBeenCalledTimes(2);expect(vi.getTimerCount()).toBe(0);
});
it('allows CPU when GPU fails and cancellation stops resource acquisition',async()=>{
  let bench:CaptureBenchmark;const stop=vi.fn();bench=new CaptureBenchmark({stop,warmupFrames:0,sampleFrames:1,start:async delegate=>{if(delegate==='GPU')throw new Error('GPU unsupported');bench.frame({fps:60,inferenceMs:5});return true;}});
  expect((await bench.run()).selected).toBe('CPU');
  const blocked=new CaptureBenchmark({stop,start:()=>new Promise(()=>{})});const pending=blocked.run();blocked.cancel();expect((await pending).cancelled).toBe(true);
});
it('ignores invalid metrics and computes nearest-rank percentiles without mutating samples',()=>{
  const values=[5,1,9];expect(percentile(values,.5)).toBe(5);expect(percentile(values,.95)).toBe(9);expect(values).toEqual([5,1,9]);expect(percentile([], .5)).toBeNull();
});
it('invalid frame metrics never count toward warmup, samples or delegate selection',async()=>{
 let bench:CaptureBenchmark;bench=new CaptureBenchmark({stop:()=>{},warmupFrames:0,sampleFrames:1,start:async()=>{
  bench.frame({fps:NaN,inferenceMs:1});bench.frame({fps:30,inferenceMs:Infinity});bench.frame({fps:0,inferenceMs:1});bench.frame({fps:30,inferenceMs:12});return true;
 }});
 const result=await bench.run();expect(result.measurements.map(value=>[value.samples,value.fpsP50,value.inferenceP50Ms])).toEqual([[1,30,12],[1,30,12]]);
});
