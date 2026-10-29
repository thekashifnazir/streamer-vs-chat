import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {createGame,step} from '../../shared/src/engine';
import {TEMPO,type Difficulty} from '../../shared/src/tempo';
import {nextBeatSeconds} from './hud';
it('NEXT IN uses the selected beat and defaults to the original hard countdown',()=>{
 for(const difficulty of Object.keys(TEMPO) as Difficulty[]){
  const state=step(createGame({difficulty,now:0}),{kind:'advance'},500);
  expect(nextBeatSeconds(state)).toBe(((TEMPO[difficulty].beat-500)/1000).toFixed(1));
 }
 expect(nextBeatSeconds(createGame({now:0}))).toBe('2.4');
});
it('keeps the difficulty tag beside the round number at the HUD font floor',()=>{
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
 expect(css).toContain('.clock .difficulty-tag{display:inline-block;');
 expect(css).toContain('margin-left:10px;font-size:36px;');
});
it('both offline and hosted screens keep Medium-selected difficulty controls available after the tutorial',()=>{
 for(const path of ['../../demo/index.html','../../demo/play/index.html']){
  const html=readFileSync(new URL(path,import.meta.url),'utf8');
  const tutorial=html.split('<section id="tutorial"')[1]!.split('</section>')[0]!;
  const controls=html.split('<section class="demo-controls"')[1]!.split('</section>')[0]!;
  expect(tutorial).not.toContain('id="start-difficulty"');
  expect(controls).toContain('Difficulty <select id="start-difficulty">');
  expect(html.match(/id="start-difficulty"/g)).toHaveLength(1);
  expect(html).toContain('<option value="medium" selected>Medium</option>');
  for(const value of ['easy','hard','expert'])expect(html).toContain(`<option value="${value}">`);
 }
});
