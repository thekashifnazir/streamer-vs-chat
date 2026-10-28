import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createBrowserChat,type BrowserSocket} from './eventsub';
import {TwitchAuthError,type BrowserAuth} from './auth';
class Socket implements BrowserSocket{
 listeners=new Map<string,((event:{data?:unknown})=>void)[]>();closed=false;
 constructor(readonly url:string){}
 addEventListener(type:string,callback:(event:{data?:unknown})=>void){this.listeners.set(type,[...(this.listeners.get(type)??[]),callback]);}
 emit(type:string,data?:unknown){for(const callback of this.listeners.get(type)??[])callback({data});}
 message(value:unknown){this.emit('message',JSON.stringify(value));}
 close(){this.closed=true;this.emit('close');}
 welcome(id='session',keepalive=10){this.message({metadata:{message_type:'session_welcome'},payload:{session:{id,keepalive_timeout_seconds:keepalive}}});}
}
function setup(){
 const sockets:Socket[]=[],vote=vi.fn(),chat=vi.fn(),control=vi.fn(),status=vi.fn(),viewers=vi.fn();
 const validate=vi.fn(async()=>({id:'me',login:'streamer',expiresIn:3600})),clear=vi.fn(),request=vi.fn(async(path:string,_init?:RequestInit)=>path.startsWith('/streams')?Response.json({data:[{viewer_count:17}]}):new Response(null,{status:202}));
 const auth={account:{id:'me',login:'streamer',expiresIn:3600},validate,request,clear} as unknown as BrowserAuth;
 const client=createBrowserChat({auth,onVote:vote,onChat:chat,onControl:control,onStatus:status,onViewers:viewers,socket:url=>{const value=new Socket(url);sockets.push(value);return value;}});
 const notification=(id:string,text:string,user='viewer',channel='me',badges:unknown[]=[])=>({metadata:{message_type:'notification',message_id:id},payload:{subscription:{type:'channel.chat.message'},event:{broadcaster_user_id:channel,chatter_user_id:user,badges,message:{text}}}});
 return{client,sockets,vote,chat,control,status,viewers,validate,request,clear,notification};
}
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(0);});afterEach(()=>vi.useRealTimers());
it('subscribes only me/me read chat after welcome and parses real-shaped chat, distinct counts and controls',async()=>{
 const s=setup();await s.client.start();await vi.advanceTimersByTimeAsync(0);expect(s.validate).toHaveBeenCalledOnce();expect(s.viewers).toHaveBeenCalledWith(17);expect(s.sockets[0]?.url).toBe('wss://eventsub.wss.twitch.tv/ws');
 const socket=s.sockets[0]!;socket.welcome();await vi.advanceTimersByTimeAsync(0);
 const subscription=s.request.mock.calls.find(([path])=>path==='/eventsub/subscriptions')!;
 expect(JSON.parse((subscription[1] as RequestInit).body as string)).toEqual({type:'channel.chat.message',version:'1',condition:{broadcaster_user_id:'me',user_id:'me'},transport:{method:'websocket',session_id:'session'}});
 socket.message(s.notification('1','!JaB later words'));socket.message(s.notification('1','!JaB'));socket.message(s.notification('2','hello'));socket.message(s.notification('3','!hookr','bad','other'));
 expect(s.chat.mock.calls).toEqual([['viewer'],['viewer']]);expect(s.vote).toHaveBeenCalledExactlyOnceWith({kind:'vote',user:'viewer',move:'JAB',at:0,simulated:false});
 socket.message(s.notification('4','!veto'));expect(s.control).not.toHaveBeenCalled();socket.message(s.notification('5','!veto','mod','me',[{set_id:'moderator'}]));socket.message(s.notification('6','stop','me'));
 expect(s.control.mock.calls.map(([value])=>value.action)).toEqual(['veto','stop']);s.client.stop();expect(vi.getTimerCount()).toBe(0);
});
it('hands off reconnect URL as-is, retains old socket until welcome, carries subscriptions and deduplicates overlap',async()=>{
 const s=setup();await s.client.start();const old=s.sockets[0]!;old.welcome();await vi.advanceTimersByTimeAsync(0);
 old.message({metadata:{message_type:'session_reconnect'},payload:{session:{reconnect_url:'wss://eventsub.wss.twitch.tv/ws?reconnect=opaque'}}});
 expect(old.closed).toBe(false);const next=s.sockets[1]!;expect(next.url).toBe('wss://eventsub.wss.twitch.tv/ws?reconnect=opaque');old.message(s.notification('one','!jab'));next.welcome('replacement');next.message(s.notification('one','!jab'));await vi.advanceTimersByTimeAsync(0);
 expect(old.closed).toBe(true);expect(s.vote).toHaveBeenCalledOnce();expect(s.request.mock.calls.filter(([path])=>path==='/eventsub/subscriptions')).toHaveLength(1);s.client.stop();
});
it('resets keepalive watchdog on notifications, then cold reconnects with validation/backoff and resubscription',async()=>{
 const s=setup();await s.client.start();s.sockets[0]!.welcome();await vi.advanceTimersByTimeAsync(9000);s.sockets[0]!.message(s.notification('one','hello'));
 await vi.advanceTimersByTimeAsync(9000);expect(s.sockets).toHaveLength(1);await vi.advanceTimersByTimeAsync(1000);expect(s.sockets[0]!.closed).toBe(true);
 await vi.advanceTimersByTimeAsync(999);expect(s.sockets).toHaveLength(1);await vi.advanceTimersByTimeAsync(1);expect(s.sockets).toHaveLength(2);expect(s.validate).toHaveBeenCalledTimes(2);
 s.sockets[1]!.welcome('cold');await vi.advanceTimersByTimeAsync(0);expect(s.request.mock.calls.filter(([path])=>path==='/eventsub/subscriptions')).toHaveLength(2);s.client.stop();
});
it('validates hourly and stops all transport on401 instead of leaking rejected reconnect promises',async()=>{
 const s=setup();await s.client.start();const socket=s.sockets[0]!;socket.welcome('long',600);
 for(let i=0;i<6;i++){await vi.advanceTimersByTimeAsync(599999);socket.message({metadata:{message_type:'session_keepalive'},payload:{}});}
 expect(s.validate).toHaveBeenCalledOnce();s.validate.mockRejectedValueOnce(new TwitchAuthError());await vi.advanceTimersByTimeAsync(6);
 expect(s.validate).toHaveBeenCalledTimes(2);expect(s.status).toHaveBeenLastCalledWith('login-required');expect(s.clear).toHaveBeenCalledOnce();expect(socket.closed).toBe(true);expect(vi.getTimerCount()).toBe(0);expect(s.request.mock.calls.filter(([path])=>path.startsWith('/streams'))).toHaveLength(60);
});
it('cancels in-flight startup, rejects hostile reconnect hosts and recovers from temporary validation failure',async()=>{
 const s=setup();let resolve!:()=>void;s.validate.mockImplementationOnce(()=>new Promise<void>(done=>{resolve=done;}) as never);const start=s.client.start();s.client.stop();resolve();await start;expect(s.sockets).toHaveLength(0);
 s.validate.mockRejectedValueOnce(new Error('offline'));await s.client.start();expect(s.status).toHaveBeenLastCalledWith('reconnecting');await vi.advanceTimersByTimeAsync(1000);expect(s.sockets).toHaveLength(1);
 s.sockets[0]!.welcome();s.sockets[0]!.message({metadata:{message_type:'session_reconnect'},payload:{session:{reconnect_url:'wss://evil.example/token'}}});expect(s.sockets.some(socket=>socket.url.includes('evil'))).toBe(false);s.client.stop();
});
it('ignores stale subscription responses after cold reconnect retires the originating socket',async()=>{
 const s=setup();let finish!:(response:Response)=>void;s.request.mockImplementationOnce(async()=>Response.json({data:[]}));s.request.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 await s.client.start();s.sockets[0]!.welcome();s.sockets[0]!.close();await vi.advanceTimersByTimeAsync(1000);
 expect(s.sockets).toHaveLength(2);expect(s.status).toHaveBeenLastCalledWith('reconnecting');finish(new Response(null,{status:202}));await vi.advanceTimersByTimeAsync(0);expect(s.status).toHaveBeenLastCalledWith('reconnecting');s.client.stop();
});
it('handles subscription401 without retrying an expired token',async()=>{
 const s=setup();s.request.mockImplementation(async path=>{if(path==='/eventsub/subscriptions')throw new TwitchAuthError();return Response.json({data:[]});});
 await s.client.start();s.sockets[0]!.welcome();await vi.advanceTimersByTimeAsync(0);expect(s.status).toHaveBeenLastCalledWith('login-required');expect(s.clear).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
