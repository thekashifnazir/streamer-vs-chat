import type {ForgeClient} from '../../shared/src/forge-client';
export type {ForgeClient,ForgeResponse,ForgeResponseRequest} from '../../shared/src/forge-client';
/** No environment access. Only trusted live server/Worker configuration may supply an actual key. */
export function createOpenAIForgeClient(options:{apiKey:string;mode:'live'|'mock';fetcher?:typeof fetch;redirect?:'manual'|'error'}):ForgeClient{
 if(!options.apiKey.trim())throw new Error('Forge API credentials unavailable');
 if(options.mode!=='live'&&!options.fetcher)throw new Error('Mock Forge requires an injected fetch client');
 const fetcher=options.fetcher??fetch;
 async function post<T>(path:string,body:unknown,signal:AbortSignal):Promise<T>{
  const response=await fetcher(`https://api.openai.com/v1/${path}`,{method:'POST',headers:{Authorization:`Bearer ${options.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal,redirect:options.redirect??'error'});
  if(response.type==='opaqueredirect'||response.status>=300&&response.status<400||!response.ok)throw new Error(`Forge API request failed (${response.status})`); // Never log upstream bodies or credentials.
  return await response.json() as T;
 }
 return {moderations:{create:(body,{signal})=>post('moderations',body,signal)},responses:{create:(body,{signal})=>post('responses',body,signal)}};
}
