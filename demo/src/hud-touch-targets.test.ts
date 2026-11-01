import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';

it('gives the scaled HUD SOUND and PLAIN controls 44 px touch targets on phones/touch only',()=>{
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
 const block=css.split('@media(max-width:760px),(pointer:coarse){')[1]?.split('\n}')[0];
 expect(block,'phone/touch media block').toBeTruthy();
 const target='calc(44px / var(--demo-hud-scale,1))';
 const sound=block!.split('button[data-id=sound]{')[1]!.split('}')[0]!,plain=block!.split('input[data-id=plain]{')[1]!.split('}')[0]!;
 for(const property of ['min-width','min-height'])expect(sound).toContain(`${property}:${target}`);
 for(const property of ['width','height','min-width','min-height'])expect(plain).toContain(`${property}:${target}`);
 // /play (PLAIN and connection line visible): SOUND shares the connection row, PLAIN gets the bottom row,
 // so two 44 px rows never push the connection line into the status card.
 const play=':not(.memory-on):not(.offline-demo) .rail.streamer footer';
 expect(block).toContain(`${play}>.hud-options{display:contents}`);
 expect(block).toContain(`${play} button[data-id=sound]{grid-column:1;grid-row:2}`);
 expect(block).toContain(`${play}>.connection{grid-column:2;grid-row:2`);
 expect(block).toContain(`${play} .hud-options label{grid-column:1/-1;grid-row:3}`);
 // The 1920x1080 stream overlay stylesheet keeps its own 24 px rule.
 const overlay=readFileSync(new URL('../../overlay/src/style.css',import.meta.url),'utf8');
 expect(overlay).not.toContain('44px / var(--demo-hud-scale');expect(overlay).toContain('min-width:var(--hud-hit-target,24px)');
});
