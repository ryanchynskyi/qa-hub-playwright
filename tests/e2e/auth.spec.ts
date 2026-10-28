import { expect, test } from '../../src/fixtures';

test.describe('sign-in and sign-up', () => {
  test('a new user signs up through the form', async ({ page, auth, shell, newCredentials }) => {
    await auth.goto('register');
    await auth.register(newCredentials, 'UI Tester');
    await shell.expectSignedIn(newCredentials.email);
    await expect(page).not.toHaveURL(/\/register/);
  });

  test('a wrong password shows the API error code', async ({ auth, user }) => {
    await auth.goto('login');
    await auth.login({ email: user.email, password: 'not-the-password' });
    await auth.expectError('invalid_credentials');
  });

  test('sign in and sign out through the UI', async ({ auth, shell, user }) => {
    await auth.goto('login');
    await auth.login(user);
    await shell.expectSignedIn(user.email);
    await shell.logout();
    await expect(shell.account).toHaveCount(0);
  });

  test('a session survives a reload', async ({ authedPage, shell, user }) => {
    await authedPage.reload();
    await shell.expectSignedIn(user.email);
  });

  test('a signed-in user can open the profile', async ({ authedPage, shell }) => {
    await shell.open('profile');
    await expect(authedPage.getByTestId('profile')).toHaveAttribute('data-state', 'user');
  });
});
