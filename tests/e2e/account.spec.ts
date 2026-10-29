// spec: specs/phase2-account.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';
import { DEFAULT_PASSWORD, uniqueEmail } from '../../src/helpers/data';
import { googleLogin } from '../../src/helpers/google';
import { readStorage } from '../../src/helpers/storage';
import { Shell } from '../../src/components/shell';
import { AuthPage } from '../../src/pages/auth-page';
import { FakeGoogle } from '../../src/pages/fake-google-page';
import { ProfilePage } from '../../src/pages/profile-page';

const REFRESH_KEY = 'qa-hub-rt';
const GOOGLE_STATE_URL = /\/api\/__e2e\/google\?state=/;

test.describe('AUTH-06 Remember me', () => {
  test(
    'Remember me on (default): the session survives a browser restart',
    { tag: ['@REQ-AUTH-06'] },
    async ({ page, auth, shell, user, restartBrowser, device }) => {
      // 1. Open /login; check remember is on; sign in as user
      await auth.goto('login');
      await expect(auth.remember).toHaveAttribute('data-state', 'on');
      await auth.login(user);
      await shell.expectSignedIn(user.email);
      await expect.poll(() => readStorage(page, REFRESH_KEY)).toMatch(/^[\w-]{43}$/);

      // 2. Read the cookies
      const cookies = await page.context().cookies();
      const refresh = cookies.find((c) => c.name === 'qa_rt');
      expect(refresh?.httpOnly).toBe(true);
      expect(refresh?.expires).toBeGreaterThan(Date.now() / 1000);

      // 3. Restart the browser and open /dash
      const next = await restartBrowser(page);
      await next.goto('dash');
      await new Shell(next, device).expectSignedIn(user.email);
      await expect(new Shell(next, device).accountGuest).toHaveCount(0);

      // 4. Reload the new page, open /profile
      await next.reload();
      await new Shell(next, device).expectSignedIn(user.email);
      const profile = new ProfilePage(next);
      await profile.goto();
      await expect(profile.card).toHaveAttribute('data-state', 'user');
    },
  );

  test(
    'Remember me off: nothing is persisted and the session ends after a restart',
    { tag: ['@REQ-AUTH-06'] },
    async ({ page, auth, shell, user, restartBrowser, device }) => {
      // 1. Open /login, untick remember, sign in as user
      await auth.goto('login');
      await auth.remember.uncheck();
      await expect(auth.remember).toHaveAttribute('data-state', 'off');
      await auth.login(user);
      await shell.expectSignedIn(user.email);

      // 2. Read localStorage and the cookies
      await expect.poll(() => readStorage(page, REFRESH_KEY)).toBeNull();
      const refresh = (await page.context().cookies()).find((c) => c.name === 'qa_rt');
      expect(refresh?.expires).toBe(-1);

      // 3. Restart the browser and open /dash
      const next = await restartBrowser(page);
      await next.goto('dash');
      const nextShell = new Shell(next, device);
      await expect(nextShell.accountGuest).toBeVisible();
      await expect(nextShell.account).toHaveCount(0);
    },
  );
});

test.describe('AUTH-08 Logout', () => {
  test(
    'Logout returns to an empty guest and stays signed out after reload',
    { tag: ['@REQ-AUTH-08'] },
    async ({ page, auth, api, catalog, shell, importBanner, profile, user }) => {
      // 1. Give the account progress through the API, sign in on /login. Not authedPage: an API
      // login keeps no token in localStorage, so step 4 would pass without logout clearing it.
      const { id, sectionId } = catalog.questions[0]!;
      await api.checkAnswer(id, await api.correctIndex(id), user.token);
      await api.finishQuiz(user.token, sectionId, [id]);
      await auth.goto('login');
      await auth.login(user);
      await shell.expectSignedIn(user.email);
      await expect.poll(() => readStorage(page, REFRESH_KEY)).not.toBeNull();
      await expect.poll(() => shell.totalXp()).toBeGreaterThan(0);

      // 2. Sign out
      await shell.logout();
      await expect(shell.account).toHaveCount(0);
      await expect.poll(() => shell.totalXp()).toBe(0);
      // Before any navigation: a later page load's failed refresh would drop the token anyway
      await expect.poll(() => readStorage(page, REFRESH_KEY)).toBeNull();

      // 3. Open /profile, then reload
      await profile.goto();
      await expect(profile.card).toHaveAttribute('data-state', 'guest');
      await expect(profile.register).toBeVisible();
      await page.reload();
      await expect(profile.card).toHaveAttribute('data-state', 'guest');
      await expect(shell.accountGuest).toBeVisible();
      await expect.poll(() => shell.totalXp()).toBe(0);
      await expect(importBanner.banner).toHaveCount(0);
    },
  );
});

