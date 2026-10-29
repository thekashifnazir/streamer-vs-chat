import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {voteCountLabel} from '../../shared/src/chat-commands';
it('keeps primary/short names, counts and 100% in separate cells at both HUD sizes',()=>{
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
 expect(css).toContain('grid-template-columns:142px minmax(54px,1fr) 72px');
 expect(css).toContain('left:148px;right:78px;');expect(css).toContain('left:144px;right:74px');
 expect(css).not.toContain('.seated.rails-hud:not(.custom-boss) .vote-track{display:none}');
 // Advance widths measured from shipped BarlowCondensed-700.woff2 at 36px:
 // widest command !combo/!c=138.42; 444=52.272; 100%=70.416; 1k=26.388.
 for(const scale of [1,720/1080])for(const [inner,gap]of [[390,6],[272,2]]){
  const track=inner!-142-72-2*gap!;expect(track).toBeGreaterThanOrEqual(54);
  expect((138.42+2)*scale).toBeLessThan(142*scale);
  expect((52.272+1)*scale).toBeLessThan(track*scale);
  expect((70.416+1)*scale).toBeLessThan(72*scale);
 }
 expect(voteCountLabel(1)).toBe('1');expect(voteCountLabel(500)).toBe('500');expect(voteCountLabel(1000)).toBe('1k');
});
