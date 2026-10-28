import { createHash, randomBytes } from 'node:crypto';
import { expect, type APIRequestContext } from '@playwright/test';
import { expectStatus } from '../api/client';
import { AuthResponse } from '../api/schemas';
import { env } from '../config/env';

/** A nonce the way the app makes it: the browser keeps the nonce, the API gets its hash. */
export function newNonce(): { nonce: string; nonceHash: string } {
  const nonce = randomBytes(16).toString('hex');
  return { nonce, nonceHash: createHash('sha256').update(nonce).digest('hex') };
}

/**
 * Google sign-in up to the login code, without the UI, through the fake consent screen of the
 * e2e API ($APP_DIR/apps/api/scripts/e2e-server.ts). The code is bound to `nonceHash`.
 */
export async function googleCode(
  request: APIRequestContext,
  email: string,
  nonceHash: string,
): Promise<string> {
  // Each step is a 302; following them by hand keeps the last one, which carries the code.
  const redirect = async (url: string): Promise<string> => {
    const res = await request.get(url, { maxRedirects: 0 });
    await expectStatus(res, 302);
    return res.headers().location!;
  };
  const chooser = await redirect(`${env.apiURL}auth/google?nonceHash=${nonceHash}`);
  // Submitting the fake consent form is a GET of .../consent with the state and the email.
  const consent = new URL(chooser.replace('/__e2e/google?', '/__e2e/google/consent?'));
  consent.searchParams.set('email', email);
  const callback = await redirect(consent.toString());
  // The callback sends the browser to the app's /auth/google?code=.
  const location = await redirect(callback);
  const code = /[?&]code=([^&]+)/.exec(location)?.[1];
  expect(code, `no login code in ${location}`).toBeTruthy();
  return code!;
}

/**
 * Full Google sign-in on a request context. On a page's own `page.request` the session cookie
 * lands in that browser, as in `authedPage`. The account is created on first sign-in.
 */
export async function googleLogin(
  request: APIRequestContext,
  email: string,
  remember = true,
): Promise<AuthResponse> {
  const { nonce, nonceHash } = newNonce();
  const code = await googleCode(request, email, nonceHash);
  const res = await request.post(`${env.apiURL}auth/google/exchange`, {
    data: { code, remember, nonce },
  });
  await expectStatus(res, 200);
  return AuthResponse.parse(await res.json());
}
