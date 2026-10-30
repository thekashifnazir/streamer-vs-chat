import {afterEach,expect,it} from 'vitest';
import {createGame,step,type GameState} from '../../shared/src/engine';
import type {Move} from '../../shared/src/index';
import {setLiveCredentials} from './credentials';
import {DEFAULT_SCOUTING_CONFIG} from '../../shared/src/scouting-config';
import {SCOUT_PREVIEW_BADGE,scoutPreviewConfig} from './scout-preview';
afterEach(()=>setLiveCredentials(false));
const offline={liveMode:false,liveTokenLoaded:false};
const location=(pathname='/',search='?scout=fast',hash='')=>({pathname,search,hash});
function scriptedDemo(config:ReturnType<typeof scoutPreviewConfig>):GameState {
  let state=createGame({seed:73,viewers:3,...(config?{scoutingConfig:config}:{})});
  // Real reducer inputs: scripted SIMULATED chat, with the player holding guard and leaning left.
  state=step(state,{kind:'pose',guard:true,lean:'L',at:0,source:'keyboard'},0);
  for(const [index,move]of (['HOOK_R','JAB','HOOK_R','JAB','HOOK_R'] as Move[]).entries()) {
    const at=index?index*2400+1000:0;
    state=step(state,{kind:'vote-batch',votes:Array.from({length:3},(_,i)=>({kind:'vote' as const,user:`sim-${i}`,move,at,simulated:true}))},at);
    state=step(state,{kind:'advance'},(index+1)*2400+800);
  }
  return state;
}
it('keeps default URLs and SPEC evidence defaults unchanged',()=>{
  expect(scoutPreviewConfig(location('/',''),offline)).toBeUndefined();
  expect(scoutPreviewConfig(location('/','?scout=slow'),offline)).toBeUndefined();
  expect(DEFAULT_SCOUTING_CONFIG).toEqual({minRound:2,minSamples:12,minShare:.65,minWilsonLower:.60});
  const state=scriptedDemo(undefined);
  expect(state.scouting.card).toBeNull();expect(state).not.toHaveProperty('scoutingConfig');
});
it('shows a labelled round-one preview after actual same-side successful dodges under scripted demo chat',()=>{
  const state=scriptedDemo(scoutPreviewConfig(location(),offline));
  expect(state.round.number).toBe(1);expect(state.round.over).toBe(false);
  expect(state.scouting.card).toBe('L');expect(state.scouting.n).toBe(3);
  expect(SCOUT_PREVIEW_BADGE).toBe('SCOUT PREVIEW · SIMULATED');
  const restarted=step(state,{kind:'restart'},state.now+1);
  expect(restarted.scoutingConfig).toEqual(state.scoutingConfig);
});
it('ignores the preset outside the offline demo, including live credentials and callback hashes',()=>{
  for(const path of ['/play','/play/','/overlay','/overlay/','/capture','/capture/'])expect(scoutPreviewConfig(location(path),offline)).toBeUndefined();
  expect(scoutPreviewConfig(location(),{...offline,liveMode:true})).toBeUndefined();
  expect(scoutPreviewConfig(location(),{...offline,liveTokenLoaded:true})).toBeUndefined();
  expect(scoutPreviewConfig(location('/','?scout=fast','#access_token=secret'),offline)).toBeUndefined();
  setLiveCredentials(true);expect(scoutPreviewConfig(location(),offline)).toBeUndefined();
});
it('does not manufacture a preview card for missing or balanced player evidence',()=>{
  let state=createGame({scoutingConfig:scoutPreviewConfig(location(),offline)});
  state=step(state,{kind:'advance'},1000);expect(state.scouting.card).toBeNull();
  state={...state,scouting:{...state.scouting,dodges:['L','R','L','R']}};
  expect(step(state,{kind:'advance'},1001).scouting.card).toBeNull();
});
