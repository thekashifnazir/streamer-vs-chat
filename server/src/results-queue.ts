/** Round results only. Clock is supplied by the server/tests; no timers or network here. */
export class ResultsQueue {
  private messages:string[]=[];
  private lastAttempt=-Infinity;
  private sending=false;
  private closed=false;
  constructor(private send:(text:string)=>Promise<unknown>,private onError:(error:unknown)=>void=()=>{}) {}
  get pending():readonly string[] {return [...this.messages];}
  enqueue(text:string,now:number):void {
    if(this.closed)return;
    this.messages.push(text);if(this.messages.length>3)this.messages.shift();
    this.flush(now);
  }
  flush(now:number):void {
    if(this.closed||this.sending||!this.messages.length||now-this.lastAttempt<10000)return;
    const text=this.messages.shift()!;this.lastAttempt=now;this.sending=true;
    Promise.resolve().then(()=>this.send(text)).catch(this.onError).finally(()=>{this.sending=false;});
  }
  close():void {this.closed=true;this.messages=[];}
}
