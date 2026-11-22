// spec: specs/phase2-feedback-admin.md
// seed: tests/seed.spec.ts

import { expect, test } from '../../src/fixtures';
import { AdminPage } from '../../src/pages/admin-page';

test.describe('Admin access and bug reports', () => {
  test('guest on /admin sees the sign-in prompt', { tag: ['@REQ-ADM-01'] }, async ({ page }) => {
    // 1. As a guest open /admin
    const admin = new AdminPage(page);
    await page.goto('admin');
    await expect(admin.signIn).toBeVisible();
    await expect(admin.signInLink).toHaveAttribute('href', '/login?next=/admin');
    await expect(admin.root).toHaveCount(0);
    await expect(admin.kpis).toHaveCount(0);
    await expect(admin.forbidden).toHaveCount(0);
  });

  test(
    'a regular account on /admin sees admin-forbidden and no data',
    { tag: ['@REQ-ADM-01'] },
    async ({ authedPage, shell }) => {
      // 1. With `authedPage` open /admin
      const admin = new AdminPage(authedPage);
      await authedPage.goto('admin');
      await expect(admin.forbidden).toBeVisible();

      // 2. Look for data
      for (const absent of [
        admin.kpis,
        admin.bugsCard,
        admin.feedbackCard,
        admin.signIn,
        shell.link('admin'),
      ]) {
        await expect(absent).toHaveCount(0);
      }
    },
  );
});
