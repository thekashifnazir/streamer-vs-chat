import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';
import {mountDemoForge,PREBAKED_BOSSES} from './forge';
afterEach(()=>vi.unstubAllGlobals());
it('shows plain accepted/rejected copy without changing admission or snapshots',()=>{
 const dom=new JSDOM('<section></section>');
 class FakeWorker {static latest:FakeWorker;onmessage:any;onerror:any;constructor(){FakeWorker.latest=this;}terminate(){}postMessage(value:unknown){this.request=value;}request:any;}
 vi.stubGlobal('document',dom.window.document);vi.stubGlobal('Worker',FakeWorker);
 const host=dom.window.document.querySelector('section')!,accepted=vi.fn(),snapshot=vi.fn();const ui=mountDemoForge(host,{betweenRounds:()=>true,onAccepted:accepted,onSnapshot:snapshot});
 try{
  const button=(action:string)=>host.querySelector<HTMLButtonElement>(`[data-action=${action}]`)!;button('test').click();expect(host.querySelector('[role=status]')!.textContent).toBe('Testing… about 6 seconds.');
  const gate={pass:true,viewers:[0,3,50,500],table:{casual:[50,50,50,50],nopunch:[40,40,40,40]},rounds:4000,seed:2026};
  FakeWorker.latest.onmessage({data:{id:FakeWorker.latest.request.id,errors:[],result:{factor:1,def:PREBAKED_BOSSES[0],before:gate,after:gate},elapsedMs:17}});
  expect(host.querySelector('[role=status]')!.textContent).toBe(`✓ Fair fight. ${PREBAKED_BOSSES[0]!.name} passed the balance test. Press “Use it next round”.`);expect(button('use').disabled).toBe(false);button('use').click();expect(accepted).toHaveBeenCalledOnce();expect(host.querySelector('[role=status]')!.textContent).toBe(`${PREBAKED_BOSSES[0]!.name} selected for the next round.`);
  button('test').click();FakeWorker.latest.onmessage({data:{id:FakeWorker.latest.request.id,errors:['Missing a guard move.'],elapsedMs:10}});expect(host.querySelector('[role=status]')!.textContent).toContain("didn't pass the balance test. Your current boss stays.");expect(host.querySelector('.forge-reason')!.textContent).toBe('Missing a guard move.');expect(button('use').disabled).toBe(true);expect(accepted).toHaveBeenCalledOnce();expect(snapshot.mock.calls.at(-1)![0].status).toBe('rejected');
 }finally{ui.dispose();dom.window.close();}
});

it('keeps the page Forge card in the More to try grid, outside HUD Forge positioning',()=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 const doc=dom.window.document;vi.stubGlobal('document',doc);
 const style=doc.createElement('style');style.textContent=readFileSync(new URL('../../overlay/src/style.css',import.meta.url),'utf8')+'\n'+readFileSync(new URL('./style.css',import.meta.url),'utf8');doc.head.append(style);
 const host=doc.getElementById('demo-forge-host')!,ui=mountDemoForge(host,{betweenRounds:()=>true,onAccepted:()=>{},onSnapshot:()=>{}});
 try{
  expect(host.classList.contains('forge-card')).toBe(false);
  expect(dom.window.getComputedStyle(host).position).not.toBe('absolute');
  expect(dom.window.getComputedStyle(host.parentElement!).display).toBe('grid');
  expect(dom.window.getComputedStyle(host.parentElement!).alignItems).toBe('stretch');
  const share=doc.getElementById('friend-tools')!,computed=dom.window.getComputedStyle;
  for(const card of [host,share]){
   const box=computed(card);expect(box.backgroundColor).toBe('rgb(18, 13, 26)');expect(box.borderLeftWidth).toBe('1px');expect(box.borderLeftColor).toBe('rgb(42, 34, 56)');expect(box.borderTopWidth).toBe('4px');expect(box.borderTopColor).toBe('rgb(46, 242, 255)');expect(box.borderRadius).toBe('16px');expect(box.padding).toBe('26px');
  }
  expect(host.querySelector('.forge-preset-badge')).toBeNull();expect(host.querySelector('.source-label')!.firstChild!.textContent).toBe('Boss ');
  for(const button of [host.querySelector('[data-action="test"]')!,doc.getElementById('copy-demo-link')!]){const appearance=computed(button);expect(appearance.backgroundColor).toBe('rgb(46, 242, 255)');expect(appearance.color).toBe('rgb(12, 9, 18)');}
 }finally{ui.dispose();dom.window.close();}
});


it('explains only the round lock, links both buttons, and hides the hint between rounds',()=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 class FakeWorker{static latest:FakeWorker;onmessage:any;onerror:any;request:any;constructor(){FakeWorker.latest=this;}terminate(){}postMessage(value:unknown){this.request=value;}}
 const doc=dom.window.document;vi.stubGlobal('document',doc);vi.stubGlobal('Worker',FakeWorker);
 const style=doc.createElement('style');style.textContent=readFileSync(new URL('../../overlay/src/style.css',import.meta.url),'utf8')+'\n'+readFileSync(new URL('./style.css',import.meta.url),'utf8');doc.head.append(style);
 let betweenRounds=false;const snapshot=vi.fn(),admit=vi.fn(),host=doc.getElementById('demo-forge-host')!,ui=mountDemoForge(host,{betweenRounds:()=>betweenRounds,onAccepted:admit,onSnapshot:snapshot});
 const hint=host.querySelector<HTMLElement>('.forge-round-hint')!,test=host.querySelector<HTMLButtonElement>('[data-action="test"]')!,use=host.querySelector<HTMLButtonElement>('[data-action="use"]')!;
 try{
  const locked=()=>{expect(host.hidden).toBe(false);expect(hint.hidden).toBe(false);for(const button of [test,use]){expect(button.disabled).toBe(true);expect(button.getAttribute('aria-describedby')).toBe(hint.id);}};
  locked();ui.update();locked(); // Running and paused rounds both keep betweenRounds false.
  expect(hint.textContent).toBe('You can change the boss between rounds. Finish this round first.');
  const computed=dom.window.getComputedStyle(hint);expect(computed.fontSize).toBe('15px');expect(computed.color).toBe('rgb(194, 189, 205)');expect(snapshot).not.toHaveBeenCalled();
  betweenRounds=true;ui.update();expect(hint.hidden).toBe(true);expect(test.disabled).toBe(false);expect(use.disabled).toBe(true);
  for(const button of [test,use])expect(button.hasAttribute('aria-describedby')).toBe(false);
  test.click();expect(test.disabled).toBe(true);ui.update();expect(hint.hidden).toBe(true); // Busy validation is not a round lock.
  const gate={pass:true,viewers:[0,3,50,500],table:{casual:[50,50,50,50],nopunch:[40,40,40,40]},rounds:4000,seed:2026};
  FakeWorker.latest.onmessage({data:{id:FakeWorker.latest.request.id,errors:[],result:{factor:1,def:PREBAKED_BOSSES[0],before:gate,after:gate},elapsedMs:17}});
  expect(use.disabled).toBe(false);betweenRounds=false;ui.update();locked();betweenRounds=true;ui.update();expect(hint.hidden).toBe(true);expect(test.disabled).toBe(false);expect(use.disabled).toBe(false);expect(admit).not.toHaveBeenCalled();
 }finally{ui.dispose();dom.window.close();}
});
