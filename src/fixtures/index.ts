import { createHash, randomBytes } from 'node:crypto';
import {
  test as base,
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { ApiClient, expectStatus, type Credentials } from '../api/client';
import type { Catalog, Lang } from '../api/schemas';
import { FocusWizard } from '../components/focus-wizard';
import { ImportBanner } from '../components/import-banner';
import { Shell } from '../components/shell';
import { Tour } from '../components/tour';
import { env } from '../config/env';
import { ADMIN_EMAIL, DEFAULT_PASSWORD, uniqueEmail } from '../helpers/data';
import { AuthPage } from '../pages/auth-page';
import { DashboardPage } from '../pages/dashboard-page';
import { KbPage } from '../pages/kb-page';
import { QuizPage } from '../pages/quiz-page';
import { RecallPage } from '../pages/recall-page';

export type Device = 'desktop' | 'tablet' | 'phone';

/** Options a project (playwright.config.ts) or a file (`test.use`) can set. */
export interface FrameworkOptions {
  device?: Device;
  lang?: Lang;
  visitor?: Visitor;
}

/** `new`: first visit, with the focus wizard and the dashboard tour; `returning`: neither. */
export type Visitor = 'returning' | 'new';

export interface TestUser extends Credentials {
  displayName: string;
  /** Access token from registration; valid for 15 minutes, enough for one test. */
  token: string;
}

interface TestFixtures {
  /** UI language pinned before the app loads. `test.use({ lang: 'en' })` for English. */
  lang: Lang;
  /** `test.use({ visitor: 'new' })` keeps the first-visit focus wizard and dashboard tour. */
  visitor: Visitor;
  /** Layout of the current project; page objects use it to hide desktop/phone differences. */
  device: Device;
  api: ApiClient;
  /** A fresh account created through the API and deleted after the test. */
  user: TestUser;
  /** Unused credentials for sign-up tests; the account is deleted after the test if it exists. */
  newCredentials: Credentials;
  /** A page signed in as `user` (API login inside the test's own browser context). */
  authedPage: Page;
  /** A page in a second browser context (another device) signed in as the same `user`. */
  secondPage: Page;
  /** A page on /admin, signed in as the owner (`ADMIN_EMAIL`) through the fake Google. */
  adminPage: Page;
  shell: Shell;
  importBanner: ImportBanner;
  focus: FocusWizard;
  tour: Tour;
  dashboard: DashboardPage;
  quiz: QuizPage;
  recall: RecallPage;
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
  visitor: ['returning', { option: true }],

  // Every page of every test starts with the same browser state, set before the app's own code
  // runs: no analytics, the chosen language and, for a returning visitor, no first-visit focus
  // wizard (it replaces the whole shell), no dashboard tour covering the UI and no sheets after
  // a finished quiz.
  // Keys: $APP_DIR/docs/test-ids.md.
  context: async ({ context, lang, visitor }, use) => {
    await prepareContext(context, lang, visitor);
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
    await apiLogin(page.request, user);
    await page.goto('dash');
    await shell.expectSignedIn(user.email);
    await use(page);
  },

  // browser.newContext() does not get the config's `use`, so the options the app depends on are
  // repeated here (playwright.config.ts).
  secondPage: async ({ browser, lang, visitor, user }, use) => {
    const context = await browser.newContext({
      baseURL: env.baseURL,
      timezoneId: 'Europe/Kyiv',
      locale: 'uk-UA',
    });
    await prepareContext(context, lang, visitor);
    const page = await context.newPage();
    await apiLogin(page.request, user);
    await use(page);
    await context.close();
  },

  // One shared owner account for all workers: fine while admin tests only read; tests that
  // reply, ban or toggle need their own data.
  adminPage: async ({ page }, use) => {
    // The fake Google exists only on the e2e server.
    assertNotProd('adminPage');
    await googleLogin(page.request, ADMIN_EMAIL);
    await page.goto('admin');
    await expect(page.getByTestId('admin')).toBeVisible();
    await use(page);
  },

  shell: async ({ page, device }, use) => use(new Shell(page, device)),
  importBanner: async ({ page }, use) => use(new ImportBanner(page)),
  dashboard: async ({ page }, use) => use(new DashboardPage(page)),
  quiz: async ({ page }, use) => use(new QuizPage(page)),
  recall: async ({ page }, use) => use(new RecallPage(page)),
  auth: async ({ page }, use) => use(new AuthPage(page)),
  kb: async ({ page }, use) => use(new KbPage(page)),
  focus: async ({ page }, use) => use(new FocusWizard(page)),
  tour: async ({ page }, use) => use(new Tour(page)),
});

export { expect };

/** Browser state set before the app's own code runs (keys: $APP_DIR/docs/test-ids.md). */
async function prepareContext(
  context: BrowserContext,
  lang: Lang,
  visitor: Visitor,
): Promise<void> {
  await context.addInitScript(
    ({ language, returning }) => {
      localStorage.setItem('umami.disabled', '1');
      localStorage.setItem('qa-hub-lang', language);
      if (!returning) return;
      localStorage.setItem('qa-hub-focus', 'skipped');
      localStorage.setItem('qa-hub-tour-v1', JSON.stringify({ stage: 'done', weakHint: true }));
      // Sheets after a finished quiz cover the result buttons: the content note, then the donate
      // offer (a signed-in user's first quiz gets it once the note is handled).
      localStorage.setItem('qa-hub-content-note', 'dismissed');
      localStorage.setItem('qa-hub-donate-offer', 'dismissed');
    },
    { language: lang, returning: visitor === 'returning' },
  );
}

/** API login on a page's own request context: the refresh cookie lands in that browser. */
async function apiLogin(request: APIRequestContext, user: Credentials): Promise<void> {
  const res = await request.post(`${env.apiURL}auth/login`, {
    data: { email: user.email, password: user.password },
  });
  await expectStatus(res, 200);
}

/** Second line of defence after the @prod-safe grep: a mis-tagged test fails, no account is made. */
function assertNotProd(fixture: string): void {
  if (env.isProd)
    throw new Error(`The "${fixture}" fixture creates accounts; it never runs on prod.`);
}

/**
 * Google sign-in without the UI, through the fake consent screen of the e2e API
 * ($APP_DIR/apps/api/scripts/e2e-server.ts). It runs on the page's own request context, so the
 * session cookie lands in that browser, as in `authedPage`.
 */
async function googleLogin(request: APIRequestContext, email: string): Promise<void> {
  // The app keeps the nonce and sends its hash; only the holder can redeem the login code.
  const nonce = randomBytes(16).toString('hex');
  const nonceHash = createHash('sha256').update(nonce).digest('hex');
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
  // The callback sends the browser to the app with ?code= inside its hash route.
  const location = await redirect(callback);
  const code = /[?&]code=([^&]+)/.exec(location)?.[1];
  expect(code, `no login code in ${location}`).toBeTruthy();
  const res = await request.post(`${env.apiURL}auth/google/exchange`, {
    data: { code, remember: true, nonce },
  });
  await expectStatus(res, 200);
}

/** Teardown helper: a test may have deleted the account itself or never created it. */
async function deleteAccountIfExists(api: ApiClient, credentials: Credentials): Promise<void> {
  const res = await api.raw.post('auth/login', { data: credentials });
  if (res.status() === 401) return;
  await expectStatus(res, 200);
  const { accessToken } = (await res.json()) as { accessToken: string };
  await api.deleteAccount(accessToken, credentials.email);
}
