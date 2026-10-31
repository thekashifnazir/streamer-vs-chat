import {FEEL} from '../../shared/src/feel';
export type AtlasFrame = {frame:{x:number;y:number;w:number;h:number};spriteSourceSize:{x:number;y:number};sourceSize:{w:number;h:number};anchor:{x:number;y:number};duration:number};
export type BossAtlas = {frames:Record<string,AtlasFrame>;animations:Record<string,string[]>};
export const bossSheetUrl=new URL('../../assets/boss/boss-sheet@1x.webp',import.meta.url).href;
export const bossAtlasUrl=new URL('../../assets/boss/boss-sheet@1x.json',import.meta.url).href;
export const moveClip = {JAB:'jab',HOOK_L:'hookl',HOOK_R:'hookr',COMBO:'combo',SUPER:'super'} as const;
/** Atlas timing holds terminal frames, and only loops idle/victory clips. */
export function animationFrame(atlas:BossAtlas,clip:string,elapsed:number):string {
  const names=atlas.animations[clip]??atlas.animations.idle;
  const total=names.reduce((sum,name)=>sum+atlas.frames[name]!.duration,0);
  let time=Math.max(0,elapsed);
  if((clip==='idle'||clip==='victory')&&total>0)time%=total;
  for(const name of names) {
    const duration=atlas.frames[name]!.duration;
    if(duration===0||time<duration)return name;
    time-=duration;
  }
  return names.at(-1)!;
}
export function framePlacement(frame:AtlasFrame,width:number,height:number){
  const scale=1;
  return {x:width/2+(frame.spriteSourceSize.x-frame.sourceSize.w*frame.anchor.x)*scale,y:height-18+(frame.spriteSourceSize.y-frame.sourceSize.h*frame.anchor.y)*scale,width:frame.frame.w*scale,height:frame.frame.h};
}
export class BossSprite {
  private atlas?:BossAtlas;
  private sheet=new Image();
  private dead=false;
  constructor(private canvas:HTMLCanvasElement) {
    this.sheet.decoding='async';
    this.sheet.src=bossSheetUrl;
    void fetch(bossAtlasUrl).then(response=>{if(!response.ok)throw new Error('Boss atlas unavailable');return response.json();}).then(atlas=>{if(!this.dead)this.atlas=atlas;}).catch(()=>{canvas.setAttribute('aria-label','Chat Golem boss');});
  }
  draw(clip:string,elapsed:number,flashOpacity=0):void {
    const ctx=this.canvas.getContext('2d');
    if(!ctx)return;
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    // A slow/failed image or atlas used to clear the canvas and leave the boss blank.
    // Keep an original vector silhouette visible until the complete atlas can draw.
    if(!this.atlas||!this.sheet.complete||!this.sheet.naturalWidth){this.drawFallback(ctx);return;}
    const frame=this.atlas.frames[animationFrame(this.atlas,clip,elapsed)]!;
    const placement=framePlacement(frame,this.canvas.width,this.canvas.height);
    ctx.drawImage(this.sheet,frame.frame.x,frame.frame.y,frame.frame.w,frame.frame.h,placement.x,placement.y,placement.width,placement.height);
    if(flashOpacity>0){ctx.save();ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=flashOpacity;ctx.fillStyle=FEEL.bossHit.flashColor;
      ctx.fillRect((this.canvas.width-FEEL.bossHit.flashWidth)/2,this.canvas.height-FEEL.bossHit.flashHeight-FEEL.bossHit.flashBottomPx,FEEL.bossHit.flashWidth,FEEL.bossHit.flashHeight);ctx.restore();}
  }
  private drawFallback(ctx:CanvasRenderingContext2D):void {
    const x=this.canvas.width/2,y=this.canvas.height-18;
    ctx.save();ctx.translate(x,y);ctx.fillStyle='#7a68b0';ctx.strokeStyle='#f5f2fa';ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(0,-330,48,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-70,-260);ctx.lineTo(70,-260);ctx.lineTo(55,-120);ctx.lineTo(-55,-120);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.lineWidth=36;ctx.lineCap='round';ctx.strokeStyle='#7a68b0';
    for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*55,-230);ctx.lineTo(side*92,-280);ctx.moveTo(side*30,-110);ctx.lineTo(side*40,-20);ctx.stroke();}
    ctx.fillStyle='#ff268a';for(const side of [-1,1]){ctx.beginPath();ctx.arc(side*92,-280,28,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  dispose(){this.dead=true;this.sheet.src='';}
}
