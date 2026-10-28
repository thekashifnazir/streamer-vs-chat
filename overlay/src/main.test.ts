import {afterEach,expect,it,vi} from 'vitest';
const hud=vi.hoisted(()=>({setConnection:vi.fn(),setModes:vi.fn(),render:vi.fn(),renderTally:vi.fn(),setEndcard:vi.fn(),setMemory:vi.fn(),dispose:vi.fn()}));
vi.mock('./hud',()=>({createRailsHud:()=>hud}));
class Socket extends EventTarget {
 static instances:Socket[]=[];
 constructor(_url:string){super();Socket.instances.push(this);}
 close(){this.dispatchEvent(new Event('close'));}
 tick(transport:string){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'tick',state:{},transport})}));}
}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.resetModules();vi.clearAllMocks();Socket.instances=[];});
async function page(){
 vi.useFakeTimers();const window=new EventTarget();Object.assign(window,{setTimeout,clearTimeout});vi.stubGlobal('window',window);vi.stubGlobal('document',{querySelector:()=>({})});vi.stubGlobal('location',{hostname:'localhost'});vi.stubGlobal('WebSocket',Socket);
 await import('./main');return window;
}
it('shows Twitch recovery, backs off overlay reconnects and accepts the replacement snapshot',async()=>{
 const window=await page();const first=Socket.instances[0]!;first.dispatchEvent(new Event('open'));first.tick('reconnecting');expect(hud.setConnection).toHaveBeenLastCalledWith('TWITCH RECONNECTING');
 first.close();await vi.advanceTimersByTimeAsync(999);expect(Socket.instances).toHaveLength(1);await vi.advanceTimersByTimeAsync(1);expect(Socket.instances).toHaveLength(2);
 Socket.instances[1]!.close();await vi.advanceTimersByTimeAsync(1999);expect(Socket.instances).toHaveLength(2);await vi.advanceTimersByTimeAsync(1);expect(Socket.instances).toHaveLength(3);
 const replacement=Socket.instances[2]!;replacement.dispatchEvent(new Event('open'));replacement.tick('connected');expect(hud.render).toHaveBeenLastCalledWith({},false);expect(hud.setConnection).toHaveBeenLastCalledWith('● CHAT CONNECTED');
 window.dispatchEvent(new Event('beforeunload'));await vi.runAllTimersAsync();expect(Socket.instances).toHaveLength(3);expect(hud.dispose).toHaveBeenCalledOnce();
});
it('ignores retired socket events and cannot close or overwrite its replacement',async()=>{
 const window=await page(),old=Socket.instances[0]!;old.close();await vi.advanceTimersByTimeAsync(1000);
 const replacement=Socket.instances[1]!,close=vi.spyOn(replacement,'close');replacement.dispatchEvent(new Event('open'));replacement.tick('connected');vi.clearAllMocks();
 old.dispatchEvent(new Event('error'));old.tick('reconnecting');old.close();old.dispatchEvent(new Event('open'));
 expect(close).not.toHaveBeenCalled();expect(hud.render).not.toHaveBeenCalled();expect(hud.setConnection).not.toHaveBeenCalled();await vi.advanceTimersByTimeAsync(30000);expect(Socket.instances).toHaveLength(2);
 replacement.tick('connected');expect(hud.render).toHaveBeenCalledOnce();window.dispatchEvent(new Event('beforeunload'));vi.clearAllMocks();replacement.tick('reconnecting');replacement.dispatchEvent(new Event('error'));replacement.close();await vi.runAllTimersAsync();
 expect(hud.render).not.toHaveBeenCalled();expect(hud.setConnection).not.toHaveBeenCalled();expect(Socket.instances).toHaveLength(2);
});

it('applies authoritative memory snapshots and clears them independently of game ticks',async()=>{
 const window=await page(),socket=Socket.instances[0]!;const memory={simulated:true,record:{streams:2,bossesKo:1,timesKo:1},hallOfFame:[],nemesis:null,mvpStreak:0};
 socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'memory',memory})}));expect(hud.setMemory).toHaveBeenLastCalledWith(memory);expect(hud.render).not.toHaveBeenCalled();
 socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'memory',memory:null})}));expect(hud.setMemory).toHaveBeenLastCalledWith(null);window.dispatchEvent(new Event('beforeunload'));
});
