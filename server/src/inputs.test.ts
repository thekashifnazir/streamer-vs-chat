import { expect, it } from 'vitest';
import { InputStore, parseStreamerInput } from './inputs';
it('keeps capture timestamps for logs and stamps authoritative receive times', () => {
  const store = new InputStore();
  expect(store.receive({kind:'pose',guard:true,lean:'L',at:5,source:'pose'},1000)).toMatchObject({
    state:{guard:true,lean:'L',at:1000},captureAt:5,receivedAt:1000,
  });
  expect(store.expire(1999)).toBe(false);
  expect(store.expire(2000)).toBe(true);
  expect(store.snapshot().state).toMatchObject({guard:false,lean:null});
});
it('stop clears held input and ignores input until explicit resume', () => {
  const store = new InputStore();
  store.receive({kind:'control',action:'stop',by:'capture'},10);
  expect(store.receive({kind:'pose',guard:true,lean:'R',at:15,source:'keyboard'},20)).toMatchObject({stopped:true,state:{guard:false,lean:null}});
  store.receive({kind:'control',action:'resume',by:'capture'},30);
  expect(store.receive({kind:'punch',side:'L',at:35,source:'keyboard'},40).lastPunch).toMatchObject({side:'L',at:40});
});
it('rejects malformed client inputs and game state', () => {
  for(const input of [null, {}, {kind:'tick',state:{}}, {kind:'pose',guard:1,lean:'L',at:1,source:'pose'},
    {kind:'pose',guard:true,lean:null,at:NaN,source:'pose'}, {kind:'control',action:'veto',by:'capture'}]) {
    expect(parseStreamerInput(input)).toBeNull();
  }
  expect(parseStreamerInput({kind:'pose',guard:true,lean:null,at:1,source:'keyboard'})).not.toBeNull();
});
