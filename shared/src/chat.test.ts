import { describe, expect, it } from 'vitest';
import { parseChatVote } from './index';
import {DEFAULT_BOSS} from './boss-def';
import nakMuay from '../../fixtures/bosses/nak-muay.json';
describe('chat commands', () => {
  it.each([['!jab','JAB'],['!hookl','HOOK_L'],['!hookr','HOOK_R'],['!combo','COMBO'],['!super','SUPER'],['!left','HOOK_L'],['!l','HOOK_L'],['!right','HOOK_R'],['!r','HOOK_R'],['!j','JAB'],['!c','COMBO'],['!s','SUPER']])('parses %s case-insensitively as the first word', (command, move) => {
    for(const variant of [command,command.toUpperCase(),command.slice(0,2).toUpperCase()+command.slice(2)])expect(parseChatVote(`  ${variant} extra !jab`, 'viewer', 123, true)).toEqual({kind:'vote',user:'viewer',move,at:123,simulated:true});
  });
  it.each(['hello', 'hello !jab', '!jabber', '!jab!', '', 'constructor', '__proto__', '1hookl', 'left', '!lefty', '!', '!s!', 'right !right', '!rubbish'])('ignores %s', text => {
    expect(parseChatVote(text,'viewer',1,false)).toBeNull();
  });
  it('gives an explicitly supplied canonical boss the same default aliases',()=>{
    expect(parseChatVote('!LEFT','viewer',1,false,DEFAULT_BOSS)?.move).toBe('HOOK_L');
    expect(parseChatVote('!S','viewer',1,false,structuredClone(DEFAULT_BOSS))?.move).toBe('SUPER');
  });
  it('keeps custom Forge commands exact without default aliases',()=>{
    const custom=structuredClone(DEFAULT_BOSS);custom.name='Custom Golem';custom.moves=custom.moves.slice(0,4);custom.moves[0]!.command='!left';
    expect(parseChatVote('!LEFT extra','viewer',1,false,custom)?.move).toBe('JAB');
    expect(parseChatVote('!l','viewer',1,false,custom)).toBeNull();
    expect(parseChatVote('!j','viewer',1,false,custom)).toBeNull();
    expect(parseChatVote('!lefty','viewer',1,false,custom)).toBeNull();
    const nak=nakMuay as import('./boss-def').BossDef;
    for(const command of ['!left','!l','!right','!r','!j','!c','!s','!jab','!hookl','!hookr','!combo'])expect(parseChatVote(command,'viewer',1,false,nak)).toBeNull();
    expect(parseChatVote('!ELBOWL extra','viewer',1,false,nak)?.move).toBe('HOOK_L');
  });
});
