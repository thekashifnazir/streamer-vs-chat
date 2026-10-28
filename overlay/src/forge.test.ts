import {expect,it} from 'vitest';
import type {ForgeSnapshot} from '../../shared/src/forge-view';
import {DEFAULT_BOSS} from '../../shared/src/boss-def';
import {forgePresentation} from './forge';
import {bossDefenceCue} from './hud';
const gate={pass:true,viewers:[0,3,50,500],table:{casual:[51.25,52,53,54],nopunch:[48,49,50,51]},rounds:4000,seed:2026};
const snapshot=():ForgeSnapshot=>({betweenRounds:true,status:'accepted',idea:'<img src=x>',ideas:[],boss:DEFAULT_BOSS,errors:[],before:gate,after:gate,factor:.53,ai:{model:'gpt-6-luna',latencyMs:1234,inputTokens:20,outputTokens:30,costUsd:null,repair:false}});
it('projects measured gate percentages without inventing costs and retains plain text',()=>{
 const view=forgePresentation(snapshot())!;expect(view.before).toContain('0: 51% casual / 48% no-punch');expect(view.before).not.toContain('5125%');expect(view.factor).toBe('DAMAGE ×0.53');expect(view.ai).toBe('AI: gpt-6-luna · 1.23s · cost unavailable');expect(view.idea).toBe('<img src=x>');expect(view.moves).toHaveLength(5);expect(view.validation).toBe('✓ VALIDATED');
});
it('shows rejection and unknown measurements honestly',()=>{
 const raw=snapshot();raw.boss=null;raw.errors=['Blocked'];raw.ai=null;raw.before=null;raw.after=null;
 expect(forgePresentation(raw)).toMatchObject({validation:'✕ Blocked',before:'Not measured',ai:''});expect(forgePresentation(null)).toBeNull();
});
it('uses configured defence rather than legacy slot semantics for custom tells',()=>{
 expect(bossDefenceCue('guard')).toBe('GUARD');expect(bossDefenceCue('lean_left')).toBe('← LEAN');expect(bossDefenceCue('lean_right',true)).toBe('TILT →');expect(bossDefenceCue('lean_any',true)).toBe('TILT ANY WAY');
});
