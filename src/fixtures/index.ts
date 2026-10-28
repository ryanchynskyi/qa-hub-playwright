import { test as base, expect, type Page } from '@playwright/test';
import { ApiClient, expectStatus, type Credentials } from '../api/client';
import type { Catalog, Lang } from '../api/schemas';
import { Shell } from '../components/shell';
import { env } from '../config/env';
import { DEFAULT_PASSWORD, uniqueEmail } from '../helpers/data';
import { AuthPage } from '../pages/auth-page';
import { DashboardPage } from '../pages/dashboard-page';
import { KbPage } from '../pages/kb-page';
import { QuizPage } from '../pages/quiz-page';

export type Device = 'desktop' | 'tablet' | 'phone';

/** Options a project (playwright.config.ts) or a file (`test.use`) can set. */
export interface FrameworkOptions {
  device?: Device;
  lang?: Lang;
}

export interface TestUser extends Credentials {
  displayName: string;
  /** Access token from registration; valid for 15 minutes, enough for one test. */
  token: string;
}

interface TestFixtures {
  /** UI language pinned before the app loads. `test.use({ lang: 'en' })` for English. */
  lang: Lang;
  /** Layout of the current project; page objects use it to hide desktop/phone differences. */
  device: Device;
  api: ApiClient;
  /** A fresh account created through the API and deleted after the test. */
  user: TestUser;
  /** Unused credentials for sign-up tests; the account is deleted after the test if it exists. */
  newCredentials: Credentials;
  /** A page signed in as `user` (API login inside the test's own browser context). */
  authedPage: Page;
  shell: Shell;
  dashboard: DashboardPage;
  quiz: QuizPage;
  auth: AuthPage;
  kb: KbPage;
}

interface WorkerFixtures {
  /** GET /content/catalog, fetched once per worker: ids for data-driven tests, never volumes. */
  catalog: Catalog;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  lang: ['uk', { option: true }],
  device: ['desktop', { option: true }],

  // Every page of every test starts with the same browser state, set before the app's own code
  // runs: no analytics, no first-visit focus wizard (it replaces the whole shell), no dashboard
  // tour covering the UI, and the chosen language. Keys: $APP_DIR/docs/test-ids.md.
  context: async ({ context, lang }, use) => {
    await context.addInitScript((language) => {
      localStorage.setItem('umami.disabled', '1');
      localStorage.setItem('qa-hub-focus', 'skipped');
      localStorage.setItem('qa-hub-tour-v1', JSON.stringify({ stage: 'done', weakHint: true }));
      localStorage.setItem('qa-hub-lang', language);
    }, lang);
    await use(context);
  },

  api: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({ baseURL: env.apiURL });
    await use(new ApiClient(request));
    await request.dispose();
  },

  catalog: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext({ baseURL: env.apiURL });
      await use(await new ApiClient(request).catalog());
      await request.dispose();
    },
    { scope: 'worker' },
  ],

  user: async ({ api }, use) => {
    assertNotProd('user');
    const credentials = { email: uniqueEmail(), password: DEFAULT_PASSWORD };
    const { accessToken, user } = await api.register({ ...credentials, displayName: 'PW Tester' });
    await use({ ...credentials, displayName: user.displayName, token: accessToken });
    await deleteAccountIfExists(api, credentials);
  },

  newCredentials: async ({ api }, use) => {
    assertNotProd('newCredentials');
    const credentials = { email: uniqueEmail('pw-ui'), password: DEFAULT_PASSWORD };
    await use(credentials);
    await deleteAccountIfExists(api, credentials);
  },

  authedPage: async ({ page, user, shell }, use) => {
    // page.request shares the cookie jar with the page: the refresh cookie (qa_rt) set by the
    // login lands in this context, and the app restores the session from it on load. Each test
    // gets its own user and session, so refresh-token rotation never logs out another test.
    const res = await page.request.post(`${env.apiURL}auth/login`, {
      data: { email: user.email, password: user.password },
    });
    await expectStatus(res, 200);
    await page.goto('dash');
    await shell.expectSignedIn(user.email);
    await use(page);
  },

  shell: async ({ page, device }, use) => use(new Shell(page, device)),
  dashboard: async ({ page }, use) => use(new DashboardPage(page)),
  quiz: async ({ page }, use) => use(new QuizPage(page)),
  auth: async ({ page }, use) => use(new AuthPage(page)),
  kb: async ({ page }, use) => use(new KbPage(page)),
});

export { expect };

/** Second line of defence after the @prod-safe grep: a mis-tagged test fails, no account is made. */
function assertNotProd(fixture: string): void {
  if (env.isProd)
    throw new Error(`The "${fixture}" fixture creates accounts; it never runs on prod.`);
}

/** Teardown helper: a test may have deleted the account itself or never created it. */
async function deleteAccountIfExists(api: ApiClient, credentials: Credentials): Promise<void> {
  const res = await api.raw.post('auth/login', { data: credentials });
  if (res.status() === 401) return;
  await expectStatus(res, 200);
  const { accessToken } = (await res.json()) as { accessToken: string };
  await api.deleteAccount(accessToken, credentials.email);
}
