import { expect, test } from '../src/fixtures';

/**
 * Seed for agent sessions that explore the first visit (guest home, first run, focus wizard,
 * short dashboard, tour):
 * `tests/seed.spec.ts` pre-sets the focus and tour keys on every load, so they never show there.
 */
test.use({ visitor: 'new' });

test('seed new visitor', async ({ page, focus }) => {
  await page.goto('dash');
  await expect(focus.home).toBeVisible();
});
