import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import type { AddressInfo } from 'node:net';
import { createServer as createHttpServer, type Server } from 'node:http';
import { once } from 'node:events';
import config from '../vite.config';

let server: ViteDevServer;
let base: string;
let http: Server;
beforeAll(async () => {
  server = await createServer({
    ...config, configFile: false,
    server: { ...config.server, middlewareMode: true, hmr: false, watch: null },
  });
  http = createHttpServer(server.middlewares);
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});
afterAll(async () => {
  await server?.close();
  if (http?.listening) await new Promise<void>((resolve, reject) => http.close(error => error ? reject(error) : resolve()));
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
