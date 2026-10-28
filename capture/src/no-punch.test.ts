import{readFileSync}from'node:fs';
import{expect,it}from'vitest';
import{PoseClassifier}from'./classifier';
it('no-punch detection preserves guard and lean on the accepted Logitech recording',()=>{
 const fixture=JSON.parse(readFileSync(new URL('../../test/fixtures/kash-guard-through-leans-logitech.landmarks.json',import.meta.url),'utf8'));
 const normal=new PoseClassifier(fixture.calibration),accessible=new PoseClassifier(fixture.calibration);
 accessible.setPunchesEnabled(false);
 for(const frame of fixture.frames){
  const landmarks=frame.lm.map(([x,y,z,visibility]:number[])=>({x,y,z,visibility}));
  const expected=normal.update(landmarks,frame.t),actual=accessible.update(landmarks,frame.t);
  expect(actual.state).toEqual(expected.state);expect(actual.punches).toEqual([]);
 }
});
