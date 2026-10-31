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
 const get=vi.spyOn(dom.window.Storage.prototype,'getItem'),fetch=vi.fn();vi.stubGlobal('sessionStorage',dom.window.sessionStorage);vi.stubGlobal('location',dom.window.location);vi.stubGlobal('history',dom.window.history);vi.stubGlobal('document',dom.window.document);vi.stubGlobal('fetch',fetch);
 try{await import('./entry');expect(auth.getBrowserAuth).not.toHaveBeenCalled();expect(get).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();}finally{get.mockRestore();dom.window.close();}
});

it.each([false,true])('fully navigates the callback to the play document (error %s)',async failed=>{
 vi.resetModules();const doc=new JSDOM('<body class=entry-loading><p id=entry-status>Loading</p></body>').window.document;vi.stubGlobal('document',doc);const replace=vi.fn(),consumeCallback=vi.fn(async()=>{if(failed)throw new Error('rejected');});
 auth.getBrowserAuth.mockReturnValue({consumeCallback});vi.stubGlobal('location',{hash:'#access_token=tab-token',search:'',replace});
 await import('./entry');expect(doc.getElementById('entry-status')!.textContent).toBe('Connecting to Twitch…');expect(doc.body.classList.contains('entry-loading')).toBe(true);expect(consumeCallback).toHaveBeenCalledOnce();expect(replace).toHaveBeenCalledWith(failed?'/play?oauthError=1':'/play');expect(consumeCallback.mock.invocationCallOrder[0]).toBeLessThan(replace.mock.invocationCallOrder[0]!);
});
it('keeps the hosted document and runtime window title identical to OBS instructions',async()=>{
 const {readFileSync}=await import('node:fs');
 const html=readFileSync(new URL('../play/index.html',import.meta.url),'utf8'),main=readFileSync(new URL('./main.ts',import.meta.url),'utf8');
 expect(html).toContain('<title>Streamer vs Chat · Twitch play</title>');expect(main).toContain("document.title='Streamer vs Chat · Twitch play'");
});
// OAuth lands on / and then replaces to /play; both documents paint before entry.ts or the
// JS-loaded page CSS runs, so each needs its own render-blocking dark shell.
it.each(['../index.html','../play/index.html'])('%s ships a dark inline loading shell before callback code or page CSS loads',async page=>{
 const {readFileSync}=await import('node:fs');const html=readFileSync(new URL(page,import.meta.url),'utf8');const dom=new JSDOM(html);try{
 const doc=dom.window.document;expect(doc.body.classList.contains('entry-loading')).toBe(true);expect(doc.getElementById('entry-status')!.getAttribute('role')).toBe('status');expect(html).toContain('.entry-loading> :not(#entry-status){visibility:hidden}');expect(html).toContain('html{background:#0c0912;color:#f5f2fa}');expect([...doc.scripts].every(script=>script.hasAttribute('src'))).toBe(true);
 }finally{dom.window.close();}
});
it('reveals the /play page once its code and CSS have loaded',async()=>{
 vi.resetModules();auth.getBrowserAuth.mockClear();const {readFileSync}=await import('node:fs');
 const dom=new JSDOM(readFileSync(new URL('../play/index.html',import.meta.url),'utf8'),{url:'https://streamervschat.kashifnazir.com/play/?oauthError=1'});
 vi.stubGlobal('document',dom.window.document);vi.stubGlobal('location',dom.window.location);
 try{await import('./entry');expect(auth.getBrowserAuth).not.toHaveBeenCalled();expect(dom.window.document.body.classList.contains('entry-loading')).toBe(false);expect(dom.window.document.getElementById('entry-status')).toBeNull();}finally{dom.window.close();}
});
