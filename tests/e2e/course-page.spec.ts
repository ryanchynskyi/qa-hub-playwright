// spec: specs/phase2-courses.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';
import { chapterAt, GUEST_CHAPTERS, lessonCount } from '../../src/helpers/course';

const NEXT = encodeURIComponent('/course/playwright');

test.describe('CRS-02 Course page', () => {
  test(
    'Guest sees chapters 1-2 open and the rest locked, with the guest box',
    { tag: '@REQ-CRS-02' },
    async ({ coursePage, course }) => {
      // 1. Open /course/playwright as a guest; take the chapter list from the course shape
      await coursePage.goto();
      await expect(coursePage.chapters).toHaveCount(course.length);
      expect(await coursePage.chapterIds()).toEqual(course.map((c) => c.id));
      // table per row: [id, state, toggle count]
      const rows = course.map(
        (c) =>
          [
            c.id,
            c.position === 1 ? 'current' : c.position <= GUEST_CHAPTERS ? 'todo' : 'locked',
            c.position <= GUEST_CHAPTERS ? 1 : 0,
          ] as const,
      );
      for (const [id, state, toggles] of rows) {
        await expect(coursePage.chapter(id)).toHaveAttribute('data-state', state);
        await expect(coursePage.toggle(id)).toHaveCount(toggles);
      }

      // 2. Inspect course-guest-box
      await expect(coursePage.guestBox).toBeVisible();
      await expect(coursePage.guestLogin).toHaveAttribute('href', `/login?next=${NEXT}`);
      await expect(coursePage.guestRegister).toHaveAttribute('href', `/register?next=${NEXT}`);
      await expect(coursePage.reset).toHaveCount(0);
    },
  );

  test(
    'Guest login link of the box goes to the login form with next',
    { tag: '@REQ-CRS-02' },
    async ({ coursePage, auth, page }) => {
      // 1. Open /course/playwright as a guest and click course-guest-login
      await coursePage.goto();
      await coursePage.guestLogin.click();
      await expect(page).toHaveURL(
        (url) => url.pathname === '/login' && url.searchParams.get('next') === '/course/playwright',
      );
      await expect(auth.email).toBeVisible();
    },
  );

  test(
    'Signed in: nothing locked, no guest box',
    { tag: '@REQ-CRS-02' },
    async ({ coursePage, course, user, signIn }) => {
      // 1. Sign in a fresh account, open /course/playwright
      await signIn(user);
      await coursePage.goto();
      await expect(coursePage.chapters).toHaveCount(course.length);
      // table per row: [id, state]; the first is current, the rest todo
      const rows = course.map((c) => [c.id, c.position === 1 ? 'current' : 'todo'] as const);
      for (const [id, state] of rows) {
        await expect(coursePage.chapter(id)).toHaveAttribute('data-state', state);
      }
      await expect(coursePage.guestBox).toHaveCount(0);
      await expect(coursePage.guestLogin).toHaveCount(0);
    },
  );

  test(
    'course-chapter-lessons equals articles plus Практика, Тест and Картки that exist',
    { tag: '@REQ-CRS-02' },
    async ({ coursePage, course }) => {
      // 1. Open /course/playwright as a guest; every todo and locked row carries its step count
      await coursePage.goto();
      await expect(coursePage.chapters).toHaveCount(course.length);
      const checked = course.filter((c) => c.position > 1);
      // the rows must hold a chapter without Практика and one without Картки, or the formula is untested
      expect(
        checked.some((c) => c.code.length === 0),
        'a checked row without code',
      ).toBe(true);
      expect(
        checked.some((c) => c.cards.length === 0),
        'a checked row without cards',
      ).toBe(true);
      const rows = checked.map((c) => [c.id, lessonCount(c)] as const);
      for (const [id, lessons] of rows) {
        await expect(coursePage.lessons(id)).toHaveAttribute('data-value', String(lessons));
      }

      // 2. Look at the first (current) row
      const first = chapterAt(course, 1).id;
      await expect(coursePage.chapter(first)).toHaveAttribute('data-state', 'current');
      await expect(coursePage.lessons(first)).toHaveCount(0);
    },
  );
});
