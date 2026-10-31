import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
import {createStreamCamera} from './go-live';
it('reuses pose video without another permission, is a captured descendant and never stops pose tracks',async()=>{
 const dom=new JSDOM('<div id=stage></div><video id=pose></video>'),doc=dom.window.document;vi.spyOn(dom.window.HTMLMediaElement.prototype,'play').mockResolvedValue();
 const track={readyState:'live',stop:vi.fn()},poseStream={getVideoTracks:()=>[track]},pose=doc.getElementById('pose') as HTMLVideoElement;pose.srcObject=poseStream as unknown as MediaStream;
 const request=vi.fn(),camera=createStreamCamera(doc.getElementById('stage')!,pose,()=>true,{getUserMedia:request});await camera.start();expect(request).not.toHaveBeenCalled();expect((doc.querySelector('.stream-camera-bubble') as HTMLVideoElement).srcObject).toBe(poseStream);expect(doc.querySelector('#stage .stream-camera-bubble')).not.toBeNull();camera.stop();expect(track.stop).not.toHaveBeenCalled();dom.window.close();
});
it('releases a late keyboard camera grant if the switch is turned off while permission is pending',async()=>{
 const dom=new JSDOM('<div id=stage></div><video id=pose></video>'),doc=dom.window.document;let enabled=true,resolve!:(stream:MediaStream)=>void;
 const camera=createStreamCamera(doc.getElementById('stage')!,doc.getElementById('pose') as HTMLVideoElement,()=>enabled,{getUserMedia:()=>new Promise(r=>{resolve=r;})});const starting=camera.start();enabled=false;camera.stop();const stop=vi.fn();resolve({getTracks:()=>[{stop}]} as unknown as MediaStream);await starting;expect(stop).toHaveBeenCalled();expect(doc.querySelector<HTMLVideoElement>('.stream-camera-bubble')!.hidden).toBe(true);dom.window.close();
});

it('keeps an unchanged pose stream attached across polling and waits for a pending pose camera',async()=>{
 vi.useFakeTimers();const dom=new JSDOM('<div id=stage></div><video id=pose></video>');
 try{const doc=dom.window.document,stage=doc.getElementById('stage')!,pose=doc.getElementById('pose') as HTMLVideoElement;
 const stream={getVideoTracks:()=>[{readyState:'live'}]} as unknown as MediaStream;
 const media={getUserMedia:vi.fn()},camera=createStreamCamera(stage,pose,()=>true,media,()=>true),bubble=stage.querySelector('video')!;
 let attached:unknown=null;const assign=vi.fn((value:unknown)=>{attached=value;});Object.defineProperty(bubble,'srcObject',{get:()=>attached,set:assign});bubble.play=vi.fn(async()=>{});
 await camera.start();expect(media.getUserMedia).not.toHaveBeenCalled();expect(assign).not.toHaveBeenCalled();pose.srcObject=stream;
 await vi.advanceTimersByTimeAsync(250);expect(assign).toHaveBeenCalledExactlyOnceWith(stream);await vi.advanceTimersByTimeAsync(2000);expect(assign).toHaveBeenCalledOnce();expect(bubble.hidden).toBe(false);camera.stop();
 }finally{dom.window.close();vi.useRealTimers();}
});
