import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';

// Exercise the page's actual handlers without a camera, Twitch, or browser runtime.
vi.mock('./camera',()=>({PoseCamera:class {stop() {}}}));
class Element extends EventTarget {
  textContent=''; hidden=false; checked=false; disabled=false; value='';
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
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
async function page() {
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(match=>[match[1]!,new Element()]));
  const get=(id:string)=>{const node=elements.get(id);if(!node)throw new Error(`Missing page element ${id}`);return node;};
  get('input-source').value='keyboard';get('posture').value='standing';
  const sockets:Socket[]=[];
  vi.stubGlobal('document',{getElementById:get});
  vi.stubGlobal('window',Object.assign(new EventTarget(),{setInterval:vi.fn(),clearInterval:vi.fn(),setTimeout:vi.fn()}));
  vi.stubGlobal('location',{hostname:'localhost'});
  vi.stubGlobal('WebSocket',class extends Socket {constructor(){super();sockets.push(this);}});
  await import('./main');
  return {get,socket:sockets[0]!};
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
  get('start-match').click();
  expect(socket.send).toHaveBeenCalledWith(JSON.stringify({kind:'session',action:'start'}));
});
it('keeps connection and calibration warnings separate from server game status too',async()=>{
  const {get,socket}=await page();
  get('clear-space').checked=true;get('clear-space').change();
  socket.readyState=0;get('start-match').click();socket.tick();
  expect(get('session-warning').textContent).toBe('Connect to the local server first.');
  expect(get('session-warning').hidden).toBe(false);
  get('resume-input').click();
  expect(get('session-warning').textContent).toBe('Connect to the local server first.');
  socket.readyState=1;get('input-source').value='pose';get('input-source').change();
  socket.send.mockClear();get('next-round').click();socket.tick();
  expect(get('session-warning').textContent).toContain('Finish webcam calibration');
  expect(get('session-warning').hidden).toBe(false);
  expect(socket.send).not.toHaveBeenCalled();
});