test.describe('AUTH-09 Google sign-in and unverified account', () => {
  test(
    'Google sign-in through the fake provider creates an account and keeps the session on reload',
    { tag: ['@REQ-AUTH-09'] },
    async ({ page, auth, fakeGoogle, shell, profile, googleEmail }) => {
      // 1. Open /login, click google-signin
      await auth.goto('login');
      await auth.google.click();
      await expect(page).toHaveURL(GOOGLE_STATE_URL);

      // 2. Submit the fake consent form
      await fakeGoogle.submit(googleEmail, 'PW Google');
      await shell.expectSignedIn(googleEmail);
      // A reload still on /auth/google?code=… would redeem the used code again (google_state)
      await expect(page).toHaveURL(/\/dash$/);

      // 3. Reload, open /profile
      await page.reload();
      await shell.expectSignedIn(googleEmail);
      await profile.goto();
      await expect(profile.method('google')).toHaveAttribute('data-state', 'on');
      await expect(profile.method('password')).toHaveAttribute('data-state', 'off');
      await expect(profile.currentPassword).toHaveCount(0);
    },
  );

  test(
    'Google sign-in with the email of an unverified password account clears its password',
    { tag: ['@REQ-AUTH-09'] },
    async ({ auth, fakeGoogle, shell, profile, api, user }) => {
      // The fixture cleans up with the password, which the callback drops in step 1.
      try {
        // 1. Open /login, click google-signin, submit the fake consent form with user.email
        await auth.goto('login');
        await auth.google.click();
        await fakeGoogle.submit(user.email);
        await shell.expectSignedIn(user.email);

        // 2. Open /profile
        await profile.goto();
        await expect(profile.method('password')).toHaveAttribute('data-state', 'off');
        await expect(profile.method('google')).toHaveAttribute('data-state', 'on');
        await expect(profile.currentPassword).toHaveCount(0);

        // 3. Sign out, sign in with the old password
        await shell.logout();
        await auth.goto('login');
        await auth.login(user);
        await auth.expectError('invalid_credentials');
      } finally {
        const { accessToken } = await googleLogin(api.raw, user.email);
        await api.deleteAccount(accessToken, user.email);
      }
    },
  );
});

test.describe('AUTH-11 Google flow security', () => {
  test(
    'A Google return link opened in a tab that did not start the flow is not redeemed',
    { tag: ['@REQ-AUTH-11'] },
    async ({ page, auth, shell }) => {
      // 1. Open the return link in a fresh guest tab
      await page.goto('auth/google?code=abc123');
      await expect(page).toHaveURL(/\/login\?error=google_state/);

      // 2. Read the error and the shell
      await auth.expectError('google_state');
      // account-guest is not rendered on /login (test-ids.md)
      await shell.open('dash');
      await expect(shell.accountGuest).toBeVisible();
    },
  );

  test(
    'Completing the Google flow in another tab fails and that tab stays a guest',
    { tag: ['@REQ-AUTH-11'] },
    async ({ page, context, auth, googleEmail, device }) => {
      // 1. Tab A starts the flow and stops on the fake consent page
      await auth.goto('login');
      await auth.google.click();
      await expect(page).toHaveURL(GOOGLE_STATE_URL);
      const consentUrl = page.url();

      // 2. Tab B (empty sessionStorage) completes the flow. A new email: the callback links an
      // existing unverified account and drops its password before the nonce is checked (AUTH-09).
      const tabB = await context.newPage();
      await tabB.goto(consentUrl);
      await new FakeGoogle(tabB).submit(googleEmail);
      await expect(tabB).toHaveURL(/\/login\?error=google_state/);
      await new AuthPage(tabB).expectError('google_state');
      const shellB = new Shell(tabB, device);
      await shellB.open('dash');
      await expect(shellB.accountGuest).toBeVisible();
    },
  );
});

