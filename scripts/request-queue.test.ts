import{expect,it}from'vitest';
import{RequestQueue}from'./request-queue';
it('delivers every scheduled item once with at most32 simultaneous requests and drains the queue',async()=>{
 const queue=new RequestQueue(32),seen:number[]=[];let active=0,max=0;
 for(let i=0;i<1000;i++)queue.add(async()=>{active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,0));seen.push(i);active--;});
 await queue.idle();expect(max).toBe(32);expect(queue.maxActive).toBe(32);expect(seen).toEqual(Array.from({length:1000},(_,i)=>i));expect(new Set(seen).size).toBe(1000);await queue.idle();
});
it('retains task failures without unhandled rejection and continues draining every item',async()=>{
 const queue=new RequestQueue(1);let completed=0;queue.add(async()=>{throw new Error('expected local failure');});queue.add(async()=>{completed++;});await queue.idle();expect(completed).toBe(1);expect(queue.errors).toHaveLength(1);
});
