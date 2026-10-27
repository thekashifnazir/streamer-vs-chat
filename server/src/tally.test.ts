import { expect, it } from 'vitest';
import { VoteTally } from './tally';
import { parseChatVote } from '@svc/shared';
it('replaces the previous choice from a viewer and drops locked super votes', () => {
  const tally = new VoteTally(true);
  for (const text of ['!jab','!hookl','!super']) tally.accept(parseChatVote(text,'A',1,true)!);
  expect(tally.snapshot()).toEqual({kind:'tally',tally:{JAB:0,HOOK_L:1,HOOK_R:0,COMBO:0,SUPER:0},voters:1,simulated:true});
});
