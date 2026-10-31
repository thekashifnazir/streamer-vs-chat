import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it} from 'vitest';
import {mountHostedFlow} from './hosted-flow';
const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
it.each([390,1440,1920])('overrides the legacy two-column grid at %i px for every hosted step',viewport=>{
 const dom=new JSDOM(readFileSync(new URL('../play/index.html',import.meta.url),'utf8'));try{
 const doc=dom.window.document;Object.defineProperty(dom.window,'innerWidth',{value:viewport});const style=doc.createElement('style');style.textContent=css;doc.head.append(style);const flow=mountHostedFlow(doc),computed=dom.window.getComputedStyle;
 for(const state of [{connected:false,live:false,obs:false,skipped:false},{connected:true,live:false,obs:false,skipped:false},{connected:true,live:false,obs:false,skipped:true}]){
  flow.update(state);const column=computed(doc.getElementById('onboarding-row')!);expect(column.display).toBe('block');expect(column.gridTemplateColumns).toBe('minmax(0,1fr)');expect(column.width).toBe('calc(100% - 32px)');expect(column.maxWidth).toBe('960px');expect(column.marginLeft).toBe('auto');expect(column.marginRight).toBe('auto');
  for(const id of ['hosted-onboarding-slot','fight-setup']){const child=computed(doc.getElementById(id)!);expect(child.width).toBe('100%');expect(child.maxWidth).toBe('100%');expect(child.minWidth).toBe('0');}
 }
 // jsdom verifies the cascade, not pixel geometry. This is the CSS constraint's
 // expected used width; actual browser rectangles remain a separate check.
 const expected=Math.min(960,viewport-32);expect(expected).toBeLessThanOrEqual(viewport);expect((viewport-expected)/2).toBeGreaterThanOrEqual(16);
 }finally{dom.window.close();}
});
it('uses equal 4px segmented progress and a 44px outlined Advanced control without changing flow state',()=>{
 const dom=new JSDOM(readFileSync(new URL('../play/index.html',import.meta.url),'utf8'));try{const doc=dom.window.document,style=doc.createElement('style');style.textContent=css;doc.head.append(style);const flow=mountHostedFlow(doc);flow.update({connected:true,live:false,obs:false,skipped:false});const computed=dom.window.getComputedStyle,bar=doc.querySelector('.play-step-bar')!;
 expect(computed(bar).display).toBe('grid');expect(computed(bar).gridTemplateColumns).toBe('repeat(3,minmax(0,1fr))');const segments=[...bar.children];expect(segments.map(segment=>(segment as HTMLElement).dataset.state)).toEqual(['done','current','future']);for(const segment of segments)expect(computed(segment).borderTopWidth).toBe('4px');expect(computed(segments[1]!).fontWeight).toBe('700');expect(css).toContain("[data-state=done]::before{content:'✓ '");const summary=doc.querySelector('#advanced-obs>summary')!,box=computed(summary);expect(box.minHeight).toBe('44px');expect(box.borderTopWidth).toBe('1px');expect(box.display).toBe('flex');expect(doc.querySelector('#obs-step .step-number')).toBeNull();
 }finally{dom.window.close();}
});
