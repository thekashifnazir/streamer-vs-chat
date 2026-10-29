import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import {createCalibrationProfiles,type ProfileStorage} from './calibration-profile';
import type {CalibrationSnapshot} from './calibration';
import type {Landmark} from './classifier';

// Exercise the page's actual handlers without a camera, Twitch, or browser runtime.
const cameraHarness=vi.hoisted(()=>({starts:0,frame:null as ((sample:{landmarks:Landmark[];at:number;fps:number;inferenceMs:number})=>void)|null}));
vi.mock('./camera',()=>({PoseCamera:class {constructor(_video:unknown,frame:typeof cameraHarness.frame){cameraHarness.frame=frame;}async start(){cameraHarness.starts++;return true;}stop() {}}}));
class Element extends EventTarget {
  textContent=''; hidden=false; checked=false; disabled=false; value='';
  focused=false;
  focus(){this.focused=true;}
  blur() {}
  click(){this.dispatchEvent(new Event('click'));}
  change(){this.dispatchEvent(new Event('change'));}
}
class Socket extends EventTarget {
  static OPEN=1;
  readyState=Socket.OPEN;
  send=vi.fn();
  close() {}
  tick(remaining=75000) {
    this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'tick',started:remaining!==75000,state:{match:{winner:null},paused:false,round:{over:false,number:1,remaining_ms:remaining}}})}));
  }
}
afterEach(()=>{cameraHarness.starts=0;cameraHarness.frame=null;vi.unstubAllGlobals();vi.resetModules();});
async function page(storage?:ProfileStorage) {
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const elements=new Map([...html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)].map(match=>{const node=new Element();node.disabled=/\bdisabled(?:\s|>|=)/.test(match[0]);return [match[1]!,node];}));
  const get=(id:string)=>{const node=elements.get(id);if(!node)throw new Error(`Missing page element ${id}`);return node;};
  get('difficulty').value='medium';get('input-source').value='keyboard';get('posture').value='standing';get('pose-delegate').value='CPU';
  const sockets:Socket[]=[];
  const data=new Map<string,string>();vi.stubGlobal('localStorage',storage??{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}});
  vi.stubGlobal('document',{getElementById:get});
  vi.stubGlobal('window',Object.assign(new EventTarget(),{setInterval:vi.fn(),clearInterval:vi.fn(),setTimeout:vi.fn(),clearTimeout:vi.fn()}));
  vi.stubGlobal('location',{hostname:'localhost'});
  vi.stubGlobal('WebSocket',class extends Socket {constructor(){super();sockets.push(this);}});
  await import('./main');
  return {get,socket:sockets[0]!,window:window};
}
it('keeps the clear-space start warning visible across live ticks until the checkbox changes',async()=>{
  const {get,socket}=await page();
  get('start-match').click();
  const warning=get('session-warning');
  expect(warning.textContent).toContain('Confirm your clear space');
  expect(warning.hidden).toBe(false);
  for(const remaining of [75000,74000,73000])socket.tick(remaining);
  expect(get('game-status').textContent).toBe('ROUND 1 · 73 s');
  expect(warning.textContent).toContain('Confirm your clear space');
  expect(warning.hidden).toBe(false);
  expect(socket.send).not.toHaveBeenCalled();
  get('clear-space').checked=true;get('clear-space').change();
  expect(warning.hidden).toBe(true);
  get('resume-input').click();
  get('start-match').click();
  expect(socket.send).toHaveBeenCalledWith(JSON.stringify({kind:'session',action:'start'}));
});
it('keeps connection and calibration warnings separate from server game status too',async()=>{
  const {get,socket}=await page();
  get('clear-space').checked=true;get('clear-space').change();
  get('resume-input').click();socket.readyState=0;get('start-match').click();socket.tick();
  expect(get('session-warning').textContent).toBe('Connect to the local server first.');
  expect(get('session-warning').hidden).toBe(false);
  get('resume-input').click();
  expect(get('session-warning').textContent).toContain('connect to the local server');
  socket.readyState=1;get('input-source').value='pose';get('input-source').change();
  socket.send.mockClear();get('next-round').click();socket.tick();
  expect(get('session-warning').textContent).toContain('Resume inputs');
  expect(get('input-lock').textContent).toContain('start the camera');
  expect(get('session-warning').hidden).toBe(false);
  expect(socket.send).not.toHaveBeenCalled();
});

