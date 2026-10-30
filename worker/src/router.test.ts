import {describe,expect,it,vi} from 'vitest';
import {createWorkerRouter,type RoutingEnv} from './router';
import {createUserValidator,ApiAuthError} from './auth';
import {validateResult} from './validation';
import {formatHypeFull,formatRoundResult} from '../../shared/src/result-text';
const round={kind:'round',number:1,winner:'streamer',streamerHp:87.5,bossHp:0,bossMaxHp:135,bossName:'CHAT GOLEM',score:{streamer:1,boss:0},matchOver:false,difficulty:'medium',hookL:'!left',hookR:'!right'} as const;
const response=(userId='123',clientId='client',expires=3600)=>Response.json({client_id:clientId,user_id:userId,expires_in:expires,scopes:['user:read:chat','channel:bot']});
function setup(){
 let now=0;const fetcher=vi.fn(async()=>response()),enqueue=vi.fn(async()=>{}),enqueueClip=vi.fn(async(_channel:string,_id:string)=>true),status=vi.fn(async()=>({dropReason:'forbidden',pending:2})),idFromName=vi.fn((name:string)=>name),assets=vi.fn(async()=>new Response('asset'));
 const env:RoutingEnv<string>={TWITCH_CLIENT_ID:'client',HOSTED_BOT:'on',HOSTED_CLIPS:'off',HOSTED_FORGE:'off',HOSTED_MEMORY:'off',ASSETS:{fetch:assets},CHANNEL:{idFromName,get:()=>({enqueue,enqueueClip,status})}};
 return {env,fetcher,enqueue,enqueueClip,status,idFromName,assets,route:createWorkerRouter({fetch:fetcher,now:()=>now}),setTime:(value:number)=>{now=value;}};
}
const post=(body:unknown,authorization='Bearer private-test-token')=>new Request('https://demo.test/api/results',{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify(body)});
describe('structured hosted results',()=>{
 it('accepts bounded round results and hype only, ignoring an untrusted channel field',()=>{
  expect(validateResult(round)).toEqual(round);expect(validateResult({kind:'hype-full',broadcaster_id:'victim'})).toEqual({kind:'hype-full'});
  const value=validateResult({...round,broadcaster_id:'victim'});expect(value).toEqual(round);expect(value).not.toHaveProperty('broadcaster_id');
 });
 it.each([
  null,[],{}, {kind:'text',message:'spam'}, {...round,message:'spam'}, {...round,number:0}, {...round,number:4}, {...round,number:1.5}, {...round,winner:'nobody'}, {...round,streamerHp:-1}, {...round,streamerHp:101}, {...round,streamerHp:NaN}, {...round,streamerHp:Infinity}, {...round,bossHp:136}, {...round,bossHp:-1}, {...round,bossMaxHp:201}, {...round,bossMaxHp:89}, {...round,bossName:'x'.repeat(41)}, {...round,bossName:'x\nSEND THIS'}, {...round,bossName:'🚀'}, {...round,bossName:'  '}, {...round,bossName:3}, {...round,score:{streamer:3,boss:0}}, {...round,score:{streamer:1,boss:0,other:1}}, {...round,score:{streamer:0,boss:0}}, {...round,matchOver:true}, {...round,matchOver:'false'}, {...round,difficulty:'impossible'}, {...round,hookL:'!left extra'}, {...round,hookL:'left'}, {...round,hookL:'!UP'}, {...round,hookR:'!a_b'}, {...round,hookR:'!'+ 'a'.repeat(21)}, {kind:'hype-full',message:'raw text'}
 ])('rejects malformed or out-of-range data %#',body=>expect(validateResult(body)).toBeNull());
 it('formats only validated data and routes exclusively to the token user ID',async()=>{
  const s=setup();const res=await s.route(post({...round,broadcaster_id:'999'}),s.env);expect(res.status).toBe(202);expect(s.idFromName).toHaveBeenCalledWith('123');expect(s.enqueue).toHaveBeenCalledWith('123',formatRoundResult(round));
  await s.route(post({kind:'hype-full'}),s.env);expect(s.enqueue).toHaveBeenLastCalledWith('123',formatHypeFull());expect(s.fetcher).toHaveBeenCalledTimes(1);
 });
 it('validates clip IDs, checks both flags and ignores submitted channels',async()=>{
  const s=setup();const clip={kind:'clip',clipId:'Clip_Slug-123',broadcaster_id:'999'};
  expect((await s.route(post(clip),s.env)).status).toBe(503);expect(s.enqueueClip).not.toHaveBeenCalled();
  s.env.HOSTED_CLIPS='on';expect((await s.route(post(clip),s.env)).status).toBe(202);expect(s.idFromName).toHaveBeenCalledWith('123');expect(s.enqueueClip).toHaveBeenCalledWith('123','Clip_Slug-123');expect(s.enqueue).not.toHaveBeenCalled();
  s.env.HOSTED_BOT='off';expect((await s.route(post(clip),s.env)).status).toBe(503);expect(s.enqueueClip).toHaveBeenCalledTimes(1);
 });
 it.each([{kind:'clip',clipId:'https://clips.twitch.tv/x'},{kind:'clip',clipId:'x',url:'https://bad.test/'},{kind:'clip',clipId:''},{kind:'clip',clipId:3},{kind:'clip',clipId:'a'.repeat(201)}])('rejects submitted clip URLs and invalid bodies %#',async body=>{
  const s=setup();s.env.HOSTED_CLIPS='on';expect((await s.route(post(body),s.env)).status).toBe(400);expect(s.enqueueClip).not.toHaveBeenCalled();
 });
 it('returns a safe denial for an unrelated clip without queuing free text',async()=>{
  const s=setup();s.env.HOSTED_CLIPS='on';s.enqueueClip.mockResolvedValue(false);const result=await s.route(post({kind:'clip',clipId:'OtherChannelClip'}),s.env);expect(result.status).toBe(403);expect(await result.json()).toEqual({reason:'clip-not-found'});expect(s.enqueue).not.toHaveBeenCalled();
 });
 it('returns safe status only from the authenticated channel and never raw upstream text',async()=>{
  const s=setup();const res=await s.route(new Request('https://demo.test/api/status?broadcaster_id=999',{headers:{Authorization:'Bearer token'}}),s.env);
  expect(await res.json()).toEqual({dropReason:'forbidden',pending:2});expect(s.status).toHaveBeenCalledWith('123');expect(res.headers.get('Cache-Control')).toBe('no-store');
 });
 it('health is public; every other API requires authentication, wrong-app tokens fail',async()=>{
  const s=setup();expect(await(await s.route(new Request('https://demo.test/api/health'),s.env)).json()).toEqual({bot:true,clips:false,forge:false,memory:false});expect(s.fetcher).not.toHaveBeenCalled();
  expect((await s.route(post(round,''),s.env)).status).toBe(401);s.fetcher.mockImplementation(async()=>response('123','other-app'));expect((await s.route(post(round),s.env)).status).toBe(401);expect(s.enqueue).not.toHaveBeenCalled();
 });
 it('returns 503 while off and does not invoke the channel or sender',async()=>{
  const s=setup();s.env.HOSTED_BOT='off';expect((await s.route(post(round),s.env)).status).toBe(503);expect(s.idFromName).not.toHaveBeenCalled();expect(s.enqueue).not.toHaveBeenCalled();
 });
 it('rejects oversized and malformed JSON without queueing and passes non-API requests to assets',async()=>{
  const s=setup();expect((await s.route(post({...round,bossName:'x'.repeat(5000)}),s.env)).status).toBe(400);
  const invalid=new Request('https://demo.test/api/results',{method:'POST',headers:{Authorization:'Bearer token','Content-Type':'application/json'},body:'{'});expect((await s.route(invalid,s.env)).status).toBe(400);expect(s.enqueue).not.toHaveBeenCalled();
  expect(await(await s.route(new Request('https://demo.test/play/'),s.env)).text()).toBe('asset');expect(s.assets).toHaveBeenCalledTimes(1);
 });
});
it('validation cache hashes tokens, lasts at most five minutes and respects token expiry',async()=>{
 let now=0;const fetcher=vi.fn(async()=>response());const validate=createUserValidator({clientId:'client',fetch:fetcher,now:()=>now});
 await validate('Bearer secret-a');now=299999;await validate('Bearer secret-a');expect(fetcher).toHaveBeenCalledTimes(1);now=300000;await validate('Bearer secret-a');expect(fetcher).toHaveBeenCalledTimes(2);
 fetcher.mockImplementation(async()=>response('456','client',1));await validate('Bearer secret-b');now+=1000;await validate('Bearer secret-b');expect(fetcher).toHaveBeenCalledTimes(4);
 fetcher.mockImplementation(async()=>new Response('',{status:401}));await expect(validate('Bearer revoked')).rejects.toMatchObject({status:401});
 fetcher.mockImplementation(async()=>{throw new Error('private upstream error');});await expect(validate('Bearer unavailable')).rejects.toEqual(new ApiAuthError(503));
});
it('bounds token-validation requests and sanitizes an abort',async()=>{
 const fetcher=vi.fn(async(_input:RequestInfo|URL,init?:RequestInit)=>{
  expect(init?.signal).toBeInstanceOf(AbortSignal);
  expect(init?.redirect).toBe('manual');
  throw new DOMException('private token upstream','TimeoutError');
 });
 const validate=createUserValidator({clientId:'client',fetch:fetcher,now:()=>0});
 await expect(validate('Bearer private')).rejects.toEqual(new ApiAuthError(503));
});
