import {parseChatVote,type ChatVote,type Control} from '../../../shared/src/index';
import {TwitchAuthError,type BrowserAuth} from './auth';
export type ChatConnectionStatus='connecting'|'connected'|'reconnecting'|'login-required'|'disconnected';
export type BrowserSocket={addEventListener:(type:string,callback:(event:{data?:unknown})=>void)=>void;close:()=>void};
export type BrowserChatOptions={auth:BrowserAuth;onChat?:(userId:string)=>void;onVote?:(vote:ChatVote)=>void;onControl?:(control:Control)=>void;onStatus?:(status:ChatConnectionStatus)=>void;onViewers?:(count:number)=>void;socket?:(url:string)=>BrowserSocket;now?:()=>number;setTimeout?:(callback:()=>void,ms:number)=>ReturnType<typeof setTimeout>;clearTimeout?:(timer:ReturnType<typeof setTimeout>)=>void};
const SOCKET_URL='wss://eventsub.wss.twitch.tv/ws';
type Connection={socket:BrowserSocket;welcomed:boolean;retired:boolean;watch?:ReturnType<typeof setTimeout>;handoff:boolean};
/** Read-only installed-client transport. Never sends chat or optional monetization events. */
export function createBrowserChat(options:BrowserChatOptions){
 const auth=options.auth,now=options.now??Date.now,schedule=options.setTimeout??setTimeout,cancel=options.clearTimeout??clearTimeout;
 const socket=options.socket??(url=>new WebSocket(url) as unknown as BrowserSocket);
 let running=false,retrying=false,generation=0,attempt=0,retry:ReturnType<typeof setTimeout>|undefined,validation:ReturnType<typeof setTimeout>|undefined,poll:ReturnType<typeof setTimeout>|undefined;
 let active:Connection|undefined,polling=false;
 const connections=new Set<Connection>(),seen=new Set<string>();
 const status=(value:ChatConnectionStatus)=>options.onStatus?.(value);
 function closeConnections(){for(const connection of connections){connection.retired=true;if(connection.watch)cancel(connection.watch);connection.socket.close();}connections.clear();active=undefined;}
 function stop(){running=false;retrying=false;generation++;for(const timer of [retry,validation,poll])if(timer)cancel(timer);retry=validation=poll=undefined;closeConnections();status('disconnected');}
 function fail(error:unknown){
  if(!running)return;
  if(error instanceof TwitchAuthError){stop();auth.clear();status('login-required');return;}
  closeConnections();status('reconnecting');
  if(retrying)return;
  retrying=true;
  const epoch=generation;retry=schedule(()=>{retry=undefined;void auth.validate().then(()=>{if(running&&generation===epoch){retrying=false;connect(SOCKET_URL,false);if(!validation)validateHourly(epoch);if(!poll&&!polling)void viewers(epoch);}}).catch(error=>{if(generation===epoch){retrying=false;fail(error);}});},Math.min(30000,1000*2**Math.min(attempt++,5)));
 }
 function watch(connection:Connection,ms:number){if(connection.watch)cancel(connection.watch);connection.watch=schedule(()=>{if(!connection.retired)fail(new Error('Twitch socket timed out'));},ms);}
 async function subscribe(session:string,epoch:number,connection:Connection){
  const me=auth.account?.id;if(!me)throw new TwitchAuthError();
  const response=await auth.request('/eventsub/subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'channel.chat.message',version:'1',condition:{broadcaster_user_id:me,user_id:me},transport:{method:'websocket',session_id:session}})});
  if(!running||generation!==epoch||connection.retired||active!==connection)return;
  if(response.status!==202)throw new Error('Twitch chat subscription unavailable');
  attempt=0;status('connected');
 }
 function connect(url:string,handoff:boolean){
  if(!running)return;
  const epoch=generation;let connection:Connection;
  try{connection={socket:socket(url),welcomed:false,retired:false,handoff};}catch(error){fail(error);return;}
  connections.add(connection);watch(connection,10000);
  let keepaliveMs=10000;
  connection.socket.addEventListener('message',event=>{
   if(!running||generation!==epoch||connection.retired)return;
   let packet:any;try{packet=JSON.parse(String(event.data));}catch{return;}
   const type=packet?.metadata?.message_type,session=packet?.payload?.session;
   if(type==='session_welcome'){
    if(connection.welcomed||typeof session?.id!=='string')return;
    connection.welcomed=true;keepaliveMs=Number.isFinite(session.keepalive_timeout_seconds)&&session.keepalive_timeout_seconds>0?session.keepalive_timeout_seconds*1000:10000;watch(connection,keepaliveMs);
    if(connection.handoff){const old=active;active=connection;if(old&&old!==connection){old.retired=true;if(old.watch)cancel(old.watch);old.socket.close();connections.delete(old);}attempt=0;status('connected');}
    else{active=connection;void subscribe(session.id,epoch,connection).catch(error=>{if(generation===epoch&&!connection.retired)fail(error);});}
    return;
   }
   if(!connection.welcomed)return;
   if(type==='session_keepalive'||type==='notification')watch(connection,keepaliveMs);
   if(type==='session_reconnect'){
    if([...connections].some(item=>item.handoff&&!item.retired&&item!==connection))return;
    const address=session?.reconnect_url;
    try{const parsed=new URL(address);if(parsed.protocol!=='wss:'||parsed.host!=='eventsub.wss.twitch.tv'||parsed.username||parsed.password)throw new Error();}catch{fail(new Error('Invalid Twitch reconnect'));return;}
    status('reconnecting');connect(address,true);return;
   }
   if(type==='revocation'){fail(new TwitchAuthError());return;}
   if(type!=='notification'||packet?.payload?.subscription?.type!=='channel.chat.message')return;
   const messageId=packet.metadata.message_id,chat=packet.payload.event,me=auth.account?.id;
   if(typeof messageId!=='string'||!messageId||seen.has(messageId)||!me||chat?.broadcaster_user_id!==me||typeof chat?.chatter_user_id!=='string'||typeof chat?.message?.text!=='string')return;
   seen.add(messageId);while(seen.size>2048)seen.delete(seen.values().next().value!);
   const user=chat.chatter_user_id,text=chat.message.text;
   options.onChat?.(user);
   const words=text.trim().toLowerCase(),isBroadcaster=user===me,isMod=Array.isArray(chat.badges)&&chat.badges.some((badge:any)=>badge?.set_id==='moderator');
   const command=words.split(/\s+/,1)[0],action=words==='stop'&&isBroadcaster?'stop':(isBroadcaster||isMod)?command==='!pause'?'pause':command==='!resume'?'resume':command==='!veto'?'veto':null:null;
   if(action){options.onControl?.({kind:'control',action,by:user});return;}
   const vote=parseChatVote(text,user,now(),false);if(vote)options.onVote?.(vote);
  });
  const lost=()=>{if(running&&generation===epoch&&!connection.retired)fail(new Error('Twitch connection lost'));};
  connection.socket.addEventListener('close',lost);connection.socket.addEventListener('error',lost);
 }
 function validateHourly(epoch:number){validation=schedule(()=>{validation=undefined;void auth.validate().then(()=>{if(running&&generation===epoch)validateHourly(epoch);}).catch(error=>{if(generation===epoch)fail(error);});},3600000);}
 async function viewers(epoch:number){
  polling=true;
  try{const me=auth.account?.id;if(!me)throw new TwitchAuthError();const response=await auth.request(`/streams?user_id=${encodeURIComponent(me)}`);if(!response.ok)throw new Error('Viewer count unavailable');const value=await response.json();if(running&&generation===epoch){const count=value?.data?.[0]?.viewer_count??0;if(Number.isSafeInteger(count)&&count>=0)options.onViewers?.(count);}}
  catch(error){if(error instanceof TwitchAuthError&&generation===epoch){fail(error);return;}}
  finally{polling=false;}
  if(running&&generation===epoch)poll=schedule(()=>{poll=undefined;void viewers(epoch);},60000);
 }
 return {async start(){if(running)return;running=true;const epoch=++generation;status('connecting');try{await auth.validate();if(!running||generation!==epoch)return;connect(SOCKET_URL,false);validateHourly(epoch);void viewers(epoch);}catch(error){if(generation===epoch)fail(error);}},stop};
}
