import{afterEach,expect,it,vi}from'vitest';
import{LocalReplay}from'./replay';
afterEach(()=>vi.useRealTimers());
function rig(){
 const recorders:any[]=[];const revokeURL=vi.fn();let at=0;
 const create=vi.fn(()=>{
  const recorder={state:'inactive',mimeType:'video/webm',ondataavailable:null as any,onstop:null as any,onerror:null as any,
   start(){this.state='recording';},stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['header-and-movie'])});this.onstop?.();});}};
  recorders.push(recorder);return recorder as any;
 });
 const replay=new LocalReplay({create,now:()=>at,createURL:()=>`blob:local/${recorders.length}`,revokeURL});
 const stream={getTracks:()=>[{stop:vi.fn()}]} as unknown as MediaStream;
 return{replay,recorders,revokeURL,stream,at:(value:number)=>{at=value;}};
}
it('retains a complete segment at highlight time so a15s poll timeout can retrieve it locally',async()=>{
 const{replay,stream,at,revokeURL}=rig();expect(replay.start(stream)).toBe(true);
 expect(await replay.save('highlight')).toBe(true);at(15000);
 expect(replay.has('highlight')).toBe(true);expect(replay.entries()[0]?.url).toMatch(/^blob:/);
 replay.dispose();expect(revokeURL).toHaveBeenCalled();expect(replay.entries()).toEqual([]);
});
it('bounds saved blobs and revokes old URLs without stopping camera tracks',async()=>{
 const{replay,stream,at,revokeURL}=rig();replay.start(stream);
 for(let index=0;index<8;index++){at(index*1000);expect(await replay.save(String(index))).toBe(true);}
 expect(replay.entries()).toHaveLength(6);expect(replay.has('0')).toBe(false);expect(revokeURL).toHaveBeenCalledTimes(2);replay.dispose();
});
it('withdrawn recording consent discards an in-flight snapshot',async()=>{
 const{replay,stream}=rig();replay.start(stream);const saving=replay.save('private');replay.stop();
 expect(await saving).toBe(false);expect(replay.entries()).toEqual([]);replay.dispose();
});
it('encoder errors become unavailable replays instead of hanging the acknowledgement',async()=>{
 const{replay,stream,recorders}=rig();replay.start(stream);recorders[0].stop=function(){this.state='inactive';queueMicrotask(()=>this.onerror?.(new Event('error')));};
 expect(await replay.save('failed')).toBe(false);replay.dispose();
});
