import { expect, test } from '../../src/fixtures';

test.describe('app smoke', { tag: ['@smoke', '@prod-safe', '@responsive'] }, () => {
  test(
    'the dashboard renders at the root for a guest',
    { tag: ['@REQ-PROG-06'] },
    async ({ page, dashboard, shell }) => {
      await page.goto('./');
      await expect(dashboard.root).toBeVisible();
      await expect(dashboard.title).not.toBeEmpty();
      await expect(shell.page.getByTestId('topbar')).toBeVisible();
      await shell.expectLanguage('uk');
    },
  );

  test(
    'an unknown route redirects to the dashboard',
    { tag: ['@REQ-GEN-06'] },
    async ({ page, dashboard }) => {
      await page.goto('no-such-page');
      await expect(page).toHaveURL(/\/dash\/?$/);
      await expect(dashboard.root).toBeVisible();
    },
  );
});
