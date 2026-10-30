/** Twitch clip slug only. URLs, query strings, whitespace and Unicode are never accepted. */
export function isClipId(value:unknown):value is string{return typeof value==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(value);}
/** Injected interfaces let Node tests cover the exact DO adapter operation without importing its runtime. */
export async function enqueueClipResult(channel:string,clipId:string,sender:{clipUrl(channel:string,id:string):Promise<string|null>},queue:{enqueue(channel:string,message:string):Promise<void>},enabled:()=>boolean):Promise<boolean>{
 if(!enabled())throw new Error('hosted-clips-off');
 if(!isClipId(clipId))return false;
 const url=await sender.clipUrl(channel,clipId);
 if(!url)return false;
 // Recheck flags after external I/O so a disabled feature cannot enqueue a stale completion.
 if(!enabled())throw new Error('hosted-clips-off');
 await queue.enqueue(channel,`Clip: ${url}`);return true;
}
