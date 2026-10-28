import {expect,it,vi} from 'vitest';
import {ServerHighlightCoordinator,type ClipTransport} from './clips';
import type {HighlightCandidate} from '../../shared/src/highlights';
const highlight=(id='r1:b1:perfect',priority:100|200|300=100):HighlightCandidate=>({id,kind:priority===300?'ko':'perfect',priority,round:1,beat:1,at:0});
function setup(overrides:Partial<ClipTransport>={},extra:Partial<ConstructorParameters<typeof ServerHighlightCoordinator>[0]>={}){
  let now=0;
  const transport={getStream:vi.fn(async()=>({startedAt:-120000})),createClip:vi.fn(async()=> 'requested-id'),getClip:vi.fn(async()=>null),...overrides};
  const replay=vi.fn();
  const coordinator=new ServerHighlightCoordinator({transport,onReplayRequest:replay,now:()=>now,sleep:async ms=>{now+=ms;},...extra});
  return {coordinator,transport,replay,get now(){return now;},set now(value:number){now=value;}};
}
it('15a: Create acceptance remains pending; empty Get Clips for15s requests local replay',async()=>{
  const s=setup();s.coordinator.enqueue(highlight());await s.coordinator.idle();
  expect(s.now).toBe(15000);expect(s.transport.createClip).toHaveBeenCalledOnce();
  expect(s.coordinator.snapshot()[0]).toMatchObject({status:'replay-pending',reason:'confirmation-timeout'});
  expect(s.coordinator.snapshot()[0].clipId).toBeUndefined();expect(s.coordinator.snapshot()[0].url).toBeUndefined();
  expect(s.replay).toHaveBeenCalledWith({highlightId:'r1:b1:perfect',at:0});
  s.coordinator.ackReplay('r1:b1:perfect',true);expect(s.coordinator.snapshot()[0].status).toBe('replay');
});
it('15a: a stream20s old skips POST regardless of potential202 response',async()=>{
  const s=setup({getStream:async()=>({startedAt:-20000})});s.coordinator.enqueue(highlight());await s.coordinator.idle();
  expect(s.transport.createClip).not.toHaveBeenCalled();expect(s.transport.getClip).not.toHaveBeenCalled();
  expect(s.coordinator.snapshot()[0]).toMatchObject({status:'skipped',reason:'stream-first-minute'});expect(s.replay).not.toHaveBeenCalled();
});
it('confirms only matching clip evidence after7.3s in a two-minute-old stream',async()=>{
  let now=0;
  const s=setup({getClip:async()=>now>=7300?{id:'requested-id',url:'https://clips.twitch.tv/confirmed'}:{id:'other',url:'https://clips.twitch.tv/wrong'}},{now:()=>now,sleep:async ms=>{now+=Math.min(ms,7300-now);}});
  s.coordinator.enqueue(highlight());await s.coordinator.idle();
  expect(now).toBe(7300);expect(s.coordinator.snapshot()[0]).toMatchObject({status:'confirmed',clipId:'requested-id',url:'https://clips.twitch.tv/confirmed'});
  expect(s.replay).not.toHaveBeenCalled();
});
it('offline, create errors and missing creation IDs produce stats-only cards',async()=>{
  for(const override of [{getStream:async()=>null},{createClip:async()=>{throw new Error('offline');}},{createClip:async()=>null}]){
    const s=setup(override);s.coordinator.enqueue(highlight());await s.coordinator.idle();
    expect(s.coordinator.snapshot()[0].status).toBe('stats-only');expect(s.replay).not.toHaveBeenCalled();
  }
});
it('unavailable replay and untrusted/duplicate replay acknowledgements cannot fabricate a clip',async()=>{
  const s=setup();s.coordinator.enqueue(highlight());await s.coordinator.idle();
  s.coordinator.ackReplay('unknown',true);s.coordinator.ackReplay('r1:b1:perfect',false);s.coordinator.ackReplay('r1:b1:perfect',true);
  expect(s.coordinator.snapshot()[0]).toMatchObject({status:'stats-only',reason:'replay-unavailable'});
});
it('serializes creation, bounds queue at3, prioritizes KO and deduplicates highlight IDs',async()=>{
  let resolveStream!:(value:{startedAt:number})=>void;
  let now=0;let calls=0;
  const create=vi.fn(async()=>`clip${++calls}`);
  const s=setup({getStream:vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{resolveStream=resolve;})).mockResolvedValue({startedAt:-120000}),createClip:create,getClip:async id=>({id,url:`https://clips.twitch.tv/${id}`})},{now:()=>now,sleep:async ms=>{now+=ms;}});
  s.coordinator.enqueue(highlight('active'));
  for(const id of ['p1','p2','p3','p4'])s.coordinator.enqueue(highlight(id));
  s.coordinator.enqueue(highlight('ko',300));s.coordinator.enqueue(highlight('ko',300));
  expect(s.coordinator.snapshot().filter(e=>e.status==='queued')).toHaveLength(3); // at most three pending, including active
  resolveStream({startedAt:-120000});await s.coordinator.idle();
  const confirmed=s.coordinator.snapshot().filter(e=>e.status==='confirmed');
  expect(confirmed).toHaveLength(1);expect(confirmed[0]?.highlight.id).toBe('active');
  expect(s.replay.mock.calls.map(([request])=>request.highlightId)).toEqual(['ko','p1']);
  expect(s.coordinator.snapshot().find(e=>e.highlight.id==='ko')).toMatchObject({status:'replay-pending',reason:'stale-request'});
  expect(create).toHaveBeenCalledTimes(1);expect(now).toBe(30000);
  s.coordinator.enqueue(highlight('ko',300));expect(create).toHaveBeenCalledTimes(1);
});
it('closing during poll suppresses replay requests and future work',async()=>{
  let release!:()=>void;
  const s=setup({}, {sleep:()=>new Promise(resolve=>{release=resolve;})});
  s.coordinator.enqueue(highlight());for(let i=0;i<20&&!release;i++)await Promise.resolve();
  s.coordinator.close();release();await s.coordinator.idle();
  expect(s.replay).not.toHaveBeenCalled();expect(s.coordinator.snapshot()[0].status).toBe('dropped');
});

