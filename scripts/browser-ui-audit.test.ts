import {once} from 'node:events';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect,it} from 'vitest';
import {browserAuditPage,startBrowserUiAudit} from './browser-ui-audit';
it('serves an isolated opt-in rendered audit with external Twitch connections blocked',async()=>{
 const root=await mkdtemp(join(tmpdir(),'svc-browser-ui-'));await writeFile(join(root,'index.html'),'<p>Local fixture</p>');const server=startBrowserUiAudit(root);
 try{
  await once(server,'listening');const base='http://127.0.0.1:'+(server.address() as {port:number}).port;
  const page=await fetch(base+'/__audit');expect(await page.text()).toBe(browserAuditPage);
  const fixture=await fetch(base+'/');expect(fixture.headers.get('Content-Security-Policy')).toBe("connect-src 'self'");expect(fixture.headers.get('Cache-Control')).toBe('no-store');
  expect(await(await fetch(base+'/api/health')).json()).toEqual({bot:false,clips:false,forge:false,memory:false});expect((await fetch(base+'/%E0%A4%A')).status).toBe(400);
  // Compile the browser assertion code; execution/geometry requires an approved browser.
  expect(()=>new Function(browserAuditPage.split('<script>')[1]!.split('</script>')[0]!)).not.toThrow();expect(browserAuditPage).toContain("frame.width='390';frame.height='844'");expect(browserAuditPage).toContain('elementFromPoint(box.left+box.width/2,box.top+box.height/2)');
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(root,{recursive:true,force:true});}
});
