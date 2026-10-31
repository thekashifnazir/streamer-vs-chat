import {afterEach,expect,it,vi} from 'vitest';
import {BossSprite,bossSheetUrl,type BossAtlas} from './assets';
afterEach(()=>vi.unstubAllGlobals());
it('requests the compressed sheet immediately and renders a silhouette until both image and atlas are ready',async()=>{
 let image!: {src:string;complete:boolean;naturalWidth:number};
 vi.stubGlobal('Image',class{src='';complete=false;naturalWidth=0;constructor(){image=this;}});
 let resolve!: (response:Response)=>void;
 vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(done=>{resolve=done;})));
 const ctx={clearRect:vi.fn(),save:vi.fn(),restore:vi.fn(),translate:vi.fn(),beginPath:vi.fn(),arc:vi.fn(),fill:vi.fn(),stroke:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),closePath:vi.fn(),drawImage:vi.fn()};
 const canvas={width:470,height:486,getContext:()=>ctx,setAttribute:vi.fn()} as unknown as HTMLCanvasElement;
 const sprite=new BossSprite(canvas);expect(image.src).toBe(bossSheetUrl);expect(bossSheetUrl).toMatch(/\.webp$/);
 sprite.draw('idle',0);expect(ctx.fill).toHaveBeenCalled();expect(ctx.drawImage).not.toHaveBeenCalled();
 image.complete=true;image.naturalWidth=4096;sprite.draw('idle',0);expect(ctx.drawImage).not.toHaveBeenCalled();
 const atlas:BossAtlas={frames:{idle:{frame:{x:0,y:0,w:10,h:10},sourceSize:{w:10,h:10},spriteSourceSize:{x:0,y:0},anchor:{x:.5,y:1},duration:100}},animations:{idle:['idle']}};
 resolve(new Response(JSON.stringify(atlas)));await vi.waitFor(()=>{sprite.draw('idle',0);expect(ctx.drawImage).toHaveBeenCalled();});
 image.naturalWidth=0;ctx.fill.mockClear();sprite.draw('idle',0);expect(ctx.fill).toHaveBeenCalled();sprite.dispose();
});
