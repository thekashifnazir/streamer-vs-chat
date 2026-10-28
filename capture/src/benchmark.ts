import type {FrameSample} from './camera';
export type PoseDelegate='CPU'|'GPU';
export type DelegateMeasurement={delegate:PoseDelegate;samples:number;warmupFrames:number;fpsP50:number|null;fpsP95:number|null;inferenceP50Ms:number|null;inferenceP95Ms:number|null;error?:string};
export type BenchmarkResult={measurements:DelegateMeasurement[];selected:PoseDelegate|null;cancelled:boolean};
export function percentile(values:number[],fraction:number):number|null {
  if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)]!;
}
/** Finite, local real-frame measurement. No fixtures, model estimates or network reporting. */
export class CaptureBenchmark {
  private active:{warmup:number;inference:number[];fps:number[];resolve:()=>void;reject:(error:Error)=>void}|null=null;
  private running=false;
  private cancelled=false;
  constructor(private options:{start:(delegate:PoseDelegate)=>Promise<boolean>;stop:()=>void;warmupFrames?:number;sampleFrames?:number;timeoutMs?:number;onProgress?:(delegate:PoseDelegate,samples:number)=>void}){}
  frame(sample:Pick<FrameSample,'fps'|'inferenceMs'>):void {
    const active=this.active;if(!active)return;
    if(!Number.isFinite(sample.fps)||sample.fps<=0||!Number.isFinite(sample.inferenceMs)||sample.inferenceMs<0)return;
    if(active.warmup++<(this.options.warmupFrames??30))return;
    active.inference.push(sample.inferenceMs);active.fps.push(sample.fps);
    this.options.onProgress?.(this.delegate!,active.inference.length);
    if(active.inference.length>=(this.options.sampleFrames??90))active.resolve();
  }
  private delegate:PoseDelegate|null=null;
  fail(message:string):void{this.active?.reject(new Error(message));}
  cancel():void{this.cancelled=true;this.active?.reject(new Error('Cancelled'));this.options.stop();}
  async run():Promise<BenchmarkResult>{
    if(this.running)throw new Error('Benchmark already running');this.running=true;this.cancelled=false;
    const measurements:DelegateMeasurement[]=[];
    try{
      for(const delegate of ['CPU','GPU'] as const){
        if(this.cancelled)break;this.delegate=delegate;
        const measurement:DelegateMeasurement={delegate,samples:0,warmupFrames:this.options.warmupFrames??30,fpsP50:null,fpsP95:null,inferenceP50Ms:null,inferenceP95Ms:null};
        let timer:ReturnType<typeof setTimeout>|undefined;
        let resolve!:()=>void,reject!:(error:Error)=>void;
        const collected=new Promise<void>((done,fail)=>{resolve=done;reject=fail;});
        this.active={warmup:0,inference:[],fps:[],resolve,reject};
        timer=setTimeout(()=>reject(new Error('Timed out before enough camera frames; retry on this Mac.')),this.options.timeoutMs??20000);
        try{
          // Race also bounds a permission prompt/model startup that never settles.
          const started=this.options.start(delegate).then(ok=>{if(!ok)throw new Error('Camera unavailable');return new Promise<void>(()=>{});});
          await Promise.race([collected,started]);
          measurement.samples=this.active.inference.length;
          measurement.fpsP50=percentile(this.active.fps,.5);measurement.fpsP95=percentile(this.active.fps,.95);
          measurement.inferenceP50Ms=percentile(this.active.inference,.5);measurement.inferenceP95Ms=percentile(this.active.inference,.95);
        }catch(error){measurement.error=error instanceof Error?error.message:'Camera benchmark failed';}
        finally{clearTimeout(timer);this.active=null;this.options.stop();}
        measurements.push(measurement);
      }
    }finally{this.running=false;this.delegate=null;}
    const usable=measurements.filter(value=>!value.error).sort((a,b)=>a.inferenceP50Ms!-b.inferenceP50Ms!||a.inferenceP95Ms!-b.inferenceP95Ms!||b.fpsP50!-a.fpsP50!);
    return {measurements,selected:this.cancelled?null:usable[0]?.delegate??null,cancelled:this.cancelled};
  }
}
