import {describe,expect,it,vi} from 'vitest';
import {TwitchBotSender} from './app-token.js';
import {enqueueClipResult,isClipId} from './clip-results.js';
const credentials={clientId:'app',clientSecret:'fake-secret',botUserId:'987'};
const slug='ThoughtfulCleverClip-Slug_123';
function setup(data:unknown){
 const fetcher=vi.fn(async(input:string|URL|Request,init?:RequestInit)=>{
  expect(init?.redirect).toBe('manual');expect(init?.signal).toBeInstanceOf(AbortSignal);
  return String(input).endsWith('/token')?Response.json({access_token:'fake-token',expires_in:3600}):Response.json({data});
 });
 const sender=new TwitchBotSender(credentials,fetcher,()=>0);const enqueue=vi.fn(async(_channel:string,_message:string)=>{});
 return {sender,fetcher,enqueue};
}
describe('verified hosted clip results',()=>{
 it('queues a canonical URL derived only from a Twitch-confirmed ID and authenticated channel',async()=>{
  const s=setup([{id:slug,broadcaster_id:'123',url:'https://untrusted.invalid/arbitrary'}]);
  expect(await enqueueClipResult('123',slug,s.sender,s,()=>true)).toBe(true);
  expect(s.enqueue).toHaveBeenCalledWith('123',`Clip: https://clips.twitch.tv/${slug}`);
  expect(String(s.fetcher.mock.calls[1]?.[0])).toBe(`https://api.twitch.tv/helix/clips?id=${slug}`);
 });
 it.each([{data:[{id:slug,broadcaster_id:'999'}]},{data:[{id:'different',broadcaster_id:'123'}]},{data:[]},{data:[null]}])('never queues an unrelated, missing or malformed clip %#',async ({data})=>{
  const s=setup(data);expect(await enqueueClipResult('123',slug,s.sender,s,()=>true)).toBe(false);expect(s.enqueue).not.toHaveBeenCalled();
 });
 it.each(['','https://clips.twitch.tv/a','a?x=1','a/b','a b','é','a'.repeat(201)])('rejects malformed clip IDs before fetching %s',async id=>{
  const s=setup([]);expect(isClipId(id)).toBe(false);expect(await enqueueClipResult('123',id,s.sender,s,()=>true)).toBe(false);expect(s.fetcher).not.toHaveBeenCalled();expect(s.enqueue).not.toHaveBeenCalled();
 });
 it('discards a completion if either flag turns off during verification',async()=>{
  let enabled=true;const sender={clipUrl:vi.fn(async()=>{enabled=false;return `https://clips.twitch.tv/${slug}`;})};const queue={enqueue:vi.fn(async()=>{})};
  await expect(enqueueClipResult('123',slug,sender,queue,()=>enabled)).rejects.toThrow('hosted-clips-off');expect(queue.enqueue).not.toHaveBeenCalled();
 });
 it('does not fetch while flags are off',async()=>{
  const s=setup([]);await expect(enqueueClipResult('123',slug,s.sender,s,()=>false)).rejects.toThrow('hosted-clips-off');expect(s.fetcher).not.toHaveBeenCalled();
 });
 it('refreshes the app token once on a clip lookup 401 and shares the cache with chat',async()=>{
  let tokens=0,clips=0;const fetcher=vi.fn(async(input:string|URL|Request)=>{
   const url=String(input);if(url.endsWith('/token')){tokens++;return Response.json({access_token:`fake-${tokens}`,expires_in:3600});}
   if(url.includes('/clips?'))return ++clips===1?new Response(null,{status:401}):Response.json({data:[{id:slug,broadcaster_id:'123'}]});
   return Response.json({data:[{is_sent:true}]});
  });
  const sender=new TwitchBotSender(credentials,fetcher,()=>0);expect(await sender.clipUrl('123',slug)).toBe(`https://clips.twitch.tv/${slug}`);await sender.send('123','formatted result');expect(tokens).toBe(2);expect(clips).toBe(2);expect(fetcher).toHaveBeenCalledTimes(5);
 });
});
