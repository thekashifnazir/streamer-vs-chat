import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
/** Rendered assertions for an approved/manual browser. No production routes or dependencies. */
export const browserAuditPage=`<!doctype html><meta charset="utf-8"><title>Streamer vs Chat mobile audit</title>
<style>body{font:16px system-ui;background:#eee;color:#111}iframe{width:390px;height:844px;border:1px solid #888}pre{white-space:pre-wrap}</style>
<h1>390 × 844 rendered camera audit</h1><p>Local fixtures only. No camera is opened and Twitch connections are blocked by this server.</p><button id="run">Run both pages</button><pre id="result">Ready</pre><div id="frames"></div>
<script>
const check=(value,message)=>{if(!value)throw new Error(message);};
async function audit(path){
 const frame=document.createElement('iframe');frame.width='390';frame.height='844';frame.src=path;document.getElementById('frames').append(frame);
 await new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=reject;});
 const win=frame.contentWindow,doc=win.document;await doc.fonts.ready;await new Promise(resolve=>setTimeout(resolve,150));
 check(win.innerWidth===390&&win.innerHeight===844,'Incorrect iframe viewport');
 const resources=win.performance.getEntriesByType('resource'),navigation=win.performance.getEntriesByType('navigation')[0];
 check(!resources.some(entry=>/\\.(mp3|m4a|wav|ogg)(?:$|\\?)/i.test(entry.name)),'Audio fetched before interaction');
 const firstLoadBytes={encoded:(navigation?.encodedBodySize||0)+resources.reduce((sum,e)=>sum+e.encodedBodySize,0),decoded:(navigation?.decodedBodySize||0)+resources.reduce((sum,e)=>sum+e.decodedBodySize,0),requests:resources.length,cacheHits:resources.filter(e=>e.transferSize===0&&e.decodedBodySize>0).length};
 const plain=doc.querySelector('[data-id=plain]'),plainBox=plain.getBoundingClientRect();check(plainBox.width>=23.99&&plainBox.height>=23.99,'Plain checkbox is below 24 CSS pixels');
 const space=doc.getElementById('clear-space');space.checked=true;space.dispatchEvent(new win.Event('change'));
 const source=doc.getElementById('input-source');source.value='pose';source.dispatchEvent(new win.Event('change'));doc.getElementById('open-webcam').click();
 const button=doc.getElementById('start-camera');button.scrollIntoView({block:'center'});await new Promise(resolve=>win.requestAnimationFrame(()=>win.requestAnimationFrame(resolve)));
 const box=button.getBoundingClientRect(),top=doc.elementFromPoint(box.left+box.width/2,box.top+box.height/2);
 check(!button.disabled,'Camera safety check did not enable button');check(top===button||button.contains(top),'Turn on camera is covered at its centre');
 const caption=doc.querySelector('.webcam-instructions');check(!doc.getElementById('webcam-preview').contains(caption),'Caption still overlays preview');
 return {path,viewport:[win.innerWidth,win.innerHeight],topmost:top.id,button:{width:box.width,height:box.height},plain:{width:plainBox.width,height:plainBox.height},firstLoadBytes};
}
document.getElementById('run').onclick=async()=>{const out=document.getElementById('result');document.getElementById('frames').replaceChildren();out.textContent='Running…';try{const results=[];for(const path of ['/','/play/'])results.push(await audit(path));out.textContent='PASS '+JSON.stringify(results,null,2);await fetch('/__audit/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pass:true,results})});}catch(error){out.textContent='FAIL '+error.message;await fetch('/__audit/result',{method:'POST',body:JSON.stringify({pass:false,reason:error.message})});}};
</script>`;
export function startBrowserUiAudit(directory=resolve('dist-demo')){
 const server=createServer(async(req,res)=>{
  const url=new URL(req.url??'/', 'http://127.0.0.1');
  if(url.pathname==='/__audit/result'&&req.method==='POST'){let body='';for await(const part of req){body+=part;if(body.length>16384){res.writeHead(413).end();return;}}console.log(body);res.writeHead(204).end();return;}
  if(url.pathname==='/__audit'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'}).end(browserAuditPage);return;}
  if(url.pathname.startsWith('/api/')){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end('{"bot":false,"clips":false,"forge":false,"memory":false}');return;}
  let target:string;try{target=resolve(directory,'.'+decodeURIComponent(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));}catch{res.writeHead(400).end();return;}
  if(!target.startsWith(directory+sep)){res.writeHead(403).end();return;}
  try{const data=await readFile(target);const mime:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.mp3':'audio/mpeg','.woff2':'font/woff2','.wasm':'application/wasm'};res.writeHead(200,{'Content-Type':mime[extname(target)]??'application/octet-stream','Cache-Control':'no-store','Content-Security-Policy':"connect-src 'self'"}).end(data);}catch{res.writeHead(404).end();}
 });
 server.listen(0,'127.0.0.1',()=>console.log('Open an approved browser at http://127.0.0.1:'+String((server.address() as {port:number}).port)+'/__audit'));
 const stop=()=>{server.closeAllConnections();server.close();};process.once('SIGINT',stop);process.once('SIGTERM',stop);server.once('close',()=>{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);});return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)startBrowserUiAudit();
