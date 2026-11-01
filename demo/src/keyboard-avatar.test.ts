import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
import {createKeyboard} from '../../capture/src/keyboard';
import {AVATAR_PUNCH_MS,createKeyboardAvatar} from './keyboard-avatar';

function setup(punchEnabled=true){
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8')),win=dom.window,avatar=win.document.getElementById('keyboard-avatar')!;
 let now=0;const timers:{at:number;run:()=>void}[]=[];
 const setTimer=((run:()=>void,ms:number)=>{const timer={at:now+ms,run};timers.push(timer);return timer;}) as unknown as typeof setTimeout;
 const clearTimer=((timer:unknown)=>{const i=timers.indexOf(timer as never);if(i>=0)timers.splice(i,1);}) as typeof clearTimeout;
 const advance=(ms:number)=>{now+=ms;for(const timer of [...timers].filter(t=>t.at<=now)){timers.splice(timers.indexOf(timer),1);timer.run();}};
 const pose=createKeyboardAvatar(avatar,{punchEnabled:()=>punchEnabled,setTimer,clearTimer}),emit=vi.fn();
 const keyboard=createKeyboard({emit,label:pose.label,target:win,now:()=>now});keyboard.setEnabled(true);
 const key=(type:'keydown'|'keyup',code:string)=>win.dispatchEvent(new win.KeyboardEvent(type,{code,cancelable:true}));
 return {avatar,key,advance,emit,keyboard,win};
}

it('mirrors held K/A/D as guard and lean poses on the keyboard figure',()=>{
 const {avatar,key,win}=setup();
 key('keydown','KeyK');expect(avatar.classList.contains('guard')).toBe(true);
 key('keydown','KeyA');expect([...avatar.classList]).toEqual(expect.arrayContaining(['guard','lean-L']));
 key('keyup','KeyA');key('keydown','KeyD');expect(avatar.classList.contains('lean-R')).toBe(true);expect(avatar.classList.contains('lean-L')).toBe(false);
 key('keyup','KeyD');key('keyup','KeyK');expect(avatar.classList.contains('guard')||avatar.classList.contains('lean-R')).toBe(false);
 win.close();
});

it('shows a short punch pose on J that a held key cannot leave stuck on',()=>{
 const {avatar,key,advance,win}=setup();
 key('keydown','KeyJ');expect(avatar.classList.contains('punch')).toBe(true);
 key('keyup','KeyJ');expect(avatar.classList.contains('punch')).toBe(true);
 advance(AVATAR_PUNCH_MS-1);expect(avatar.classList.contains('punch')).toBe(true);
 advance(1);expect(avatar.classList.contains('punch')).toBe(false);
 key('keydown','KeyJ');advance(AVATAR_PUNCH_MS/2);key('keyup','KeyJ');key('keydown','KeyJ');advance(AVATAR_PUNCH_MS-1);expect(avatar.classList.contains('punch')).toBe(true);
 advance(1);expect(avatar.classList.contains('punch')).toBe(false);
 win.close();
});

it('does not punch in Defence only, and leaves the emitted game input unchanged',()=>{
 const off=setup(false);off.key('keydown','KeyJ');expect(off.avatar.classList.contains('punch')).toBe(false);off.win.close();
 const {key,emit,win}=setup();emit.mockClear();
 key('keydown','KeyK');key('keydown','KeyJ');key('keyup','KeyJ');key('keyup','KeyK');
 expect(emit.mock.calls.map(([input])=>input.kind==='punch'?'punch':`pose:${input.guard}`)).toEqual(['pose:true','punch','pose:false']);
 win.close();
});

it('styles each pose, with reduced motion snapping instead of animating',()=>{
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
 for(const selector of ['#keyboard-avatar.guard .avatar-arm.left{','#keyboard-avatar.lean-L{','#keyboard-avatar.lean-R{','#keyboard-avatar.punch .avatar-arm.right{'])expect(css).toContain(selector);
 expect(css).toMatch(/#keyboard-avatar\.lean-R\{translate:12% 0;rotate:1[2-5]deg\}/);
 expect(css).toContain('@media(prefers-reduced-motion:reduce){#keyboard-avatar,#keyboard-avatar .avatar-arm{transition:none}}');
});
