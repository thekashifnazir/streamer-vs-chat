import type { PoseState, StreamerInput } from '@svc/shared';

export type KeyboardLabel = { guard: boolean; lean: 'L' | 'R' | null; punch: boolean; at: number };
type Options = {
  emit: (input: StreamerInput) => void;
  label?: (state: KeyboardLabel) => void;
  target?: EventTarget;
  now?: () => number;
};

function isTextEntry(target: EventTarget | null) {
  const element = target as { tagName?: string; type?: string; isContentEditable?: boolean } | null;
  if (element?.tagName === 'INPUT' && ['checkbox', 'radio', 'button'].includes(element.type ?? '')) return false;
  return element?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName ?? '');
}

/** Physical keys label recordings in both modes; only the selected input sends gameplay events. */
export function createKeyboard({ emit, label, target = window, now = () => performance.now() }: Options) {
  const held = new Set<string>();
  let enabled = false;
  const physical = () => ({ guard: held.has('KeyK'), lean: held.has('KeyA') === held.has('KeyD') ? null : held.has('KeyA') ? 'L' as const : 'R' as const });
  const pose = (at: number): PoseState => ({ kind: 'pose', ...physical(), source: 'keyboard', at });
  const neutral = (at: number): PoseState => ({ kind: 'pose', guard: false, lean: null, source: 'keyboard', at });
  function release() {
    const at = now();
    held.clear();
    label?.({ ...physical(), punch: false, at });
    if (enabled) emit(neutral(at));
  }
  function down(event: Event) {
    const key = event as KeyboardEvent;
    if (key.code === 'Escape') {
      if (!key.repeat) { release(); emit({ kind: 'control', action: 'stop', by: 'capture' }); }
      return;
    }
    if (!['KeyA', 'KeyD', 'KeyK', 'KeyJ'].includes(key.code) || isTextEntry(key.target)) return;
    key.preventDefault();
    if (key.repeat || held.has(key.code)) return;
    held.add(key.code);
    const at = now();
    label?.({ ...physical(), punch: key.code === 'KeyJ', at });
    if (enabled) {
      if (key.code === 'KeyJ') emit({ kind: 'punch', side: 'L', source: 'keyboard', at });
      else emit(pose(at));
    }
  }
  function up(event: Event) {
    const key = event as KeyboardEvent;
    if (!held.delete(key.code)) return;
    const at = now();
    label?.({ ...physical(), punch: false, at });
    if (enabled && key.code !== 'KeyJ') emit(pose(at));
  }
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  target.addEventListener('blur', release);
  return {
    get physical() { return physical(); },
    setEnabled(value: boolean) {
      if (enabled === value) return;
      const at = now();
      if (enabled) emit(neutral(at));
      enabled = value;
      if (enabled) emit(pose(at));
    },
    release,
    dispose() {
      release();
      target.removeEventListener('keydown', down);
      target.removeEventListener('keyup', up);
      target.removeEventListener('blur', release);
    },
  };
}
