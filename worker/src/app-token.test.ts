import {describe,it,expect,vi} from 'vitest';
import {TwitchBotSender,safeDropReason} from './app-token.js';
const credentials={clientId:'app',clientSecret:'never-store-this',botUserId:'987'};
const token=(value='token',expires=3600)=>Response.json({access_token:value,expires_in:expires});
const sent=()=>Response.json({data:[{is_sent:true}]});
describe('Worker app access token and bot sender',()=>{
  it('rejects incomplete credentials before any network request',async()=>{
    const fetcher=vi.fn(async()=>token());
    for(const missing of [{...credentials,clientId:''},{...credentials,clientSecret:' '},{...credentials,botUserId:''},{...credentials,botUserId:'not-a-user-id'}])await expect(new TwitchBotSender(missing,fetcher,()=>0).send('123','result')).rejects.toThrow('bot-not-configured');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('disallows redirects on credential-bearing requests',async()=>{
    const fetcher=vi.fn(async(input:string|URL|Request,init?:RequestInit)=>{expect(init?.redirect).toBe('error');return String(input).includes('/oauth2/token')?token():sent();});
    await new TwitchBotSender(credentials,fetcher,()=>0).send('123','result');expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('caches until 60 seconds before expiry and sends only the passed validated channel',async()=>{
    let now=0;const fetcher=vi.fn(async(input:string|URL|Request)=>String(input).includes('/oauth2/token')?token():sent());
    const sender=new TwitchBotSender(credentials,fetcher,()=>now);
    await sender.send('123','one');now=3539999;await sender.send('123','two');
    expect(fetcher.mock.calls.filter(([url])=>String(url).includes('/oauth2/token'))).toHaveLength(1);
    now=3540000;await sender.send('123','three');
    expect(fetcher.mock.calls.filter(([url])=>String(url).includes('/oauth2/token'))).toHaveLength(2);
    const all=vi.fn(async(_input:string|URL|Request,init?:RequestInit)=>{expect(JSON.parse(String(init?.body))).toEqual({broadcaster_id:'123',sender_id:'987',message:'four',for_source_only:true});return sent();});
    // The previously cached token means this call reaches only the chat endpoint.
    const raw=fetcher.mock.calls;expect(raw.length).toBe(5);
    const request=vi.fn(async(input:string|URL|Request,init?:RequestInit)=>String(input).includes('/oauth2/token')?token():all(input,init));
    await new TwitchBotSender(credentials,request,()=>now).send('123','four');expect(all).toHaveBeenCalledOnce();
  });
  it('refreshes once on 401 and never loops on a second 401',async()=>{
    let tokens=0;let chats=0;
    const fetcher=vi.fn(async(input:string|URL|Request)=>String(input).includes('/oauth2/token')?(tokens++,token(`t${tokens}`)):(chats++,new Response(null,{status:401})));
    expect(await new TwitchBotSender(credentials,fetcher,()=>0).send('123','result')).toEqual({dropReason:'http_401'});
    expect(tokens).toBe(2);expect(chats).toBe(2);
  });
  it('refreshes a rejected token then succeeds',async()=>{
    let chats=0;const fetcher=vi.fn(async(input:string|URL|Request)=>String(input).includes('/oauth2/token')?token():(++chats===1?new Response(null,{status:401}):sent()));
    expect(await new TwitchBotSender(credentials,fetcher,()=>0).send('123','result')).toEqual({dropReason:null});
  });
  it('retains only a bounded drop code and never the Twitch explanation text',async()=>{
    const fetcher=vi.fn(async(input:string|URL|Request)=>String(input).includes('/oauth2/token')?token():Response.json({data:[{is_sent:false,drop_reason:{code:'channel_suspended',message:'private upstream text'}}]}));
    const result=await new TwitchBotSender(credentials,fetcher,()=>0).send('123','result');
    expect(result).toEqual({dropReason:'channel_suspended'});expect(JSON.stringify(result)).not.toContain('private');
    expect(safeDropReason('x'.repeat(81))).toBeNull();expect(safeDropReason('body with text')).toBeNull();
  });
  it('returns a fixed 403 code without retaining an upstream error body',async()=>{
    const fetcher=vi.fn(async(input:string|URL|Request)=>String(input).includes('/oauth2/token')?token():new Response('upstream private text',{status:403}));
    expect(await new TwitchBotSender(credentials,fetcher,()=>0).send('123','result')).toEqual({dropReason:'forbidden'});
  });
  it('keeps a structured drop code from a 403 response, never the message',async()=>{
    const fetcher=vi.fn(async(input:string|URL|Request)=>String(input).includes('/oauth2/token')?token():Response.json({data:[{drop_reason:{code:'channel_requires_verified_phone_number',message:'private'}}]},{status:403}));
    expect(await new TwitchBotSender(credentials,fetcher,()=>0).send('123','result')).toEqual({dropReason:'channel_requires_verified_phone_number'});
  });
  it('rejects invalid token responses without exposing them',async()=>{
    const fetcher=vi.fn(async()=>Response.json({access_token:'secret',expires_in:Infinity}));
    await expect(new TwitchBotSender(credentials,fetcher,()=>0).send('123','result')).rejects.toThrow('app-token-invalid');
  });
});
