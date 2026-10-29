import { EventEmitter } from 'node:events';
import { expect, it, vi } from 'vitest';
import { CaptureInputs, InputStore, parseStreamerInput, parseCaptureOptions, parseReplayResult } from './inputs';
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

it('only the capture owner can acknowledge replay availability or change modes',()=>{
 const options=vi.fn(),ack=vi.fn();const channel=new CaptureInputs({onOptions:options,onReplay:ack});
 class Client extends EventEmitter {readyState=1;send=vi.fn();terminate=vi.fn();}
 const owner=new Client(),other=new Client();channel.attach(owner as any);channel.attach(other as any);
 owner.emit('message',JSON.stringify({kind:'capture-options',seated:true,noPunch:true}));
 expect(options).toHaveBeenCalledWith({kind:'capture-options',seated:true,noPunch:true});
 expect(channel.requestReplay({kind:'replay-capture',highlightId:'moment'})).toBe(true);
 expect(owner.send).toHaveBeenCalledWith(JSON.stringify({kind:'replay-capture',highlightId:'moment'}));
 other.emit('message',JSON.stringify({kind:'replay-result',highlightId:'moment',available:true}));expect(ack).not.toHaveBeenCalled();
 owner.emit('message',JSON.stringify({kind:'replay-result',highlightId:'moment',available:true,url:'blob:private-video'}));
 expect(ack).toHaveBeenCalledWith({kind:'replay-result',highlightId:'moment',available:true});
 expect(parseCaptureOptions({kind:'capture-options',seated:'yes',noPunch:true})).toBe(null);
 expect(parseReplayResult({kind:'replay-result',highlightId:'x',available:'yes'})).toBe(null);
 owner.emit('close');expect(channel.requestReplay({kind:'replay-request',highlightId:'moment'})).toBe(false);
});

it('validates pending difficulty options while retaining old client compatibility',()=>{
 for(const difficulty of ['easy','medium','hard','expert'])expect(parseCaptureOptions({kind:'capture-options',seated:false,noPunch:false,difficulty})).toEqual({kind:'capture-options',seated:false,noPunch:false,difficulty});
 for(const difficulty of ['extreme','constructor',null,1])expect(parseCaptureOptions({kind:'capture-options',seated:false,noPunch:false,difficulty})).toBeNull();
});
