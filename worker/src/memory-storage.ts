import type {SqlStorageValue} from '@cloudflare/workers-types';
export interface MemorySqlStorage {sql:{exec<T extends Record<string,SqlStorageValue>>(query:string,...bindings:SqlStorageValue[]):{toArray():T[]}};transactionSync<T>(work:()=>T):T;sync():Promise<void>}
export interface MemoryTransaction {
 load():unknown;
 save(value:unknown):void;
 /** Returns true only for the first durable observation of this tuple. */
 vote(session:string,beat:string,user:string,at:number):boolean;
 prune(before:number):void;
 forgetVotes(user:string):void;
}
export interface MemoryStorage {transaction<T>(work:(storage:MemoryTransaction)=>T):T;flush():Promise<void>}
/** SQL TEXT rows avoid the 128KiB Durable Object KV value limit. No user-controlled SQL. */
export class SqliteMemoryStorage implements MemoryStorage {
 constructor(private storage:MemorySqlStorage){}
 flush():Promise<void>{return this.storage.sync();}
 transaction<T>(work:(storage:MemoryTransaction)=>T):T {
  return this.storage.transactionSync(()=>{
   const sql=this.storage.sql;
   sql.exec('CREATE TABLE IF NOT EXISTS viewer_memory_state (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL)');
   sql.exec('CREATE TABLE IF NOT EXISTS viewer_memory_votes (session TEXT NOT NULL, beat TEXT NOT NULL, user TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY(session,beat,user))');
   sql.exec('CREATE INDEX IF NOT EXISTS viewer_memory_votes_at ON viewer_memory_votes(at)');
   return work({
    load:()=>{const rows=sql.exec<{value:string}>('SELECT value FROM viewer_memory_state WHERE id=1').toArray();return rows.length?JSON.parse(rows[0].value):undefined;},
    save:value=>{sql.exec('INSERT INTO viewer_memory_state(id,value) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value',JSON.stringify(value));},
    vote:(session,beat,user,at)=>sql.exec('INSERT OR IGNORE INTO viewer_memory_votes(session,beat,user,at) VALUES(?,?,?,?) RETURNING user',session,beat,user,at).toArray().length===1,
    prune:before=>{sql.exec('DELETE FROM viewer_memory_votes WHERE at < ?',before);},
    forgetVotes:user=>{sql.exec('DELETE FROM viewer_memory_votes WHERE user = ?',user);},
   });
  });
 }
}
