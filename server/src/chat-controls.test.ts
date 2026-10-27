import { expect, it } from 'vitest';
import { parseChatControl } from './chat-controls';
it('acceptance14: only broadcaster plain stop and mod/broadcaster commands are authorized',()=>{
  expect(parseChatControl('  StOp  ','caster','broadcaster')).toEqual({kind:'control',action:'stop',by:'caster'});
  for(const role of ['viewer','mod'] as const)expect(parseChatControl('stop','user',role)).toBeNull();
  for(const role of ['mod','broadcaster'] as const)for(const action of ['pause','resume','veto'] as const) {
    expect(parseChatControl(`!${action.toUpperCase()} trailing`,'user',role)).toEqual({kind:'control',action,by:'user'});
  }
  for(const action of ['!pause','!resume','!veto'])expect(parseChatControl(action,'viewer','viewer')).toBeNull();
  expect(parseChatControl('stop please','caster','broadcaster')).toBeNull();
  expect(parseChatControl('!vetoed','mod','mod')).toBeNull();
});
