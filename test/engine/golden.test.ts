import { readFileSync,readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect,it } from 'vitest';
import { createGame,step,drawMove,mulberry32,type GameState,type EngineEvent } from '../../shared/src/engine.js';
import {parseChatVote,type Move}from '../../shared/src/index.js';
const directory=fileURLToPath(new URL('../fixtures/golden/',import.meta.url));
const vectors=readdirSync(directory).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(readFileSync(directory+f,'utf8')).vectors);
function path(root:any,name:string){return name.replace(/\[(\d+)\]/g,'.$1').split('.').reduce((v,k)=>v?.[k],root);}
function set(root:any,name:string,value:unknown){const keys=name.split('.');let target=root;for(const key of keys.slice(0,-1))target=target[key];target[keys.at(-1)!]=value;}
function check(root:any,item:any){const value=path(root,item.path);if('equals'in item)expect(value,item.path).toEqual(item.equals);if('approx'in item)expect(Math.abs(value-item.approx),item.path).toBeLessThanOrEqual(item.tol??1e-6);if('in'in item)expect(item.in).toContain(value);if('not_in'in item)expect(item.not_in).not.toContain(value);}
for(const vector of vectors)it(`golden ${vector.id}`,()=>{
  if(vector.kind==='draw'){
    const rng=mulberry32(vector.seed);const count:Record<string,number>={};const first10:Move[]=[];
    for(let i=0;i<vector.draws.n;i++){const move=drawMove(vector.draws.counts,[],rng);count[move]=(count[move]??0)+1;if(i<10)first10.push(move);}
    const share=Object.fromEntries(Object.entries(count).map(([k,n])=>[k,n/vector.draws.n]));
    for(const item of vector.expect)check({count,share,first10},item);return;
  }
  let state=createGame({roundSeed:vector.seed});
  for(const [key,value]of Object.entries(vector.initial_state??{}))set(state,key,value);
  state=step(state,{kind:'advance'},0);
  const keys={K:false,A:false,D:false,J:false};
  const times=[...new Set<number>([...vector.events.map((e:any)=>e.t_ms),...vector.expect.filter((e:any)=>e.t_ms!=='end').map((e:any)=>e.t_ms),75000])].sort((a,b)=>a-b);
  for(const t of times){
    state=step(state,{kind:'advance'},t);
    for(const e of vector.events.filter((e:any)=>e.t_ms===t)){
      let event:EngineEvent|undefined;
      if(e.type==='vote')event=parseChatVote(e.value,e.viewer,t,true)??undefined;
      if(e.type==='guard')event={kind:'pose',guard:e.value,lean:state.input.lean,at:t,source:'pose'};
      if(e.type==='lean')event={kind:'pose',guard:state.input.guard,lean:e.value,at:t,source:'pose'};
      if(e.type==='punch')event={kind:'punch',side:e.value,at:t,source:'pose'};
      if(e.type==='control')event={kind:'control',action:e.value,by:e.viewer,authorized:e.role==='mod'||e.role==='broadcaster'};
      if(e.type==='key'){
        keys[e.value.key as keyof typeof keys]=e.value.down;
        if(e.value.key==='J'){if(e.value.down)event={kind:'punch',side:'L',at:t,source:'keyboard'};}
        else event={kind:'pose',guard:keys.K,lean:keys.A===keys.D?null:keys.A?'L':'R',at:t,source:'keyboard'};
      }
      if(event)state=step(state,event,t);
    }
    for(const item of vector.expect.filter((e:any)=>e.t_ms===t))check(state,item);
  }
  for(const item of vector.expect.filter((e:any)=>e.t_ms==='end'))check(state,item);
});
it('loads all50 supplied vectors',()=>expect(vectors).toHaveLength(50));