it('reports unavailable replay metadata without sending a blob URL or media when recording is off',async()=>{
 const{get,socket}=await page();
 const message=(data:unknown)=>socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(data)}));
 message({kind:'replay-capture',highlightId:'moment'});await Promise.resolve();
 message({kind:'replay-request',highlightId:'moment'});await Promise.resolve();await Promise.resolve();
 expect(socket.send).toHaveBeenCalledWith(JSON.stringify({kind:'replay-result',highlightId:'moment',available:false}));
 get('no-punch').checked=true;get('no-punch').change();
 expect(get('punch-key-guide').hidden).toBe(true);
 expect(socket.send).toHaveBeenCalledWith(JSON.stringify({kind:'capture-options',seated:false,noPunch:true,difficulty:'medium'}));
});

function storedProfile(){
 const data=new Map<string,string>(),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
 const ready:CalibrationSnapshot={stage:'ready',ready:true,mode:'standing',message:'Ready',progress:1,guardThreshold:-1.2+.7*1.8,guardMedians:{neutral:-2.5,resting:-1.2,guard:.6},guardReleaseBand:.775,neutralSwayP95:.02,leanFloor:.3,leanPeaks:{L:.57,R:.88},leanThresholds:{L:.342,R:.528}};
 expect(createCalibrationProfiles(()=>storage).save(ready)).toBe(true);return storage;
}
function guardFrame():Landmark[]{const frame=Array.from({length:33},()=>({x:.5,y:.1,z:0,visibility:1}));for(const [index,x,y]of [[11,.41,.4],[12,.59,.4],[13,.41,.7],[14,.59,.7],[15,.41,.3],[16,.59,.3],[23,.41,.9],[24,.59,.9]])frame[index!]={x:x!,y:y!,z:0,visibility:1};return frame;}
it('reload restores stored calibration but stays STOPPED until clear space, camera frames and explicit Resume',async()=>{
 const storage=storedProfile();const first=await page(storage);expect(first.get('calibration-status').textContent).toContain('restored');expect(cameraHarness.starts).toBe(0);
 first.window.dispatchEvent(new Event('beforeunload'));vi.resetModules();const{get,socket}=await page(storage);
 expect(get('input-source').value).toBe('pose');expect(get('calibration-status').textContent).toContain('restored');expect(get('save-calibration').disabled).toBe(false);expect(cameraHarness.starts).toBe(0);
 socket.dispatchEvent(new Event('open'));expect(socket.send).toHaveBeenCalledWith(JSON.stringify({kind:'control',action:'stop',by:'capture'}));socket.send.mockClear();
 get('clear-space').checked=true;get('clear-space').change();get('resume-input').click();expect(get('connection-status').textContent).toContain('No camera');expect(get('input-lock').textContent).toContain('start the camera');
 expect(socket.send.mock.calls.map(([raw])=>JSON.parse(raw)).some(value=>value.kind==='control'&&value.action==='resume')).toBe(false);
 get('start-camera').click();await Promise.resolve();await Promise.resolve();expect(cameraHarness.starts).toBe(1);get('resume-input').click();expect(get('connection-status').textContent).toContain('frames are 500 ms');expect(get('input-lock').textContent).toContain('frames are 500 ms');
 cameraHarness.frame!({landmarks:guardFrame(),at:performance.now(),fps:30,inferenceMs:4});get('start-match').click();expect(get('session-warning').textContent).toContain('Resume inputs');
 expect(socket.send.mock.calls.map(([raw])=>JSON.parse(raw)).some(value=>value.kind==='pose'&&value.guard)).toBe(false);
 get('resume-input').click();expect(socket.send).toHaveBeenCalledWith(JSON.stringify({kind:'control',action:'resume',by:'capture'}));
 cameraHarness.frame!({landmarks:guardFrame(),at:performance.now(),fps:30,inferenceMs:4});expect(socket.send.mock.calls.map(([raw])=>JSON.parse(raw)).some(value=>value.kind==='pose'&&value.guard)).toBe(true);
 get('start-match').click();expect(socket.send).toHaveBeenCalledWith(JSON.stringify({kind:'session',action:'start'}));
});
it('forget removes the saved profile so the next reload requires calibration again',async()=>{
 const storage=storedProfile();const current=await page(storage);current.get('forget-calibration').click();expect(createCalibrationProfiles(()=>storage).load('standing')).toBeNull();current.window.dispatchEvent(new Event('beforeunload'));vi.resetModules();
 const next=await page(storage);expect(next.get('calibration-status').textContent).not.toContain('restored');expect(next.get('save-calibration').disabled).toBe(true);expect(cameraHarness.starts).toBe(0);
});

