import { describe, expect, it } from 'vitest';
import { parseChatVote } from './index';
describe('chat commands', () => {
  it.each([['!jab','JAB'],['!hookl','HOOK_L'],['!hookr','HOOK_R'],['!combo','COMBO'],['!super','SUPER']])('parses %s case-insensitively as the first word', (command, move) => {
    expect(parseChatVote(`  ${command.toUpperCase()} extra !jab`, 'viewer', 123, true)).toEqual({kind:'vote',user:'viewer',move,at:123,simulated:true});
  });
  it.each(['hello', 'hello !jab', '!jabber', '!jab!', '', 'constructor', '__proto__'])('ignores %s', text => {
    expect(parseChatVote(text,'viewer',1,false)).toBeNull();
  });
});
