import type { KeyboardLabel } from '../../capture/src/keyboard';

/** How long the J punch pose stays up: long enough to read on stream, short enough to feel snappy. */
export const AVATAR_PUNCH_MS = 220;

/**
 * Presentation only: mirrors the physical keys the keyboard module already reports (K guard,
 * A/D lean, J punch) as CSS classes on the stand-in figure. It never emits game input.
 */
export function createKeyboardAvatar(avatar: HTMLElement, options: { punchEnabled?: () => boolean; setTimer?: typeof setTimeout; clearTimer?: typeof clearTimeout } = {}) {
  const setTimer = options.setTimer ?? setTimeout, clearTimer = options.clearTimer ?? clearTimeout;
  let punchTimer: ReturnType<typeof setTimeout> | null = null;
  const endPunch = () => { if (punchTimer !== null) clearTimer(punchTimer); punchTimer = null; avatar.classList.remove('punch'); };
  return {
    label(state: KeyboardLabel) {
      avatar.classList.toggle('guard', state.guard);
      avatar.classList.toggle('lean-L', state.lean === 'L');
      avatar.classList.toggle('lean-R', state.lean === 'R');
      if (state.punch && (options.punchEnabled?.() ?? true)) {
        // A rapid second tap restarts the hold rather than leaving the pose stuck on.
        endPunch();
        avatar.classList.add('punch');
        punchTimer = setTimer(endPunch, AVATAR_PUNCH_MS);
      }
    },
    reset: endPunch,
  };
}
