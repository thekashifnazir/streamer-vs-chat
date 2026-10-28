/** Tests must identify the stuck phase rather than consume Vitest's 10s hook timeout. */
export async function boundedTeardown(label:string,close:()=>Promise<unknown>,timeoutMs=750):Promise<void>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  await Promise.race([Promise.resolve().then(close),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label} teardown exceeded ${timeoutMs}ms; a pending request or background pre-transform did not close`)),timeoutMs);})]);
 }finally{clearTimeout(timer);}
}
