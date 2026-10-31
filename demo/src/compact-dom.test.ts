import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it} from 'vitest';
import {mountStreamLayout} from './stream-layout';

const styles=readFileSync(new URL('../../overlay/src/style.css',import.meta.url),'utf8')+'\n'+readFileSync(new URL('./style.css',import.meta.url),'utf8');
const source=readFileSync(new URL('../../overlay/src/hud.ts',import.meta.url),'utf8');
// Use the actual production HUD template: its nested <main> caused this regression.
const hudMarkup=source.match(/host\.innerHTML=`([\s\S]*?)`;/)![1]!;

it.each(['../index.html','../play/index.html'])('retains visible, dimensioned Rails when compacting %s',file=>{
 const dom=new JSDOM(readFileSync(new URL(file,import.meta.url),'utf8'));
 try{
  const {document,getComputedStyle}=dom.window;
  if(file.includes('/play/'))document.body.dataset.playStep='fight';
  const style=document.createElement('style');style.textContent=styles;document.head.append(style);
  const host=document.getElementById('game-hud')!;host.classList.add('rails-host');host.innerHTML=hudMarkup;
  const layout=mountStreamLayout({live:file.includes('/play/'),onEnd:()=>{}},document);
  const hud=host.querySelector<HTMLElement>('main.rails-hud')!;
  for(const seated of [false,true])for(const compact of [false,true,false]){
   hud.classList.toggle('seated',seated);
   if(compact)layout.collapse();else layout.expand();
   expect(document.body.classList.contains('stream-compact')).toBe(compact);
   const root=getComputedStyle(hud);
   for(const selector of ['.rail.streamer','.rail.boss']){
    const rail=hud.querySelector<HTMLElement>(selector)!;
    // Check the rail and all ancestors: display is not inherited in computed styles.
    for(let element:Element|null=rail;element;element=element.parentElement)expect(getComputedStyle(element).display,`${file} ${selector} under ${element.tagName}.${element.className}`).not.toBe('none');
    const box=getComputedStyle(rail);
    expect(parseFloat(box.width)).toBeGreaterThan(0);
    expect(box.top).toBe('0px');expect(box.bottom).toBe('0px');
    // jsdom has no layout engine. The declared nonzero HUD height and stretched
    // rail insets prove a nonzero CSS height; do not invent bounding rectangles.
    expect(parseFloat(root.height)-parseFloat(box.top)-parseFloat(box.bottom)).toBeGreaterThan(0);
   }
   expect(root.width).toBe('1920px');expect(root.height).toBe('1080px');
   expect(root.display).not.toBe('flex'); // Page-main flex layout must not reach the HUD.
  }
 }finally{dom.window.close();}
});
