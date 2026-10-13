import { expect, test } from '../../src/fixtures';
import { numberValue } from '../../src/helpers/locators';

test.describe('knowledge base', () => {
  test.beforeEach(async ({ kb }) => {
    await kb.gotoTopic('sql');
  });

  test('search shows results from 2 characters on', async ({ kb }) => {
    await kb.search.fill('j');
    // One character never searches: wait for the debounce window by asserting state, not time.
    await expect(kb.searchResults).toHaveCount(0);

    await kb.search.fill('join');
    await expect(kb.searchResults).toBeVisible();
    await expect(kb.searchHits.first()).toBeVisible();
    expect(await numberValue(kb.searchResults)).toBeGreaterThan(0);
  });

  test('nonsense finds nothing', async ({ kb }) => {
    await kb.search.fill('zzqqxx');
    await expect(kb.searchEmpty).toBeVisible();
  });

  test('opening an article for the first time gives XP once', async ({ kb, shell }) => {
    const articleId = await kb.firstArticleId();
    const before = await shell.totalXp();

    await kb.openArticle(articleId);
    // +2 for the first read; a daily task may add more, so the check is relative.
    await expect.poll(() => shell.totalXp()).toBeGreaterThanOrEqual(before + 2);
    const afterFirst = await shell.totalXp();

    // Close and open again: no XP for a second read.
    await kb.closeArticle(articleId);
    await kb.openArticle(articleId);
    await expect.poll(() => shell.totalXp()).toBe(afterFirst);
  });
});
