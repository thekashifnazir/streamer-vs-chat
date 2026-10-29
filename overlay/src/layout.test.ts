import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
it('reserves separate scouting and source/control regions without changing memory layout',()=>{
 const base=css.slice(css.indexOf('/* Keep safety/source labels'),css.indexOf('\n.forge-card'));
 const seatedRules=base.split('.seated.rails-hud:not(.memory-on) .streamer{')[1]!.split('}')[0]!;
 const seatedCardHeight=Number(seatedRules.match(/--left-scout-h:([0-9]+)px/)![1]);
 const value=(name:string)=>Number(base.match(new RegExp(`--left-${name}:([0-9]+)px`))![1]);
 for(const seated of [false,true]){
  const rows=[seated?108:value('header-h'),seated?130:value('hp-h'),value('bar-h'),value('rounds-h'),seated?seatedCardHeight:value('scout-h')];
  const contentEnd=(seated?20:value('padding-y'))+rows.reduce((a,b)=>a+b,0)+4*value('gap');
  const footerStart=1080-(seated?22:value('footer-bottom'))-value('footer-h');
  for(const scale of [1,720/1080])expect(contentEnd*scale).toBeLessThan(footerStart*scale);
 }
 expect(base).toContain('.scouting:not([hidden])+.status-card{display:none}');
 expect(base).toContain('footer>.simulated{grid-column:1/-1;max-width:100%;white-space:nowrap');
 expect([...base.matchAll(/\.rails-hud[^,{]*|\.seated\.rails-hud[^,{]*/g)].every(match=>match[0].includes(':not(.memory-on)'))).toBe(true);
});

it('gives the widest share its own intrinsic-width row in standing and seated layouts',()=>{
 const base=css.slice(css.indexOf('/* Keep safety/source labels'),css.indexOf('\n.forge-card'));
 expect(base).toContain('[data-id="habit-details"]{display:grid;grid-template-columns:minmax(0,1fr)');
 expect(base).toContain('>.habit-share{width:max-content;padding-right:8px;font-size:76px');
 expect(base).toContain('.scouting-evidence{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px');
 expect(base).toContain('.seated.rails-hud:not(.memory-on) [data-id="habit-details"]{grid-template-columns:minmax(0,1fr)}');
 // Claude measured the 100% ink width as 181 px at 76 px Anton. Its intrinsic
 // row plus 8 px ink padding fits each card, including proportional 720p scaling.
 const rule=(selector:string)=>base.split(selector+'{')[1]!.split('}')[0]!;
 const px=(declarations:string,property:string)=>Number(declarations.match(new RegExp(property+':([0-9]+)px'))![1]);
 const normal='.rails-hud:not(.memory-on)',seatedSelector='.seated'+normal;
 for(const {font,rail,padding,cardHeight} of [
  {font:px(rule(normal+' [data-id="habit-details"]>.habit-share'),'font-size'),rail:470,padding:40,cardHeight:px(rule(normal+' .streamer'),'--left-scout-h')},
  {font:px(rule(seatedSelector+' [data-id="habit-details"]>.habit-share'),'font-size'),rail:300,padding:20,cardHeight:px(rule(seatedSelector+' .streamer'),'--left-scout-h')}
 ]){
  const inner=rail-2*padding-20-9; // rail padding, card padding, left border
  const glyphWidth=181*font/76;
  const maxContentWidth=glyphWidth+8;
  // Eyebrow + heading + share + evidence + vote line + gaps + padding.
  // Seated evidence and the vote line may each wrap into two lines.
  const seated=rail===300;
  const contentHeight=39.6+(seated?39.6:44)+font+(seated?84:40)+(seated?79.2:39.6)+12+20;
  for(const scale of [1,720/1080]){expect(maxContentWidth*scale).toBeLessThan(inner*scale);expect(contentHeight*scale).toBeLessThan(cardHeight*scale);}
 }
});

import {bossDamageLayout} from './damage-layout';
import {FEEL} from '../../shared/src/feel';
it('keeps every floating number box below vote rows and inside the boss rail at1920x1080 standing/seated',()=>{
 // Design-space rail boxes; production gets the lower boundary from the rendered
 // vote legend, so differing fonts, wrapped locks and mode cards cannot move a
 // number back across a vote row. Include all three lane positions and full rise.
 for(const seated of [false,true]){
  const width=seated?300:470,numberHeight=seated?70:100;
  for(const votesBottom of [560,650,750]){
   const layout=bossDamageLayout(width,1080,votesBottom,seated);
   // Actual shipped Anton ink for −13.75 is235.25px at100px; include
   // the6px shadow, plus the widest36px counter label (<=216px).
   const inkWidth=235.25*numberHeight/100+6;
   expect(layout.boxWidth).toBeGreaterThanOrEqual(Math.max(inkWidth,216));
   for(const center of layout.centers)for(const rise of [0,FEEL.bossHit.floatRisePx]){
    const box={left:center-layout.boxWidth/2,right:center+layout.boxWidth/2,top:layout.top+72-rise,bottom:layout.top+72-rise+numberHeight+36};
    expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(width);
    expect(box.top).toBeGreaterThan(votesBottom);expect(box.bottom).toBeLessThanOrEqual(1080);
   }
  }
 }
 expect(css).toContain('.boss-damage-numbers{position:absolute;left:0;right:0;');
 expect(css).toContain('overflow:hidden;pointer-events:none;z-index:3');
 expect(css).toContain('.boss-damage-number{position:absolute;left:50%;top:72px;');
});
