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

it.each(['/overlay', '/capture'])('redirects %s and serves the page', async path => {
  const response = await fetch(`${base}${path}`, { redirect: 'manual' });
  expect(response.status).toBe(302);
  expect(response.headers.get('location')).toBe(`${path}/`);
  const page = await fetch(`${base}${path}`);
  expect(page.status).toBe(200);
  expect(page.url).toBe(`${base}${path}/`);
  expect(await page.text()).toContain('<!doctype html>');
});
it.each(['/overlay', '/capture'])('preserves query parameters when redirecting %s', async path => {
  const response = await fetch(`${base}${path}?mode=obs`, { redirect: 'manual' });
  expect(response.status).toBe(302);
  expect(response.headers.get('location')).toBe(`${path}/?mode=obs`);
});
