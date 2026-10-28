import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import type { AddressInfo } from 'node:net';
import { createServer as createHttpServer, type Server } from 'node:http';
import { once } from 'node:events';
import config from '../vite.config';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {boundedTeardown} from './test-teardown';

let server: ViteDevServer;
let base: string;
let http: Server;
let cacheDir:string;
beforeAll(async () => {
  cacheDir=await mkdtemp(join(tmpdir(),'svc-route-cold-'));
  server = await createServer({
    ...config, configFile: false,cacheDir,
    // HTTP route tests never execute the page JS. Fresh-cache background warmups
    // otherwise wait on dependency transforms while middleware close awaits them.
    optimizeDeps:{noDiscovery:true,include:[]},
    server: { ...config.server, middlewareMode: true, hmr: false, watch: null, preTransformRequests:false },
  });
  http = createHttpServer(server.middlewares);
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});
afterAll(async () => {
  // Undici keeps fetch sockets alive, including redirect responses without bodies.
  // Stop accepting requests and terminate those sockets before Vite cleanup.
  try {
    if (http?.listening) {
      const closed = new Promise<void>((resolve, reject) => http.close(error => error ? reject(error) : resolve()));
      http.closeAllConnections();
      await boundedTeardown('HTTP listener',()=>closed,200);
    }
  } finally {
    try{if(server)await boundedTeardown('Vite middleware server.close()',()=>server.close());}
    finally{if(cacheDir)await rm(cacheDir,{recursive:true,force:true});}
  }
});

it.each(['/overlay', '/capture', '/play'])('redirects %s and serves the page', async path => {
  const response = await fetch(`${base}${path}`, { redirect: 'manual' });
  expect(response.status).toBe(302);
  expect(response.headers.get('location')).toBe(`${path}/`);
  const page = await fetch(`${base}${path}`);
  expect(page.status).toBe(200);
  expect(page.url).toBe(`${base}${path}/`);
  expect(await page.text()).toContain('<!doctype html>');
});
it.each(['/overlay', '/capture', '/play'])('preserves query parameters when redirecting %s', async path => {
  const response = await fetch(`${base}${path}?mode=obs`, { redirect: 'manual' });
  expect(response.status).toBe(302);
  expect(response.headers.get('location')).toBe(`${path}/?mode=obs`);
});
it('serves root OAuth callback page without dropping query or hash handling entry',async()=>{
  const response=await fetch(`${base}/?code=callback`);
  expect(response.status).toBe(200);
  expect(await response.text()).toContain('/src/entry.ts');
});
it.each([
  ['/assets/pose/vision_wasm_internal.js','application/javascript'],
  ['/assets/pose/vision_wasm_internal.wasm','application/wasm'],
  ['/assets/pose/pose_landmarker_lite.task','application/octet-stream'],
])('serves local runtime file %s in development',async(path,mime)=>{
  const response=await fetch(`${base}${path}`);
  expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe(mime);
  expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(1000);
});
