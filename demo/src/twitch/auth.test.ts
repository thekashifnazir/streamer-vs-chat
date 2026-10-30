import {afterEach,expect,it,vi} from 'vitest';
import {createBrowserAuth,TwitchAuthError} from './auth';
import {hasLiveCredentials,setLiveCredentials} from '../credentials';
const valid={client_id:'client',user_id:'me',login:'streamer',scopes:['user:read:chat'],expires_in:3600};
function setup(){const data=new Map<string,string>(),strip=vi.fn(),fetch=vi.fn<typeof globalThis.fetch>().mockImplementation(async()=>Response.json(valid));const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
 const auth=createBrowserAuth({clientId:'client',redirectUri:'https://game.example/',fetch,storage,stripCallback:strip,randomBytes:bytes=>bytes.fill(17)});
 const callback=()=>`https://game.example/#access_token=private-token&token_type=bearer&state=${new URL(auth.loginUrl()).searchParams.get('state')}`;
 return{auth,data,fetch,strip,callback,storage};}
afterEach(()=>setLiveCredentials(false));
it('requests the shared hosted scopes with random state and persists only nonce',()=>{const s=setup(),url=new URL(s.auth.loginUrl());expect(url.searchParams.get('scope')).toBe('user:read:chat channel:bot clips:edit');expect(url.searchParams.get('response_type')).toBe('token');expect(url.searchParams.get('state')).toHaveLength(64);expect([...s.data.values()]).toEqual([url.searchParams.get('state')]);});
it('strips the hash before validation then retains the token only in tab storage',async()=>{const s=setup();s.fetch.mockImplementation(async()=>{expect(s.strip).toHaveBeenCalledWith('https://game.example/');expect(hasLiveCredentials()).toBe(true);return Response.json(valid);});expect(await s.auth.consumeCallback(s.callback())).toBe(true);expect([...s.data.values()]).toEqual(['private-token']);expect(s.auth.account?.id).toBe('me');expect(JSON.stringify(s.auth)).not.toContain('private-token');s.auth.clear();expect(hasLiveCredentials()).toBe(false);});
it('rejects state mismatch or callback origin before any request and always strips sensitive hash',async()=>{const s=setup();const callback=s.callback();await expect(s.auth.consumeCallback(callback.replace('state=','state=wrong'))).rejects.toBeInstanceOf(TwitchAuthError);expect(s.fetch).not.toHaveBeenCalled();expect(s.strip).toHaveBeenCalled();const next=s.callback();await expect(s.auth.consumeCallback(next.replace('game.example','evil.example'))).rejects.toBeInstanceOf(TwitchAuthError);expect(s.fetch).not.toHaveBeenCalled();});
it('rejects invalid scopes/client identity and401, clears memory, and does not expose errors',async()=>{for(const value of [{...valid,client_id:'other'},{...valid,scopes:[]},{...valid,expires_in:0}]){const s=setup();s.fetch.mockResolvedValueOnce(Response.json(value));await expect(s.auth.consumeCallback(s.callback())).rejects.toBeInstanceOf(TwitchAuthError);expect(s.auth.hasToken).toBe(false);}const s=setup();await s.auth.consumeCallback(s.callback());s.fetch.mockResolvedValueOnce(new Response('',{status:401}));await expect(s.auth.request('/streams?user_id=me')).rejects.toBeInstanceOf(TwitchAuthError);expect(s.auth.account).toBe(null);expect(hasLiveCredentials()).toBe(false);});
it('adds credentials only to fixed Helix requests and handles denial without retaining callback query',async()=>{const s=setup();await s.auth.consumeCallback(s.callback());await expect(s.auth.request('https://evil.example')).rejects.toThrow();await s.auth.request('/streams');const headers=new Headers(s.fetch.mock.calls.at(-1)?.[1]?.headers);expect(headers.get('Authorization')).toBe('Bearer private-token');expect(headers.get('Client-Id')).toBe('client');const denied=s.callback().split('#')[0]+'?error=access_denied&error_description=no&state=wrong';await expect(s.auth.consumeCallback(denied)).rejects.toBeInstanceOf(TwitchAuthError);expect(s.strip).toHaveBeenLastCalledWith('https://game.example/');expect(s.auth.hasToken).toBe(false);});

