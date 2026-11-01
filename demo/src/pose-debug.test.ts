// @vitest-environment jsdom
import {describe,expect,it} from 'vitest';
import {formatPoseMove,mountPoseDebug,poseDebugEnabled} from './pose-debug';
describe('?debug=pose readout',()=>{
 it('is off unless the URL asks for it',()=>{
  expect(poseDebugEnabled('')).toBe(false);expect(poseDebugEnabled('?mode=trainer')).toBe(false);expect(poseDebugEnabled('?debug=1')).toBe(false);
  expect(poseDebugEnabled('?debug=pose')).toBe(true);expect(poseDebugEnabled('?mode=trainer&debug=audio,pose')).toBe(true);
  expect(mountPoseDebug(document,'')).toBeNull();expect(document.querySelector('.pose-debug')).toBeNull();
 });
 it('formats a move with side and local time to the millisecond',()=>{
  expect(formatPoseMove({kind:'PUNCH',side:'L'},new Date(2026,10,1,21,3,4,120))).toBe('PUNCH L · 21:03:04.120');
  expect(formatPoseMove({kind:'GUARD'},new Date(2026,10,1,9,0,0,5))).toBe('GUARD · 09:00:00.005');
 });
 it('shows pose fps, the last 5 moves newest first and the expected token, outside the stage',()=>{
  const debug=mountPoseDebug(document,'?debug=pose',()=>new Date(2026,10,1,21,3,4,120))!;
  for(let at=0;at<=1000;at+=40)debug.frame(at);
  const panel=document.querySelector('.pose-debug')!;expect(panel.parentElement).toBe(document.body);
  expect(panel.querySelector('[data-d=fps]')!.textContent).toBe('pose 26 fps');
  for(const side of ['L','R','L','R','L','R'] as const)debug.move({kind:'PUNCH',side});debug.move({kind:'SLIP',side:'L'});
  expect([...panel.querySelectorAll('li')].map(li=>li.textContent)).toEqual(['SLIP L · 21:03:04.120','PUNCH R · 21:03:04.120','PUNCH L · 21:03:04.120','PUNCH R · 21:03:04.120','PUNCH L · 21:03:04.120']);
  debug.expect('1 (L)');expect(panel.querySelector('[data-d=expect]')!.textContent).toBe('NEXT 1 (L)');debug.expect(null);expect(panel.querySelector<HTMLElement>('[data-d=expect]')!.hidden).toBe(true);
 });
});
