import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
it('reserves separate scouting and source/control regions without changing memory layout',()=>{
 const base=css.slice(css.indexOf('/* Keep safety/source labels'),css.indexOf('\n.forge-card'));
 const value=(name:string)=>Number(base.match(new RegExp(`--left-${name}:([0-9]+)px`))![1]);
 for(const seated of [false,true]){
  const rows=[seated?108:value('header-h'),seated?130:value('hp-h'),value('bar-h'),value('rounds-h'),seated?300:value('scout-h')];
  const contentEnd=(seated?20:value('padding-y'))+rows.reduce((a,b)=>a+b,0)+4*value('gap');
  const footerStart=1080-(seated?22:value('footer-bottom'))-value('footer-h');
  for(const scale of [1,720/1080])expect(contentEnd*scale).toBeLessThan(footerStart*scale);
 }
 expect(base).toContain('.scouting:not([hidden])+.status-card{display:none}');
 expect(base).toContain('footer>.simulated{grid-column:1/-1;max-width:100%;white-space:nowrap');
 expect([...base.matchAll(/\.rails-hud[^,{]*|\.seated\.rails-hud[^,{]*/g)].every(match=>match[0].includes(':not(.memory-on)'))).toBe(true);
});
