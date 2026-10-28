import {expect,it} from 'vitest';
import {createGame} from '../../shared/src/engine';
import {chatHabitPresentation,readItResolution} from './chat-habit';
import type {Resolution} from '../../shared/src/engine';
it('hides the chat card in R1 and whenever the server has not declared a habit',()=>{
 const state={...createGame(),chatScouting:{history:['JAB' as const],card:'JAB' as const,n:1,share:1,lowerBound:.2}};
 expect(chatHabitPresentation(state)).toEqual({visible:false});state.round.number=2;state.chatScouting.card=null as never;expect(chatHabitPresentation(state)).toEqual({visible:false});
});
it('shows authoritative share/n and exact12-sample distribution without doing threshold decisions',()=>{
 const state={...createGame({roundNumber:2}),chatScouting:{history:[...Array(8).fill('JAB'),...Array(2).fill('HOOK_L'),'HOOK_R','COMBO'],card:'JAB' as const,n:12,share:8/12,lowerBound:.41}};
 const view=chatHabitPresentation(state);expect(view).toMatchObject({visible:true,percent:67,n:12,counts:{JAB:8,HOOK_L:2,HOOK_R:1,COMBO:1,SUPER:0},instruction:'PRE-HOLD GUARD'});
 expect(view.visible&&view.distribution).toBe('JAB 8 · HOOK L 2 · HOOK R 1 · COMBO 1 · SUPER 0');
 state.chatScouting.card='HOOK_L' as never;expect(chatHabitPresentation(state,true)).toMatchObject({instruction:'PRE-HOLD TILT RIGHT'});
});
it('READ IT requires the server brace marker and a successful defence',()=>{
 expect(readItResolution(undefined)).toBe(false);
 expect(readItResolution({outcome:'BLOCK',braced:false} as Resolution)).toBe(false);
 for(const outcome of ['BLOCK','PERFECT','DODGE'])expect(readItResolution({outcome,braced:true} as Resolution)).toBe(true);
 expect(readItResolution({outcome:'HIT',braced:true} as Resolution)).toBe(false);
});

it('projects reset and chosen-opening metadata without using it as card evidence',()=>{
 const state={...createGame({roundNumber:2}),chatScouting:{history:Array(12).fill('JAB'),card:'JAB' as const,n:12,share:1,lowerBound:.8,openingPending:true,openings:[{round:1,beat:0,at:2400,move:'HOOK_L' as const,voted:false}]}};
 expect(chatHabitPresentation(state)).toMatchObject({move:'JAB',opening:'OPENING RESET',n:12});state.chatScouting.openingPending=false;expect(chatHabitPresentation(state)).toMatchObject({move:'JAB',opening:'AUTO: HOOK L',openingDetail:'Round 1, beat 0: autopilot opening'});
});
