import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {describe,expect,it,vi} from 'vitest';
import {createGame,type GameState} from '../../shared/src/engine';
import {bankFiles,BOSS_CUES,COACH_CUES,createBossTaunts,createVoiceBank,DEFAULT_VOICE,mountVoicePicker,playCoach,setActiveVoiceBank,TAUNT,VOICE_PREF_PREFIX,VOICES,type VoiceHost} from './voice-bank';

// Fake audio: buffers remember their URL; lines end only when the test says so.
function fakeHost(){
 const loads:string[]=[],started:string[]=[],stopped:string[]=[],enders:(()=>void)[]=[];
 const host={enabled:true,talking:false,duration:1,
  speaking(){return this.talking;},
  loadBuffer:vi.fn(async(url:string)=>{loads.push(url);return {duration:host.duration,url} as unknown as AudioBuffer;}),
  playBuffer:vi.fn((buffer:AudioBuffer,_options?:{yieldToVoice?:boolean})=>{const url=(buffer as unknown as {url:string}).url;started.push(url);let done=()=>{};const ended=new Promise<void>(resolve=>{done=resolve;});enders.push(done);return {stop(){stopped.push(url);done();},ended};}),
 };
 return {host:host as typeof host&VoiceHost,loads,started,stopped,finish:async()=>{enders.splice(0).forEach(end=>end());await Promise.resolve();}};
}
const files=(voices:string[],cues:Record<string,number>)=>Object.fromEntries(voices.map(voice=>[voice,Object.fromEntries(Object.entries(cues).map(([cue,n])=>[cue,Array.from({length:n},(_,i)=>`/${voice}/${cue}-${i+1}.mp3`)]))]));
const memory=()=>{const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};};
const fixture=files(['golem','gremlin','drill','hype'],{'taunt-hit':12,'taunt-blocked':8,'taunt-dodged':12,'taunt-perfect':8,'taunt-habit-left':8,'taunt-round-win':8,'taunt-round-lose':8,'taunt-round-start':8,'taunt-quiet-chat':8,'taunt-finisher':8,'taunt-super':8,'combo-12':4,'clean':12});

