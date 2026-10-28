import { expect, test } from '../src/fixtures';

/**
 * Seed for the Playwright test agents (.claude/agents/playwright-test-*.md): the planner and the
 * generator start every session from this test, so they get the framework's browser state (no
 * focus wizard, no tour, uk language) instead of a bare `page`.
 */
test('seed', async ({ page, dashboard }) => {
  await page.goto('dash');
  await expect(dashboard.root).toBeVisible();
});
