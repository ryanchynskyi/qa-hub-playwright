// spec: specs/phase2-feedback-admin.md
// seed: tests/seed.spec.ts

import { expect, test } from '../../src/fixtures';
import { AdminPage } from '../../src/pages/admin-page';

test.describe('Admin access and bug reports', () => {
  test('guest on /admin sees the sign-in prompt', { tag: ['@REQ-ADM-01'] }, async ({ page }) => {
    // 1. As a guest open /admin
    const admin = new AdminPage(page);
    await page.goto('admin');
    await expect(page.getByTestId('admin-signin')).toBeVisible();
    await expect(page.getByTestId('admin-signin-link')).toHaveAttribute(
      'href',
      '/login?next=/admin',
    );
    await expect(admin.root).toHaveCount(0);
    await expect(page.getByTestId('admin-kpis')).toHaveCount(0);
    await expect(page.getByTestId('admin-forbidden')).toHaveCount(0);
  });

  test(
    'a regular account on /admin sees admin-forbidden and no data',
    { tag: ['@REQ-ADM-01'] },
    async ({ authedPage }) => {
      // 1. With `authedPage` open /admin
      await authedPage.goto('admin');
      await expect(authedPage.getByTestId('admin-forbidden')).toBeVisible();

      // 2. Look for data
      for (const absent of [
        'admin-kpis',
        'admin-bugs',
        'admin-feedback',
        'admin-signin',
        'nav-admin',
      ]) {
        await expect(authedPage.getByTestId(absent)).toHaveCount(0);
      }
    },
  );
});