describe('voice bank player',()=>{
 it('derives every shipped file URL from the durations manifest, under the copied bank folder',()=>{
  expect(bankFiles({golem:{'taunt-hit':[1.2,0.9]},drill:{'combo-12':[0.7]}},'https://x.test/assets/voice-bank/')).toEqual({golem:{'taunt-hit':['https://x.test/assets/voice-bank/golem/taunt-hit-1.mp3','https://x.test/assets/voice-bank/golem/taunt-hit-2.mp3']},drill:{'combo-12':['https://x.test/assets/voice-bank/drill/combo-12-1.mp3']}});
 });
 it('never repeats any of the last five lines of a cue, nor the last three of a four-line cue',async()=>{
  const {host,finish}=fakeHost(),bank=createVoiceBank(host,{files:fixture,storage:memory()});
  for(const [cue,window] of [['taunt-hit',5],['combo-12',3]] as const){
   const voiceBank=cue==='combo-12'?'coach':'boss';
   for(let i=0;i<60;i++){expect(await bank.playLine(voiceBank,cue)).toBe(cue);await finish();}
   const urls=host.playBuffer.mock.calls.slice(-60).map(([buffer])=>(buffer as unknown as {url:string}).url);
   urls.forEach((url,index)=>expect(urls.slice(Math.max(0,index-window),index)).not.toContain(url));
   expect(new Set(urls).size).toBe(cue==='taunt-hit'?12:4);
  }
 });
 it('lazy-loads only the chosen voice, respects mute and Off, and caches decoded lines',async()=>{
  const {host,loads,finish}=fakeHost(),bank=createVoiceBank(host,{files:fixture,storage:memory(),random:()=>0});
  expect(loads).toEqual([]);
  await bank.playLine('boss','taunt-hit');await finish();
  expect(loads).toEqual(['/golem/taunt-hit-1.mp3']);
  bank.setVoice('boss','gremlin');await bank.playLine('boss','taunt-hit');await finish();
  expect(loads.every(url=>url.startsWith('/golem/')||url.startsWith('/gremlin/'))).toBe(true);expect(loads.at(-1)).toMatch(/^\/gremlin\//);
  host.enabled=false;expect(await bank.playLine('boss','taunt-hit')).toBeNull();host.enabled=true;
  bank.setVoice('boss','off');expect(await bank.playLine('boss','taunt-hit')).toBeNull();expect(bank.previewUrl('boss')).toBeUndefined();
  expect(loads).toHaveLength(2);
 });
 it('never overlaps itself; interrupt cuts the current line; stop cancels a pending load',async()=>{
  const {host,started,stopped,finish}=fakeHost(),bank=createVoiceBank(host,{files:fixture,storage:memory(),random:()=>0});
  expect(await bank.playLine('boss','taunt-hit')).toBe('taunt-hit');
  expect(await bank.playLine('boss','taunt-blocked')).toBeNull();expect(bank.busy()).toBe(true);
  expect(await bank.playLine('coach','clean',{interrupt:true})).toBe('clean');expect(stopped).toEqual(['/golem/taunt-hit-1.mp3']);
  await finish();expect(bank.busy()).toBe(false);
  const pending=bank.playLine('boss','taunt-hit');bank.stop('boss');expect(await pending).toBeNull();expect(started).toHaveLength(2);
  await finish();const first=bank.playLine('coach','clean'),second=bank.playLine('coach','combo-12',{interrupt:true});expect(await first).toBeNull();expect(await second).toBe('combo-12');expect(started).toHaveLength(3);
 });
 it('picks only a take that fits the gap, and plays nothing (and fetches nothing) when none fits',async()=>{
  const {host,loads}=fakeHost(),durations={golem:{'taunt-hit':[2.4,0.9,2.2,2.3,2.1,2.0,2.4,2.4,2.4,2.4,2.4,2.4],'taunt-habit-left':Array(8).fill(2.4)}};
  const bank=createVoiceBank(host,{files:fixture,durations,storage:memory(),random:()=>.99});host.duration=.9;
  expect(await bank.playLine('boss',['taunt-habit-left','taunt-hit'],{maxSeconds:1.2})).toBe('taunt-hit');
  expect(loads).toEqual(['/golem/taunt-hit-2.mp3']);
 });
 it('stores the choice under svc.prefs.voice., ignores unknown stored ids and survives blocked storage',()=>{
  const {host}=fakeHost(),storage=memory();storage.data.set(VOICE_PREF_PREFIX+'boss','queen');storage.data.set(VOICE_PREF_PREFIX+'coach','nobody');
  const bank=createVoiceBank(host,{files:fixture,storage});expect(bank.voice('boss')).toBe('queen');expect(bank.voice('coach')).toBe(DEFAULT_VOICE.coach);
  bank.setVoice('coach','hype');bank.setVoice('coach','off');bank.setVoice('boss','off');
  expect(Object.fromEntries(storage.data)).toEqual({'svc.prefs.voice.boss':'off','svc.prefs.voice.coach':'hype'});
  const broken={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
  const fallback=createVoiceBank(host,{files:fixture,storage:broken});expect(fallback.voice('boss')).toBe(DEFAULT_VOICE.boss);expect(()=>fallback.setVoice('boss','rumble')).not.toThrow();expect(fallback.voice('boss')).toBe('rumble');
 });
 it('exports the coach cues for the Crowd Trainer and speaks them through the active bank, cutting the last call',async()=>{
  expect(COACH_CUES).toEqual(['combo-12','combo-112','combo-121','combo-1212','combo-12s','combo-s12','combo-12g','combo-2s2','round-start','rest','ten-seconds','time','clean','partial','missed','faster','slower','workout-done','chat-picked']);
  setActiveVoiceBank(null);expect(await playCoach('combo-12')).toBe(false);
  const {host,stopped}=fakeHost(),bank=createVoiceBank(host,{files:fixture,storage:memory(),random:()=>0});setActiveVoiceBank(bank);
  expect(await playCoach('combo-12')).toBe(true);expect(await playCoach('clean')).toBe(true);expect(stopped).toEqual(['/drill/combo-12-1.mp3']);
  expect(host.playBuffer.mock.calls.at(-1)![1]).toEqual({yieldToVoice:false});setActiveVoiceBank(null);
 });
});

describe('boss taunts',()=>{
 function rig(){
  const audio=fakeHost();let now=0;
  const bank=createVoiceBank(audio.host,{files:fixture,storage:memory(),random:()=>0});
  const taunts=createBossTaunts(bank,audio.host,{now:()=>now,random:()=>0});
  const base=createGame();base.round.elapsed_ms=5000;base.now=5000;base.clock.next_beat=9000;base.tally.JAB=1;
  const flush=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};
  const cue=()=>{const url=(audio.host.playBuffer.mock.calls.at(-1)?.[0] as unknown as {url:string}|undefined)?.url;return url?/\/golem\/(.+)-\d+\.mp3$/.exec(url)![1]:undefined;};
  return {...audio,taunts,base,flush,cue,advance:(ms:number)=>{now+=ms;}};
 }
 const resolve=(state:GameState,outcome:'HIT'|'BLOCK'|'DODGE'|'PERFECT'|'CHIP'):GameState=>{const next=structuredClone(state);next.log.resolved=[...next.log.resolved,{round:1,beat:next.log.resolved.length+1,move:'JAB',at:next.now,outcome,dmg:0,counter_dmg:0,guard:true,lean:null,defence:'guard',reaction_ms:null,reaction_kind:'none',capture_at:null,received_at:null}];return next;};
 it('primes silently on a match already in progress, then taunts a resolved hit when nothing else speaks',async()=>{
  const {taunts,base,host,flush,cue}=rig(),old=resolve(base,'BLOCK');
  taunts.observe(old);await flush();expect(host.playBuffer).not.toHaveBeenCalled();
  host.talking=true;taunts.observe(resolve(old,'HIT'));await flush();expect(host.playBuffer).not.toHaveBeenCalled();
  host.talking=false;taunts.observe(resolve(old,'HIT'));await flush();expect(cue()).toBe('taunt-hit');
 });
 it('maps every outcome and match event to its cue',async()=>{
  const cases:[(s:GameState)=>GameState,string][]=[
   [s=>resolve(s,'BLOCK'),'taunt-blocked'],[s=>resolve(s,'DODGE'),'taunt-dodged'],[s=>resolve(s,'PERFECT'),'taunt-perfect'],[s=>resolve(s,'CHIP'),'taunt-hit'],
   [s=>{const n=structuredClone(s);n.hype=100;return n;},'taunt-super'],
   [s=>{const n=structuredClone(s);n.log.finishers=[...n.log.finishers,{round:1,beat:1,at:n.now,damage:4,actual_damage:4,window_ends_at:n.now+3000}];return n;},'taunt-finisher'],
   [s=>{const n=structuredClone(s);n.scouting.card='L';return n;},'taunt-habit-left'],
   [s=>{const n=structuredClone(s);n.round.number=2;n.round.elapsed_ms=0;return n;},'taunt-round-start'],
   [s=>{const n=structuredClone(s);n.round.over=true;n.log.rounds=[{number:1,winner:'boss',at:n.now,reason:'timeout',streamer_hp:40,boss_hp:60}];return n;},'taunt-round-win'],
   [s=>{const n=structuredClone(s);n.round.over=true;n.log.rounds=[{number:1,winner:'streamer',at:n.now,reason:'ko',streamer_hp:40,boss_hp:0}];return n;},'taunt-round-lose'],
  ];
  for(const [change,expected] of cases){const {taunts,base,flush,cue}=rig();taunts.observe(base);taunts.observe(change(base));await flush();expect(cue(),expected).toBe(expected);}
 });
 it('plays at most one taunt per gap and drops a stale event',async()=>{
  const {taunts,base,host,flush,finish,advance}=rig();taunts.observe(base);
  let state=resolve(base,'HIT');taunts.observe(state);await flush();await finish();expect(host.playBuffer).toHaveBeenCalledTimes(1);
  advance(TAUNT.gapMs-1);state=resolve(state,'BLOCK');taunts.observe(state);await flush();expect(host.playBuffer).toHaveBeenCalledTimes(1);
  advance(1);taunts.observe(state);await flush();expect(host.playBuffer).toHaveBeenCalledTimes(2);await finish();
  advance(TAUNT.gapMs);state=resolve(state,'DODGE');host.talking=true;taunts.observe(state);
  advance(TAUNT.ttlMs+1);host.talking=false;taunts.observe(state);await flush();expect(host.playBuffer).toHaveBeenCalledTimes(2);
 });
 it('never starts during a telegraph, cuts a playing taunt when a warning starts and keeps lines inside the gap to the next beat',async()=>{
  const {taunts,base,host,flush,stopped}=rig();taunts.observe(base);
  const warned=resolve(base,'HIT');warned.activeAttack={round:1,beat:2,move:'JAB',at:warned.now,lands_at:warned.now+800,exploit:false,vetoed:false};
  taunts.observe(warned);await flush();expect(host.playBuffer).not.toHaveBeenCalled();
  const free=structuredClone(warned);free.activeAttack=null;taunts.observe(free);await flush();expect(host.playBuffer).toHaveBeenCalledTimes(1);
  taunts.observe(warned);expect(stopped).toHaveLength(1);
  const tight=rig();tight.taunts.observe(tight.base);const close=resolve(tight.base,'HIT');close.clock.next_beat=close.now+700;tight.taunts.observe(close);await tight.flush();expect(tight.host.playBuffer).not.toHaveBeenCalled();
 });
 it('taunts a quiet chat once per quiet stretch and stays silent when Boss voice is off',async()=>{
  const {taunts,base,flush,cue,host}=rig();taunts.observe(base);
  const quiet=structuredClone(base);quiet.tally.JAB=0;quiet.voters=0;taunts.observe(quiet);
  const later=structuredClone(quiet);later.now+=TAUNT.quietMs;later.clock.next_beat=later.now+4000;taunts.observe(later);await flush();expect(cue()).toBe('taunt-quiet-chat');
  const off=rig();off.taunts.setEnabled(false);off.taunts.observe(off.base);off.taunts.observe(resolve(off.base,'HIT'));await off.flush();expect(off.host.playBuffer).not.toHaveBeenCalled();
  expect(host.playBuffer).toHaveBeenCalledTimes(1);
 });
 it('a new match or restart never replays old events',async()=>{
  const {taunts,base,host,flush}=rig();const done=resolve(base,'HIT');done.round.over=true;done.log.rounds=[{number:1,winner:'streamer',at:1,reason:'ko',streamer_hp:50,boss_hp:0}];
  taunts.observe(done);await flush();const fresh=structuredClone(done);fresh.match.seed+=1;taunts.observe(fresh);await flush();expect(host.playBuffer).not.toHaveBeenCalled();
 });
});

describe('voice picker',()=>{
 it('offers Off plus every boss voice and every coach voice, stores changes and previews the chosen voice',()=>{
  const dom=new JSDOM('<div><label id="sound"><input type="checkbox"> Sound</label></div>'),doc=dom.window.document,{host}=fakeHost(),storage=memory();
  const bank=createVoiceBank(host,{files:fixture,storage}),preview=vi.fn();
  mountVoicePicker(doc.getElementById('sound')!,bank,{preview});
  const boss=doc.getElementById('boss-voice') as HTMLSelectElement,coach=doc.getElementById('coach-voice') as HTMLSelectElement;
  expect([...boss.options].map(option=>option.textContent)).toEqual(['Off',...VOICES.boss.map(voice=>voice.name)]);
  expect([...coach.options].map(option=>option.value)).toEqual(VOICES.coach.map(voice=>voice.id));
  expect(boss.value).toBe('golem');expect(doc.getElementById('sound')!.nextElementSibling!.className).toContain('voice-picker');
  const [bossPlay,coachPlay]=[...doc.querySelectorAll<HTMLButtonElement>('.voice-preview')];
  coachPlay!.click();expect(preview).toHaveBeenCalledWith('coach');
  boss.value='off';boss.dispatchEvent(new dom.window.Event('change'));expect(bank.voice('boss')).toBe('off');expect(bossPlay!.disabled).toBe(true);expect(storage.data.get('svc.prefs.voice.boss')).toBe('off');
  dom.window.close();
 });
});

describe('bank data',()=>{
 const lines=JSON.parse(readFileSync('assets/voice/bank/lines.json','utf8')) as {voices:Record<'boss'|'coach',{id:string;name:string;voice_id:string;model_id:string}[]>;lines:Record<'boss'|'coach',Record<string,string[]>>};
 it('keeps the player voice list, defaults and cue ids in step with lines.json',()=>{
  for(const bank of ['boss','coach'] as const)expect(VOICES[bank]).toEqual(lines.voices[bank].map(({id,name})=>({id,name})));
  expect(Object.keys(lines.lines.boss)).toEqual([...BOSS_CUES]);expect(Object.keys(lines.lines.coach)).toEqual([...COACH_CUES]);
  expect(VOICES.boss.map(voice=>voice.id)).toContain(DEFAULT_VOICE.boss);expect(VOICES.coach.map(voice=>voice.id)).toContain(DEFAULT_VOICE.coach);
 });
 it('has enough variety: at least 12 for frequent cues, 4 per combo call, 6 otherwise, and no repeated line',()=>{
  for(const cue of ['taunt-hit','taunt-blocked','taunt-dodged'])expect(lines.lines.boss[cue]!.length).toBeGreaterThanOrEqual(12);
  for(const cue of ['clean','partial'])expect(lines.lines.coach[cue]!.length).toBeGreaterThanOrEqual(12);
  for(const [cue,texts] of Object.entries(lines.lines.coach))expect(texts.length,cue).toBeGreaterThanOrEqual(cue.startsWith('combo-')?4:6);
  for(const texts of Object.values(lines.lines.boss))expect(texts.length).toBeGreaterThanOrEqual(8);
  for(const bank of ['boss','coach'] as const){const all=Object.values(lines.lines[bank]).flat().map(text=>text.toLowerCase());expect(new Set(all).size).toBe(all.length);}
 });
});
