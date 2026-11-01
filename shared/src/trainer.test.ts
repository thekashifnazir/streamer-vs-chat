import {describe,expect,it} from 'vitest';
import {COMBOS,TRAINER,comboWindowMs,createTrainer,drawCombo,formatWorkoutSummary,matchToken,nudgePace,punchToken,scoreCombo,trainerStep,trainerSummary,type ActiveCombo,type ComboId,type TrainerEvent,type TrainerState} from './trainer';
const base={difficulty:'medium' as const,southpaw:false,anyHand:false,seed:7};
const run=(state:TrainerState,events:[TrainerEvent,number][])=>{const cues:string[]=[];for(const [event,at] of events){state=trainerStep(state,event,at);cues.push(...state.cues);}return {state,cues};};
/** Start, then advance to the first call. */
function called(options=base){let s=createTrainer(options,0);s=trainerStep(s,{kind:'advance'},TRAINER.firstCallMs);return s;}
function sequence(id:ComboId){return COMBOS.find(combo=>combo.id===id)!.tokens;}
it('defines exactly the menu commands and cue ids',()=>{
 expect(COMBOS.map(c=>[c.command,c.tokens.join(''),c.cue])).toEqual([['!12','12','combo-12'],['!112','112','combo-112'],['!121','121','combo-121'],['!1212','1212','combo-1212'],['!12s','12S','combo-12s'],['!s12','S12','combo-s12'],['!12g','12G','combo-12g'],['!2s2','2S2','combo-2s2']]);
 expect(TRAINER.rounds).toBe(3);expect(TRAINER.workMs).toBe(60000);expect(TRAINER.restMs).toBe(20000);
});
describe('votes and draw',()=>{
 it('counts one vote per viewer per window and lets a later vote replace it',()=>{
  let s=createTrainer(base,0);
  s=trainerStep(s,{kind:'vote',user:'a',vote:{kind:'combo',combo:'12'}},10);
  s=trainerStep(s,{kind:'vote',user:'a',vote:{kind:'combo',combo:'12'}},20);
  expect(s.tally['12']).toBe(1);
  s=trainerStep(s,{kind:'vote',user:'a',vote:{kind:'combo',combo:'2s2'}},30);
  expect(s.tally['12']).toBe(0);expect(s.tally['2s2']).toBe(1);
  s=trainerStep(s,{kind:'vote',user:'b',vote:{kind:'combo',combo:'2s2'}},40);
  s=trainerStep(s,{kind:'advance'},TRAINER.firstCallMs);
  expect(s.combo?.id).toBe('2s2');expect(s.combo?.voted).toBe(true);expect(s.tally['2s2']).toBe(0);expect(s.votes).toEqual({});
 });
 it('draws weighted by votes, autopilots uniformly with none, and never three in a row',()=>{
  let seed=1;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const counts:Record<string,number>={};for(let i=0;i<4000;i++){const id=drawCombo({'12':3,'121':1},[],rng);counts[id]=(counts[id]??0)+1;}
  expect(Object.keys(counts).sort()).toEqual(['12','121']);expect(counts['12']!/4000).toBeGreaterThan(.7);expect(counts['12']!/4000).toBeLessThan(.8);
  const auto=new Set<string>();for(let i=0;i<400;i++)auto.add(drawCombo({},[],rng));expect(auto.size).toBe(COMBOS.length);
  for(let i=0;i<50;i++)expect(drawCombo({'12':9},['12','12'],rng)).not.toBe('12');
  expect(drawCombo({'12':9},['121','12'],()=>0)).toBe('12');
 });
 it('counts distinct chatters and chat’s favourite across the workout',()=>{
  let s=createTrainer(base,0);
  for(const user of ['a','b','c'])s=trainerStep(s,{kind:'vote',user,vote:{kind:'combo',combo:'121'}},5);
  s=trainerStep(s,{kind:'vote',user:'d',vote:{kind:'pace',pace:'faster'}},6);
  const summary=trainerSummary(trainerStep(s,{kind:'advance'},TRAINER.firstCallMs));
  expect(summary.voters).toBe(4);expect(summary.favourite?.id).toBe('121');
  expect(trainerSummary(createTrainer(base,0)).favourite).toBeNull();
 });
});
describe('pace',()=>{
 it('nudges the gap one step inside safe bounds',()=>{
  const {stepMs,minMs,maxMs}=TRAINER.pace;
  expect(nudgePace(2500,3,1)).toBe(2500-stepMs);expect(nudgePace(2500,1,3)).toBe(2500+stepMs);expect(nudgePace(2500,2,2)).toBe(2500);
  expect(nudgePace(minMs,9,0)).toBe(minMs);expect(nudgePace(maxMs,0,9)).toBe(maxMs);
 });
 it('applies pace votes at the next call and raises a cue',()=>{
  let s=createTrainer(base,0);s=trainerStep(s,{kind:'vote',user:'a',vote:{kind:'pace',pace:'slower'}},1);
  s=trainerStep(s,{kind:'advance'},TRAINER.firstCallMs);
  expect(s.gapMs).toBe(TRAINER.gapMs.medium+TRAINER.pace.stepMs);expect(s.cues).toContain('slower');expect(s.paceVotes).toEqual({});
 });
});
describe('token matching',()=>{
 const combo=(id:ComboId):ActiveCombo=>({id,tokens:sequence(id),calledAt:0,endsAt:9999,index:0,marks:sequence(id).map(()=>null),tokenSince:0,voted:false});
 it('matches in order and ignores unexpected moves',()=>{
  let c=combo('121');c=matchToken(c,'S',1);c=matchToken(c,'G',1);expect(c.index).toBe(0);
  for(const t of ['1','2','1'] as const)c=matchToken(c,t,2);expect(c.marks).toEqual(['hit','hit','hit']);expect(scoreCombo(c.marks)).toBe('clean');
 });
 it('skips one token the webcam missed but scores it partial',()=>{
  let c=combo('121');c=matchToken(c,'2',1);c=matchToken(c,'1',2);
  expect(c.marks).toEqual(['skip','hit','hit']);expect(scoreCombo(c.marks)).toBe('partial');
  let d=combo('112');d=matchToken(d,'2',1);expect(d.index).toBe(0);
 });
 it('scores CLEAN, PARTIAL and MISSED',()=>{expect(scoreCombo(['hit','hit'])).toBe('clean');expect(scoreCombo(['hit',null])).toBe('partial');expect(scoreCombo([null,null])).toBe('missed');});
 it('maps 1 to the lead hand: left orthodox, right southpaw; any-hand ignores the side',()=>{
  expect(punchToken('L',{southpaw:false,anyHand:false})).toBe('1');expect(punchToken('R',{southpaw:false,anyHand:false})).toBe('2');
  expect(punchToken('L',{southpaw:true,anyHand:false})).toBe('2');expect(punchToken('R',{southpaw:true,anyHand:false})).toBe('1');
  expect(punchToken('R',{southpaw:false,anyHand:true})).toBe('P');
  let c=combo('12');c=matchToken(c,'P',1);c=matchToken(c,'P',2);expect(scoreCombo(c.marks)).toBe('clean');
  let s=combo('s12');s=matchToken(s,'P',1);expect(s.marks).toEqual(['skip','hit',null]);
 });
});
describe('reducer',()=>{
 const forceCombo=(id:ComboId,options=base)=>{let s=createTrainer(options,0);s=trainerStep(s,{kind:'vote',user:'v',vote:{kind:'combo',combo:id}},1);return trainerStep(s,{kind:'advance'},TRAINER.firstCallMs);};
 const t0=TRAINER.firstCallMs;
 it('calls a combo with its cue and a window scaled by length and difficulty',()=>{
  const s=forceCombo('1212');expect(s.cues).toContain('combo-1212');expect(s.combo?.endsAt).toBe(t0+comboWindowMs(sequence('1212'),'medium'));
  expect(comboWindowMs(sequence('12'),'easy')).toBeGreaterThan(comboWindowMs(sequence('12'),'expert'));
  expect(comboWindowMs(sequence('1212'),'medium')).toBeGreaterThan(comboWindowMs(sequence('12'),'medium'));
  expect(comboWindowMs(sequence('12g'),'medium')).toBe(comboWindowMs(sequence('12s'),'medium')+TRAINER.guardHoldMs);
 });
 it('scores a clean one-two from punches, then schedules the next call after the gap',()=>{
  const {state,cues}=run(forceCombo('12'),[[{kind:'punch',side:'L'},t0+300],[{kind:'punch',side:'R'},t0+600]]);
  expect(cues).toContain('clean');expect(state.stats.clean).toBe(1);expect(state.combo).toBeNull();expect(state.nextCallAt).toBe(t0+600+TRAINER.gapMs.medium);
  expect(state.stats.punchesL).toBe(1);expect(state.stats.punchesR).toBe(1);
 });
 it('treats wrong-hand punches as missing for orthodox and right for southpaw',()=>{
  const wrong=run(forceCombo('12'),[[{kind:'punch',side:'R'},t0+300],[{kind:'advance'},t0+99999]]).state;
  expect(wrong.stats.partial+wrong.stats.missed).toBeGreaterThan(0);expect(wrong.stats.clean).toBe(0);
  const south=run(forceCombo('12',{...base,southpaw:true}),[[{kind:'punch',side:'R'},t0+300],[{kind:'punch',side:'L'},t0+500]]).state;
  expect(south.stats.clean).toBe(1);
 });
 it('reads a slip from a lean onset (either side), not a held lean',()=>{
  let s=createTrainer(base,0);s=trainerStep(s,{kind:'pose',guard:false,lean:'L'},1);
  s=trainerStep(s,{kind:'vote',user:'v',vote:{kind:'combo',combo:'s12'}},2);s=trainerStep(s,{kind:'advance'},t0);
  s=trainerStep(s,{kind:'pose',guard:false,lean:'L'},t0+10);expect(s.combo?.index).toBe(0);
  s=trainerStep(s,{kind:'pose',guard:false,lean:null},t0+50);s=trainerStep(s,{kind:'pose',guard:false,lean:'R'},t0+100);expect(s.combo?.marks[0]).toBe('hit');
  const {state}=run(s,[[{kind:'punch',side:'L'},t0+200],[{kind:'punch',side:'R'},t0+300]]);expect(state.stats.clean).toBe(1);expect(state.stats.slips).toBe(2);
 });
 it('needs the guard held 0.5 s after the guard token comes up',()=>{
  let s=forceCombo('12g');s=trainerStep(s,{kind:'pose',guard:true,lean:null},t0+50);
  s=run(s,[[{kind:'punch',side:'L'},t0+100],[{kind:'punch',side:'R'},t0+200]]).state;expect(s.combo?.index).toBe(2);
  s=trainerStep(s,{kind:'advance'},t0+200+TRAINER.guardHoldMs-1);expect(s.combo?.index).toBe(2);
  s=trainerStep(s,{kind:'advance'},t0+200+TRAINER.guardHoldMs+50);expect(s.stats.clean).toBe(1);expect(s.last?.at).toBe(t0+200+TRAINER.guardHoldMs);
  const dropped=run(forceCombo('12g'),[[{kind:'punch',side:'L'},t0+100],[{kind:'punch',side:'R'},t0+200],[{kind:'pose',guard:true,lean:null},t0+300],[{kind:'pose',guard:false,lean:null},t0+500],[{kind:'advance'},t0+20000]]).state;
  expect(dropped.stats.partial).toBe(1);expect(dropped.stats.guards).toBe(0);
 });
 it('lets a missed combo pass without a fail state',()=>{
  const {state,cues}=run(forceCombo('12'),[[{kind:'advance'},t0+comboWindowMs(sequence('12'),'medium')]]);
  expect(cues).toContain('missed');expect(state.stats.missed).toBe(1);expect(state.phase).toBe('work');expect(state.nextCallAt).not.toBeNull();
 });
 it('runs 3 × 60 s work with 20 s rest and the round cues',()=>{
  const {state,cues}=run(createTrainer(base,0),[[{kind:'advance'},50_000],[{kind:'advance'},60_000],[{kind:'advance'},79_999]]);
  expect(cues.filter(c=>c==='ten-seconds')).toHaveLength(1);expect(cues).toContain('time');expect(cues).toContain('rest');
  expect(state.phase).toBe('rest');expect(state.phaseEndsAt).toBe(80_000);
  const next=trainerStep(state,{kind:'advance'},80_000);expect(next.phase).toBe('work');expect(next.round).toBe(2);expect(next.cues).toContain('round-start');
  const done=run(next,[[{kind:'advance'},140_000],[{kind:'advance'},160_000],[{kind:'advance'},220_000]]);
  expect(done.state.phase).toBe('done');expect(done.cues.at(-1)).toBe('workout-done');expect(trainerSummary(done.state).activeMinutes).toBe(3);
  expect(done.state.stats.missed).toBeGreaterThan(10);
 });
 it('pauses every deadline and resumes where it stopped',()=>{
  let s=forceCombo('12');const ends=s.combo!.endsAt,phaseEnds=s.phaseEndsAt;
  s=trainerStep(s,{kind:'pause'},t0+100);s=trainerStep(s,{kind:'punch',side:'L'},t0+200);expect(s.stats.punchesL).toBe(0);
  s=trainerStep(s,{kind:'advance'},t0+30_000);expect(s.combo?.id).toBe('12');
  s=trainerStep(s,{kind:'resume'},t0+30_100);expect(s.combo!.endsAt).toBe(ends+30_000);expect(s.phaseEndsAt).toBe(phaseEnds+30_000);
  s=trainerStep(s,{kind:'vote',user:'x',vote:{kind:'combo',combo:'12'}},t0+30_200);expect(s.tally['12']).toBe(1);
 });
 it('ignores votes and inputs while paused, and stop ends with a summary',()=>{
  let s=trainerStep(createTrainer(base,0),{kind:'pause'},100);s=trainerStep(s,{kind:'vote',user:'x',vote:{kind:'combo',combo:'12'}},200);expect(s.tally['12']).toBe(0);
  s=trainerStep(s,{kind:'resume'},1100);s=trainerStep(s,{kind:'stop'},31_100);expect(s.phase).toBe('done');expect(s.cues.at(-1)).toBe('workout-done');
  expect(trainerSummary(s).activeMinutes).toBe(.5);
 });
 it('summarises the workout in one chat-safe line',()=>{
  const {state}=run(forceCombo('12'),[[{kind:'punch',side:'L'},t0+300],[{kind:'punch',side:'R'},t0+600],[{kind:'stop'},t0+700]]);
  const summary=trainerSummary(state);expect(summary).toMatchObject({clean:1,partial:0,missed:0,combos:1,punches:2,punchesL:1,punchesR:1,voters:1});
  expect(formatWorkoutSummary(summary)).toBe("Workout done: 1 clean combo, 2 punches. Chat's favourite: one-two.");
  expect(formatWorkoutSummary(summary)).not.toMatch(/calor|heart|kcal|bpm/i);
 });
 it('never reads the clock: the same events give the same state',()=>{
  const events:[TrainerEvent,number][]=[[{kind:'advance'},3000],[{kind:'punch',side:'L'},3200],[{kind:'advance'},90_000]];
  expect(run(createTrainer(base,0),events).state).toEqual(run(createTrainer(base,0),events).state);
  expect(()=>trainerStep(createTrainer(base,10),{kind:'advance'},5)).toThrow();
 });
});
