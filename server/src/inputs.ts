import { parseSessionCommand } from './game-session';
import type { InputStatus, PoseState, StreamerInput, CaptureOptions, ReplayResult } from '@svc/shared';

export function parseStreamerInput(value: unknown): StreamerInput | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Record<string, unknown>;
  if (event.kind === 'control') {
    return (event.action === 'stop' || event.action === 'resume') && event.by === 'capture'
      ? {kind:'control', action:event.action, by:'capture'} : null;
  }
  if (typeof event.at !== 'number' || !Number.isFinite(event.at) || event.at < 0 ||
      (event.source !== 'pose' && event.source !== 'keyboard')) return null;
  if (event.kind === 'pose' && typeof event.guard === 'boolean' &&
      (event.lean === 'L' || event.lean === 'R' || event.lean === null)) {
    return {kind:'pose',guard:event.guard,lean:event.lean,at:event.at,source:event.source};
  }
  if (event.kind === 'punch' && (event.side === 'L' || event.side === 'R')) {
    return {kind:'punch',side:event.side,at:event.at,source:event.source};
  }
  return null;
}

export function parseCaptureOptions(raw:unknown):CaptureOptions|null {
  const value=raw as Partial<CaptureOptions>|null;
  return value?.kind==='capture-options'&&typeof value.seated==='boolean'&&typeof value.noPunch==='boolean'?{kind:'capture-options',seated:value.seated,noPunch:value.noPunch}:null;
}
export function parseReplayResult(raw:unknown):ReplayResult|null {
  const value=raw as Partial<ReplayResult>|null;
  return value?.kind==='replay-result'&&typeof value.highlightId==='string'&&value.highlightId.length>0&&value.highlightId.length<=160&&typeof value.available==='boolean'?{kind:'replay-result',highlightId:value.highlightId,available:value.available}:null;
}
/** Server-owned input state. */
export class InputStore {
  private state: PoseState = {kind:'pose', guard:false, lean:null, at:0, source:'keyboard'};
  private stopped = false;
  private captureAt: number | null = null;
  private lastPunch: InputStatus['lastPunch'] = null;
  private receivedAt = 0;

  receive(event: StreamerInput, now: number): InputStatus {
    this.receivedAt = now;
    if (event.kind === 'control') {
      this.stopped = event.action === 'stop';
      this.neutral(now);
    } else {
      this.captureAt = event.at;
      if (!this.stopped) {
        if (event.kind === 'pose') this.state = {...event, at:now};
        else this.lastPunch = {...event, at:now};
      }
    }
    return this.snapshot();
  }
  neutral(now: number): void {
    this.state = {...this.state, guard:false, lean:null, at:now};
    this.lastPunch = null;
  }
  expire(now: number): boolean {
    if (now - this.receivedAt < 1000 || (!this.state.guard && !this.state.lean)) return false;
    this.neutral(now);
    return true;
  }
  snapshot(): InputStatus {
    return {kind:'input-status',state:{...this.state},stopped:this.stopped,captureAt:this.captureAt,
      receivedAt:this.receivedAt,lastPunch:this.lastPunch ? {...this.lastPunch} : null};
  }
}

/** One active local capture socket; overlay connections never claim input ownership. */
export class CaptureInputs {
  private owner: import('ws').WebSocket | undefined;
  private store = new InputStore();
  constructor(private callbacks:{onInput?:(event:StreamerInput,receivedAt:number)=>void;onSession?:(event:import('./game-session').SessionCommand)=>void;onOptions?:(options:CaptureOptions)=>void;onReplay?:(result:ReplayResult)=>void}={}) {}
  setStopped(stopped:boolean,now:number):void {
    if(this.store.snapshot().stopped===stopped)return;
    const status=this.store.receive({kind:'control',action:stopped?'stop':'resume',by:'capture'},now);
    if(this.owner?.readyState===1)this.owner.send(JSON.stringify(status));
  }
  requestReplay(request:{kind:'replay-capture'|'replay-request';highlightId:string;at?:number}):boolean {
    if(this.owner?.readyState!==1)return false;this.owner.send(JSON.stringify(request));return true;
  }
  attach(client: import('ws').WebSocket): void {
    const release = () => {
      if(this.owner === client) { const now=Date.now();this.store.neutral(now);this.callbacks.onInput?.(this.store.snapshot().state,now);this.owner = undefined; }
    };
    client.on('message', data => {
      let raw:unknown;
      try { raw=JSON.parse(data.toString()); } catch { return; }
      const event=parseStreamerInput(raw);
      const session=parseSessionCommand(raw);
      const options=parseCaptureOptions(raw),replay=parseReplayResult(raw);
      if(!event&&!session&&!options&&!replay)return;
      if(replay&&this.owner!==client)return;
      if(this.owner && this.owner !== client) {
        client.send(JSON.stringify({kind:'input-error',message:'Another capture page owns inputs. Close it before connecting this page.'}));
        return;
      }
      this.owner = client;
      const now=Date.now();
      if(options){this.callbacks.onOptions?.(options);return;}
      if(replay){this.callbacks.onReplay?.(replay);return;}
      if(session){this.callbacks.onSession?.(session);return;}
      const status=this.store.receive(event!,now);
      if(event!.kind==='control'||event!.kind==='pose'||!status.stopped)this.callbacks.onInput?.(event!,now);
      client.send(JSON.stringify(status));
    });
    client.on('close', release);
    // ws reports malformed/oversized frames as errors: reject the client, not the server.
    client.on('error', () => {release();client.terminate();});
  }
  expire(now: number): void {
    if(this.store.expire(now)) {
      this.callbacks.onInput?.(this.store.snapshot().state,now);
      if(this.owner?.readyState===1)this.owner.send(JSON.stringify(this.store.snapshot()));
    }
  }
}
