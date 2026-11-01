import {describe,expect,it} from 'vitest';
import {createHandsWatch,HANDS_OUT_MS} from './hands-warning';
const body=(left={x:.6,y:.5,visibility:.9},right={x:.4,y:.5,visibility:.9})=>Object.assign(Array.from({length:33},()=>({x:.5,y:.4,visibility:.9})),{15:left,16:right});
describe('hands-in-view watch',()=>{
 it('warns only after a wrist has been lost for more than 0.5 s, and clears as soon as both are back',()=>{
  const watch=createHandsWatch();watch.frame(body(),0);expect(watch.out(0)).toBe(false);
  watch.frame(body({x:.6,y:.5,visibility:.2}),100);expect(watch.out(100+HANDS_OUT_MS)).toBe(false);
  watch.frame(body({x:.6,y:.5,visibility:.2}),400);expect(watch.out(601)).toBe(true);
  watch.frame(body(),700);expect(watch.out(700)).toBe(false);
 });
 it('counts a wrist outside the image or no pose at all as lost',()=>{
  const watch=createHandsWatch();watch.frame(body(undefined,{x:.4,y:1.08,visibility:.9}),0);watch.frame(body(),1);
  watch.frame(body({x:.6,y:1.08,visibility:.9}),10);expect(watch.out(520)).toBe(true);
  watch.reset();watch.frame([],0);expect(watch.out(501)).toBe(true);
 });
 it('warns when pose frames stop arriving, but not before the first frame',()=>{
  const watch=createHandsWatch();expect(watch.out(5000)).toBe(false);watch.frame(body(),0);expect(watch.out(400)).toBe(false);expect(watch.out(501)).toBe(true);
 });
});
