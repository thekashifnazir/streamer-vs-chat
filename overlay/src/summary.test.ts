import {expect,test} from 'vitest';
import {createGame} from '../../shared/src/engine';
import {summarizeGame} from '../../shared/src/highlights';
import {safeClipHref,summaryPresentation,type EndcardClip} from './summary';
import {defenceCue} from './hud';

test('seated telegraphs keep correct unmirrored defence directions using TILT',()=>{
  expect(defenceCue('HOOK_L',true)).toBe('TILT →');
  expect(defenceCue('HOOK_R',true)).toBe('← TILT');
  expect(defenceCue('SUPER',true)).toBe('TILT ANY WAY');
  expect(defenceCue('JAB',true)).toBe('GUARD');
});

test('endcard refuses active content, arbitrary remote hosts and credential URLs',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,hi','https://evil.example/clip/a','https://clips.twitch.tv.evil.example/a','https://user:secret@clips.twitch.tv/a'])expect(safeClipHref(url)).toBeNull();
  expect(safeClipHref('https://clips.twitch.tv/ActualClip')).toBe('https://clips.twitch.tv/ActualClip');
  expect(safeClipHref('https://www.twitch.tv/user/clip/ActualClip')).toBe('https://www.twitch.tv/user/clip/ActualClip');
});

test('endcards preserve absent reaction and attribution without inventing a clip',()=>{
  const view=summaryPresentation(summarizeGame(createGame({now:0})),[]);
  expect(view.links).toEqual([]);
  expect(view.mvp).toContain('NO CHAT MVP');
  expect(view.reaction).toBe('NO REACTED DEFENCES');
});

test('endcard links are deduplicated, sanitized and capped to three',()=>{
  const clips:EndcardClip[]=Array.from({length:5},(_,i)=>({id:String(i),label:'PERFECT',url:`https://clips.twitch.tv/clip${i}`,status:'confirmed'}));
  const summary=summarizeGame(createGame({now:0}));
  summary.chatMvp={user:'<b>viewer</b>',damage:12.5};
  const view=summaryPresentation(summary,[{...clips[0]!,url:'javascript:alert(1)'},clips[0]!,...clips]);
  expect(view.links.map(clip=>clip.id)).toEqual(['0','1','2']);
  expect(view.mvp).toBe('<b>viewer</b> · 12.5 DAMAGE');
});

test('endcard prefers the Twitch display name over the stable user ID',()=>{
  const summary=summarizeGame(createGame({now:0}));
  summary.chatMvp={user:'123456',displayName:'VisibleViewer',damage:12.5};
  expect(summaryPresentation(summary,[]).mvp).toBe('VisibleViewer · 12.5 DAMAGE');
});

test('memory adds the prospective MVP streak and forget command without changing game stats',()=>{
 const summary=summarizeGame(createGame({now:0}));summary.chatMvp={user:'id',displayName:'Viewer',damage:3};
 const memory={simulated:true,record:{streams:2,bossesKo:0,timesKo:0},hallOfFame:[],nemesis:null,mvpStreak:3};
 const value=summaryPresentation(summary,[],'http://localhost/',memory);
 expect(value.mvpStreak).toBe('MVP 3 STREAMS RUNNING');expect(value.forget).toBe('Type !forgetme to be forgotten.');expect(value.mvp).toBe('Viewer · 3.0 DAMAGE');
 expect(summaryPresentation(summary,[]).mvpStreak).toBe('');summary.chatMvp=null;expect(summaryPresentation(summary,[],'http://localhost/',memory).mvpStreak).toBe('');
});
