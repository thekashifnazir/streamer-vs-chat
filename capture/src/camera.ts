import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Landmark } from './classifier';
export type FrameSample = {landmarks:Landmark[];at:number;inferenceMs:number;fps:number};
export type PoseAssets = { wasmLoaderPath:string; wasmBinaryPath:string; modelAssetPath:string };

/** Inference always sees the raw video; the preview alone is mirrored in CSS. */
export class PoseCamera {
  private stream: MediaStream | undefined;
  private landmarker: PoseLandmarker | undefined;
  private frameId: number | undefined;
  private generation = 0;
  constructor(private video:HTMLVideoElement,private onFrame:(sample:FrameSample)=>void,private onError:(message:string)=>void,private assets?:PoseAssets) {}
  async start(delegate:'CPU'|'GPU'='CPU'):Promise<boolean> {
    this.stop();
    const generation=this.generation;
    if(!this.video.requestVideoFrameCallback) throw new Error('Use a current Chrome window with requestVideoFrameCallback support.');
    try {
      const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'},audio:false});
      if(generation!==this.generation) {stream.getTracks().forEach(track=>track.stop());return false;}
      this.stream=stream;this.video.srcObject=stream;
      for(const track of stream.getVideoTracks())track.addEventListener('ended',()=>{
        if(generation===this.generation){this.stop();this.onError('Camera disconnected. Restart the camera to continue.');}
      });
      await this.video.play();
      const fileset=this.assets?{wasmLoaderPath:this.assets.wasmLoaderPath,wasmBinaryPath:this.assets.wasmBinaryPath}:await FilesetResolver.forVisionTasks('/node_modules/@mediapipe/tasks-vision/wasm');
      const model=await PoseLandmarker.createFromOptions(fileset,{
        baseOptions:{modelAssetPath:this.assets?.modelAssetPath??'/capture/public/models/pose_landmarker_lite.task',delegate},
        runningMode:'VIDEO',numPoses:1,outputSegmentationMasks:false,
      });
      if(generation!==this.generation) {model.close();return false;}
      this.landmarker=model;
      let lastAt=0;
      const frame:VideoFrameRequestCallback=(now,metadata)=>{
        if(generation!==this.generation) return;
        try {
          const start=performance.now();
          const result=model.detectForVideo(this.video,now);
          const inferenceMs=performance.now()-start;
          const at=metadata.captureTime??now;
          const fps=lastAt>0?1000/(now-lastAt):0; lastAt=now;
          this.onFrame({landmarks:result.landmarks[0]??[],at,inferenceMs,fps});
          this.frameId=this.video.requestVideoFrameCallback(frame);
        } catch(error) {this.stop();this.onError(error instanceof Error?error.message:'Camera inference failed.');}
      };
      this.frameId=this.video.requestVideoFrameCallback(frame);
      return true;
    } catch(error) {if(generation===this.generation)this.stop();throw error;}
  }
  stop():void {
    this.generation++;
    if(this.frameId!==undefined) this.video.cancelVideoFrameCallback(this.frameId);
    this.frameId=undefined;
    this.stream?.getTracks().forEach(track=>track.stop());this.stream=undefined;
    this.video.pause();this.video.srcObject=null;
    this.landmarker?.close();this.landmarker=undefined;
  }
}
