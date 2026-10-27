import type { Control } from '@svc/shared';
export type ChatRole='viewer'|'mod'|'broadcaster';
export function parseChatControl(text:string,by:string,role:ChatRole):Control|null {
  const trimmed=text.trim().toLowerCase();
  if(trimmed==='stop'&&role==='broadcaster')return {kind:'control',action:'stop',by};
  if(role==='viewer')return null;
  const command=trimmed.split(/\s+/,1)[0];
  const action=command==='!pause'?'pause':command==='!resume'?'resume':command==='!veto'?'veto':null;
  return action?{kind:'control',action,by}:null;
}
