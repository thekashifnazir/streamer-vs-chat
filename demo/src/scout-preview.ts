import {hasLiveCredentials} from './credentials';
import type {ScoutingConfig} from '../../shared/src/scouting-config';
export const SCOUT_PREVIEW_BADGE='SCOUT PREVIEW · SIMULATED';
const PREVIEW_CONFIG:ScoutingConfig=Object.freeze({minRound:1,minSamples:3,minShare:.65,minWilsonLower:.40});
/** Only the no-login demo entry may opt in. Tokens and all other entry points fail closed. */
export function scoutPreviewConfig(location:Pick<Location,'pathname'|'search'|'hash'>,options:{liveMode:boolean;liveTokenLoaded:boolean}):ScoutingConfig|undefined {
  if(options.liveMode||options.liveTokenLoaded||hasLiveCredentials()||new URLSearchParams(location.hash.slice(1)).has('access_token'))return undefined;
  if(!['/','/index.html'].includes(location.pathname))return undefined;
  return new URLSearchParams(location.search).get('scout')==='fast'?PREVIEW_CONFIG:undefined;
}
