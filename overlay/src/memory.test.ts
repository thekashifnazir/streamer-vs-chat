import {expect,it} from 'vitest';
import type {ViewerMemoryView} from '../../shared/src/viewer-memory';
import {memoryPresentation} from './memory';
const view=():ViewerMemoryView=>({simulated:true,record:{streams:3,bossesKo:4,timesKo:2},hallOfFame:Array.from({length:5},(_,i)=>({name:`Viewer${i}`,koVotes:10-i,favMove:'JAB'})),nemesis:{name:'<img src=x onerror=alert(1)>',koVotes:10,favMove:'HOOK_L',active:true},mvpStreak:2});
it('keeps memory a projection of authoritative records and hall ranking, capped at four',()=>{
 expect(memoryPresentation(null)).toBeNull();const raw=view(),projected=memoryPresentation(raw)!;
 expect(projected.record).toEqual(raw.record);expect(projected.hall).toHaveLength(4);expect(projected.hall.map(entry=>entry.name)).toEqual(['Viewer0','Viewer1','Viewer2','Viewer3']);expect(projected.simulated).toBe(true);expect(raw.hallOfFame).toHaveLength(5);
});
it('uses server active for the card but still names an inactive known nemesis KO move',()=>{
 const raw=view();expect(memoryPresentation(raw,'HOOK_L')?.nemesis?.name).toBe(raw.nemesis?.name);raw.nemesis!.active=false;
 const result=memoryPresentation(raw,'HOOK_L')!;expect(result.nemesis).toBeNull();expect(result.koMove).toBe('<img src=x onerror=alert(1)>’s KO MOVE');expect(memoryPresentation(raw,'HOOK_R')?.koMove).toBe('');
});
it('clears attribution when the server forgets a viewer and does not infer one from the hall',()=>{
 const raw=view();raw.nemesis=null;expect(memoryPresentation(raw,'JAB')).toMatchObject({nemesis:null,koMove:''});
});

import {readFileSync} from 'node:fs';
it('budgets all seated memory panels and a calm footer without rail overlap at1080 or720',()=>{
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
 const px=(name:string)=>{const value=css.match(new RegExp(`--memory-${name}:([0-9]+)px`));expect(value,`missing CSS layout budget ${name}`).not.toBeNull();return Number(value![1]);};
 const rows=['header-h','hp-h','bar-h','rounds-h','scout-h','record-h','hall-h'];
 const contentEnd=px('padding-y')+rows.reduce((sum,key)=>sum+px(key),0)+(rows.length-1)*px('gap');
 const footerStart=1080-px('footer-bottom')-px('footer-h');
 expect(contentEnd).toBeLessThan(footerStart);
 for(const scale of [1,720/1080])expect(contentEnd*scale).toBeLessThan(footerStart*scale);
 expect(css).toContain('grid-row:6;height:var(--memory-record-h)');expect(css).toContain('grid-row:7;height:var(--memory-hall-h)');
 expect(css).toContain('.seated.memory-on .record-values{grid-template-columns:1fr');
});
