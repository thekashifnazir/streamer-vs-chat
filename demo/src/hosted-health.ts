/** One public feature snapshot per hosted page; refresh only after connecting. */
export type HostedHealth={bot:boolean;clips:boolean;forge:boolean;memory:boolean};
export type HealthReader=()=>Promise<HostedHealth>;
export function createHostedHealth(request:typeof fetch=globalThis.fetch.bind(globalThis)){
 let pending:Promise<HostedHealth>|undefined,generation=0;
 const get:HealthReader=()=>pending??=(async()=>{
  const started=generation;
  let snapshot:HostedHealth={bot:false,clips:false,forge:false,memory:false};
  try{const response=await request('/api/health',{cache:'no-store'});const data=response.ok?await response.json():{};snapshot={bot:data.bot===true,clips:data.clips===true,forge:data.forge===true,memory:data.memory===true};}catch{/* Feature failures never block play. */}
  // A page-load caller must not overwrite post-Connect capabilities with an old
  // response. Existing callers join the latest request, without another fetch.
  return started===generation?snapshot:get();
 })();
 return {get,refresh(){generation++;pending=undefined;return get();}};
}
