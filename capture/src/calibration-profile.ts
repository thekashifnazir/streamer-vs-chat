import {computeGuardReleaseBand,GUARD_METRIC,GUARD_MIN_ON} from './classifier';
import type {CalibrationMode,CalibrationSnapshot} from './calibration';
export const CALIBRATION_PROFILE_VERSION=1;
export const CALIBRATION_MODEL='mediapipe-pose-landmarker-lite@0.10.32:sha256:59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a';
// Bump this contract when accepted measurement/calibration rules change.
export const CALIBRATION_CLASSIFIER=`${GUARD_METRIC}:anatomy-sway-asymmetric-v1`;
export type CalibrationSettings={mode:CalibrationMode;guardThreshold:number;leanThresholds:{L:number;R:number};leanPeaks:{L:number;R:number};guardMedians:{neutral:number;resting:number;guard:number};guardReleaseBand:number;neutralSwayP95:number;leanFloor:number};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const finite=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const close=(a:number,b:number)=>Math.abs(a-b)<1e-8;
/** Accept the complete current calibration, never legacy guesses or arbitrary thresholds. */
export function validateCalibrationSettings(value:unknown,mode:CalibrationMode):CalibrationSettings|null{
 if((mode!=='standing'&&mode!=='seated')||!object(value)||value.mode!==mode||!finite(value.guardThreshold,GUARD_MIN_ON,50)||!finite(value.guardReleaseBand,0,50)||!finite(value.neutralSwayP95,0,25)||!finite(value.leanFloor,.3,25))return null;
 const medians=value.guardMedians,peaks=value.leanPeaks,thresholds=value.leanThresholds;
 if(!object(medians)||!object(peaks)||!object(thresholds))return null;
 if(!['neutral','resting','guard'].every(key=>finite(medians[key],-100,100)))return null;
 if(!['L','R'].every(key=>finite(peaks[key],.3,25)&&finite(thresholds[key],.3,25)))return null;
 const guardMedians={neutral:medians.neutral as number,resting:medians.resting as number,guard:medians.guard as number};
 const baseline=Math.max(guardMedians.neutral,guardMedians.resting),guard=guardMedians.guard;
 if(guard<=baseline||guard-value.guardThreshold<.05-1e-8||value.guardThreshold-value.guardReleaseBand-baseline<.05-1e-8)return null;
 if(!close(value.guardThreshold,Math.max(GUARD_MIN_ON,baseline+.7*(guard-baseline)))||!close(value.guardReleaseBand,computeGuardReleaseBand(guardMedians))||!close(value.leanFloor,Math.max(.3,1.5*value.neutralSwayP95)))return null;
 const leanPeaks={L:peaks.L as number,R:peaks.R as number},leanThresholds={L:thresholds.L as number,R:thresholds.R as number};
 for(const side of ['L','R'] as const)if(leanPeaks[side]<value.leanFloor||!close(leanThresholds[side],Math.max(value.leanFloor,.6*leanPeaks[side])))return null;
 return {mode,guardThreshold:value.guardThreshold,guardReleaseBand:value.guardReleaseBand,guardMedians,leanPeaks,leanThresholds,neutralSwayP95:value.neutralSwayP95,leanFloor:value.leanFloor};
}
export type ProfileStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const key=(mode:CalibrationMode)=>`svc.calibration.v1.${mode}`;
const MODE_KEY='svc.calibration.posture';
/** Explicit local opt-in; the allowlist contains no frames, identity or credentials. */
export function createCalibrationProfiles(storage:()=>ProfileStorage){return {
 mode():CalibrationMode{try{return storage().getItem(MODE_KEY)==='seated'?'seated':'standing';}catch{return 'standing';}},
 load(mode:CalibrationMode):CalibrationSettings|null{try{const raw=storage().getItem(key(mode));if(!raw||raw.length>4096)return null;const profile=JSON.parse(raw);if(!object(profile)||profile.version!==CALIBRATION_PROFILE_VERSION||profile.model!==CALIBRATION_MODEL||profile.classifier!==CALIBRATION_CLASSIFIER||profile.mode!==mode)return null;return validateCalibrationSettings(profile.settings,mode);}catch{return null;}},
 save(snapshot:CalibrationSnapshot):boolean{if(!snapshot.ready)return false;const settings=validateCalibrationSettings(snapshot,snapshot.mode);if(!settings)return false;try{storage().setItem(key(snapshot.mode),JSON.stringify({version:CALIBRATION_PROFILE_VERSION,model:CALIBRATION_MODEL,classifier:CALIBRATION_CLASSIFIER,mode:snapshot.mode,settings}));storage().setItem(MODE_KEY,snapshot.mode);return true;}catch{return false;}},
 forget(mode:CalibrationMode):boolean{try{storage().removeItem(key(mode));if(storage().getItem(MODE_KEY)===mode)storage().removeItem(MODE_KEY);return true;}catch{return false;}},
};}
