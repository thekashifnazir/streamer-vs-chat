import { createCrowd, crowdVotes } from '../../shared/src/crowd';
import type { GameState } from '../../shared/src/engine';
import { assertSimulationAllowed } from './safety';

export function createSimulationSource(options: { viewers: number; seed: number; liveTokenLoaded: boolean; mock?: boolean }) {
  assertSimulationAllowed(options);
  const crowd = createCrowd(options.viewers, options.seed);
  return { votes: (state: GameState, at: number) => crowdVotes(crowd, state, at) };
}
