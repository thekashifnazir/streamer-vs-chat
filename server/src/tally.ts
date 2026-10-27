import { MOVES, type ChatVote, type TallySnapshot } from '@svc/shared';
/** Day 1 input monitor: cumulative until restart, no beat/attack engine yet. */
export class VoteTally {
  private votes = new Map<string, ChatVote>();
  constructor(private readonly simulated: boolean) {}
  accept(vote: ChatVote): void {
    // Static Day 1 hype is zero, so SUPER is ineligible (SPEC §1).
    if (vote.move !== 'SUPER') this.votes.set(vote.user, vote);
  }
  snapshot(): TallySnapshot {
    const tally = Object.fromEntries(MOVES.map(move => [move, 0])) as TallySnapshot['tally'];
    for (const vote of this.votes.values()) tally[vote.move]++;
    return {kind:'tally',tally,voters:this.votes.size,simulated:this.simulated};
  }
}
