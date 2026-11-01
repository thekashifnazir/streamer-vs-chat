import {describe,expect,it,vi} from 'vitest';
import {createWorkerRouter,type RoutingEnv,type Hub} from './router';
import {CoachCaps,coachDemoLimits,coachIpHash,coachLimits,fetchCoachToken} from './coach';
import type {CapStorage} from './forge-caps';
class Store implements CapStorage {
 data=new Map<string,unknown>();tail:Promise<unknown>=Promise.resolve();
 transaction<T>(work:(storage:{get<T>(key:string):Promise<T|undefined>;put<T>(key:string,value:T):Promise<unknown>})=>Promise<T>):Promise<T>{
  const operation=this.tail.then(()=>work({get:async<T>(key:string)=>structuredClone(this.data.get(key)) as T|undefined,put:async<T>(key:string,value:T)=>{this.data.set(key,structuredClone(value));}}));this.tail=operation.catch(()=>{});return operation;
 }
}
const KEY='sk_private_test_key';
const twitch=()=>Response.json({client_id:'client',user_id:'123',expires_in:3600,scopes:['user:read:chat']});
function setup(options:{upstream?:()=>Promise<Response>}={}){
 let now=Date.UTC(2026,10,1,12);const hubs=new Map<string,CoachCaps>();
 const upstream=vi.fn<(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>>(options.upstream??(async()=>Response.json({token:'eyJ.conversation.token'})));
 const fetcher=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>String(input).startsWith('https://id.twitch.tv/')?twitch():upstream(input,init));
 const caps=(name:string)=>{let value=hubs.get(name);if(!value){value=new CoachCaps(new Store(),()=>now);hubs.set(name,value);}return value;};
 const idFromName=vi.fn((name:string)=>name);
 const env:RoutingEnv<string>={TWITCH_CLIENT_ID:'client',HOSTED_BOT:'off',HOSTED_CLIPS:'off',HOSTED_FORGE:'off',HOSTED_MEMORY:'off',HOSTED_COACH:'on',COACH_AGENT_ID:'agent_abc123',COACH_DEMO_AGENT_ID:'agent_demo456',ELEVENLABS_API_KEY:KEY,COACH_DAILY_CHANNEL:'3',COACH_DAILY_IP:'2',COACH_DAILY_GLOBAL:'4',ASSETS:{fetch:async()=>new Response('asset')},
  CHANNEL:{idFromName,get:(name:string)=>({coachReserveChannel:(channel:string,max:number)=>caps(name).reserveChannel(channel,max),coachReserveGlobal:(hash:string,global:number,ip:number)=>caps(name).reserveGlobal(hash,global,ip),coachReleaseChannel:(channel:string)=>caps(name).releaseChannel(channel),coachReserveDemo:(hash:string,global:number,ip:number)=>caps(name).reserveGlobal(hash,global,ip)}) as unknown as Hub}};
 return {env,fetcher,upstream,idFromName,route:createWorkerRouter({fetch:fetcher as typeof fetch,now:()=>now}),setTime:(value:number)=>{now=value;}};
}
const post=(ip='203.0.113.7',authorization='Bearer streamer-token',path='/api/coach/token')=>new Request(`https://demo.test${path}`,{method:'POST',headers:{Authorization:authorization,'CF-Connecting-IP':ip}});
describe('corner coach token route',()=>{
 it('is off by default: 503 feature-off before any Twitch or ElevenLabs call, and health reports coach:false',async()=>{
  const s=setup();s.env.HOSTED_COACH='off';const response=await s.route(post(),s.env);
  expect(response.status).toBe(503);expect(await response.json()).toEqual({reason:'feature-off'});expect(s.fetcher).not.toHaveBeenCalled();expect(s.idFromName).not.toHaveBeenCalled();
  delete s.env.HOSTED_COACH;expect((await s.route(post(),s.env)).status).toBe(503);
  expect(await(await s.route(new Request('https://demo.test/api/health'),s.env)).json()).toEqual({bot:false,clips:false,forge:false,memory:false,coach:false,coachDemo:false});
  s.env.HOSTED_COACH='on';expect((await(await s.route(new Request('https://demo.test/api/health'),s.env)).json()).coach).toBe(true);
 });
 it('needs a validated Twitch login and POST, and rejects query overrides',async()=>{
  const s=setup();expect((await s.route(post('1.1.1.1',''),s.env)).status).toBe(401);expect(s.upstream).not.toHaveBeenCalled();
  expect((await s.route(new Request('https://demo.test/api/coach/token',{headers:{Authorization:'Bearer t'}}),s.env)).status).toBe(405);
  expect((await s.route(post('1.1.1.1','Bearer t','/api/coach/token?agent_id=other'),s.env)).status).toBe(400);expect(s.upstream).not.toHaveBeenCalled();
 });
 it('mints a token server-side with the configured agent and key, returning only {token}',async()=>{
  const s=setup(),response=await s.route(post(),s.env);expect(response.status).toBe(200);const text=await response.text();
  expect(JSON.parse(text)).toEqual({token:'eyJ.conversation.token'});expect(text).not.toContain(KEY);expect(response.headers.get('Cache-Control')).toBe('no-store');
  const [url,init]=s.upstream.mock.calls[0]!;expect(String(url)).toBe('https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=agent_abc123');
  expect(init?.headers).toEqual({'xi-api-key':KEY});expect(init?.redirect).toBe('manual');expect(init?.signal).toBeInstanceOf(AbortSignal);
  expect(s.idFromName).toHaveBeenCalledWith('123');expect(s.idFromName).toHaveBeenCalledWith('coach-global');
 });
 it('returns 503 unavailable without spending caps when the key or agent id is missing',async()=>{
  for(const change of [{ELEVENLABS_API_KEY:''},{COACH_AGENT_ID:''},{COACH_AGENT_ID:'bad id/../x'},{ELEVENLABS_API_KEY:undefined}]){
   const s=setup();Object.assign(s.env,change);const response=await s.route(post(),s.env);expect(response.status).toBe(503);expect(await response.json()).toEqual({reason:'unavailable'});expect(s.upstream).not.toHaveBeenCalled();
  }
 });
 it('enforces per-channel, per-IP and global daily caps with 429 daily-cap, resetting at UTC midnight',async()=>{
  const s=setup();
  expect((await s.route(post('10.0.0.1'),s.env)).status).toBe(200);expect((await s.route(post('10.0.0.1'),s.env)).status).toBe(200);
  const ip=await s.route(post('10.0.0.1'),s.env);expect(ip.status).toBe(429);expect(await ip.json()).toEqual({reason:'daily-cap'});
  // The IP-capped attempt gave its channel slot back, so another address still gets the third.
  expect((await s.route(post('10.0.0.2'),s.env)).status).toBe(200);
  const channel=await s.route(post('10.0.0.3'),s.env);expect(channel.status).toBe(429);expect(await channel.json()).toEqual({reason:'daily-cap'});
  expect(s.upstream).toHaveBeenCalledTimes(3);
  s.setTime(Date.UTC(2026,10,2,0,0,1));expect((await s.route(post('10.0.0.1'),s.env)).status).toBe(200);
 });
 it('caps every channel together at the global limit',async()=>{
  const caps=new CoachCaps(new Store(),()=>0),hash=(n:number)=>String(n).padStart(64,'0');
  for(let n=0;n<4;n++)expect(await caps.reserveGlobal(hash(n),4,2)).toEqual({ok:true});
  expect(await caps.reserveGlobal(hash(9),4,2)).toEqual({ok:false,reason:'daily-cap'});
  expect(await caps.reserveGlobal('not-a-hash',4,2)).toEqual({ok:false,reason:'unavailable'});expect(await caps.reserveChannel('coach-global',4)).toEqual({ok:false,reason:'unavailable'});
 });
 it.each([
  ['upstream 401',async()=>new Response('{"detail":"invalid api key sk_private_test_key"}',{status:401})],
  ['upstream throws',async()=>{throw new Error('network sk_private_test_key');}],
  ['missing token',async()=>Response.json({detail:'x'})],
  ['token with spaces',async()=>Response.json({token:'a b'})],
  ['redirect',async()=>new Response(null,{status:302,headers:{Location:'https://evil.test/'}})],
 ])('returns a safe 503 on %s, never upstream text',async(_name,upstream)=>{
  const s=setup({upstream});const response=await s.route(post(),s.env);expect(response.status).toBe(503);const text=await response.text();expect(JSON.parse(text)).toEqual({reason:'unavailable'});expect(text).not.toContain(KEY);
 });
});
const demo=(ip='203.0.113.7',init:RequestInit={method:'POST'},path='/api/coach/demo-token')=>new Request(`https://demo.test${path}`,{...init,headers:{'CF-Connecting-IP':ip,...(init.headers as Record<string,string>|undefined)}});
describe('homepage demo coach token route',()=>{
 it('is off unless HOSTED_COACH_DEMO is on: 503 before any upstream call; health reports coachDemo',async()=>{
  const s=setup();const response=await s.route(demo(),s.env);expect(response.status).toBe(503);expect(await response.json()).toEqual({reason:'feature-off'});expect(s.fetcher).not.toHaveBeenCalled();expect(s.idFromName).not.toHaveBeenCalled();
  s.env.HOSTED_COACH_DEMO='off';expect((await s.route(demo(),s.env)).status).toBe(503);
  expect((await(await s.route(new Request('https://demo.test/api/health'),s.env)).json()).coachDemo).toBe(false);
  s.env.HOSTED_COACH_DEMO='on';expect((await(await s.route(new Request('https://demo.test/api/health'),s.env)).json()).coachDemo).toBe(true);
 });
 it('needs no Twitch login: mints a token from the demo global object only, never calling Twitch',async()=>{
  const s=setup();s.env.HOSTED_COACH_DEMO='on';s.env.HOSTED_COACH='off';const response=await s.route(demo(),s.env);expect(response.status).toBe(200);const text=await response.text();
  // The demo spends its own agent's limits, never the streamers' agent.
  expect(String(s.upstream.mock.calls[0]![0])).toBe('https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=agent_demo456');
  expect(JSON.parse(text)).toEqual({token:'eyJ.conversation.token'});expect(text).not.toContain(KEY);
  expect(s.idFromName.mock.calls.map(call=>call[0])).toEqual(['coach-demo-global']);expect(s.fetcher.mock.calls.every(call=>!String(call[0]).startsWith('https://id.twitch.tv/'))).toBe(true);
  expect((await s.route(demo('1.1.1.1',{method:'GET'}),s.env)).status).toBe(405);expect((await s.route(demo('1.1.1.1',{method:'POST'},'/api/coach/demo-token?agent_id=other'),s.env)).status).toBe(400);expect(s.upstream).toHaveBeenCalledTimes(1);
 });
 it('enforces the demo per-IP and global caps (defaults 3 and 150) with 429, separately from /play caps',async()=>{
  const s=setup();s.env.HOSTED_COACH_DEMO='on';s.env.COACH_DEMO_DAILY_GLOBAL='4';
  for(let n=0;n<3;n++)expect((await s.route(demo('10.0.0.1'),s.env)).status).toBe(200);
  const ip=await s.route(demo('10.0.0.1'),s.env);expect(ip.status).toBe(429);expect(await ip.json()).toEqual({reason:'daily-cap'});
  expect((await s.route(demo('10.0.0.2'),s.env)).status).toBe(200);expect((await s.route(demo('10.0.0.3'),s.env)).status).toBe(429);expect(s.upstream).toHaveBeenCalledTimes(4);
  // The signed-in route keeps its own global counter.
  expect((await s.route(post('10.0.0.1'),s.env)).status).toBe(200);
  s.setTime(Date.UTC(2026,10,2,0,0,1));expect((await s.route(demo('10.0.0.1'),s.env)).status).toBe(200);
 });
 it('returns a safe 503 when the key or agent is missing or upstream fails',async()=>{
  for(const change of [{ELEVENLABS_API_KEY:''},{COACH_DEMO_AGENT_ID:''}]){const s=setup();s.env.HOSTED_COACH_DEMO='on';Object.assign(s.env,change);expect((await s.route(demo(),s.env)).status).toBe(503);expect(s.upstream).not.toHaveBeenCalled();}
  const s=setup({upstream:async()=>new Response('{"detail":"sk_private_test_key"}',{status:401})});s.env.HOSTED_COACH_DEMO='on';const response=await s.route(demo(),s.env);expect(response.status).toBe(503);expect(await response.text()).not.toContain(KEY);
 });
});
it('demo limits parse Worker vars with safe defaults',()=>{
 expect(coachDemoLimits({})).toEqual({ip:3,global:150});expect(coachDemoLimits({COACH_DEMO_DAILY_IP:'5',COACH_DEMO_DAILY_GLOBAL:'0'})).toEqual({ip:5,global:0});expect(coachDemoLimits({COACH_DEMO_DAILY_IP:'x',COACH_DEMO_DAILY_GLOBAL:'-2'})).toEqual({ip:3,global:150});
});
it('limits parse Worker vars with safe defaults',()=>{
 expect(coachLimits({})).toEqual({channel:20,ip:10,global:200});
 expect(coachLimits({COACH_DAILY_CHANNEL:'5',COACH_DAILY_IP:'0',COACH_DAILY_GLOBAL:'1000'})).toEqual({channel:5,ip:0,global:1000});
 expect(coachLimits({COACH_DAILY_CHANNEL:'-1',COACH_DAILY_IP:'1.5',COACH_DAILY_GLOBAL:''})).toEqual({channel:20,ip:10,global:200});
});
it('IP hashes are salted, rotate daily and never contain the address',async()=>{
 const a=await coachIpHash('203.0.113.7','salt','2026-11-01');expect(a).toMatch(/^[0-9a-f]{64}$/);expect(a).not.toContain('203');
 expect(await coachIpHash('203.0.113.7, 10.0.0.1','salt','2026-11-01')).toBe(a);expect(await coachIpHash('203.0.113.7','salt','2026-11-02')).not.toBe(a);expect(await coachIpHash('203.0.113.7','other','2026-11-01')).not.toBe(a);
});
it('token fetch is bounded to the token field',async()=>{expect(await fetchCoachToken(async()=>Response.json({token:'t.k',extra:'leak'}),KEY,'agent')).toBe('t.k');});
