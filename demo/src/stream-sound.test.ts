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
 const text=doc.querySelector('#obs-instructions')!.textContent;
 expect(text).toContain('macOS Screen Capture → Method: Window Capture → “Streamer vs Chat · Twitch play”');
 expect(text).toContain('macOS Audio Capture → Application Audio Capture → Google Chrome');
 expect(text).toContain('Window Capture has no audio option on macOS');
 expect(text).toContain('Window Capture → “Streamer vs Chat · Twitch play” (this Chrome window) → tick Capture Audio');
 expect(text).toContain('START FIGHT plays the announcer and the OBS meter should move');expect(text).toContain('M mutes and unmutes');expect(text).not.toContain('Test: press M');dom.window.close();
});
