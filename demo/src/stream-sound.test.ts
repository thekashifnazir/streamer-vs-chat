import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it} from 'vitest';
import {hostedOnboardingMarkup} from './hosted-onboarding';
it('offers hosted sound on by default with truthful page-specific footers',()=>{
 const live=new JSDOM(readFileSync(new URL('../play/index.html',import.meta.url),'utf8'));
 const demo=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 expect(live.window.document.querySelector<HTMLInputElement>('#stream-sound')!.checked).toBe(true);
 expect(live.window.document.querySelector('footer')!.textContent).toContain('Sound starts on at START FIGHT');
 expect(demo.window.document.querySelector('#stream-sound')).toBeNull();expect(demo.window.document.querySelector('footer')!.textContent).toContain('Sound starts off');
 live.window.close();demo.window.close();
});
it('gives both OBS audio routes and a meter test without changing Twitch permissions',()=>{
 const dom=new JSDOM(hostedOnboardingMarkup()),doc=dom.window.document;
 expect(doc.querySelector('#obs-step')!.textContent).toContain('Capture Chrome audio in OBS too');
 const text=doc.querySelector('#obs-instructions')!.textContent;
 expect(text).toContain('Windows: in Window Capture tick “Capture Audio”, or add an “Application Audio Capture” source for Chrome.');
 expect(text).toContain('macOS: use “macOS Screen Capture” set to Window and tick “Capture Audio”.');
 expect(text).toContain('Test: press M, you should see the Chrome audio meter move in OBS.');dom.window.close();
});
