import {expect,it}from'vitest';
import{RaidTracker}from'./raid-tracker';
it('uses first message of any kind this session, admits only within120s and caps membership at raid viewers',()=>{
 const tracker=new RaidTracker();
 expect(tracker.observe('regular',0)).toBe(false);
 tracker.start(2,1000);
 expect(tracker.observe('regular',1001)).toBe(false);
 expect(tracker.observe('new-a',1001)).toBe(true);
 expect(tracker.observe('new-a',2000)).toBe(true);
 expect(tracker.observe('new-b',120999)).toBe(true);
 expect(tracker.observe('new-c',120999)).toBe(false);
 expect(tracker.observe('new-d',121000)).toBe(false);
 expect(tracker.observe('new-a',200000)).toBe(true);
});
it('does not reclassify returning chatters on later raids or confuse prototype IDs',()=>{
 const tracker=new RaidTracker();tracker.start(1,0);
 expect(tracker.observe('__proto__',0)).toBe(true);
 tracker.start(2,1000);
 expect(tracker.observe('__proto__',1000)).toBe(false);
 expect(tracker.observe('constructor',1000)).toBe(true);
 expect(tracker.observe('toString',1000)).toBe(true);
 expect(tracker.observe('extra',1000)).toBe(false);
});
it('treats120s as an exclusive admission boundary and ignores invalid raid counts',()=>{
 const tracker=new RaidTracker();tracker.start(10,0);
 expect(tracker.observe('at-end',120000)).toBe(false);
 tracker.start(NaN,120001);
 expect(tracker.observe('after-end',120001)).toBe(false);
 tracker.start(1.5,120002);
 expect(tracker.observe('fractional',120002)).toBe(false);
 tracker.start(0,120002);
 expect(tracker.observe('no-slots',120003)).toBe(false);
});