it('accepts older chat-only tokens, retains immutable scopes, and sends backend bearer only to allowed same-origin endpoints',async()=>{const s=setup();await s.auth.consumeCallback(s.callback());expect(s.auth.account?.scopes).toEqual(['user:read:chat']);s.auth.account?.scopes.push('channel:bot');expect(s.auth.account?.scopes).toEqual(['user:read:chat']);for(const path of ['//evil/api/results','https://evil/api/results','/api/results?redirect=x','/api/results/../status','/api/unknown'])await expect(s.auth.backendRequest(path)).rejects.toThrow('Invalid hosted API path');await s.auth.backendRequest('/api/results',{method:'POST'});const [path,init]=s.fetch.mock.calls.at(-1)!;expect(path).toBe('/api/results');expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer private-token');expect(init?.redirect).toBe('error');expect(JSON.stringify(s.auth)).not.toContain('private-token');});
it('allows only structured same-origin memory routes with bounded opaque and numeric query values',async()=>{const s=setup();await s.auth.consumeCallback(s.callback());for(const path of ['/api/memory/events','/api/memory/snapshot?sessionId=page-uuid','/api/memory/snapshot?sessionId=page:1&mvpId=123']){await s.auth.backendRequest(path);expect(s.fetch.mock.calls.at(-1)?.[0]).toBe(path);}for(const path of ['/api/memory/snapshot','/api/memory/snapshot?sessionId=x&channel=123','/api/memory/events?channel=123','/api/memory/snapshot?sessionId=x&mvpId=name','/api/memory/snapshot?sessionId=../../results','/api/memory/snapshot?sessionId='+('x'.repeat(101))])await expect(s.auth.backendRequest(path)).rejects.toThrow('Invalid hosted API path');});

it('validates a tab token on reload before authenticating, with the live safety gate already active',async()=>{
 const s=setup();await s.auth.consumeCallback(s.callback());
 let resolve!:(response:Response)=>void;
 const fetch=vi.fn<typeof globalThis.fetch>(()=>new Promise<Response>(done=>{resolve=done;}));
 const reloaded=createBrowserAuth({clientId:'client',redirectUri:'https://game.example/',storage:s.storage,fetch});
 const pending=reloaded.restore();expect(reloaded.hasToken).toBe(true);expect(hasLiveCredentials()).toBe(true);expect(reloaded.authenticated).toBe(false);
 resolve(Response.json(valid));expect(await pending).toBe(true);expect(reloaded.restored).toBe(true);expect(reloaded.account?.login).toBe('streamer');
 reloaded.clear();expect(s.data.size).toBe(0);expect(reloaded.restored).toBe(false);
});
it('clears tab credentials for every validation failure, including unavailable and malformed responses',async()=>{
 for(const failure of [()=>Promise.resolve(new Response('',{status:401})),()=>Promise.resolve(new Response('',{status:503})),()=>Promise.reject(new TypeError('offline')),()=>Promise.resolve(new Response('not json')),()=>Promise.resolve(Response.json({...valid,expires_in:0}))]){
  const s=setup();await s.auth.consumeCallback(s.callback());
  const reloaded=createBrowserAuth({clientId:'client',redirectUri:'https://game.example/',storage:s.storage,fetch:vi.fn(failure)});
  expect(await reloaded.restore()).toBe(false);expect(reloaded.authenticated).toBe(false);expect(reloaded.hasToken).toBe(false);expect(s.data.size).toBe(0);expect(hasLiveCredentials()).toBe(false);
 }
 const s=setup();await s.auth.consumeCallback(s.callback());s.fetch.mockRejectedValueOnce(new TypeError('offline'));await expect(s.auth.validate()).rejects.toThrow();expect(s.data.size).toBe(0);
});
it('clears stored credentials on a backend 401 just like a Helix 401 and disconnect',async()=>{
 for(const path of ['backend','helix','disconnect']){
  const s=setup();await s.auth.consumeCallback(s.callback());
  if(path==='disconnect')s.auth.clear();else{s.fetch.mockResolvedValueOnce(new Response('',{status:401}));await expect(path==='backend'?s.auth.backendRequest('/api/status'):s.auth.request('/streams')).rejects.toBeInstanceOf(TwitchAuthError);}
  expect(s.data.size).toBe(0);expect(s.auth.hasToken).toBe(false);
 }
});
it('handles blocked session storage without touching localStorage or issuing a request',async()=>{
 const local=vi.fn(()=>{throw new Error('localStorage must never be used');});vi.stubGlobal('localStorage',{getItem:local,setItem:local,removeItem:local});
 try{
  const unavailable=()=>{throw new Error('storage denied');},fetch=vi.fn<typeof globalThis.fetch>();
  const auth=createBrowserAuth({clientId:'client',redirectUri:'https://game.example/',fetch,storage:{getItem:unavailable,setItem:unavailable,removeItem:unavailable}});
  expect(await auth.restore()).toBe(false);auth.clear();expect(()=>auth.loginUrl()).toThrow('session storage');expect(fetch).not.toHaveBeenCalled();expect(local).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
it('keeps a valid callback playable when writing the session token fails',async()=>{
 const s=setup();const callback=s.callback();const auth=createBrowserAuth({clientId:'client',redirectUri:'https://game.example/',fetch:s.fetch,stripCallback:s.strip,storage:{...s.storage,setItem:()=>{throw new Error('quota');}}});
 expect(await auth.consumeCallback(callback)).toBe(true);expect(auth.authenticated).toBe(true);expect(s.data.size).toBe(0);auth.clear();
});
it('does not resurrect a disconnected restore or persist an in-flight callback after clear',async()=>{
 for(const kind of ['restore','callback']){
  const s=setup();await s.auth.consumeCallback(s.callback());
  let resolve!:(response:Response)=>void;s.fetch.mockImplementationOnce(()=>new Promise<Response>(done=>{resolve=done;}));
  const pending=kind==='restore'?createBrowserAuth({clientId:'client',redirectUri:'https://game.example/',storage:s.storage,fetch:s.fetch}):s.auth;
  const operation=kind==='restore'?pending.restore():pending.consumeCallback(s.callback());
  const settled=operation.then(value=>({value}),()=>({value:false}));pending.clear();resolve(Response.json(valid));expect((await settled).value).toBe(false);
  expect(pending.account).toBe(null);expect(pending.restored).toBe(false);expect(pending.hasToken).toBe(false);expect(s.data.size).toBe(0);
 }
});
it('ignores stale validation success/failure and backend/Helix 401 after a newer login',async()=>{
 for(const kind of ['validation-success','validation-failure','backend','helix']){
  const s=setup();await s.auth.consumeCallback(s.callback());
  let resolve!:(response:Response)=>void;s.fetch.mockImplementationOnce(()=>new Promise<Response>(done=>{resolve=done;}));
  const operation=kind.startsWith('validation')?s.auth.validate():kind==='backend'?s.auth.backendRequest('/api/status'):s.auth.request('/streams');
  const settled=operation.catch(()=>null);
  await s.auth.consumeCallback(s.callback().replace('private-token','new-token'));
  resolve(kind==='validation-success'?Response.json({...valid,login:'old-name'}):new Response('',{status:401}));await settled;
  expect(s.auth.account?.login).toBe('streamer');expect(s.auth.authenticated).toBe(true);expect([...s.data.values()]).toEqual(['new-token']);expect(hasLiveCredentials()).toBe(true);
 }
});
