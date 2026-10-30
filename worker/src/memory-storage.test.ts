import {DatabaseSync} from 'node:sqlite';
import {it,expect} from 'vitest';
import {SqliteMemoryStorage,type MemorySqlStorage} from './memory-storage';
import {HostedMemory} from './memory';
/** Real SQLite syntax/rollback, injected synchronous platform boundary and deterministic clock. */
function adapter(){
 const db=new DatabaseSync(':memory:');let durable=0;
 const storage:MemorySqlStorage={sql:{exec(query,...bindings){const rows=db.prepare(query).all(...bindings.map(value=>value instanceof ArrayBuffer?new Uint8Array(value):value));return {toArray:()=>JSON.parse(JSON.stringify(rows))};}},transactionSync<T>(work:()=>T):T{db.exec('BEGIN');try{const value=work();db.exec('COMMIT');return value;}catch(error){db.exec('ROLLBACK');throw error;}},async sync(){durable++;}};
 return {storage:new SqliteMemoryStorage(storage),db,durable:()=>durable};
}
it('SQLite adapter persists large state and dedup atomically, including rolled-back inserts',async()=>{
 const s=adapter();try{
  s.storage.transaction(tx=>{tx.save({large:'x'.repeat(150000)});expect(tx.vote('s','b','2',1)).toBe(true);});
  expect(()=>s.storage.transaction(tx=>{tx.save({wrong:true});tx.vote('s','b2','2',2);throw new Error('abort');})).toThrow('abort');
  s.storage.transaction(tx=>{expect(tx.load()).toEqual({large:'x'.repeat(150000)});expect(tx.vote('s','b','2',3)).toBe(false);expect(tx.vote('s','b2','2',3)).toBe(true);tx.prune(4);expect(tx.vote('s','b','2',4)).toBe(true);});
 }finally{s.db.close();}
});
it('acknowledgements await SQL durability and do not happen when durability fails',async()=>{
 const s=adapter();try{
  let ack=0;const memory=new HostedMemory(s.storage,()=>1_800_000_000_000,()=>true,async()=>{expect(s.durable()).toBe(1);ack++;});
  await memory.events('1',[{kind:'forget',sessionId:'s',userId:'2'}]);expect(ack).toBe(1);
  s.storage.flush=async()=>{throw new Error('durability failed');};
  await expect(memory.events('1',[{kind:'forget',sessionId:'s',userId:'3'}])).rejects.toThrow('durability failed');expect(ack).toBe(1);
 }finally{s.db.close();}
});

it('SQL forget erases only that viewer dedup and opts out future activity',async()=>{
 const s=adapter();try{
  const memory=()=>new HostedMemory(s.storage,()=>1_800_000_000_000,()=>true,async()=>{});
  const vote=(userId:string,beatId:string)=>({kind:'vote' as const,sessionId:'s',userId,beatId,displayName:'Viewer',move:'JAB' as const});
  await memory().events('1',[vote('2','b1'),vote('2','b2'),vote('3','b1')]);
  await memory().events('1',[{kind:'forget',sessionId:'s',userId:'2'}]);
  expect(s.db.prepare('SELECT user FROM viewer_memory_votes').all().map(row=>row.user)).toEqual(['3']);
  await memory().events('1',[vote('2','b3')]);expect(s.db.prepare('SELECT user FROM viewer_memory_votes').all().map(row=>row.user)).toEqual(['3']);
 }finally{s.db.close();}
});
