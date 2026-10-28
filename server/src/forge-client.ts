export type ForgeResponse={id?:string;status?:string;output_text?:string;output?:{type?:string;content?:{type?:string;text?:string;refusal?:string}[]}[];usage?:{input_tokens?:number;output_tokens?:number;input_tokens_details?:{cached_tokens?:number}}};
export type ForgeResponseRequest={model:'gpt-6-luna';reasoning:{effort:'low'};store:false;max_output_tokens:number;text:{format:{type:'json_schema';name:'boss_def';schema:unknown;strict:true}};input:{role:'system'|'user'|'assistant';content:string}[]};
export type ForgeClient={moderations:{create:(body:{model:'omni-moderation-latest';input:string[]},options:{signal:AbortSignal})=>Promise<{results:{flagged:boolean}[]}>};responses:{create:(body:ForgeResponseRequest,options:{signal:AbortSignal})=>Promise<ForgeResponse>}};
/** No environment access. Only the live server configuration may supply an actual key. */
export function createOpenAIForgeClient(options:{apiKey:string;mode:'live'|'mock';fetcher?:typeof fetch}):ForgeClient{
 if(!options.apiKey.trim())throw new Error('Forge API credentials unavailable');
 if(options.mode!=='live'&&!options.fetcher)throw new Error('Mock Forge requires an injected fetch client');
 const fetcher=options.fetcher??fetch;
 async function post<T>(path:string,body:unknown,signal:AbortSignal):Promise<T>{
  const response=await fetcher(`https://api.openai.com/v1/${path}`,{method:'POST',headers:{Authorization:`Bearer ${options.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal,redirect:'error'});
  if(!response.ok)throw new Error(`Forge API request failed (${response.status})`); // Never log upstream bodies or credentials.
  return await response.json() as T;
 }
 return {moderations:{create:(body,{signal})=>post('moderations',body,signal)},responses:{create:(body,{signal})=>post('responses',body,signal)}};
}