test.describe('AUTH-16 Change password in the profile', () => {
  test(
    'Changing the password in the profile signs out the other session and keeps this one',
    { tag: ['@REQ-AUTH-16'] },
    async ({ authedPage, secondPage, profile, shell, api, user, device }) => {
      const secondShell = new Shell(secondPage, device);
      await secondPage.goto('dash');
      await secondShell.expectSignedIn(user.email);
      const newPassword = `${DEFAULT_PASSWORD}-new`;

      // 1. In session 1 open /profile and change the password
      await profile.goto();
      await profile.changePassword(newPassword, user.password);
      // The fixture cleans up with the old password, which may no longer work.
      try {
        await expect(profile.passwordMessage).toHaveAttribute('data-state', 'ok');
        await expect(profile.currentPassword).toHaveValue('');
        await expect(profile.newPassword).toHaveValue('');

        // 2. Session 1: reload /profile
        await authedPage.reload();
        await shell.expectSignedIn(user.email);

        // 3. Session 2: reload /dash
        await secondPage.reload();
        await expect(secondShell.accountGuest).toBeVisible();

        // 4. The new password works, the old one does not
        const old = await api.raw.post('auth/login', {
          data: { email: user.email, password: user.password },
        });
        expect(old.status()).toBe(401);
        expect(await old.json()).toMatchObject({ error: 'invalid_credentials' });
        const { accessToken } = await api.login({ email: user.email, password: newPassword });
        await api.deleteAccount(accessToken, user.email);
      } finally {
        // If the change failed, the old password still works and the fixture deletes the account.
        await api
          .login({ email: user.email, password: newPassword })
          .then(({ accessToken }) => api.deleteAccount(accessToken, user.email))
          .catch(() => undefined);
      }
    },
  );
});

test.describe('AUTH-18 Delete account in the profile', () => {
  test(
    'The delete button is enabled only after the account email is typed',
    { tag: ['@REQ-AUTH-18'] },
    async ({ authedPage: _signedIn, profile, api, user }) => {
      // 1. Open /profile
      await profile.goto();
      await expect(profile.deleteConfirm).toHaveValue('');
      await expect(profile.deleteButton).toBeDisabled();

      // 2. Type another email, then user.email minus the last character
      await profile.deleteConfirm.fill(uniqueEmail());
      await expect(profile.deleteButton).toBeDisabled();
      await profile.deleteConfirm.fill(user.email.slice(0, -1));
      await expect(profile.deleteButton).toBeDisabled();

      // 3. Replace the text with user.email, then with it in upper case (emails are
      // case-insensitive, plan Ambiguity 3)
      await profile.deleteConfirm.fill(user.email);
      await expect(profile.deleteButton).toBeEnabled();
      await profile.deleteConfirm.fill(user.email.toUpperCase());
      await expect(profile.deleteButton).toBeEnabled();

      // 4. Clear the field
      await profile.deleteConfirm.fill('');
      await expect(profile.deleteButton).toBeDisabled();
      // Nothing was deleted.
      await api.login(user);
    },
  );

  test(
    'Deleting the account in the profile signs out and frees the email',
    { tag: ['@REQ-AUTH-18'] },
    async ({ authedPage: _signedIn, profile, shell, api, user }) => {
      // 1. Type user.email and delete
      await profile.goto();
      await profile.deleteAccount(user.email);
      await expect(shell.accountGuest).toBeVisible();

      // 2. The deleted credentials no longer log in
      const login = await api.raw.post('auth/login', {
        data: { email: user.email, password: user.password },
      });
      expect(login.status()).toBe(401);
      expect(await login.json()).toMatchObject({ error: 'invalid_credentials' });

      // 3. The same email registers again (the fixture teardown deletes it)
      await api.register(user);
    },
  );
});
