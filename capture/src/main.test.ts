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
  expect(get('session-warning').textContent).toBe('Connect to the local server first.');
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
 get('clear-space').checked=true;get('clear-space').change();get('resume-input').click();expect(get('connection-status').textContent).toContain('Start camera');expect(get('input-lock').textContent).toContain('start the camera');
 expect(socket.send.mock.calls.map(([raw])=>JSON.parse(raw)).some(value=>value.kind==='control'&&value.action==='resume')).toBe(false);
 get('start-camera').click();await Promise.resolve();await Promise.resolve();expect(cameraHarness.starts).toBe(1);get('resume-input').click();expect(get('connection-status').textContent).toContain('Start camera');expect(get('input-lock').textContent).toContain('keep head, shoulders and wrists in frame');
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
 const{get,socket}=await page(storedProfile());get('clear-space').checked=true;get('clear-space').change();socket.readyState=0;get('resume-input').click();expect(get('connection-status').textContent).toContain('Connect to the local server');socket.readyState=1;socket.dispatchEvent(new Event('open'));
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
 expect(socket.send.mock.calls.some(([raw])=>JSON.parse(raw).kind==='session')).toBe(false);expect(get('input-lock').hidden).toBe(false);expect(get('input-lock').textContent).toContain('keep head, shoulders and wrists in frame');expect(get('resume-input').focused).toBe(true);
});

it('initial server READY cannot bypass the first explicit Resume',async()=>{
 const {get,socket}=await page();get('clear-space').checked=true;get('clear-space').change();
 socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'input-status',stopped:false,state:{source:'keyboard',guard:false,lean:null}})}));
 expect(get('input-lock').hidden).toBe(false);expect(socket.send).toHaveBeenCalledWith(JSON.stringify({kind:'control',action:'stop',by:'capture'}));socket.send.mockClear();
 socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'input-status',stopped:true,state:{source:'keyboard',guard:false,lean:null}})}));expect(socket.send).not.toHaveBeenCalled();
 get('start-match').click();expect(socket.send).not.toHaveBeenCalled();
});
