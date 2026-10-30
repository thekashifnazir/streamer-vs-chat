import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {JSDOM} from 'jsdom';
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
  const dom=new JSDOM(html);
  try{
   const doc=dom.window.document,select=doc.querySelector<HTMLSelectElement>('#start-difficulty')!;
   expect(doc.querySelector('#tutorial #start-difficulty')).toBeNull();
   expect(doc.querySelector('#fight-setup #start-difficulty')).toBe(select);
   expect(doc.querySelectorAll('#start-difficulty')).toHaveLength(1);
   expect(select.value).toBe('medium');
   expect([...select.options].map(option=>option.value)).toEqual(['easy','medium','hard','expert']);
   expect(doc.querySelectorAll('[data-option-for="start-difficulty"]')).toHaveLength(4);
  }finally{dom.window.close();}
 }
});
