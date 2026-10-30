export type ValidatedUser={userId:string;scopes:readonly string[]};
export class ApiAuthError extends Error{constructor(readonly status:401|503){super(status===401?'unauthorized':'auth-unavailable');}}
export function createUserValidator(options:{clientId:string;fetch:typeof fetch;now:()=>number}){
 const cache=new Map<string,{value:ValidatedUser;until:number}>();
 return async (authorization:string|null):Promise<ValidatedUser>=>{
  if(!options.clientId)throw new ApiAuthError(503);
  const token=authorization?.match(/^Bearer ([^\s]{1,2048})$/i)?.[1];if(!token)throw new ApiAuthError(401);
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));const key=Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
  const now=options.now();for(const [hash,item]of cache)if(item.until<=now)cache.delete(hash);
  const existing=cache.get(key);if(existing)return {...existing.value,scopes:[...existing.value.scopes]};
  let response:Response;try{response=await options.fetch('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${token}`},redirect:'error',signal:AbortSignal.timeout(8000)});}catch{throw new ApiAuthError(503);}
  if(response.status===401)throw new ApiAuthError(401);if(!response.ok)throw new ApiAuthError(503);
  let data:Record<string,unknown>;try{data=await response.json();}catch{throw new ApiAuthError(503);}
  if(!data||data.client_id!==options.clientId||typeof data.user_id!=='string'||!/^\d{1,30}$/.test(data.user_id)||!Array.isArray(data.scopes)||!data.scopes.every(scope=>typeof scope==='string')||typeof data.expires_in!=='number'||!Number.isFinite(data.expires_in)||data.expires_in<=0)throw new ApiAuthError(401);
  const value={userId:data.user_id,scopes:[...data.scopes] as string[]};
  if(cache.size>=256)cache.delete(cache.keys().next().value!);
  cache.set(key,{value,until:now+Math.min(300000,data.expires_in*1000)});return {...value,scopes:[...value.scopes]};
 };
}
