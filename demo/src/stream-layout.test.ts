import {SCOUT_PREVIEW_BADGE} from './scout-preview';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {STREAM_CHROME,streamFrame,mountStreamLayout} from './stream-layout';
const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
it('fits both full Rails and start/safety controls at 1080p and 720p after connect',()=>{
 for(const [width,height]of [[1920,1080],[1280,720]]){
  const frame=streamFrame(width!,height!);
  expect(frame.width/frame.height).toBeCloseTo(16/9);
  expect(frame.width).toBeLessThanOrEqual(width!);
  expect(frame.bottom).toBeLessThanOrEqual(height!);
  expect(frame.bottom+STREAM_CHROME.controls+STREAM_CHROME.status).toBeLessThanOrEqual(height!);
 }
 // Bind the geometry check to the production CSS budget, with no wrapped rows.
 expect(css).toContain('calc((100dvh - 120px)*16/9)');
 expect(STREAM_CHROME.bar+STREAM_CHROME.controls+STREAM_CHROME.status).toBe(120);
 expect(css).toContain('.stream-compact .demo-controls{box-sizing:border-box;flex:none;width:100%;height:52px');
 expect(css).toContain('flex-wrap:nowrap');
 expect(css).toContain('.stream-compact .demo-stage{flex:none;');
 expect(css).toContain('.stream-compact .tutorial{top:50%;padding:16px 24px}');
});
class Node extends EventTarget{
 textContent='';checked=false;hidden=false;attrs=new Map<string,string>();nodes=new Map<string,Node>();
 classList={toggle:(name:string,value:boolean)=>{this.attrs.set(name,String(value));}};
 set className(value:string){this.attrs.set('class',value);}set innerHTML(_value:string){}
 setAttribute(key:string,value:string){this.attrs.set(key,value);}
 querySelector(selector:string){if(!this.nodes.has(selector))this.nodes.set(selector,new Node());return this.nodes.get(selector)!;}
 prepend(_node:Node){}click(){this.dispatchEvent(new Event('click'));}
}
it('collapses on explicit readiness, keeps status/green/end accessible and restores setup with Expand',()=>{
 const bar=new Node(),body=new Node(),main=new Node(),stage=new Node(),original=new Node();let ended=0;
 const doc={body,createElement:()=>bar,querySelector:()=>main,getElementById:(id:string)=>id==='stage'?stage:original} as unknown as Document;
 const layout=mountStreamLayout({live:true,onEnd:()=>ended++},doc);
 expect(bar.hidden).toBe(true);expect(bar.querySelector('.stream-expand').textContent).toBe('Collapse');expect(bar.querySelector('.stream-expand').attrs.get('aria-expanded')).toBe('true');
 layout.collapse();expect(bar.hidden).toBe(false);expect(body.attrs.get('stream-compact')).toBe('true');
 layout.status(SCOUT_PREVIEW_BADGE);expect(bar.querySelector('.stream-status').textContent).toBe('SCOUT PREVIEW · SIMULATED');
 // Conservative14px per character plus the other toolbar controls fits even720p.
 expect(SCOUT_PREVIEW_BADGE.length*14+170+110+100+3*20+24).toBeLessThan(1280);
 layout.status('LIVE · Twitch chat connected');expect(bar.querySelector('.stream-status').textContent).toContain('LIVE');
 let greenChanges=0;original.addEventListener('change',()=>greenChanges++);const green=bar.querySelector('.stream-green');green.checked=true;green.dispatchEvent(new Event('change'));expect(stage.attrs.get('chroma-green')).toBe('true');expect(original.checked).toBe(true);expect(greenChanges).toBe(1);
 bar.querySelector('.stream-expand').click();expect(body.attrs.get('stream-compact')).toBe('false');
 expect(bar.querySelector('.stream-expand').attrs.get('aria-expanded')).toBe('true');
 layout.collapse();bar.querySelector('.stream-end').click();expect(ended).toBe(1);expect(body.attrs.get('stream-compact')).toBe('false');
});
it('wires collapse to hosted connection and demo fight start, leaving all safety buttons mounted',()=>{
 const main=readFileSync(new URL('./main.ts',import.meta.url),'utf8');
 const play=readFileSync(new URL('./play.ts',import.meta.url),'utf8');
 expect(main).not.toContain('onConnected:()=>streamLayout.collapse()');
 expect(main).toContain('if(previewConfig)streamLayout.status(SCOUT_PREVIEW_BADGE)');
 expect(main).toContain("el('tutorial').hidden=true;\n  streamLayout.collapse();");
 expect(play).toContain('if(connected)options.onConnected?.();');
 for(const file of ['../index.html','../play/index.html']){
  const html=readFileSync(new URL(file,import.meta.url),'utf8');
  for(const id of ['stop-input','resume-input','next-round','restart','webcam-settings'])expect(html).toContain(`id="${id}"`);
  expect(html).toContain('id="attack-rows"');
 }
});
