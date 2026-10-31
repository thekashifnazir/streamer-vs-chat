import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
import {mountDemoLanding,VIDEO_URL} from './demo-landing';
it('has one immediate keyboard action and moves the single safety checkbox to webcam setup',()=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8')),doc=dom.window.document;mountDemoLanding(doc);
 expect(doc.getElementById('demo-intro')!.textContent).toContain('Chat picks the attacks. You dodge them.');expect(doc.querySelectorAll('#play-now')).toHaveLength(1);expect(doc.querySelectorAll('#clear-space')).toHaveLength(1);expect(doc.getElementById('clear-space')!.closest('#webcam-settings')).not.toBeNull();expect(doc.getElementById('start-difficulty')!.closest('#demo-more-options')).not.toBeNull();expect(VIDEO_URL).toBe('');expect(doc.getElementById('demo-intro')!.textContent).not.toContain('Watch the');
 const start=vi.fn(),webcam=vi.fn();doc.getElementById('start-fight')!.removeAttribute('disabled');doc.getElementById('start-fight')!.addEventListener('click',start);doc.getElementById('open-webcam')!.addEventListener('click',webcam);doc.getElementById('play-now')!.click();expect(start).toHaveBeenCalledOnce();doc.getElementById('demo-webcam')!.click();expect(webcam).toHaveBeenCalledOnce();expect(doc.getElementById('stage')!.hidden).toBe(true);dom.window.close();
});
it('does not seed memory and stops even a pending camera when keyboard is selected',()=>{
 const main=readFileSync(new URL('./main.ts',import.meta.url),'utf8');expect(main).not.toContain('createDemoViewerMemory');expect(main).toContain("if(source.value==='keyboard'){camera.stop();");expect(main).toContain('difficulty.addEventListener');
});
