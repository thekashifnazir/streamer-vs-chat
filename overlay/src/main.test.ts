import {afterEach,expect,it,vi} from 'vitest';
const hud=vi.hoisted(()=>({setBossReceipts:vi.fn(),setSuperNotices:vi.fn(),setInputLocked:vi.fn(),setConnection:vi.fn(),setModes:vi.fn(),render:vi.fn(),renderTally:vi.fn(),setEndcard:vi.fn(),setMemory:vi.fn(),setForge:vi.fn(),dispose:vi.fn()}));
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
it('passes authoritative Forge phase snapshots to the view without starting a game',async()=>{
 const window=await page(),socket=Socket.instances[0]!;
 const forge={betweenRounds:true,status:'collecting',ideas:[],idea:null,boss:null,errors:[],before:null,after:null,factor:null,ai:null};
 socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'forge',forge})}));expect(hud.setForge).toHaveBeenLastCalledWith(forge);expect(hud.render).not.toHaveBeenCalled();
 socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'forge',forge:{...forge,betweenRounds:false}})}));expect(hud.setForge).toHaveBeenLastCalledWith({...forge,betweenRounds:false});window.dispatchEvent(new Event('beforeunload'));
});

it('shows the server-owned input lock independently of ordinary game renders',async()=>{
 const window=await page(),socket=Socket.instances[0]!;expect(hud.setInputLocked).toHaveBeenLastCalledWith(true);
 const tick=(inputsStopped:boolean)=>socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'tick',state:{},inputsStopped})}));
 tick(true);expect(hud.setInputLocked).toHaveBeenLastCalledWith(true);socket.tick('connected');expect(hud.setInputLocked).toHaveBeenLastCalledWith(true);
 tick(false);expect(hud.setInputLocked).toHaveBeenLastCalledWith(false);tick(true);expect(hud.setInputLocked).toHaveBeenLastCalledWith(true);window.dispatchEvent(new Event('beforeunload'));
});
it('primes boss receipts once on each connection and forwards subsequent batches before rendering',async()=>{
 const window=await page(),socket=Socket.instances[0]!;
 const receipts={source:'server-1',entries:[{id:1,kind:'punch',amount:1,brace:false,round:1,at:100}]};
 const tick=(connection:Socket)=>connection.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'tick',state:{},bossImpacts:receipts})}));
 tick(socket);expect(hud.setBossReceipts).toHaveBeenLastCalledWith(receipts,true);
 tick(socket);expect(hud.setBossReceipts).toHaveBeenLastCalledWith(receipts,false);
 socket.close();await vi.advanceTimersByTimeAsync(1000);tick(Socket.instances[1]!);expect(hud.setBossReceipts).toHaveBeenLastCalledWith(receipts,true);
 window.dispatchEvent(new Event('beforeunload'));
});

it('forwards authoritative SUPER ready and denied notice timestamps',async()=>{
 const window=await page(),socket=Socket.instances[0]!;const superNotices={readyAt:1000,deniedAt:null,round:1,beat:4};socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'tick',state:{},superNotices})}));expect(hud.setSuperNotices).toHaveBeenLastCalledWith(superNotices);window.dispatchEvent(new Event('beforeunload'));
});
