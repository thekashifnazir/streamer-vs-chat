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
 const dom=new JSDOM('<main><section id="more-to-try"><div class="more-cards"><section id="demo-forge-host"></section></div></section></main>');
 const doc=dom.window.document;vi.stubGlobal('document',doc);
 const style=doc.createElement('style');style.textContent=readFileSync(new URL('../../overlay/src/style.css',import.meta.url),'utf8')+'\n'+readFileSync(new URL('./style.css',import.meta.url),'utf8');doc.head.append(style);
 const host=doc.getElementById('demo-forge-host')!,ui=mountDemoForge(host,{betweenRounds:()=>true,onAccepted:()=>{},onSnapshot:()=>{}});
 try{
  expect(host.classList.contains('forge-card')).toBe(false);
  expect(dom.window.getComputedStyle(host).position).not.toBe('absolute');
  expect(dom.window.getComputedStyle(host.parentElement!).display).toBe('grid');
 }finally{ui.dispose();dom.window.close();}
});
