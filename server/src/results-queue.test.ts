import { expect, it } from 'vitest';
import { ResultsQueue } from './results-queue';
it('acceptance15: sends first immediately, retains newest3, and sends at most once each10s',async()=>{
  const sent:{text:string;at:number}[]=[];let now=0;
  const queue=new ResultsQueue(async text=>{sent.push({text,at:now});});
  for(let i=0;i<10;i++) {now=i*500;queue.enqueue(`round-${i}`,now);await Promise.resolve();await Promise.resolve();}
  expect(sent).toEqual([{text:'round-0',at:0}]);
  expect(queue.pending).toEqual(['round-7','round-8','round-9']);
  for(now=5000;now<=60000;now+=100){queue.flush(now);await Promise.resolve();await Promise.resolve();}
  expect(sent).toEqual([{text:'round-0',at:0},{text:'round-7',at:10000},{text:'round-8',at:20000},{text:'round-9',at:30000}]);
});
it('contains transport failures without bursting or retaining unbounded retries',async()=>{
  let attempts=0;const errors:unknown[]=[];
  const queue=new ResultsQueue(async()=>{attempts++;throw new Error('transport failed');},error=>errors.push(error));
  queue.enqueue('first',0);queue.enqueue('second',0);
  await new Promise(resolve=>setTimeout(resolve,0));
  queue.flush(9999);expect(attempts).toBe(1);expect(errors).toHaveLength(1);
  queue.flush(10000);await new Promise(resolve=>setTimeout(resolve,0));expect(attempts).toBe(2);
  queue.close();queue.enqueue('ignored',20000);expect(queue.pending).toHaveLength(0);
});
