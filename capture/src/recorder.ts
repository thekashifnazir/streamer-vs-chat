import type { Landmark } from './classifier';
export type HeldLabels = {guard:boolean;lean:'L'|'R'|null};
type LabelEvent = 'guard'|'lean_L'|'lean_R';
export type RecordingLabels = {
  version:1; mode:'standing'|'seated'; intervals:{event:LabelEvent;start:number;end:number}[];
  events:{event:'left_punch';t:number}[];
};
export class FixtureRecorder {
  private startAt = 0;
  private active = false;
  private frames: {t:number;lm:number[][]}[] = [];
  private labels: RecordingLabels = {version:1,mode:'standing',intervals:[],events:[]};
  private opened = new Map<LabelEvent,number>();
  private threshold: number | null = null;
  start(at:number, mode:'standing'|'seated', guardThreshold:number|null, held:HeldLabels): void {
    this.startAt=at; this.active=true; this.frames=[]; this.opened.clear(); this.threshold=guardThreshold;
    this.labels={version:1,mode,intervals:[],events:[]};
    this.key(held,at);
  }
  get recording() { return this.active; }
  get frameCount() { return this.frames.length; }
  frame(landmarks:Landmark[],at:number):void {
    if(!this.active || at<this.startAt) return;
    this.frames.push({t:at-this.startAt,lm:landmarks.map(p=>[p.x,p.y,p.z??0,p.visibility??1])});
  }
  key(held:HeldLabels & {punch?:boolean},at:number):void {
    if(!this.active) return;
    const t=Math.max(0,at-this.startAt);
    for(const event of ['guard','lean_L','lean_R'] as const) {
      const on=event==='guard'?held.guard:held.lean===(event==='lean_L'?'L':'R');
      if(on && !this.opened.has(event)) this.opened.set(event,t);
      if(!on && this.opened.has(event)) {
        this.labels.intervals.push({event,start:this.opened.get(event)!,end:t}); this.opened.delete(event);
      }
    }
    if(held.punch) this.labels.events.push({event:'left_punch',t});
  }
  stop(at:number) {
    if(!this.active) return null;
    this.key({guard:false,lean:null},at); this.active=false;
    return {
      landmarks:{version:1,mode:this.labels.mode,calibration:{guardThreshold:this.threshold},frames:this.frames},
      labels:this.labels,
    };
  }
}
export function saveJson(filename:string,content:unknown):void {
  const url=URL.createObjectURL(new Blob([JSON.stringify(content)],{type:'application/json'}));
  const link=document.createElement('a'); link.href=url;link.download=filename;link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
