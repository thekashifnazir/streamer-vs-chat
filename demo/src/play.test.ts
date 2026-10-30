import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createBrowserAuth} from './twitch/auth';
import {setLiveCredentials} from './credentials';
import {mountHostedPlay} from './play';
const bridge=vi.hoisted(()=>({auth:null as any,chat:null as any,start:vi.fn(),stop:vi.fn(),initialize:vi.fn(async()=>{})}));
vi.mock('./twitch/auth',async original=>({...await original<typeof import('./twitch/auth')>(),getBrowserAuth:()=>bridge.auth}));
vi.mock('./twitch/eventsub',()=>({createBrowserChat:(options:any)=>{bridge.chat=options;return{start:bridge.start.mockImplementation(async()=>options.onStatus('connected')),stop:bridge.stop};}}));
vi.mock('./hosted-results',()=>({createHostedResults:()=>({available:false,capable:false,enabled:false,initialize:bridge.initialize,setEnabled:()=>false,postClip:vi.fn(),observeGame:vi.fn(),dispose:vi.fn()})}));
vi.mock('./hosted-clips',()=>({createHostedClips:()=>({available:false,capable:false,enabled:false,initialize:bridge.initialize,setEnabled:()=>false,observeGame:vi.fn(),snapshot:()=>[],dispose:vi.fn()})}));
vi.mock('./hosted-forge',()=>({createHostedForge:()=>({available:false,capable:false,enabled:false,busy:false,initialize:bridge.initialize,setEnabled:()=>false,onChat:vi.fn(),observePhase:vi.fn(),dispose:vi.fn()})}));
vi.mock('./hosted-memory',()=>({createHostedMemory:()=>({available:false,capable:false,enabled:false,initialize:bridge.initialize,setEnabled:()=>false,onChat:vi.fn(),acceptedVote:vi.fn(),observeGame:vi.fn(),finalize:vi.fn(),view:()=>null,publicSummary:(v:unknown)=>v,dispose:vi.fn()})}));
let dom:JSDOM,ui:ReturnType<typeof mountHostedPlay>|undefined;
beforeEach(()=>{vi.clearAllMocks();dom=new JSDOM(readFileSync(new URL('../play/index.html',import.meta.url),'utf8'),{url:'https://streamervschat.kashifnazir.com/play'});vi.stubGlobal('document',dom.window.document);vi.stubGlobal('location',dom.window.location);vi.stubGlobal('history',dom.window.history);});
afterEach(()=>{ui?.dispose();ui=undefined;dom.window.close();setLiveCredentials(false);vi.unstubAllGlobals();});
function setup(request:typeof fetch){const data=new Map([['svc.twitch.access-token','tab-token']]);bridge.auth=createBrowserAuth({clientId:'client',redirectUri:'https://streamervschat.kashifnazir.com/',fetch:request,storage:{getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);},removeItem:key=>{data.delete(key);}}});const onRaid=vi.fn();ui=mountHostedPlay({getState:()=>null,onVote:()=>false,onRaid,onControl:vi.fn(),onViewers:vi.fn(),onDisconnect:vi.fn(),onSummary:vi.fn(),betweenRounds:()=>true,onForgeAccepted:vi.fn(),onForgeSnapshot:vi.fn()});return{data,onRaid};}
const valid={client_id:'client',user_id:'me',login:'streamer',scopes:['user:read:chat'],expires_in:3600};
it('validates the tab token before silently starting chat, shows Reconnected, routes raids and clears Disconnect',async()=>{
 const request=vi.fn<typeof fetch>(async()=>{expect(bridge.start).not.toHaveBeenCalled();return Response.json(valid);});const s=setup(request);
 await vi.waitFor(()=>expect(bridge.start).toHaveBeenCalledOnce());expect(request).toHaveBeenCalledWith('https://id.twitch.tv/oauth2/validate',expect.anything());expect(dom.window.document.querySelector('.demo-tag')!.textContent).toBe('Reconnected as streamer');bridge.chat.onRaid({kind:'raid',viewers:12});expect(s.onRaid).toHaveBeenCalledWith({kind:'raid',viewers:12});
 dom.window.document.getElementById('twitch-disconnect')!.click();expect(s.data.size).toBe(0);expect(bridge.auth.hasToken).toBe(false);expect(dom.window.document.querySelector('.demo-tag')!.textContent).toBe('Not connected');
});
it('clears an expired reload token and leaves the normal Connect step without starting chat',async()=>{
 const s=setup(vi.fn<typeof fetch>(async()=>new Response(null,{status:401})));
 await vi.waitFor(()=>expect(bridge.initialize).toHaveBeenCalled());expect(s.data.size).toBe(0);expect(bridge.start).not.toHaveBeenCalled();const button=dom.window.document.getElementById('twitch-connect') as HTMLButtonElement;expect(button.hidden).toBe(false);expect(button.textContent).toBe('Connect with Twitch');expect(dom.window.document.querySelector('.demo-tag')!.textContent).toBe('Not connected');
});
it('does not open a socket if the page is disposed while reload validation is pending',async()=>{
 let finish!:(value:Response)=>void;setup(vi.fn<typeof fetch>(()=>new Promise(resolve=>{finish=resolve;})));ui!.dispose();ui=undefined;finish(Response.json(valid));await new Promise(resolve=>setTimeout(resolve,0));expect(bridge.start).not.toHaveBeenCalled();expect(bridge.initialize).not.toHaveBeenCalled();
});

it('cannot offer a new live fight after a backend 401 clears auth while the socket is still open',async()=>{
 const s=setup(vi.fn<typeof fetch>(async input=>String(input).includes('/oauth2/validate')?Response.json(valid):new Response(null,{status:401})));
 await vi.waitFor(()=>expect(bridge.start).toHaveBeenCalledOnce());expect(ui!.ready).toBe(true);
 await expect(bridge.auth.backendRequest('/api/status')).rejects.toThrow();expect(s.data.size).toBe(0);expect(ui!.hasToken).toBe(false);expect(ui!.ready).toBe(false);
});
