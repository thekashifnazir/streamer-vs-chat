export type AtlasFrame = {frame:{x:number;y:number;w:number;h:number};spriteSourceSize:{x:number;y:number};sourceSize:{w:number;h:number};anchor:{x:number;y:number};duration:number};
export type BossAtlas = {frames:Record<string,AtlasFrame>;animations:Record<string,string[]>};
export const bossSheetUrl=new URL('../../assets/boss/boss-sheet@1x.png',import.meta.url).href;
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
    this.sheet.src=bossSheetUrl;
    void fetch(bossAtlasUrl).then(response=>{if(!response.ok)throw new Error('Boss atlas unavailable');return response.json();}).then(atlas=>{if(!this.dead)this.atlas=atlas;}).catch(()=>{canvas.setAttribute('aria-label','Chat Golem boss');});
  }
  draw(clip:string,elapsed:number):void {
    const ctx=this.canvas.getContext('2d');
    if(!ctx)return;
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    if(!this.atlas||!this.sheet.complete||!this.sheet.naturalWidth)return;
    const frame=this.atlas.frames[animationFrame(this.atlas,clip,elapsed)]!;
    const placement=framePlacement(frame,this.canvas.width,this.canvas.height);
    ctx.drawImage(this.sheet,frame.frame.x,frame.frame.y,frame.frame.w,frame.frame.h,placement.x,placement.y,placement.width,placement.height);
  }
  dispose(){this.dead=true;this.sheet.src='';}
}
