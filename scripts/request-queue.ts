/** FIFO local injection queue. Never retries or discards scheduled messages. */
export class RequestQueue {
 private active=0;private waiting:(()=>Promise<void>)[]=[];private idleWaiters:(()=>void)[]=[];
 readonly errors:unknown[]=[];maxActive=0;maxQueued=0;
 constructor(readonly concurrency=32){if(!Number.isInteger(concurrency)||concurrency<1)throw new Error('Invalid request concurrency');}
 add(task:()=>Promise<void>){this.waiting.push(task);this.maxQueued=Math.max(this.maxQueued,this.waiting.length);this.pump();}
 private pump(){while(this.active<this.concurrency&&this.waiting.length){const task=this.waiting.shift()!;this.active++;this.maxActive=Math.max(this.maxActive,this.active);void Promise.resolve().then(task).catch(error=>{this.errors.push(error);}).finally(()=>{this.active--;this.pump();if(!this.active&&!this.waiting.length)this.idleWaiters.splice(0).forEach(resolve=>resolve());});}}
 idle(){return this.active||this.waiting.length?new Promise<void>(resolve=>this.idleWaiters.push(resolve)):Promise.resolve();}
}
