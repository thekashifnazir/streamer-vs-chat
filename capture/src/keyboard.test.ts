import { expect, test } from 'vitest';
import type { StreamerInput } from '@svc/shared';
import { createKeyboard, type KeyboardLabel } from './keyboard.js';

function rig() {
  const target = new EventTarget();
  const events: StreamerInput[] = [];
  const labels: KeyboardLabel[] = [];
  let at = 10;
  const keyboard = createKeyboard({ target, emit: (event) => events.push(event), label: (state) => labels.push(state), now: () => at++ });
  function key(type: string, code: string, repeat = false) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { code, repeat });
    target.dispatchEvent(event);
  }
  return { keyboard, events, labels, target, key };
}

test('keyboard sends held guard and lean and one punch per physical press', () => {
  const { keyboard, events, key } = rig();
  keyboard.setEnabled(true);
  key('keydown', 'KeyK'); key('keydown', 'KeyA');
  expect(events.at(-1)).toMatchObject({ kind: 'pose', guard: true, lean: 'L', source: 'keyboard' });
  key('keydown', 'KeyD');
  expect(events.at(-1)).toMatchObject({ lean: null });
  key('keyup', 'KeyA');
  expect(events.at(-1)).toMatchObject({ lean: 'R' });
  key('keydown', 'KeyJ'); key('keydown', 'KeyJ', true);
  expect(events.filter((event) => event.kind === 'punch')).toHaveLength(1);
  key('keyup', 'KeyJ'); key('keydown', 'KeyJ');
  expect(events.filter((event) => event.kind === 'punch')).toHaveLength(2);
  keyboard.dispose();
});

test('labels physical keys in pose mode while source switch and blur release gameplay', () => {
  const { keyboard, events, labels, key, target } = rig();
  key('keydown', 'KeyK'); key('keydown', 'KeyJ');
  expect(events).toHaveLength(0);
  expect(labels.at(-1)).toMatchObject({ guard: true, punch: true });
  keyboard.setEnabled(true);
  expect(events.at(-1)).toMatchObject({ guard: true });
  keyboard.setEnabled(false);
  expect(events.at(-1)).toMatchObject({ kind: 'pose', guard: false, lean: null });
  expect(keyboard.physical.guard).toBe(true);
  keyboard.setEnabled(true);
  target.dispatchEvent(new Event('blur'));
  expect(keyboard.physical).toEqual({ guard: false, lean: null });
  expect(events.at(-1)).toMatchObject({ guard: false, lean: null });
  keyboard.dispose();
});

test('Escape sends stop in either input mode', () => {
  const { keyboard, events, key } = rig();
  key('keydown', 'Escape'); key('keydown', 'Escape', true);
  expect(events).toEqual([{ kind: 'control', action: 'stop', by: 'capture' }]);
  keyboard.dispose();
});

test('play keys work with a focused safety checkbox but do not label typing in text fields',()=>{
  for(const type of ['checkbox','text']) {
    const target=Object.assign(new EventTarget(),{tagName:'INPUT',type});
    const events:StreamerInput[]=[];
    const keyboard=createKeyboard({target,emit:event=>events.push(event),now:()=>100});
    keyboard.setEnabled(true);events.length=0;
    const key=new Event('keydown',{cancelable:true});Object.assign(key,{code:'KeyK',repeat:false});target.dispatchEvent(key);
    expect(events.length).toBe(type==='checkbox'?1:0);
    keyboard.dispose();
  }
});
