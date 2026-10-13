import { expect, test } from '../../src/fixtures';

// Runs on desktop, tablet and phone (tag @responsive): the Shell component hides where each
// link lives, the tests below only describe what the user can do.
test.describe('shell navigation', { tag: '@responsive' }, () => {
  test.beforeEach(async ({ dashboard }) => {
    await dashboard.goto();
    await expect(dashboard.root).toBeVisible();
  });

  test('main links open their pages and mark themselves active', async ({ page, shell }) => {
    await shell.open('quiz');
    await expect(page.getByTestId('quiz-view')).toBeVisible();
    await shell.expectActive('quiz');

    await shell.open('kb');
    await expect(page.getByTestId('kb')).toBeVisible();
    await shell.expectActive('kb');

    await shell.open('dash');
    await shell.expectActive('dash');
  });

  test('secondary links are reachable on every layout', async ({ page, shell }) => {
    await shell.open('leaderboard');
    await expect(page).toHaveURL(/\/leaderboard\/?$/);
    await expect(page.getByTestId('leaderboard')).toBeVisible();

    await shell.open('chat');
    await expect(page).toHaveURL(/\/chat\/?$/);
  });

  test('layout matches the viewport', async ({ shell }) => {
    await shell.expectLayout();
  });

  test('the phone More sheet closes on Escape and returns focus', async ({ shell }) => {
    test.skip(shell.device !== 'phone', 'the More sheet exists on phones only');
    await shell.openMoreSheet();
    await expect(shell.moreSheet).toHaveAttribute('aria-modal', 'true');
    await shell.page.keyboard.press('Escape');
    await expect(shell.moreSheet).toHaveCount(0);
    await expect(shell.moreButton).toBeFocused();
  });
});
