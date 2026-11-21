// spec: specs/phase2-courses.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';
import { chapterAt, completeChapter } from '../../src/helpers/course';
import type { SoonKey } from '../../src/pages/course-catalog-page';

// The chip keys of test-ids.md "Courses", compared as a set (the DOM order differs: A2).
const SOON_KEYS: SoonKey[] = ['cypress', 'selenium', 'typescript', 'sql', 'appium'];

test.describe('CRS-01 Catalog', () => {
  test(
    'Guest catalog: two cards, not-started count line',
    { tag: '@REQ-CRS-01' },
    async ({ courses, course }) => {
      // 1. Open /course as a guest with empty storage; N = chapters of the Playwright course
      await courses.goto();
      await expect(courses.root).toBeVisible();
      await expect(courses.cards).toHaveCount(2);
      await expect(courses.cards.nth(0)).toHaveAttribute('data-key', 'playwright');
      await expect(courses.cards.nth(1)).toHaveAttribute('data-key', 'api');
      await expect(courses.chapters('playwright')).toHaveAttribute(
        'data-value',
        String(course.length),
      );
      await expect(courses.progress('playwright')).toHaveAttribute('data-value', '0');
      await expect(courses.progress('playwright')).toHaveAttribute(
        'data-total',
        String(course.length),
      );
      // not started: no bar, the count line instead
      await expect(courses.bar('playwright')).toHaveCount(0);

      // 2. Read the cta of both cards
      await expect(courses.cta('playwright')).toHaveAttribute('data-state', 'start');
      await expect(courses.cta('api')).toHaveAttribute('data-state', 'start');
      // the API card's chapter count lives in the app code: it equals its own bar total
      await expect(courses.chapters('api')).toBeVisible();
      await expect(courses.progress('api')).toHaveAttribute('data-value', '0');
      await expect(courses.bar('api')).toHaveCount(0);
      const apiTotal = await courses.progress('api').getAttribute('data-total');
      await expect(courses.chapters('api')).toHaveAttribute('data-value', apiTotal ?? '');
    },
  );

  test(
    'Started course: bar and n / N on the Playwright card only',
    { tag: '@REQ-CRS-01' },
    async ({ courses, course, api, user, signIn }) => {
      // 1. Register, complete the first chapter through scoped calls, sign in, open /course
      await completeChapter(api, user.token, chapterAt(course, 1));
      await signIn(user);
      await courses.goto();
      await expect(courses.progress('playwright')).toHaveAttribute('data-value', '1');
      await expect(courses.progress('playwright')).toHaveAttribute(
        'data-total',
        String(course.length),
      );
      await expect(courses.bar('playwright')).toBeVisible();
      await expect(courses.chapters('playwright')).toHaveAttribute(
        'data-value',
        String(course.length),
      );

      // 2. Read the cta of both cards
      await expect(courses.cta('playwright')).toHaveAttribute('data-state', 'continue');
      await expect(courses.cta('api')).toHaveAttribute('data-state', 'start');
      await expect(courses.progress('api')).toHaveAttribute('data-value', '0');
      await expect(courses.bar('api')).toHaveCount(0);
    },
  );

  test(
    'Coming-soon chips toggle, persist on reload and unmark',
    { tag: '@REQ-CRS-01' },
    async ({ courses, page }) => {
      // 1. Open /course as a guest; collect the chips
      await courses.goto();
      await expect(courses.soonChips).toHaveCount(SOON_KEYS.length);
      for (const key of SOON_KEYS) {
        await expect(courses.soon(key)).toHaveAttribute('data-state', 'idle');
        await expect(courses.soon(key)).toHaveAttribute('aria-pressed', 'false');
      }
      await expect(courses.soon('cypress')).toBeVisible();
      await expect(courses.soonNote).toHaveCount(0);

      // 2. Click the cypress chip
      await courses.soon('cypress').click();
      await expect(courses.soon('cypress')).toHaveAttribute('data-state', 'clicked');
      await expect(courses.soon('cypress')).toHaveAttribute('aria-pressed', 'true');
      await expect(courses.soon('cypress')).toContainText('✓');
      await expect(courses.soonNote).toBeVisible();
      await expect(courses.soonNote).toHaveRole('status');
      for (const key of SOON_KEYS.filter((k) => k !== 'cypress')) {
        await expect(courses.soon(key)).toHaveAttribute('data-state', 'idle');
      }

      // 3. Reload the page
      await page.reload();
      await expect(courses.soon('cypress')).toHaveAttribute('data-state', 'clicked');
      await expect(courses.soonNote).toBeVisible();

      // 4. Click the cypress chip a second time
      await courses.soon('cypress').click();
      await expect(courses.soon('cypress')).toHaveAttribute('data-state', 'idle');
      await expect(courses.soon('cypress')).toHaveAttribute('aria-pressed', 'false');
      await expect(courses.soon('cypress')).not.toContainText('✓');
      await expect(courses.soonNote).toHaveCount(0);

      // 5. Reload the page again
      await page.reload();
      await expect(courses.soon('cypress')).toHaveAttribute('data-state', 'idle');
    },
  );
});
