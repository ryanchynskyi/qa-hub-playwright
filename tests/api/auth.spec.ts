import { bearer } from '../../src/api/client';
import { expect, test } from '../../src/fixtures';
import { DEFAULT_PASSWORD, uniqueEmail } from '../../src/helpers/data';

test.describe('auth API', () => {
  test(
    'a registered user can log in and read their profile',
    { tag: ['@REQ-AUTH-02'] },
    async ({ api, user }) => {
      const { accessToken, user: profile } = await api.login(user);
      expect(profile.email).toBe(user.email);
      expect(await api.me(accessToken)).toEqual(profile);
    },
  );

  test(
    'registration sets the httpOnly refresh cookie',
    { tag: ['@REQ-NFR-01'] },
    async ({ api, newCredentials }) => {
      const res = await api.raw.post('auth/register', {
        data: { ...newCredentials, timeZone: 'Europe/Kyiv' },
      });
      expect(res.status()).toBe(201);
      const cookie = res.headersArray().find((h) => h.name.toLowerCase() === 'set-cookie');
      expect(cookie?.value).toMatch(/^qa_rt=/);
      expect(cookie?.value).toMatch(/HttpOnly/i);
    },
  );

  test('a duplicate email is 409 email_taken', { tag: ['@REQ-AUTH-01'] }, async ({ api, user }) => {
    const res = await api.raw.post('auth/register', {
      data: { email: user.email, password: DEFAULT_PASSWORD, timeZone: 'Europe/Kyiv' },
    });
    expect(res.status()).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'email_taken' });
  });

  const badLogins = [
    { name: 'a wrong password', password: 'not-the-password' },
    { name: 'an unknown email', email: uniqueEmail('nobody') },
  ];
  for (const { name, ...override } of badLogins) {
    test(`${name} is 401 invalid_credentials`, { tag: ['@REQ-AUTH-02'] }, async ({ api, user }) => {
      const res = await api.raw.post('auth/login', {
        data: { email: user.email, password: user.password, ...override },
      });
      expect(res.status()).toBe(401);
      // Same code for both cases: the API does not reveal which emails exist.
      expect(await res.json()).toMatchObject({ error: 'invalid_credentials' });
    });
  }

  test(
    'a password shorter than 8 characters is rejected',
    { tag: ['@REQ-AUTH-01'] },
    async ({ api, newCredentials }) => {
      const res = await api.raw.post('auth/register', {
        data: { email: newCredentials.email, password: 'short', timeZone: 'Europe/Kyiv' },
      });
      expect(res.status()).toBe(400);
    },
  );

  test('protected endpoints need a valid token', async ({ api }) => {
    expect((await api.raw.get('auth/me')).status()).toBe(401);
    expect((await api.raw.get('auth/me', { headers: bearer('not-a-jwt') })).status()).toBe(401);
  });

  test(
    'a deleted account can no longer log in',
    { tag: ['@REQ-AUTH-18'] },
    async ({ api, user }) => {
      await api.deleteAccount(user.token, user.email);
      const res = await api.raw.post('auth/login', { data: user });
      expect(res.status()).toBe(401);
    },
  );

  test(
    'deleting with a wrong confirm email is 400 confirm_mismatch and keeps the account',
    { tag: ['@REQ-AUTH-18'] },
    async ({ api, user }) => {
      const res = await api.raw.delete('me', {
        headers: bearer(user.token),
        data: { confirmEmail: uniqueEmail('other') },
      });
      expect(res.status()).toBe(400);
      expect(await res.json()).toMatchObject({ error: 'confirm_mismatch' });
      expect(await api.me(user.token)).toMatchObject({ email: user.email });
      expect((await api.raw.post('auth/login', { data: user })).status()).toBe(200);
    },
  );
});
