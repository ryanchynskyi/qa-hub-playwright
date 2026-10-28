import { expect, test } from '../../src/fixtures';

test.describe('first visit', () => {
  test.use({ visitor: 'new' });

  test(
    'a new visitor gets the focus wizard instead of the shell',
    { tag: ['@REQ-GEN-10'] },
    async ({ page, dashboard, shell }) => {
      await dashboard.goto();
      await expect(page.getByTestId('focus-gate')).toBeVisible();
      await expect(shell.sidebar).toBeHidden();
      await expect(dashboard.root).toBeHidden();
    },
  );
});
