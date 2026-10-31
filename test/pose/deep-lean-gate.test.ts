import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { PoseClassifier, type Landmark } from '../../capture/src/classifier';

// Recorded fight-speed LEFT lean with guard up (see the fixture's provenance field).
// At ~1.5 shoulder tilt the guard wrist sat ~1.0 shoulder-axis lengths from its shoulder,
// but >1.6 horizontal shoulder widths, so the punch gate froze the lean and it never registered.
const fixture=JSON.parse(readFileSync(new URL('../fixtures/kash-deep-lean-guard.frames.json',import.meta.url),'utf8')) as
  {calibration:ConstructorParameters<typeof PoseClassifier>[0];frames:{at:number;landmarks:[number,number,number,number][]}[]};

it('registers and holds a deep recorded lean with guard up instead of gating it as a punch',()=>{
  const classifier=new PoseClassifier(fixture.calibration);
  const states=fixture.frames.map(({at,landmarks})=>{
    const lm:Landmark[]=landmarks.map(([x,y,z,visibility])=>({x,y,z,visibility}));
    const {state,metrics}=classifier.update(lm,at);
    return {at,lean:state.lean,tilt:metrics?.tilt??null,gated:metrics?.punchExtended??false};
  });
  const deep=states.filter(s=>s.tilt!==null&&s.tilt>=1.4);
  expect(deep.length).toBeGreaterThan(5);
  // No raised wrist is extended beyond 1.6 shoulder-axis lengths while the body is tilted this far.
  expect(deep.filter(s=>s.gated)).toEqual([]);
  const left=states.filter(s=>s.lean==='L');
  expect(left.length).toBeGreaterThan(0);
  expect(left.at(-1)!.at-left[0]!.at).toBeGreaterThanOrEqual(300);
});
