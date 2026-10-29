import {expect,it} from 'vitest';
import {PREBAKED_BOSSES,offlineForgeSnapshot} from './forge';
import {validateBoss} from '../../shared/src/boss-def';
import {gateBoss} from '../../shared/src/boss-forge';
import {createGame,step,bossMove} from '../../shared/src/engine';
import {MOVES} from '../../shared/src/index';
import {bossDefenceCue} from '../../overlay/src/hud';
const gate={pass:true,viewers:[0,3,50,500],table:{casual:[50,50,50,50],nopunch:[40,40,40,40]},rounds:4000,seed:2026};
it('ships four distinct valid prebaked definitions without a credential path',()=>{
 expect(PREBAKED_BOSSES).toHaveLength(4);expect(new Set(PREBAKED_BOSSES.map(b=>b.name)).size).toBe(4);for(const boss of PREBAKED_BOSSES)expect(validateBoss(boss)).toEqual([]);
});
it('accepts only all-cell passing tuned results and reports failure rather than selecting it',()=>{
 const result={factor:.53,def:PREBAKED_BOSSES[0]!,before:{...gate,pass:false},after:gate};
 expect(offlineForgeSnapshot(result,'Prebaked')).toMatchObject({betweenRounds:true,status:'accepted',ai:null,factor:.53});
 result.after={...gate,pass:false};expect(offlineForgeSnapshot(result,'JSON')).toMatchObject({status:'rejected',errors:[expect.stringContaining('No damage factor')]});
});

it('offers Nak Muay after Velvet with the requested combat data and passing fixture gate',()=>{
 const boss=PREBAKED_BOSSES[3]!;
 expect(PREBAKED_BOSSES[2]?.name).toBe('Velvet Sentinel');
 expect(boss).toEqual({name:'Nak Muay',tagline:'Eight limbs. Same four reads.',hp:135,moves:[
 {command:'!teep',label:'TEEP',defence:'guard',damage:8,chip:0,telegraph_ms:800,hits:1},
 {command:'!elbowl',label:'LEFT ELBOW',defence:'lean_right',damage:12,chip:3,telegraph_ms:800,hits:1},
 {command:'!elbowr',label:'RIGHT ELBOW',defence:'lean_left',damage:12,chip:3,telegraph_ms:800,hits:1},
 {command:'!clinch',label:'CLINCH KNEES',defence:'guard',damage:7,chip:0,telegraph_ms:800,hits:2},
 ]});
 expect(validateBoss(boss)).toEqual([]);expect(gateBoss(boss).pass).toBe(true);
},10000);
it('uses Nak Muay labels and matching unmirrored defence cues on its telegraphs',()=>{
 const boss=PREBAKED_BOSSES[3]!,labels=['TEEP','LEFT ELBOW','RIGHT ELBOW','CLINCH KNEES'],standing=['GUARD','LEAN →','← LEAN','GUARD'],seated=['GUARD','TILT →','← TILT','GUARD'];
 for(let index=0;index<boss.moves.length;index++){
  const state=step(createGame({bossDef:boss,moves:[MOVES[index]!]}),{kind:'advance'},2400);
  const tell=bossMove(state,state.activeAttack!.move);
  expect(tell.label).toBe(labels[index]);expect(bossDefenceCue(tell.defence)).toBe(standing[index]);expect(bossDefenceCue(tell.defence,true)).toBe(seated[index]);
 }
});
