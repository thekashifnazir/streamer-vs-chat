import type {Landmark} from '../../capture/src/classifier';
// Upper body only: shoulders, arms, hips. Raw MediaPipe indices; the drawing is mirrored like the setup preview.
const BONES=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24]] as const;
const SIZE=240;
/**
 * Offline demo, webcam fights: a small mirrored camera circle with the tracked skeleton drawn lightly, so a player sees
 * how far they move (Kash, 1 Nov: /play's small camera circle made that easier to judge). It draws inside the pose loop
 * from frames inference already read: no second camera, no extra loop, a centre-square crop of the video.
 */
export function mountPosePreview(stage:HTMLElement,video:HTMLVideoElement){
 const canvas=stage.ownerDocument.createElement('canvas');canvas.className='pose-preview';canvas.width=SIZE;canvas.height=SIZE;canvas.hidden=true;canvas.setAttribute('aria-hidden','true');stage.append(canvas);
 let context:CanvasRenderingContext2D|null|undefined;
 function hide(){canvas.hidden=true;}
 function draw(landmarks:Landmark[],visible:boolean){
  if(!visible||video.readyState<2||!video.videoWidth){hide();return;}
  context??=canvas.getContext('2d');if(!context){hide();return;}
  const width=video.videoWidth,height=video.videoHeight,side=Math.min(width,height),left=(width-side)/2,top=(height-side)/2;
  const point=(p:Landmark)=>[(p.x*width-left)/side*SIZE,(p.y*height-top)/side*SIZE] as const,seen=(p:Landmark|undefined)=>!!p&&(p.visibility??1)>=.5;
  context.save();context.setTransform(-1,0,0,1,SIZE,0);context.drawImage(video,left,top,side,side,0,0,SIZE,SIZE);
  context.lineWidth=5;context.lineCap='round';context.strokeStyle='rgba(87,240,255,.75)';context.beginPath();
  for(const [a,b] of BONES){const p=landmarks[a],q=landmarks[b];if(!seen(p)||!seen(q))continue;const [x1,y1]=point(p!),[x2,y2]=point(q!);context.moveTo(x1,y1);context.lineTo(x2,y2);}
  context.stroke();context.fillStyle='rgba(255,220,67,.9)';
  for(const index of [15,16]){const p=landmarks[index];if(!seen(p))continue;const [x,y]=point(p!);context.beginPath();context.arc(x,y,9,0,Math.PI*2);context.fill();}
  context.restore();canvas.hidden=false;
 }
 return {draw,hide};
}
