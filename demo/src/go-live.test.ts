import {afterEach,expect,it,vi} from 'vitest';
import {broadcastSupport,createGoLive,preferredCodecs,restrictCapture,STREAM_KEY_SCOPE,WHIP_URL} from './go-live';
const h264=(profile:string,mode=1)=>({mimeType:'video/H264',clockRate:90000,sdpFmtpLine:`profile-level-id=${profile};packetization-mode=${mode}`});
const codecs=[h264('640c1f'),h264('42e01f',0),h264('42e01f'),{mimeType:'video/VP8',clockRate:90000}];
class Track extends EventTarget{kind='video';stop=vi.fn();}
class Peer extends EventTarget{
 connectionState:RTCPeerConnectionState='new';iceGatheringState:RTCIceGatheringState='complete';localDescription={sdp:'local-offer'};close=vi.fn();
 preferences:unknown[][]=[];parameters:unknown[]=[];addTransceiver=vi.fn((_track:unknown,init:unknown)=>({setCodecPreferences:(value:unknown[])=>this.preferences.push(value),sender:{getParameters:()=>({encodings:[{}]}),setParameters:async(value:unknown)=>{this.parameters.push(value);}}}));
 createOffer=vi.fn(async()=>({type:'offer',sdp:'local-offer'}));setLocalDescription=vi.fn(async()=>{});setRemoteDescription=vi.fn(async()=>{this.connectionState='connected';this.dispatchEvent(new Event('connectionstatechange'));});
}
function setup(status=200){const video=new Track(),audio=new Track();audio.kind='audio';const stream={getTracks:()=>[video,audio],getVideoTracks:()=>[video],getAudioTracks:()=>[audio]} as unknown as MediaStream;
 const request=vi.fn(async()=>Response.json(status===403?{message:'You must complete additional steps.'}:{data:[{stream_key:'private-stream-key'}]},{status}));
 const peer=new Peer(),send=vi.fn(async()=>new Response('answer',{status:201})),state=vi.fn(),media={getDisplayMedia:vi.fn(async()=>stream)};
 const camera={start:vi.fn(async()=>{}),stop:vi.fn()};
 const client=createGoLive({auth:{account:{id:'me',login:'viewer',scopes:[STREAM_KEY_SCOPE],expiresIn:100},request},stage:{} as HTMLElement,media,peer:()=>peer as unknown as RTCPeerConnection,fetch:send,capabilities:kind=>kind==='video'?codecs:[{mimeType:'audio/opus',clockRate:48000}],restrict:vi.fn(async()=> 'element' as const),onState:state,camera});return {client,video,audio,stream,media,peer,send,request,state,camera};}
afterEach(()=>vi.unstubAllGlobals());
it('uses H264 mode1 baseline first, Opus, sendonly and bounded video parameters with WHIP 201',async()=>{
 const storage=vi.fn(),log=vi.spyOn(console,'log');vi.stubGlobal('sessionStorage',{setItem:storage});vi.stubGlobal('localStorage',{setItem:storage});const s=setup();
 const starting=s.client.start();expect(s.media.getDisplayMedia).toHaveBeenCalledOnce();expect(s.request).not.toHaveBeenCalled();await starting;
 expect(s.request).toHaveBeenCalledWith('/streams/key?broadcaster_id=me',expect.anything());expect(s.peer.preferences[0]).toEqual([h264('42e01f'),h264('640c1f')]);expect(s.peer.preferences[1]).toEqual([{mimeType:'audio/opus',clockRate:48000}]);expect(s.peer.parameters[0]).toEqual({encodings:[{maxBitrate:3500000,maxFramerate:30}]});expect(s.peer.addTransceiver.mock.calls.every(call=>(call[1] as {direction:string}).direction==='sendonly')).toBe(true);
 expect(s.send).toHaveBeenCalledWith(WHIP_URL,expect.objectContaining({method:'POST',headers:{'Content-Type':'application/sdp',Authorization:'Bearer private-stream-key'},body:'local-offer',redirect:'error'}));expect(s.client.live).toBe(true);expect(s.peer.setRemoteDescription).toHaveBeenCalledWith({type:'answer',sdp:'answer'});expect(storage).not.toHaveBeenCalled();expect(log).not.toHaveBeenCalled();log.mockRestore();s.client.stop();expect(s.video.stop).toHaveBeenCalled();expect(s.audio.stop).toHaveBeenCalled();expect(s.peer.close).toHaveBeenCalled();
});
it('shows the Twitch 403 message, without sending a stream key to WHIP',async()=>{const s=setup(403);await s.client.start();expect(s.state).toHaveBeenLastCalledWith(false,'You must complete additional steps.');expect(s.send).not.toHaveBeenCalled();expect(s.video.stop).toHaveBeenCalled();});
it('requires 201 and returns to retry when Chrome stops sharing or transport fails',async()=>{
 const rejected=setup();rejected.send.mockResolvedValueOnce(new Response('',{status:403}));await rejected.client.start();expect(rejected.client.live).toBe(false);expect(rejected.video.stop).toHaveBeenCalled();
 for(const failure of ['ended','failed']){const s=setup();await s.client.start();if(failure==='ended')s.video.dispatchEvent(new Event('ended'));else{s.peer.connectionState='failed';s.peer.dispatchEvent(new Event('connectionstatechange'));}expect(s.client.live).toBe(false);expect(s.peer.close).toHaveBeenCalled();}
});
it('tries Element Capture, then CropTarget, then explicitly reports whole-tab capture',async()=>{
 const order:string[]=[],stage={} as HTMLElement;const track={restrictTo:vi.fn(async()=>{order.push('restrict');throw new Error();}),cropTo:vi.fn(async()=>{order.push('crop');})} as unknown as MediaStreamTrack;
 const targets={restriction:{fromElement:async()=>{order.push('restriction-target');return{};}},crop:{fromElement:async()=>{order.push('crop-target');return{};}}};
 expect(await restrictCapture(track,stage,targets)).toBe('crop');expect(order).toEqual(['restriction-target','restrict','crop-target','crop']);(track as any).cropTo.mockRejectedValueOnce(new Error());expect(await restrictCapture(track,stage,targets)).toBe('tab');(track as any).restrictTo.mockResolvedValueOnce(undefined);expect(await restrictCapture(track,stage,targets)).toBe('element');
});
it('offers quick streaming only on supported desktop Chrome/Edge',()=>{
 const sender={getCapabilities:()=>({codecs})} as unknown as typeof RTCRtpSender;
 expect(broadcastSupport({userAgent:'Chrome/130',mediaDevices:{getDisplayMedia:()=>{}}} as unknown as Navigator,sender)).toBe(true);expect(broadcastSupport({userAgent:'iPhone Chrome/130 Mobile',mediaDevices:{getDisplayMedia:()=>{}}} as unknown as Navigator,sender)).toBe(false);expect(preferredCodecs(codecs,'video')).toHaveLength(2);
});