it('offline Resume never arms a restored page before its reconnection',async()=>{
 const{get,socket}=await page(storedProfile());get('clear-space').checked=true;get('clear-space').change();socket.readyState=0;get('resume-input').click();expect(get('connection-status').textContent).toContain('connect to the local server');socket.readyState=1;socket.dispatchEvent(new Event('open'));
 expect(socket.send).toHaveBeenCalledWith(JSON.stringify({kind:'control',action:'stop',by:'capture'}));socket.send.mockClear();get('start-match').click();expect(get('session-warning').textContent).toContain('Resume inputs');expect(socket.send).not.toHaveBeenCalled();
});

it('pre-selects Medium difficulty and sends the selected difficulty as a pending start option',async()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');expect(html).toContain('<option value="medium" selected>Medium</option>');
 const {get,socket}=await page();get('difficulty').value='expert';get('difficulty').change();
 expect(socket.send).toHaveBeenCalledWith(JSON.stringify({kind:'capture-options',seated:false,noPunch:false,difficulty:'expert'}));
 expect(socket.send.mock.calls.map(([raw])=>JSON.parse(raw)).some(value=>value.kind==='session')).toBe(false);
});

it('locks a new keyboard page until clear-space and explicit Resume, keeps the banner across ticks and focuses Resume on START',async()=>{
 const {get,socket}=await page();
 expect(get('input-lock').hidden).toBe(false);expect(get('input-lock').textContent).toContain('INPUTS LOCKED');expect(get('input-lock').textContent).toContain('My space is clear');
 get('start-match').click();expect(get('resume-input').focused).toBe(true);expect(socket.send.mock.calls.some(([raw])=>JSON.parse(raw).kind==='session')).toBe(false);
 get('clear-space').checked=true;get('clear-space').change();socket.tick(74000);
 expect(get('input-lock').hidden).toBe(false);expect(get('input-lock').textContent).toContain('press Resume inputs');get('start-match').click();
 expect(socket.send.mock.calls.some(([raw])=>JSON.parse(raw).kind==='session')).toBe(false);
 get('resume-input').click();expect(get('input-lock').hidden).toBe(true);expect(cameraHarness.starts).toBe(0);get('start-match').click();expect(socket.send).toHaveBeenCalledWith(JSON.stringify({kind:'session',action:'start'}));
 get('stop-input').click();expect(get('input-lock').hidden).toBe(false);expect(get('input-lock').textContent).toContain('Resume inputs');
});
it('server READY respects explicit local Resume and local STOP while allowing moderator pause/resume',async()=>{
 const {get,socket}=await page();get('clear-space').checked=true;get('clear-space').change();get('resume-input').click();expect(get('input-lock').hidden).toBe(true);
 const status=(stopped:boolean)=>socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'input-status',stopped,state:{source:'keyboard',guard:false,lean:null}})}));
 status(true);expect(get('input-lock').hidden).toBe(false);status(false);expect(get('input-lock').hidden).toBe(true);
 get('stop-input').click();socket.send.mockClear();status(false);expect(get('input-lock').hidden).toBe(false);expect(socket.send).toHaveBeenCalledExactlyOnceWith(JSON.stringify({kind:'control',action:'stop',by:'capture'}));socket.send.mockClear();get('start-match').click();expect(socket.send).not.toHaveBeenCalled();
 get('resume-input').click();expect(get('input-lock').hidden).toBe(true);
});

