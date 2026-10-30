import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe,expect,it,vi} from 'vitest';
import {createUserValidator,ApiAuthError} from './auth';
import {TwitchBotSender,type Fetcher} from './app-token';

const credentials={clientId:'app',clientSecret:'fake-secret',botUserId:'987'};
const valid=()=>Response.json({client_id:'app',user_id:'123',expires_in:3600,scopes:['user:read:chat']});
const token=()=>Response.json({access_token:'fake-app-token',expires_in:3600});
const sent=()=>Response.json({data:[{is_sent:true}]});
/** Model workerd's Request constructor rather than Node's broader fetch API. */
function workerdFetch(respond:Fetcher){return vi.fn(async(input:string|URL|Request,init?:RequestInit)=>{
 if(init?.redirect==='error')throw new TypeError('Unsupported redirect mode');
 expect(init?.redirect).toBe('manual');
 return respond(input,init);
});}
const opaque=()=>{const response=new Response('untrusted redirect body');Object.defineProperty(response,'type',{value:'opaqueredirect'});return response;};

describe('Worker redirect compatibility and credential isolation',()=>{
 it('validates, obtains an app token and sends chat with a workerd-compatible fetch',async()=>{
  const fetcher=workerdFetch(async input=>String(input).endsWith('/validate')?valid():String(input).endsWith('/token')?token():sent());
  const validate=createUserValidator({clientId:'app',fetch:fetcher,now:()=>0});
  expect(await validate('Bearer fake-user-token')).toMatchObject({userId:'123'});
  expect(await new TwitchBotSender(credentials,fetcher,()=>0).send('123','formatted result')).toEqual({dropReason:null});
  expect(fetcher).toHaveBeenCalledTimes(3);
 });
 it('looks up a confirmed clip with a workerd-compatible fetch',async()=>{
  const fetcher=workerdFetch(async input=>String(input).endsWith('/token')?token():Response.json({data:[{id:'ClipSlug',broadcaster_id:'123'}]}));
  expect(await new TwitchBotSender(credentials,fetcher,()=>0).clipUrl('123','ClipSlug')).toBe('https://clips.twitch.tv/ClipSlug');expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('preserves Twitch 401 as unauthorized instead of hiding it as auth-unavailable',async()=>{
  const fetcher=workerdFetch(async()=>new Response(null,{status:401}));
  await expect(createUserValidator({clientId:'app',fetch:fetcher,now:()=>0})('Bearer dummy')).rejects.toEqual(new ApiAuthError(401));
 });
 for(const [label,redirect] of [...[300,301,302,303,304,307,308,399].map(status=>[String(status),()=>new Response(null,{status,headers:{Location:'https://untrusted.invalid/'}})] as const),['opaque',opaque] as const]){
  it(`rejects ${label} from validation without following or parsing it`,async()=>{
   const fetcher=workerdFetch(async()=>redirect());
   await expect(createUserValidator({clientId:'app',fetch:fetcher,now:()=>0})('Bearer dummy')).rejects.toEqual(new ApiAuthError(503));
   expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it(`rejects ${label} from app-token acquisition before sending chat`,async()=>{
   const fetcher=workerdFetch(async()=>redirect());
   await expect(new TwitchBotSender(credentials,fetcher,()=>0).send('123','result')).rejects.toThrow('app-token-unavailable');
   expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it(`rejects ${label} from Get Clips without following or retrying`,async()=>{
   const fetcher=workerdFetch(async input=>String(input).endsWith('/token')?token():redirect());
   await expect(new TwitchBotSender(credentials,fetcher,()=>0).clipUrl('123','ClipSlug')).rejects.toThrow('clip-unavailable');expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it(`rejects ${label} from send-chat without following or retrying`,async()=>{
   const fetcher=workerdFetch(async input=>String(input).endsWith('/token')?token():redirect());
   const result=await new TwitchBotSender(credentials,fetcher,()=>0).send('123','result');
   expect(result.dropReason).toBe(label==='opaque'?'invalid_response':`http_${label}`);
   expect(fetcher).toHaveBeenCalledTimes(2);
  });
 }
 it('contains no unsupported redirect initializer in any Worker source file',()=>{
  const root=fileURLToPath(new URL('./',import.meta.url));
  function files(directory:string):string[]{return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(directory,entry.name)):[join(directory,entry.name)]);}
  for(const file of files(root))expect(readFileSync(file,'utf8'),file).not.toMatch(/redirect\s*:\s*['"]error['"]/);
 });
});
