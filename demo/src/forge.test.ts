import {expect,it} from 'vitest';
import {PREBAKED_BOSSES,offlineForgeSnapshot} from './forge';
import {validateBoss} from '../../shared/src/boss-def';
const gate={pass:true,viewers:[0,3,50,500],table:{casual:[50,50,50,50],nopunch:[40,40,40,40]},rounds:4000,seed:2026};
it('ships three distinct valid prebaked definitions without a credential path',()=>{
 expect(PREBAKED_BOSSES).toHaveLength(3);expect(new Set(PREBAKED_BOSSES.map(b=>b.name)).size).toBe(3);for(const boss of PREBAKED_BOSSES)expect(validateBoss(boss)).toEqual([]);
});
it('accepts only all-cell passing tuned results and reports failure rather than selecting it',()=>{
 const result={factor:.53,def:PREBAKED_BOSSES[0]!,before:{...gate,pass:false},after:gate};
 expect(offlineForgeSnapshot(result,'Prebaked')).toMatchObject({betweenRounds:true,status:'accepted',ai:null,factor:.53});
 result.after={...gate,pass:false};expect(offlineForgeSnapshot(result,'JSON')).toMatchObject({status:'rejected',errors:[expect.stringContaining('No damage factor')]});
});
