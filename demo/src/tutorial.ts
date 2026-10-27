import type { StreamerInput } from '@svc/shared';

/** A short input tutorial, independent of the fight's reducer. */
export class InputTutorial {
  private index = 0;
  get step() { return this.index; }
  get complete() { return this.index === 3; }
  input(input: StreamerInput) {
    if (this.index === 0 && input.kind === 'pose' && input.guard) this.index = 1;
    else if (this.index === 1 && input.kind === 'pose' && input.lean === 'L') this.index = 2;
    else if (this.index === 2 && input.kind === 'punch') this.index = 3;
    return this.complete;
  }
}
