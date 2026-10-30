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
