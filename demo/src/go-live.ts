import type {BrowserAuth} from './twitch/auth';
export const STREAM_KEY_SCOPE='channel:read:stream_key';
export const WHIP_URL='https://g.webrtc.live-video.net:4443/v2/offer';
class BroadcastError extends Error {}
type Codec=RTCRtpCodec;
type CaptureTrack=MediaStreamTrack&{restrictTo?:(target:unknown)=>Promise<void>;cropTo?:(target:unknown)=>Promise<void>};
type TargetFactory={fromElement:(element:HTMLElement)=>Promise<unknown>};
export function broadcastSupport(nav:Navigator=navigator,sender:typeof RTCRtpSender|undefined=globalThis.RTCRtpSender){
 try{const desktop=/Chrome\/|Edg\//.test(nav.userAgent)&&!/Mobile|Android|iPhone|iPad/.test(nav.userAgent);
 return desktop&&!!nav.mediaDevices?.getDisplayMedia&&!!sender?.getCapabilities('video')?.codecs.some(codec=>/video\/h264/i.test(codec.mimeType)&&/packetization-mode=1(?:;|$)/i.test(codec.sdpFmtpLine??''));}catch{return false;}
}
export function preferredCodecs(codecs:Codec[],kind:'audio'|'video'){
 return codecs.filter(codec=>kind==='audio'?codec.mimeType.toLowerCase()==='audio/opus':codec.mimeType.toLowerCase()==='video/h264'&&/(?:^|;)\s*packetization-mode=1(?:;|$)/i.test(codec.sdpFmtpLine??''))
 .sort((a,b)=>Number(/profile-level-id=42e01f/i.test(b.sdpFmtpLine??''))-Number(/profile-level-id=42e01f/i.test(a.sdpFmtpLine??'')));
}
export async function restrictCapture(track:CaptureTrack,stage:HTMLElement,targets:{restriction?:TargetFactory;crop?:TargetFactory}={restriction:(globalThis as any).RestrictionTarget,crop:(globalThis as any).CropTarget}){
 if(track.restrictTo&&targets.restriction)try{await track.restrictTo(await targets.restriction.fromElement(stage));return 'element' as const;}catch{/* Fall back to region capture. */}
 if(track.cropTo&&targets.crop)try{await track.cropTo(await targets.crop.fromElement(stage));return 'crop' as const;}catch{/* Explicit whole-tab warning below. */}
 return 'tab' as const;
}
function waitIce(pc:RTCPeerConnection,signal:AbortSignal){return new Promise<void>((resolve,reject)=>{
 const finish=()=>{clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',check);signal.removeEventListener('abort',abort);resolve();};
 const check=()=>{if(pc.iceGatheringState==='complete')finish();};
 const abort=()=>{finish();reject(new Error('cancelled'));};const timer=setTimeout(finish,3000);
 pc.addEventListener('icegatheringstatechange',check);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();else check();
});}
/** Browser-only transport. The stream key exists only in the local request scope. */
export function createGoLive(options:{auth:Pick<BrowserAuth,'account'|'request'>;stage:HTMLElement;onState:(live:boolean,message:string)=>void;media?:Pick<MediaDevices,'getDisplayMedia'>;peer?:()=>RTCPeerConnection;fetch?:typeof fetch;capabilities?:(kind:'audio'|'video')=>Codec[];restrict?:typeof restrictCapture;camera?:{start:()=>Promise<void>;stop:()=>void}}){
 let epoch=0,pc:RTCPeerConnection|null=null,stream:MediaStream|null=null,abort:AbortController|null=null,live=false,connectTimer:ReturnType<typeof setTimeout>|null=null;
 const stop=(message='Stream ended.')=>{epoch++;live=false;if(connectTimer)clearTimeout(connectTimer);connectTimer=null;abort?.abort();abort=null;const old=pc;pc=null;old?.close();const tracks=stream;stream=null;tracks?.getTracks().forEach(track=>track.stop());options.camera?.stop();options.onState(false,message);};
 return {get live(){return live;},stop,async start(){
  const user=options.auth.account;if(!user?.scopes.includes(STREAM_KEY_SCOPE))throw new BroadcastError('Reconnect once to allow this page to read your stream key.');
  stop('Choose this Chrome tab and keep tab audio on.');const current=epoch,controller=new AbortController();abort=controller;
  const currentSession=()=>{if(current!==epoch)return false;if(options.auth.account?.id!==user.id||controller.signal.aborted){stop('Stream session ended. Reconnect or retry.');return false;}return true;};
  let acquired:MediaStream|null=null;
  try{
   // Keep the display picker directly in the click's user activation, before any network await.
   const capture=(options.media??navigator.mediaDevices).getDisplayMedia({video:{width:1280,height:720,frameRate:30},audio:true,preferCurrentTab:true,selfBrowserSurface:'include',surfaceSwitching:'exclude',systemAudio:'exclude'} as DisplayMediaStreamOptions);
   acquired=await capture;if(!currentSession()){acquired.getTracks().forEach(track=>track.stop());return;}stream=acquired;
   const video=stream.getVideoTracks()[0];if(video?.getSettings?.().displaySurface&&video.getSettings().displaySurface!=='browser')throw new BroadcastError('Choose this Chrome tab, not a window or entire screen, then retry.');if(!video)throw new BroadcastError('No shared tab video. Pick this Chrome tab and retry.');
   for(const track of stream.getTracks())track.addEventListener('ended',()=>{if(current===epoch)stop('Sharing stopped. Go live again or use OBS.');},{once:true});
   const restriction=await (options.restrict??restrictCapture)(video,options.stage);
   if(!currentSession())return;
   if(restriction==='tab')options.onState(false,'Warning: isolation failed. The whole tab will be streamed. Use OBS for fight-only capture.');
   await options.camera?.start();if(!currentSession())return;
   const response=await options.auth.request(`/streams/key?broadcaster_id=${encodeURIComponent(user.id)}`,{signal:controller.signal,redirect:'error'});
   if(!currentSession())return;
   if(response.status===403){const value=await response.json().catch(()=>({}));throw new BroadcastError(typeof value.message==='string'?value.message.slice(0,500):'Twitch requires additional account steps before you can stream.');}
   if(!response.ok)throw new BroadcastError('Could not read your Twitch stream key. Reconnect and retry.');
   const value=await response.json();let key:unknown=value.data?.[0]?.stream_key;
   if(typeof key!=='string'||!key)throw new BroadcastError('Twitch did not return a stream key.');if(!currentSession())return;
   const connection=(options.peer??(()=>new RTCPeerConnection({bundlePolicy:'max-bundle'})))();pc=connection;
   connection.addEventListener('connectionstatechange',()=>{
    if(current!==epoch)return;
    if(connection.connectionState==='connected'){if(connectTimer)clearTimeout(connectTimer);connectTimer=null;live=true;options.onState(true,restriction==='tab'?'Warning: the whole tab is on stream; isolation failed. Use OBS to capture only the fight.':!stream?.getAudioTracks().length?'Live, but no tab audio was shared. End and retry with tab audio on.':'Live on Twitch.');}
    if(['failed','disconnected','closed'].includes(connection.connectionState))stop('Stream connection lost. Retry Go live or use OBS.');
   });
   for(const track of stream.getTracks()){
    const kind=track.kind as 'audio'|'video',transceiver=connection.addTransceiver(track,{direction:'sendonly',streams:[stream]});
    const codecs=preferredCodecs((options.capabilities??(kind=>RTCRtpSender.getCapabilities(kind)?.codecs??[]))(kind),kind);
    if(!codecs.length)throw new BroadcastError('Compatible H.264/Opus codecs are unavailable. Use OBS.');transceiver.setCodecPreferences(codecs);
    if(kind==='video'){const parameters=transceiver.sender.getParameters();parameters.encodings=parameters.encodings?.length?parameters.encodings:[{}];for(const encoding of parameters.encodings){encoding.maxBitrate=3_500_000;encoding.maxFramerate=30;}await transceiver.sender.setParameters(parameters);}
   }
   await connection.setLocalDescription(await connection.createOffer());await waitIce(connection,controller.signal);if(!currentSession())return;
   const timeout=setTimeout(()=>controller.abort(),15000);
   let answer:Response;try{answer=await (options.fetch??fetch)(WHIP_URL,{method:'POST',headers:{'Content-Type':'application/sdp',Authorization:`Bearer ${key}`},body:connection.localDescription!.sdp,signal:controller.signal,redirect:'error'});}finally{key=null;clearTimeout(timeout);}
   if(!currentSession()){if(current===epoch)stop('Stream connection timed out. Retry or use OBS.');return;}
   if(answer.status!==201)throw new BroadcastError('Twitch could not start this stream. Retry or use OBS.');
   await connection.setRemoteDescription({type:'answer',sdp:await answer.text()});
   if(!currentSession())return;
   if(connection.connectionState!=='connected')connectTimer=setTimeout(()=>{if(current===epoch)stop('Stream connection timed out. Retry or use OBS.');},15000);
   // A 201 is only signaling acceptance; connectionstatechange confirms live transport.
   if(connection.connectionState==='connected'&&!live){live=true;options.onState(true,restriction==='tab'?'Warning: the whole tab is on stream; isolation failed. Use OBS to capture only the fight.':!stream?.getAudioTracks().length?'Live, but no tab audio was shared. End and retry with tab audio on.':'Live on Twitch.');}
  }catch(error){if(current!==epoch)return;const message=error instanceof BroadcastError?error.message:'Could not start streaming. Allow tab/camera sharing and retry, or use OBS.';stop(message);}
 }};
}
/** A captured descendant; pose uses the very same camera stream without another camera request. */
export function createStreamCamera(stage:HTMLElement,pose:HTMLVideoElement,enabled:()=>boolean,media:Pick<MediaDevices,'getUserMedia'>=navigator.mediaDevices){
 const bubble=stage.ownerDocument.createElement('video');bubble.className='stream-camera-bubble';bubble.autoplay=true;bubble.muted=true;bubble.playsInline=true;bubble.hidden=true;stage.append(bubble);
 let own:MediaStream|null=null,timer:ReturnType<typeof setInterval>|null=null,epoch=0;
 const sync=()=>{const poseStream=pose.srcObject as MediaStream|null;if(poseStream?.getVideoTracks().some(track=>track.readyState==='live')){if(own){own.getTracks().forEach(track=>track.stop());own=null;}bubble.srcObject=poseStream;}bubble.hidden=!enabled()||!bubble.srcObject;};
 const stop=()=>{epoch++;if(timer)clearInterval(timer);timer=null;own?.getTracks().forEach(track=>track.stop());own=null;bubble.srcObject=null;bubble.hidden=true;};
 return {stop,async start(){const current=++epoch;if(!enabled()){stop();return;}sync();if(!bubble.srcObject){const stream=await media.getUserMedia({video:true,audio:false});if(current!==epoch||!enabled()){stream.getTracks().forEach(track=>track.stop());return;}own=stream;bubble.srcObject=stream;}if(current!==epoch)return;bubble.hidden=false;void bubble.play().catch(()=>{});timer=setInterval(sync,250);}};
}
