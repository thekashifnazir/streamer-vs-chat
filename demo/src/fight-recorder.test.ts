// @vitest-environment jsdom
import {describe,expect,it} from 'vitest';
import {createFightRecorder,fightRecEnabled,mountFightRecorder,type FightRecFrame} from './fight-recorder';
const pose=(x:number)=>Array.from({length:33},(_,i)=>({x:x+i/1000,y:.5,z:0,visibility:.9}));
const info=(over:Partial<FightRecFrame>={}):FightRecFrame=>({ready:true,framed:true,calibrated:true,fps:30,inferenceMs:12,score:{L:.1,R:.2},guard:false,lean:null,...over});
const meta={page:'/play/',mode:'Boss Fight',difficulty:'easy',posture:'standing',noPunch:false};
describe('?rec=1 fight recorder',()=>{
 it('is off, adds nothing and records nothing without the flag',()=>{
  expect(fightRecEnabled('')).toBe(false);expect(fightRecEnabled('?rec=0')).toBe(false);expect(fightRecEnabled('?lab=punch')).toBe(false);
  expect(fightRecEnabled('?rec=1')).toBe(true);expect(fightRecEnabled('?mode=trainer&rec=1')).toBe(true);
  expect(mountFightRecorder(document,'',()=>meta)).toBeNull();expect(document.querySelector('.fight-rec')).toBeNull();
 });
 it('records frames, punches, defence changes and gaps in the punch lab shape',()=>{
  const rec=createFightRecorder();
  rec.calibration({guardThreshold:1.2,punchThresholds:{L:.5,R:.55}},'setup',990);
  rec.frame(pose(.4),1000,info());
  rec.frame(pose(.41),1033,info({guard:true}));
  rec.punch('R',1033,1020,true,true,'fight');
  rec.frame(pose(.42),1400,info({guard:false,lean:'L',ready:false}));
  rec.punch('L',1400,1390,false,false,'fight');
  const out=rec.recording({startedAt:'2026-11-02T16:30:00.000Z',...meta});
  expect(out.frames).toHaveLength(3);expect(out.frames[0]!.at).toBe(0);expect(out.frames[2]!.at).toBe(400);
  expect(out.frames[0]!.landmarks).toHaveLength(33);expect(out.frames[0]!.landmarks[1]).toEqual([.401,.5,0,.9]);
  expect(out.frames[2]).toMatchObject({ready:false,fps:30,inferenceMs:12,score:{L:.1,R:.2}});
  expect(out.calibration).toEqual({guardThreshold:1.2,punchThresholds:{L:.5,R:.55}});expect(out.calibrationSource).toBe('setup');
  expect(out.thresholds.boss).toEqual({L:.5,R:.55});
  const kinds=out.events.map(e=>`${e.kind}${e.side??''}`);
  expect(kinds).toEqual(['calibration','guard','punchR','gap','guard-off','leanL','punchL']);
  expect(out.events.find(e=>e.kind==='punch'&&e.side==='R')).toMatchObject({at:33,peakAt:20,ready:true,taken:true,phase:'fight'});
  expect(out.events.find(e=>e.kind==='gap')).toMatchObject({gapMs:367});
  expect(out.provenance).toContain('page /play/');expect(out.sections).toEqual([]);
 });
 it('keeps only the newest frames inside the cap',()=>{
  const rec=createFightRecorder({maxMs:1000});
  for(let at=0;at<=3000;at+=100){rec.frame(pose(.4),at,info());if(at===500||at===2900)rec.punch('L',at,at-10,true,true,'fight');}
  expect(rec.frameCount).toBe(11);expect(rec.seconds).toBe(1);
  const out=rec.recording({startedAt:'x',...meta});
  expect(out.frames[0]!.at).toBe(0);expect(out.frames.at(-1)!.at).toBe(1000);
  // Events older than the first kept frame were dropped when the cap trimmed; later ones stay.
  expect(out.events.filter(e=>e.kind==='punch').map(e=>e.at)).toEqual([900]);
 });
 it('mounts a REC chip outside the stage that saves a frames.json file',()=>{
  const clicks:string[]=[];const real=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(this:HTMLAnchorElement){clicks.push(this.download);};
  (window.URL as unknown as {createObjectURL:()=>string}).createObjectURL=()=>'blob:x';(window.URL as unknown as {revokeObjectURL:()=>void}).revokeObjectURL=()=>{};
  try{
   const rec=mountFightRecorder(document,'?rec=1',()=>meta,()=>new Date(2026,10,2,16,5,9))!;
   expect(document.querySelector('.fight-rec')?.textContent).toContain('● REC');
   document.querySelector<HTMLButtonElement>('.fight-rec [data-rec="save"]')!.click();
   document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyR',shiftKey:true}));
   document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyR'}));
   expect(clicks).toEqual(['fight-rec-2026-11-02-16-05-09.frames.json','fight-rec-2026-11-02-16-05-09.frames.json']);
   expect(rec.frameCount).toBe(0);
  }finally{HTMLAnchorElement.prototype.click=real;document.querySelector('.fight-rec')?.remove();}
 });
});