it('close cancels a stalled API wait without waiting for its network timeout',async()=>{
  const s=setup({getStream:()=>new Promise(()=>{})});s.coordinator.enqueue(highlight());s.coordinator.close();await s.coordinator.idle();
  expect(s.coordinator.snapshot()[0]).toMatchObject({status:'dropped',reason:'closed'});expect(s.transport.createClip).not.toHaveBeenCalled();
});

it('does not POST delayed footage when stream lookup itself makes the request stale',async()=>{
  let now=0;
  const s=setup({getStream:async()=>{now=10001;return {startedAt:-120000};}},{now:()=>now});
  s.coordinator.enqueue(highlight());await s.coordinator.idle();
  expect(s.transport.createClip).not.toHaveBeenCalled();expect(s.replay).toHaveBeenCalledOnce();
  expect(s.coordinator.snapshot()[0]).toMatchObject({status:'replay-pending',reason:'stale-request'});
});
it('stale queued requests still use stats for offline streams and skip the first minute',async()=>{
  for(const stream of [null,{startedAt:0}]){
    let now=0;
    const s=setup({getStream:async()=>{now=20000;return stream;}},{now:()=>now});s.coordinator.enqueue(highlight());await s.coordinator.idle();
    expect(s.transport.createClip).not.toHaveBeenCalled();expect(s.replay).not.toHaveBeenCalled();
    expect(s.coordinator.snapshot()[0].status).toBe(stream?'skipped':'stats-only');
  }
});
it('a fresh KO arriving during cooldown outranks older PERFECTs and still creates timely footage',async()=>{
  let now=0,release!:(()=>void),sleeps=0;
  const s=setup({getClip:async id=>({id,url:'https://clips.twitch.tv/confirmed'})},{now:()=>now,sleep:async ms=>{
    if(sleeps++===0){await new Promise<void>(resolve=>{release=resolve;});now=30000;}else now+=ms;
  }});
  s.coordinator.enqueue(highlight('first'));s.coordinator.enqueue(highlight('old-perfect'));
  for(let i=0;i<30&&!release;i++)await Promise.resolve();
  expect(release).toBeTypeOf('function');now=25000;s.coordinator.enqueue(highlight('fresh-ko',300));release();
  await s.coordinator.idle();
  expect(s.transport.createClip).toHaveBeenCalledTimes(2);
  expect(s.coordinator.snapshot().find(entry=>entry.highlight.id==='fresh-ko')?.status).toBe('confirmed');
  expect(s.replay).toHaveBeenCalledWith({highlightId:'old-perfect',at:0});
});
