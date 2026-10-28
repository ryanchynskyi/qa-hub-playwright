import { expect, test } from '../src/fixtures';

/**
 * Seed for agent sessions that explore the first visit (focus wizard, short dashboard, tour):
 * `tests/seed.spec.ts` pre-sets the focus and tour keys on every load, so they never show there.
 */
test.use({ visitor: 'new' });

test('seed new visitor', async ({ page }) => {
  await page.goto('dash');
  await expect(page.getByTestId('focus-gate')).toBeVisible();
});
