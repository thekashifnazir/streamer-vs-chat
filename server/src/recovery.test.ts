import {AbstractConnection,PersistentConnection} from '@d-fischer/connection';
import {afterEach,expect,it,vi} from 'vitest';
import {GameSession} from './game-session';

/** The actual installed retry implementation, with only its network socket replaced. */
class Socket extends AbstractConnection {
 static instances:Socket[]=[];
 constructor(..._args:unknown[]){super();Socket.instances.push(this);}
 get hasSocket(){return true;}
 connect(){this._connecting=true;}
 disconnect(){this._connected=false;this._connecting=false;}
 protected clearSocket(){}
 protected sendRaw(_line:string){}
 ready(){this._connecting=false;this._connected=true;this.emit(this.onConnect);}
 fail(){this._connected=false;this.emit(this.onDisconnect,false,new Error('local socket unavailable'));}
}
afterEach(()=>{vi.useRealTimers();Socket.instances=[];});
it('installed Twurple connection retries an outage with Fibonacci backoff and stops retrying after shutdown',async()=>{
 vi.useFakeTimers();const connection=new PersistentConnection(Socket,{});connection.connect();Socket.instances.at(-1)!.ready();
 Socket.instances.at(-1)!.fail();expect(Socket.instances).toHaveLength(2); // immediate reconnect after established link loss
 for(const seconds of [0,1,1,2,3,5,8,13,21,34,55,89,120,120]){
  const count=Socket.instances.length;Socket.instances.at(-1)!.fail();
  if(seconds){await vi.advanceTimersByTimeAsync(seconds*1000-1);expect(Socket.instances).toHaveLength(count);await vi.advanceTimersByTimeAsync(1);}
  else await vi.advanceTimersByTimeAsync(0);
  expect(Socket.instances).toHaveLength(count+1);
 }
 Socket.instances.at(-1)!.ready();Socket.instances.at(-1)!.fail();Socket.instances.at(-1)!.fail();connection.disconnect();const count=Socket.instances.length;await vi.runAllTimersAsync();expect(Socket.instances).toHaveLength(count);
});
it('transport outage preserves counted votes and pending attacks while later empty beats use autopilot',()=>{
 let now=0;const game=new GameSession({mock:true,now:()=>now,seed:1,sendResult:async()=>{}});
 try{game.command({kind:'session',action:'start'});game.chat({user:'counted',text:'!hookl',simulated:true,role:'viewer'});
  // Transport loss changes no reducer input: accepted votes remain authoritative.
  now=2400;game.advance();expect(game.state.activeAttack?.move).toBe('HOOK_L');expect(game.state.paused).toBe(false);game.state.moves=['HOOK_L','JAB'];
  now=3200;game.advance();expect(game.state.log.resolved[0]?.outcome).toBe('HIT');
  now=4800;game.advance();expect(game.state.activeAttack?.move).toBe('JAB');expect(game.state.chatScouting.history).toEqual(['HOOK_L']);
 }finally{game.close();}
});
