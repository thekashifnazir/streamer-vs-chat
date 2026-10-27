import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, rename, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { RefreshingAuthProvider, exchangeCode, type AccessToken } from '@twurple/auth';

export const REDIRECT_URI = 'http://localhost:3000/callback';
export const ACCOUNT_SCOPES = {
  bot: ['user:read:chat', 'user:write:chat', 'user:bot'],
  broadcaster: ['channel:bot', 'clips:edit'],
} as const;
type Role = keyof typeof ACCOUNT_SCOPES;
type Account = { userId: string; token: AccessToken };
type TokenFile = { clientId: string; bot?: Account; broadcaster?: Account };
export type TwitchAccounts = { botId: string; broadcasterId: string };
const TOKEN_PATH = fileURLToPath(new URL('../../tokens.json', import.meta.url));

/** Live-only. The mock entry path must never construct this controller. */
export async function createAuth(options: {
  onReady: (provider: RefreshingAuthProvider, accounts: TwitchAccounts) => Promise<void> | void;
}) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const provider = clientId && clientSecret
    ? new RefreshingAuthProvider({ clientId, clientSecret, redirectUri: REDIRECT_URI })
    : undefined;
  let tokens: TokenFile = { clientId: clientId ?? '' };
  let writes = Promise.resolve();
  const pending = new Map<string, { role: Role; expires: number }>();

  function persist() {
    const contents = JSON.stringify(tokens, null, 2) + '\n';
    // Serialize atomic writes: refreshes for both users may arrive together.
    writes = writes.catch(() => {}).then(async () => {
      await writeFile(`${TOKEN_PATH}.tmp`, contents, { mode: 0o600 });
      await chmod(`${TOKEN_PATH}.tmp`, 0o600);
      await rename(`${TOKEN_PATH}.tmp`, TOKEN_PATH);
    });
    return writes;
  }
  async function ready() {
    if (provider && tokens.bot && tokens.broadcaster) {
      await options.onReady(provider, {
        botId: tokens.bot.userId,
        broadcasterId: tokens.broadcaster.userId,
      });
    }
  }
  if (provider) {
    provider.onRefresh(async (userId, token) => {
      for (const role of ['bot', 'broadcaster'] as const) {
        if (tokens[role]?.userId === userId) tokens[role] = { userId, token };
      }
      try { await persist(); }
      catch { console.error('[auth] Could not persist refreshed tokens; check tokens.json permissions.'); }
    });
    provider.onRefreshFailure((userId) => {
      console.error(`[auth] Refresh failed for user ${userId}; log in again at http://localhost:3000/auth`);
    });
    try {
      const saved = JSON.parse(await readFile(TOKEN_PATH, 'utf8')) as TokenFile;
      if (saved.clientId !== clientId) throw new Error('tokens.json belongs to another Twitch application');
      for (const role of ['bot', 'broadcaster'] as const) {
        const account = saved[role];
        if (!account) continue;
        if (!account.userId || !account.token?.refreshToken ||
            !ACCOUNT_SCOPES[role].every(scope => account.token.scope?.includes(scope))) {
          throw new Error(`Stored ${role} token is missing identity, refresh token or required scopes; log in again`);
        }
        provider.addUser(account.userId, account.token, [role]);
      }
      if (saved.bot && saved.broadcaster && saved.bot.userId === saved.broadcaster.userId) {
        throw new Error('The bot and broadcaster must be different Twitch accounts');
      }
      tokens = saved;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await ready();
  }

  function reply(res: ServerResponse, status: number, text: string) {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    res.end(text);
  }
  async function handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? '/', 'http://localhost:3000');
    if (!['/auth', '/auth/bot', '/auth/broadcaster', '/callback'].includes(url.pathname)) return false;
    if (req.method !== 'GET') { reply(res, 405, 'Use GET for Twitch login.'); return true; }
    if (!provider || !clientId || !clientSecret) {
      reply(res, 503, 'Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in .env, then restart. Register http://localhost:3000/callback as the redirect URI.');
      return true;
    }
    if (url.pathname === '/auth') {
      reply(res, 200, '<h1>Streamer vs Chat — Twitch login</h1><p>Use two different Twitch accounts. Confirm the account shown by Twitch on each login.</p><ol><li><a href="/auth/bot">Authorize bot</a></li><li><a href="/auth/broadcaster">Authorize broadcaster</a></li></ol>');
      return true;
    }
    if (url.pathname.startsWith('/auth/')) {
      const role = url.pathname.split('/')[2] as Role;
      const state = randomBytes(32).toString('hex');
      for (const [key, item] of pending) if (item.expires < Date.now()) pending.delete(key);
      pending.set(state, { role, expires: Date.now() + 10 * 60_000 });
      const target = new URL('https://id.twitch.tv/oauth2/authorize');
      target.search = new URLSearchParams({ client_id: clientId, redirect_uri: REDIRECT_URI,
        response_type: 'code', scope: ACCOUNT_SCOPES[role].join(' '), state, force_verify: 'true' }).toString();
      res.writeHead(302, { Location: target.toString(), 'Cache-Control': 'no-store',
        'Set-Cookie': `twitch_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/callback; Max-Age=600` });
      res.end();
      return true;
    }
    const state = url.searchParams.get('state') ?? '';
    const cookie = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('twitch_oauth_state='))?.slice('twitch_oauth_state='.length) ?? '';
    const attempt = pending.get(state);
    const stateBytes = Buffer.from(state);
    const cookieBytes = Buffer.from(cookie);
    if (!attempt || attempt.expires < Date.now() || cookieBytes.length !== stateBytes.length ||
        !timingSafeEqual(cookieBytes, stateBytes)) {
      reply(res, 400, 'Invalid or expired login state. Start again at /auth.');
      return true;
    }
    pending.delete(state);
    res.setHeader('Set-Cookie', 'twitch_oauth_state=; HttpOnly; SameSite=Lax; Path=/callback; Max-Age=0');
    const code = url.searchParams.get('code');
    if (!code || url.searchParams.has('error')) {
      reply(res, 400, 'Twitch login was cancelled. Start again at /auth.');
      return true;
    }
    try {
      const token = await exchangeCode(clientId, clientSecret, code, REDIRECT_URI);
      if (!ACCOUNT_SCOPES[attempt.role].every(scope => token.scope.includes(scope))) {
        throw new Error('Required scopes were not granted');
      }
      // Resolve identity before changing either registered account.
      const { getTokenInfo } = await import('@twurple/auth');
      const info = await getTokenInfo(token.accessToken, clientId);
      if (!info.userId) throw new Error('Expected a user token');
      const other = attempt.role === 'bot' ? 'broadcaster' : 'bot';
      if (tokens[other]?.userId === info.userId) throw new Error('Use two different accounts');
      tokens[attempt.role] = { userId: info.userId, token };
      provider.addUser(info.userId, token, [attempt.role]);
      await persist();
      await ready();
      reply(res, 200, `<p>${attempt.role} authorized.</p><a href="/auth">Continue account setup</a>`);
    } catch {
      // OAuth errors can contain request details; never print codes or tokens.
      console.error('[auth] Login failed. Verify the account, app credentials and callback URI, then try again.');
      reply(res, 400, 'Login failed. Check that these are two different accounts and all requested scopes were granted, then retry at /auth.');
    }
    return true;
  }
  return { handle, close: () => writes };
}
