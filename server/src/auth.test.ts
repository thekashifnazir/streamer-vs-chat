import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createAuth, ACCOUNT_SCOPES, REDIRECT_URI } from './auth.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' })),
  writeFile: vi.fn(), rename: vi.fn(), chmod: vi.fn(),
}));
vi.mock('@twurple/auth', () => ({
  RefreshingAuthProvider: class { onRefresh() {} onRefreshFailure() {} },
  exchangeCode: vi.fn(),
}));

function response() {
  const result = { status: 0, headers: {} as Record<string, string>, body: '' };
  const res = {
    writeHead(status: number, headers: Record<string, string>) { result.status = status; Object.assign(result.headers, headers); },
    setHeader(name: string, value: string) { result.headers[name] = value; },
    end(body = '') { result.body = body; },
  } as unknown as ServerResponse;
  return { result, res };
}

afterEach(() => vi.unstubAllEnvs());
describe('two-account Authorization Code login', () => {
  it('serves setup instructions without credentials or network', async () => {
    vi.stubEnv('TWITCH_CLIENT_ID', ''); vi.stubEnv('TWITCH_CLIENT_SECRET', '');
    const auth = await createAuth({ onReady: vi.fn() });
    const { result, res } = response();
    await auth.handle({ url: '/auth/bot', method: 'GET', headers: {} } as IncomingMessage, res);
    expect(result.status).toBe(503);
    expect(result.body).toContain('TWITCH_CLIENT_ID');
  });
  it('redirects each account with exactly its Day 1 scopes, state and callback', async () => {
    vi.stubEnv('TWITCH_CLIENT_ID', 'test-client'); vi.stubEnv('TWITCH_CLIENT_SECRET', 'test-secret');
    const auth = await createAuth({ onReady: vi.fn() });
    for (const role of ['bot', 'broadcaster'] as const) {
      const { result, res } = response();
      expect(await auth.handle({ url: `/auth/${role}`, method: 'GET', headers: {} } as IncomingMessage, res)).toBe(true);
      expect(result.status).toBe(302);
      const target = new URL(result.headers.Location!);
      expect(target.origin).toBe('https://id.twitch.tv');
      expect(target.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
      expect(target.searchParams.get('response_type')).toBe('code');
      expect(target.searchParams.get('scope')).toBe(ACCOUNT_SCOPES[role].join(' '));
      expect(target.searchParams.get('state')).toMatch(/^[a-f0-9]{64}$/);
      expect(result.headers['Set-Cookie']).toContain('HttpOnly; SameSite=Lax');
      expect(result.headers.Location).not.toContain('test-secret');
    }
  });
  it('rejects callbacks without browser-bound state before exchanging codes', async () => {
    vi.stubEnv('TWITCH_CLIENT_ID', 'test-client'); vi.stubEnv('TWITCH_CLIENT_SECRET', 'test-secret');
    const auth = await createAuth({ onReady: vi.fn() });
    const { result, res } = response();
    await auth.handle({ url: '/callback?code=untrusted&state=unknown', method: 'GET', headers: {} } as IncomingMessage, res);
    expect(result.status).toBe(400);
    const { exchangeCode } = await import('@twurple/auth');
    expect(exchangeCode).not.toHaveBeenCalled();
  });
});
