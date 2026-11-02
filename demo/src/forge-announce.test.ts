import {describe,expect,it} from 'vitest';
import {forgeResultsLine} from './forge-announce';
import type {ForgeSnapshot} from '../../shared/src/forge-view';
import type {BossDef} from '../../shared/src/boss-def';
const snap=(status:ForgeSnapshot['status'],ideas=0)=>({betweenRounds:true,status,ideas:Array.from({length:ideas},(_,i)=>({id:String(i),idea:'kettle',votes:1})),idea:null,boss:null,errors:[],before:null,after:null,factor:null,ai:null}) as unknown as ForgeSnapshot;
const boss={name:'The Noodle Knight'} as BossDef;
describe('forge results line',()=>{
 it('names a forged boss waiting for the next round, once it is not the boss on stage',()=>{
  expect(forgeResultsLine(snap('accepted'),boss,'Chat Golem')).toBe('NEW BOSS READY · The Noodle Knight · fights next round');
  expect(forgeResultsLine(null,boss,'The Noodle Knight')).toBeNull();
 });
 it('says when the boss is being built, failed, or is waiting for !forge',()=>{
  expect(forgeResultsLine(snap('generating'),null,'Chat Golem')).toBe('BOSS FORGE · building chat’s boss…');
  expect(forgeResultsLine(snap('tuning'),null,'Chat Golem')).toBe('BOSS FORGE · building chat’s boss…');
  expect(forgeResultsLine(snap('rejected'),null,'Chat Golem')).toBe('BOSS FORGE · that boss failed the balance test');
  expect(forgeResultsLine(snap('collecting',2),null,'Chat Golem')).toBe('BOSS FORGE · 2 ideas in · streamer types !forge to build');
  expect(forgeResultsLine(snap('collecting',0),null,'Chat Golem')).toBeNull();
  expect(forgeResultsLine(snap('idle'),null,'Chat Golem')).toBeNull();
 });
});
