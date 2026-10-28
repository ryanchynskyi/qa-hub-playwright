import { expect, test } from '../../src/fixtures';

// Runs on desktop, tablet and phone (tag @responsive): the Shell component hides where each
// link lives, the tests below only describe what the user can do.
test.describe('shell navigation', { tag: ['@responsive', '@prod-safe'] }, () => {
  test.beforeEach(async ({ dashboard }) => {
    await dashboard.goto();
    await expect(dashboard.root).toBeVisible();
  });

  test(
    'main links open their pages and mark themselves active',
    { tag: ['@REQ-GEN-01'] },
    async ({ page, shell }) => {
      await shell.open('quiz');
      await expect(page.getByTestId('quiz-view')).toBeVisible();
      await shell.expectActive('quiz');

      await shell.open('kb');
      await expect(page.getByTestId('kb')).toBeVisible();
      await shell.expectActive('kb');

      await shell.open('dash');
      await shell.expectActive('dash');
    },
  );

  test(
    'secondary links are reachable on every layout',
    { tag: ['@REQ-GEN-01'] },
    async ({ page, shell }) => {
      await shell.open('leaderboard');
      await expect(page).toHaveURL(/\/leaderboard\/?$/);
      await expect(page.getByTestId('leaderboard')).toBeVisible();

      await shell.open('chat');
      await expect(page).toHaveURL(/\/chat\/?$/);
    },
  );

  test('layout matches the viewport', { tag: ['@REQ-GEN-01'] }, async ({ shell }) => {
    await shell.expectLayout();
  });

  test(
    'the phone More sheet closes on Escape and returns focus',
    { tag: ['@REQ-NFR-10'] },
    async ({ shell }) => {
      test.skip(shell.device !== 'phone', 'the More sheet exists on phones only');
      await shell.openMoreSheet();
      await expect(shell.moreSheet).toHaveAttribute('aria-modal', 'true');
      await shell.page.keyboard.press('Escape');
      await expect(shell.moreSheet).toHaveCount(0);
      await expect(shell.moreButton).toBeFocused();
    },
  );
});

// Routing, not layout: one viewport is enough. Checklist SHELL-016 (no REQ row): prod serves a
// prerendered shell for every route, never a 404 page.
test.describe('deep links', { tag: ['@prod-safe'] }, () => {
  test('deep links load their view directly and after a reload', async ({ page }) => {
    const views = [
      { path: 'kb/sql', testId: 'kb' }, // redirects to a chapter: the reload hits that deep link
      { path: 'quiz/sql', testId: 'quiz-view' },
      { path: 'leaderboard', testId: 'leaderboard' },
    ];
    for (const { path, testId } of views) {
      await test.step(path, async () => {
        await page.goto(path);
        await expect(page.getByTestId(testId)).toBeVisible();
        // GitHub Pages adds a trailing slash on reload (a directory redirect); same route.
        const route = page.url().replace(/\/$/, '');
        await page.reload();
        await expect(page.getByTestId(testId)).toBeVisible();
        expect(page.url().replace(/\/$/, '')).toBe(route);
      });
    }
  });
});
