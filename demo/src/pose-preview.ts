import type {Landmark} from '../../capture/src/classifier';
// Upper body only: shoulders, arms, hips. Raw MediaPipe indices; the drawing is mirrored like the setup preview.
const BONES=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24]] as const;
// The camera lane's circle: 20% x 28% of a 16:9 stage (the /play stream bubble's box), so the drawing matches it pixel for pixel.
const WIDTH=320,HEIGHT=252;
/**
 * The camera circle in the fight stage's camera lane (overlay/src/stage-lanes.ts). Offline demo (`video`): it draws the mirrored camera,
 * cropped like the /play bubble's object-fit:cover, from frames inference already read: no second camera, no extra loop. /play
 * (`skeleton-only`): a transparent layer over the stream bubble. The tracked skeleton is opt-in on both pages (Kash, 1 Nov: cleaner on stream without it).
 */
export function mountPosePreview(stage:HTMLElement,video:HTMLVideoElement,options:{skeleton:()=>boolean;mode?:'video'|'skeleton-only'}={skeleton:()=>false}){
 const mode=options.mode??'video';
 const canvas=stage.ownerDocument.createElement('canvas');canvas.className=`pose-preview${mode==='skeleton-only'?' skeleton-only':''}`;canvas.width=WIDTH;canvas.height=HEIGHT;canvas.hidden=true;canvas.setAttribute('aria-hidden','true');stage.append(canvas);
 let context:CanvasRenderingContext2D|null|undefined;
 function hide(){canvas.hidden=true;}
 function draw(landmarks:Landmark[],visible:boolean){
  const skeleton=options.skeleton();
  if(!visible||mode==='skeleton-only'&&!skeleton||video.readyState<2||!video.videoWidth){hide();return;}
  context??=canvas.getContext('2d');if(!context){hide();return;}
  const width=video.videoWidth,height=video.videoHeight,scale=Math.max(WIDTH/width,HEIGHT/height),cropW=WIDTH/scale,cropH=HEIGHT/scale,left=(width-cropW)/2,top=(height-cropH)/2;
  const point=(p:Landmark)=>[(p.x*width-left)*scale,(p.y*height-top)*scale] as const,seen=(p:Landmark|undefined)=>!!p&&(p.visibility??1)>=.5;
  context.save();context.setTransform(-1,0,0,1,WIDTH,0);
  if(mode==='video')context.drawImage(video,left,top,cropW,cropH,0,0,WIDTH,HEIGHT);else context.clearRect(0,0,WIDTH,HEIGHT);
  if(skeleton){
   context.lineWidth=5;context.lineCap='round';context.strokeStyle='rgba(87,240,255,.75)';context.beginPath();
   for(const [a,b] of BONES){const p=landmarks[a],q=landmarks[b];if(!seen(p)||!seen(q))continue;const [x1,y1]=point(p!),[x2,y2]=point(q!);context.moveTo(x1,y1);context.lineTo(x2,y2);}
   context.stroke();context.fillStyle='rgba(255,220,67,.9)';
   for(const index of [15,16]){const p=landmarks[index];if(!seen(p))continue;const [x,y]=point(p!);context.beginPath();context.arc(x,y,9,0,Math.PI*2);context.fill();}
  }
  context.restore();canvas.hidden=false;
 }
 return {draw,hide};
}
