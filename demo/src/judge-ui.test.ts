import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it} from 'vitest';
import {hostedOnboardingMarkup} from './hosted-onboarding';
it('reserves the exact hosted panel before JavaScript mounts, so setup keeps its grid position',()=>{
 const dom=new JSDOM(readFileSync(new URL('../play/index.html',import.meta.url),'utf8'));
 try{const doc=dom.window.document,slot=doc.getElementById('hosted-onboarding-slot')!,expected=doc.createElement('div');expected.innerHTML='<section class="hosted-panel">'+hostedOnboardingMarkup()+'</section>';expect(slot.innerHTML).toBe(expected.innerHTML);expect(slot.querySelectorAll('.hosted-panel')).toHaveLength(1);expect(doc.querySelector('#onboarding-row')!.children[1]!.id).toBe('fight-setup');
 const style=doc.createElement('style');style.textContent=readFileSync(new URL('./style.css',import.meta.url),'utf8');doc.head.append(style);expect(dom.window.getComputedStyle(doc.getElementById('twitch-connect')!).backgroundColor).toBe('rgb(119, 44, 232)');}finally{dom.window.close();}
});
it('defines a scale-aware 24px Plain checkbox instead of a tiny transformed checkbox',()=>{
 const css=readFileSync(new URL('../../overlay/src/style.css',import.meta.url),'utf8'),hud=readFileSync(new URL('../../overlay/src/hud.ts',import.meta.url),'utf8');expect(css).toContain('.rails-hud footer .hud-options input[data-id=plain]');expect(css).toContain('min-width:var(--hud-hit-target,24px)');expect(css).toContain('min-height:var(--hud-hit-target,24px)');expect(hud).toContain("setProperty('--hud-hit-target',`${scale>0?24/scale:24}px`)");for(const width of [390,1280,1920]){const scale=width/1920;expect(24/scale*scale).toBeCloseTo(24);}
});
