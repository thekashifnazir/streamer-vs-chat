import type { StreamerInput } from '@svc/shared';

/** A short input tutorial, independent of the fight reducer and camera permission. */
export class InputTutorial {
  private index=0;
  constructor(private noPunch=false) {}
  get step(){return this.index;}
  get complete(){return this.index===3;}
  get keys(){return this.noPunch?['K','A','D'] as const:['K','A','J'] as const;}
  setNoPunch(value:boolean){this.noPunch=value;}
  input(input:StreamerInput) {
    if(this.index===0&&input.kind==='pose'&&input.guard)this.index=1;
    else if(this.index===1&&input.kind==='pose'&&input.lean==='L')this.index=2;
    else if(this.index===2&&(this.noPunch?input.kind==='pose'&&input.lean==='R':input.kind==='punch'))this.index=3;
    return this.complete;
  }
}
