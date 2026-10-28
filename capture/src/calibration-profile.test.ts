import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {createCalibration,type CalibrationSnapshot} from './calibration';
import {createCalibrationProfiles,validateCalibrationSettings} from './calibration-profile';
import {PoseClassifier,type Landmark} from './classifier';
function ready(mode:'standing'|'seated'='standing'):CalibrationSnapshot{return {stage:'ready',ready:true,mode,message:'Ready',progress:1,guardThreshold:-1.2+.7*1.8,guardMedians:{neutral:-2.5,resting:-1.2,guard:.6},guardReleaseBand:.775,neutralSwayP95:.02,leanFloor:.3,leanPeaks:{L:.57,R:.88},leanThresholds:{L:.342,R:.528}};}
function setup(){const data=new Map<string,string>();const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};return{data,profiles:createCalibrationProfiles(()=>storage)};}
it('persists only explicitly saved validated calibration numbers, separately for each posture',()=>{
 const {profiles,data}=setup();expect(profiles.load('standing')).toBeNull();expect(profiles.save({...ready(),message:'private message',landmarks:['private-image']} as CalibrationSnapshot)).toBe(true);
 expect([...data.values()].join('')).not.toContain('private');expect(profiles.mode()).toBe('standing');expect(profiles.load('seated')).toBeNull();expect(profiles.save({...ready(),mode:'other'} as unknown as CalibrationSnapshot)).toBe(false);expect(profiles.save(ready('seated'))).toBe(true);expect(profiles.mode()).toBe('seated');expect(profiles.load('standing')?.leanThresholds).toEqual({L:.342,R:.528});expect(profiles.forget('seated')).toBe(true);expect(profiles.load('seated')).toBeNull();expect(profiles.load('standing')).not.toBeNull();
});
it('rejects corrupt, old, mismatched model/classifier/posture and incomplete profiles',()=>{
 const {profiles,data}=setup();profiles.save(ready());const key='svc.calibration.v1.standing',saved=data.get(key)!;
 for(const raw of ['{','null','[]',JSON.stringify({version:0}),...['version','model','classifier','mode'].map(field=>JSON.stringify({...JSON.parse(saved),[field]:'old'})),JSON.stringify({...JSON.parse(saved),settings:{guardThreshold:.1}})]){data.set(key,raw);expect(profiles.load('standing')).toBeNull();}
 data.set(key,saved);expect(profiles.load('standing')).not.toBeNull();
});
it('rejects unsafe bounds and inconsistent thresholds, bands, sway or calibration clearance',()=>{
 for(const change of [{guardThreshold:-1.2},{guardThreshold:Infinity},{guardReleaseBand:-.1},{guardReleaseBand:.25},{leanFloor:.1},{neutralSwayP95:NaN},{leanPeaks:{L:.1,R:.88}},{leanThresholds:{L:-.3,R:.528}},{leanThresholds:{L:.31,R:.528}},{mode:'other'},{guardMedians:{neutral:-1.6,resting:-.6,guard:-.3}}])expect(validateCalibrationSettings({...ready(),...change},'standing')).toBeNull();
 expect(validateCalibrationSettings(ready('seated'),'standing')).toBeNull();expect(validateCalibrationSettings(ready(),'standing')).not.toBeNull();
});
it('restores a ready calibration snapshot without input or camera access and does not share references',()=>{
 const original=ready(),calibration=createCalibration();expect(calibration.restore(original,'seated')).toBe(false);expect(calibration.snapshot.ready).toBe(false);expect(calibration.restore(original,'standing')).toBe(true);expect(calibration.snapshot).toMatchObject({...original,message:expect.stringContaining('restored')});original.leanThresholds!.L=1;expect(calibration.snapshot.leanThresholds?.L).toBe(.342);expect(calibration.restore({guardThreshold:0},'standing')).toBe(false);
});
it('storage denial fails safely without disrupting calibration',()=>{
 const profiles=createCalibrationProfiles(()=>{throw new Error('denied');});expect(profiles.mode()).toBe('standing');expect(profiles.load('standing')).toBeNull();expect(profiles.save(ready())).toBe(false);expect(profiles.forget('standing')).toBe(false);
});
it('restoration preserves exact classifier decisions on the accepted Logitech recording',()=>{
 const {profiles}=setup(),saved=ready();expect(profiles.save(saved)).toBe(true);const calibration=createCalibration();expect(calibration.restore(profiles.load('standing'),'standing')).toBe(true);
 const settings=validateCalibrationSettings(saved,'standing')!,restored=validateCalibrationSettings(calibration.snapshot,'standing')!;
 const before=new PoseClassifier(settings),after=new PoseClassifier(restored);
 const fixture=JSON.parse(readFileSync(new URL('../../test/fixtures/kash-guard-through-leans-logitech.landmarks.json',import.meta.url),'utf8')) as {frames:{t:number;lm:number[][]}[]};
 let guards=0,leans=0;
 for(const frame of fixture.frames){const landmarks=frame.lm.map(([x,y,z,visibility])=>({x:x!,y:y!,z,visibility})) as Landmark[];const a=before.update(landmarks,frame.t),b=after.update(landmarks,frame.t);expect(b).toEqual(a);guards+=Number(a.state.guard);leans+=Number(a.state.lean!==null);}
 expect(guards).toBeGreaterThan(100);expect(leans).toBeGreaterThan(100);
});
