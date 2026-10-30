import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountFightSetup} from '../../demo/src/setup-ui';
import {chatCommand,chatCommandLegend} from './chat-commands';
import nak from '../../fixtures/bosses/nak-muay.json';
import type {BossDef} from './boss-def';
it('shows primary aliases with short forms without changing Forge commands',()=>{
 expect(chatCommand('HOOK_L')).toBe('!left (!l)');expect(chatCommand('HOOK_R',undefined,true)).toBe('!right/!r');
 expect(chatCommand('HOOK_L',nak as BossDef)).toBe('!elbowl');expect(chatCommandLegend(nak as BossDef)).not.toContain('!left');
 expect(chatCommandLegend()).toContain('!left = hook from the left → you lean right (!l)');expect(chatCommandLegend()).toContain('!right (!r) = hook from the right → you lean left');
});
it('keeps command help on offline and hosted pages and uses the shared HUD labels',()=>{
 for(const path of ['../../demo/index.html','../../demo/play/index.html']){
  const dom=new JSDOM(readFileSync(new URL(path,import.meta.url),'utf8'));
  try{
   mountFightSetup(dom.window.document,{onStart:()=>{},onWebcamStart:()=>{}});
   const doc=dom.window.document;
   expect(doc.querySelector('[data-defence="lean_right"]')!.textContent).toContain('!left');
   expect(doc.querySelector('[data-defence="lean_right"]')!.textContent).toContain('Lean right');
   expect(doc.querySelector('[data-defence="lean_left"]')!.textContent).toContain('!right');
   expect(doc.querySelector('[data-defence="lean_left"]')!.textContent).toContain('Lean left');
  }finally{dom.window.close();}
 }
 const hud=readFileSync(new URL('../../overlay/src/hud.ts',import.meta.url),'utf8');expect(hud).toContain('textContent=chatCommand(move,state.bossDef,true)');expect(hud).toContain('title=chatCommandLegend(state.bossDef)');
});