it('START requires a freshly framed pose even after Resume succeeded',async()=>{
 const {get,socket}=await page(storedProfile());get('clear-space').checked=true;get('clear-space').change();get('start-camera').click();await Promise.resolve();await Promise.resolve();
 cameraHarness.frame!({landmarks:guardFrame(),at:performance.now(),fps:30,inferenceMs:4});get('resume-input').click();expect(get('input-lock').hidden).toBe(true);
 cameraHarness.frame!({landmarks:[],at:performance.now(),fps:30,inferenceMs:4});socket.send.mockClear();get('start-match').click();
 expect(socket.send.mock.calls.some(([raw])=>JSON.parse(raw).kind==='session')).toBe(false);expect(get('input-lock').hidden).toBe(false);expect(get('input-lock').textContent).toContain('Head not detected');expect(get('resume-input').focused).toBe(true);
});

it('initial server READY cannot bypass the first explicit Resume',async()=>{
 const {get,socket}=await page();get('clear-space').checked=true;get('clear-space').change();
 socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'input-status',stopped:false,state:{source:'keyboard',guard:false,lean:null}})}));
 expect(get('input-lock').hidden).toBe(false);expect(socket.send).toHaveBeenCalledWith(JSON.stringify({kind:'control',action:'stop',by:'capture'}));socket.send.mockClear();
 socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'input-status',stopped:true,state:{source:'keyboard',guard:false,lean:null}})}));expect(socket.send).not.toHaveBeenCalled();
 get('start-match').click();expect(socket.send).not.toHaveBeenCalled();
});

const landmarkCases=([ [0,'Head'],[11,'Left shoulder'],[12,'Right shoulder'],[15,'Left wrist'],[16,'Right wrist'] ] as const)
 .flatMap(([index,name])=>[
  {name:`${name} left boundary`,index,patch:{x:-.001},message:`${name} leaves the left`},
  {name:`${name} right boundary`,index,patch:{x:1.001},message:`${name} leaves the right`},
  {name:`${name} top boundary`,index,patch:{y:-.001},message:`${name} leaves the top`},
  {name:`${name} bottom boundary`,index,patch:{y:1.001},message:`${name} leaves the bottom`},
  {name:`${name} visibility`,index,patch:{visibility:.499},message:`${name} visibility below 0.5`},
 ]);
for(const scenario of landmarkCases)it(`uses one matching blocker for status, banner and Resume: ${scenario.name}`,async()=>{
 const {get,socket}=await page(storedProfile());get('clear-space').checked=true;get('clear-space').change();get('start-camera').click();await Promise.resolve();await Promise.resolve();
 const frame=guardFrame();Object.assign(frame[scenario.index]!,scenario.patch);
 cameraHarness.frame!({landmarks:frame,at:performance.now(),fps:30,inferenceMs:4});socket.send.mockClear();get('resume-input').click();
 const message=get('camera-status').textContent;expect(message).toContain(scenario.message);
 expect(get('input-lock').textContent).toBe(`INPUTS LOCKED: ${message}`);expect(get('connection-status').textContent).toBe(message);
 expect(socket.send.mock.calls.some(([raw])=>JSON.parse(raw).action==='resume')).toBe(false);
});
for(const scenario of ['no camera','calibration','stale','seated'] as const)it(`uses one matching blocker for status, banner and Resume: ${scenario}`,async()=>{
 const clock=vi.spyOn(performance,'now').mockReturnValue(10000);
 try{
 const {get,socket}=await page(scenario==='calibration'?undefined:storedProfile());get('input-source').value='pose';get('input-source').change();get('clear-space').checked=true;get('clear-space').change();
 if(scenario!=='no camera'){get('start-camera').click();await Promise.resolve();await Promise.resolve();}
 if(scenario==='stale'||scenario==='seated'){
  if(scenario==='seated'){get('posture').value='seated';} // restored calibration already ready; test framing gate independently
  const frame=guardFrame();if(scenario==='seated'){frame[11]!.x=.35;frame[12]!.x=.65;}
  cameraHarness.frame!({landmarks:frame,at:10000,fps:30,inferenceMs:4});
 }
 if(scenario==='stale')clock.mockReturnValue(10500);
 socket.send.mockClear();get('resume-input').click();const message=get('camera-status').textContent;
 expect(message).toContain({'no camera':'No camera',calibration:'Calibration not ready',stale:'frames are 500 ms',seated:'Seated too close'}[scenario]);
 expect(get('input-lock').textContent).toBe(`INPUTS LOCKED: ${message}`);expect(get('connection-status').textContent).toBe(message);
 expect(socket.send.mock.calls.some(([raw])=>JSON.parse(raw).action==='resume')).toBe(false);
 }finally{clock.mockRestore();}
});

