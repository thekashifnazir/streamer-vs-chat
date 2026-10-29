import {measurePose,type Landmark} from './classifier';

export const FRAME_MAX_AGE_MS=500;
export const BLOCKER_HOLD_MS=1000;
export interface PoseReadiness {cameraRunning:boolean;calibrated:boolean;lastFrameAt:number;landmarks:Landmark[];seated:boolean;now:number}
/** Safety checks use raw landmarks, exactly the accepted framing/visibility bounds. */
export function poseBlocker(state:PoseReadiness):string {
 if(!state.cameraRunning)return 'No camera: start the camera, then press Resume inputs.';
 if(!state.calibrated)return 'Calibration not ready: finish webcam calibration, then press Resume inputs.';
 if(state.now-state.lastFrameAt>=FRAME_MAX_AGE_MS)return 'NO POSE: frames are 500 ms old or older; step back into frame.';
 for(const[index,name]of [[0,'Head'],[11,'Left shoulder'],[12,'Right shoulder'],[15,'Left wrist'],[16,'Right wrist']] as const){
  const point=state.landmarks[index];
  if(!point)return `${name} not detected: step back into frame.`;
  if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return `${name} position unavailable: step back into frame.`;
  if(point.x<0)return `${name} leaves the left of the frame: step back.`;
  if(point.x>1)return `${name} leaves the right of the frame: step back.`;
  if(point.y<0)return `${name} leaves the top of the frame: step back.`;
  if(point.y>1)return `${name} leaves the bottom of the frame: step back.`;
  if(!Number.isFinite(point.visibility??1)||(point.visibility??1)<.5)return `${name} visibility below 0.5: step back into frame.`;
 }
 const metrics=measurePose(state.landmarks);
 if(!metrics)return 'NO POSE: step back into frame.';
 if(state.seated&&metrics.shoulderWidth>.2)return 'Seated too close: sit about 1 m further back.';
 return '';
}
/** A failing frame remains visible and blocks Resume until one second of clear frames. */
export function createStickyBlocker(){
 let latest='',lastFailure=-Infinity;
 return {update(message:string,now:number){if(message){latest=message;lastFailure=now;}return message||(now-lastFailure<BLOCKER_HOLD_MS?latest:'');},reset(){latest='';lastFailure=-Infinity;}};
}
