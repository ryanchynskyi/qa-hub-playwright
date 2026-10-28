import type { APIRequestContext } from '@playwright/test';
import { bearer, type ApiClient } from '../../src/api/client';
import { AuthResponse } from '../../src/api/schemas';
import { env } from '../../src/config/env';
import { expect, test } from '../../src/fixtures';

// Refresh tokens travel in the body ("remember me"): the cookie would win over it, so each call
// gets a new cookie-less context and the test controls exactly which token is presented.
type NewContext = () => Promise<APIRequestContext>;

async function call(newContext: NewContext, path: string, data: object) {
  const request = await newContext();
  try {
    const res = await request.post(path, { data });
    return { status: res.status(), body: res.ok() ? AuthResponse.parse(await res.json()) : null };
  } finally {
    await request.dispose();
  }
}

async function rememberedLogin(newContext: NewContext, email: string, password: string) {
  const { status, body } = await call(newContext, 'auth/login', {
    email,
    password,
    remember: true,
  });
  expect(status).toBe(200);
  return { access: body!.accessToken, refresh: body!.refreshToken! };
}

/**
 * Access tokens are stateless and outlive a revoked session by up to 15 minutes (`/auth/me` still
 * answers); only sensitive routes check the session. A wrong current password on one of them tells
 * a live session (invalid_credentials) from an ended one (unauthorized), and changes nothing.
 */
async function sessionIsLive(api: ApiClient, accessToken: string): Promise<boolean> {
  const res = await api.raw.post('me/password', {
    data: { currentPassword: 'not-the-password', newPassword: 'unused-password' },
    headers: bearer(accessToken),
  });
  expect(res.status()).toBe(401);
  const { error } = (await res.json()) as { error: string };
  expect(['invalid_credentials', 'unauthorized']).toContain(error);
  return error === 'invalid_credentials';
}

test.describe('sessions', () => {
  let newContext: NewContext;

  test.beforeEach(({ playwright }) => {
    newContext = () => playwright.request.newContext({ baseURL: env.apiURL });
  });

  test(
    'email is case-insensitive for login and for the duplicate check',
    { tag: ['@REQ-AUTH-02'] },
    async ({ api, user }) => {
      const upper = user.email.toUpperCase();
      const { user: profile } = await api.login({ email: upper, password: user.password });
      expect(profile.email).toBe(user.email);

      const res = await api.raw.post('auth/register', {
        data: { email: upper, password: user.password, timeZone: 'Europe/Kyiv' },
      });
      expect(res.status()).toBe(409);
    },
  );

  test(
    'refresh rotates the token; replaying the old one after the 30 s grace ends the family',
    { tag: ['@REQ-AUTH-07', '@slow'] },
    async ({ api, user }) => {
      test.slow();
      const first = await rememberedLogin(newContext, user.email, user.password);

      const rotated = await call(newContext, 'auth/refresh', { refreshToken: first.refresh });
      expect(rotated.status).toBe(200);
      const second = rotated.body!.refreshToken!;
      expect(second).not.toBe(first.refresh);
      // Within the grace a replay is a benign race (two tabs), not theft.
      expect((await call(newContext, 'auth/refresh', { refreshToken: first.refresh })).status).toBe(
        200,
      );

      // Business rule, not a wait for the app: the replay grace is 30 s, plus 1 s margin.
      await new Promise((resolve) => setTimeout(resolve, 31_000));
      expect((await call(newContext, 'auth/refresh', { refreshToken: first.refresh })).status).toBe(
        401,
      );
      // Theft assumed: the successor and the family's session are dead too.
      expect((await call(newContext, 'auth/refresh', { refreshToken: second })).status).toBe(401);
      expect(await sessionIsLive(api, first.access)).toBe(false);
    },
  );

  test(
    'a password change ends the other sessions and retires the old password',
    { tag: ['@REQ-AUTH-16'] },
    async ({ api, user }) => {
      const other = await rememberedLogin(newContext, user.email, user.password);
      const newPassword = `${user.password}-new`;

      await api.changePassword(user.token, user.password, newPassword);
      // The fixture cleans up with the old password, which no longer works.
      try {
        expect(
          (await call(newContext, 'auth/refresh', { refreshToken: other.refresh })).status,
        ).toBe(401);
        expect(await sessionIsLive(api, other.access)).toBe(false);
        // The session that changed the password stays.
        expect(await sessionIsLive(api, user.token)).toBe(true);

        const old = await api.raw.post('auth/login', { data: user });
        expect(old.status()).toBe(401);
        await api.login({ email: user.email, password: newPassword });
      } finally {
        await api.deleteAccount(user.token, user.email);
      }
    },
  );
});