it('keeps a real recorded failing wrist frame sticky across a clear frame and refuses Resume with the same reason',async()=>{
 const clock=vi.spyOn(performance,'now').mockReturnValue(10000);
 try{
 const fixture=JSON.parse(readFileSync(new URL('../../test/fixtures/kash-guard-through-leans-logitech.landmarks.json',import.meta.url),'utf8')) as {frames:{t:number;lm:number[][]}[]};
 const convert=(lm:number[][])=>lm.map(([x,y,z,visibility])=>({x:x!,y:y!,z:z!,visibility:visibility!}));
 const good=fixture.frames.find(f=>[0,11,12,15,16].every(i=>{const p=f.lm[i]!;return p[0]!>=0&&p[0]!<=1&&p[1]!>=0&&p[1]!<=1&&p[3]!>=.5;}))!;
 const bad=fixture.frames.find(f=>f.lm[16]![1]!>1)!;
 expect(good).toBeDefined();expect(bad).toBeDefined();
 const {get,socket}=await page(storedProfile());get('clear-space').checked=true;get('clear-space').change();get('start-camera').click();await Promise.resolve();await Promise.resolve();
 cameraHarness.frame!({landmarks:convert(bad.lm),at:10000,fps:30,inferenceMs:4});const failure=get('camera-status').textContent;expect(failure).not.toContain('Calibration ready');
 clock.mockReturnValue(10500);cameraHarness.frame!({landmarks:convert(good.lm),at:10500,fps:30,inferenceMs:4});get('resume-input').click();
 expect(get('camera-status').textContent).toBe(failure);expect(get('connection-status').textContent).toBe(failure);expect(get('input-lock').textContent).toBe(`INPUTS LOCKED: ${failure}`);
 expect(socket.send.mock.calls.some(([raw])=>JSON.parse(raw).action==='resume')).toBe(false);
 clock.mockReturnValue(11000);cameraHarness.frame!({landmarks:convert(good.lm),at:11000,fps:30,inferenceMs:4});get('resume-input').click();expect(get('input-lock').hidden).toBe(true);
 expect(socket.send).toHaveBeenCalledWith(JSON.stringify({kind:'control',action:'resume',by:'capture'}));
 }finally{clock.mockRestore();}
});

for(const scenario of ['clear space','connection','benchmark'] as const)it(`matches shared input blocker in pose status, banner and Resume: ${scenario}`,async()=>{
 const {get,socket}=await page(storedProfile());
 if(scenario!=='clear space'){get('clear-space').checked=true;get('clear-space').change();}
 if(scenario==='connection')socket.readyState=0;
 if(scenario==='benchmark')get('benchmark-camera').click();
 get('resume-input').click();const message=get('camera-status').textContent;
 expect(message).toContain({'clear space':'My space is clear',connection:'connect to the local server',benchmark:'camera comparison'}[scenario]);
 expect(get('input-lock').textContent).toBe(`INPUTS LOCKED: ${message}`);expect(get('connection-status').textContent).toBe(message);
 expect(socket.send.mock.calls.some(([raw])=>JSON.parse(raw).action==='resume')).toBe(false);
 if(scenario==='benchmark'){get('stop-camera').click();await Promise.resolve();await Promise.resolve();}
});
