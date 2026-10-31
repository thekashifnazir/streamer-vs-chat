import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';
const auth=vi.hoisted(()=>({getBrowserAuth:vi.fn()}));
// Isolate entry side effects; existing hosted-results guard tests cover main's live-only import.
vi.mock('./main',()=>({}));
vi.mock('./twitch/auth',()=>({getBrowserAuth:auth.getBrowserAuth}));
afterEach(()=>vi.unstubAllGlobals());
it('does not load a tab-stored token or call Twitch/API on the no-login entry',async()=>{
 vi.resetModules();auth.getBrowserAuth.mockClear();const dom=new JSDOM('',{url:'https://streamervschat.kashifnazir.com/'});
 dom.window.sessionStorage.setItem('svc.twitch.access-token','stored-live-token');
 const get=vi.spyOn(dom.window.Storage.prototype,'getItem'),fetch=vi.fn();vi.stubGlobal('sessionStorage',dom.window.sessionStorage);vi.stubGlobal('location',dom.window.location);vi.stubGlobal('history',dom.window.history);vi.stubGlobal('fetch',fetch);
 try{await import('./entry');expect(auth.getBrowserAuth).not.toHaveBeenCalled();expect(get).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();}finally{get.mockRestore();dom.window.close();}
});

it.each([false,true])('fully navigates the callback to the play document (error %s)',async failed=>{
 vi.resetModules();const replace=vi.fn(),consumeCallback=vi.fn(async()=>{if(failed)throw new Error('rejected');});
 auth.getBrowserAuth.mockReturnValue({consumeCallback});vi.stubGlobal('location',{hash:'#access_token=tab-token',search:'',replace});
 await import('./entry');expect(consumeCallback).toHaveBeenCalledOnce();expect(replace).toHaveBeenCalledWith(failed?'/play?oauthError=1':'/play');expect(consumeCallback.mock.invocationCallOrder[0]).toBeLessThan(replace.mock.invocationCallOrder[0]!);
});
it('keeps the hosted document and runtime window title identical to OBS instructions',async()=>{
 const {readFileSync}=await import('node:fs');
 const html=readFileSync(new URL('../play/index.html',import.meta.url),'utf8'),main=readFileSync(new URL('./main.ts',import.meta.url),'utf8');
 expect(html).toContain('<title>Streamer vs Chat · Twitch play</title>');expect(main).toContain("document.title='Streamer vs Chat · Twitch play'");
});
