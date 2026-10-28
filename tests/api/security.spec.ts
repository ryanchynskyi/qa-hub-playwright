import { bearer } from '../../src/api/client';
import { env } from '../../src/config/env';
import { expect, test } from '../../src/fixtures';

test(
  'a write from another origin is 403 bad_origin, from the app itself it passes',
  { tag: ['@REQ-NFR-01'] },
  async ({ api, user }) => {
    const login = (origin: string) =>
      api.raw.post('auth/login', { data: user, headers: { origin } });

    const foreign = await login('https://evil.example');
    expect(foreign.status()).toBe(403);
    expect(await foreign.json()).toMatchObject({ error: 'bad_origin' });
    expect((await login(new URL(env.baseURL).origin)).status()).toBe(200);
  },
);

// Every owner-only endpoint ($APP_DIR/apps/api/src/routes). The guard runs before the body and the
// ids are read, so placeholders are enough.
const adminEndpoints = [
  ['GET', 'admin/stats'],
  ['GET', 'admin/chat/bans'],
  ['POST', 'admin/chat/ban'],
  ['POST', 'admin/chat/unban'],
  ['GET', 'admin/bug-reports'],
  ['GET', 'admin/bug-reports/1/images/1'],
  ['PATCH', 'admin/bug-reports/1'],
  ['GET', 'admin/feedback'],
  ['GET', 'admin/feedback/1/images/1'],
  ['PATCH', 'admin/feedback/1'],
  ['PUT', 'admin/feedback/1/reply'],
  ['GET', 'admin/question-ratings'],
] as const;

test(
  'admin endpoints: 401 for a guest, 403 for a regular account',
  { tag: ['@REQ-ADM-03'] },
  async ({ api, user }) => {
    for (const [method, path] of adminEndpoints) {
      const call = (token?: string) =>
        api.raw.fetch(path, { method, headers: bearer(token), data: {} });
      expect.soft((await call()).status(), `${method} ${path} as a guest`).toBe(401);
      const asUser = await call(user.token);
      expect.soft(asUser.status(), `${method} ${path} as a user`).toBe(403);
      // Text, not json(): a non-JSON body fails this endpoint instead of the whole loop.
      expect.soft(await asUser.text(), `${method} ${path} body`).toContain('"error":"forbidden"');
    }
  },
);
