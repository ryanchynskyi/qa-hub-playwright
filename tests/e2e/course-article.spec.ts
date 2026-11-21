// spec: specs/phase2-courses.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';
import { articleStep, type StepKey } from '../../src/pages/course-step-page';
import { chapterAt, chapterOf } from '../../src/helpers/course';

const COURSE_PATH = '/course/playwright';
const onCoursePage = (url: URL) => url.pathname === COURSE_PATH;

test.describe('CRS-03 Article step', () => {
  test(
    'Article screen shows the outline with every step and a correct first-step footer',
    { tag: '@REQ-CRS-03' },
    async ({ courseStep, course, user, signIn }) => {
      // the `full` shape has code, plain questions and cards, so all three steps exist
      const full = chapterOf(course, 'full');
      const steps: StepKey[] = [...full.articles.map(articleStep), 'practice', 'test', 'cards'];

      // 1. Signed-in fresh account; open /course/playwright/<full>/article/1
      await signIn(user);
      await courseStep.gotoArticle(full.id, 1);
      await expect(courseStep.root).toBeVisible();
      await expect(courseStep.ctx).toHaveAttribute('data-key', full.id);
      await expect(courseStep.article).toHaveAttribute('data-key', full.articles[0]!);
      await expect(courseStep.outline).toHaveAttribute('data-key', full.id);
      expect(await courseStep.outlineKeys()).toEqual(steps);
      // table per item: [key, state]; the first is the open step, the rest are not done
      const items = steps.map((key, i) => [key, i === 0 ? 'current' : 'todo'] as const);
      for (const [key, state] of items) {
        await expect(courseStep.outlineItem(key)).toHaveAttribute('data-state', state);
      }
      await expect(courseStep.outlineItem(steps[0]!)).toHaveAttribute('aria-current', 'step');
      await expect(courseStep.back).toHaveCount(0);
      await expect(courseStep.next).toHaveAttribute('data-key', articleStep(full.articles[1]!));
    },
  );

  test(
    'Next walks forward, back returns, the read article turns done',
    { tag: '@REQ-CRS-03' },
    async ({ courseStep, course, user, signIn, api, page }) => {
      const full = chapterOf(course, 'full');
      const [first, second, ...rest] = full.articles as [string, string, ...string[]];
      const later: StepKey[] = [...rest.map(articleStep), 'practice', 'test', 'cards'];
      await signIn(user);
      await courseStep.gotoArticle(full.id, 1);
      await expect(courseStep.article).toHaveAttribute('data-key', first);

      // 1. On article 1 click course-next
      await courseStep.next.click();
      await expect(page).toHaveURL(new RegExp(`/${full.id}/article/2$`));
      await expect(courseStep.back).toHaveAttribute('data-key', articleStep(first));
      // table per item: [key, state]
      const forward: [StepKey, string][] = [
        [articleStep(first), 'done'],
        [articleStep(second), 'current'],
        ...later.map((key): [StepKey, string] => [key, 'todo']),
      ];
      for (const [key, state] of forward) {
        await expect(courseStep.outlineItem(key)).toHaveAttribute('data-state', state);
      }

      // 2. Click course-back: the first article is current again, the second was read (A7) and is done
      await courseStep.back.click();
      await expect(page).toHaveURL(new RegExp(`/${full.id}/article/1$`));
      const backward: [StepKey, string][] = [
        [articleStep(first), 'current'],
        [articleStep(second), 'done'],
        ...later.map((key): [StepKey, string] => [key, 'todo']),
      ];
      for (const [key, state] of backward) {
        await expect(courseStep.outlineItem(key)).toHaveAttribute('data-state', state);
      }
      await expect(courseStep.outlineItem(articleStep(first))).toHaveAttribute(
        'aria-current',
        'step',
      );

      // 3. Read the course record through the ApiClient
      await expect
        .poll(async () =>
          Object.keys(
            (await api.progress(user.token)).courses.playwright?.articlesRead ?? {},
          ).sort(),
        )
        .toEqual([first, second].sort());
      const progress = await api.progress(user.token);
      expect(Object.keys(progress.articlesRead)).toEqual(expect.arrayContaining([first, second]));
    },
  );

  test(
    'Last article continues to the next existing step; programme shows the article steps done',
    { tag: '@REQ-CRS-03' },
    async ({ courseStep, coursePage, course, user, signIn }) => {
      const full = chapterOf(course, 'full');
      const noCode = chapterOf(course, 'noCode');
      const lastFull = full.articles.at(-1)!;
      const lastNoCode = noCode.articles.at(-1)!;
      await signIn(user);

      // 1. Open the last article of the full chapter and read course-next
      await courseStep.gotoArticle(full.id, full.articles.length);
      await expect(courseStep.article).toHaveAttribute('data-key', lastFull);
      await expect(courseStep.next).toHaveAttribute('data-key', 'practice');

      // 2. Open the last article of the noCode chapter
      await courseStep.gotoArticle(noCode.id, noCode.articles.length);
      await expect(courseStep.article).toHaveAttribute('data-key', lastNoCode);
      await expect(courseStep.next).toHaveAttribute('data-key', 'test');

      // 3. Open /course/playwright and look at the full chapter row steps
      await coursePage.goto();
      await expect(coursePage.chapters).toHaveCount(course.length);
      await coursePage.toggle(full.id).click();
      // table per chip: [key, state]; only the opened article is done
      const chips: [StepKey, string][] = [
        [articleStep(lastFull), 'done'],
        ['practice', 'todo'],
        ['test', 'todo'],
        ['cards', 'todo'],
      ];
      for (const [key, state] of chips) {
        await expect(coursePage.step(full.id, key)).toHaveAttribute('data-state', state);
      }
    },
  );

  test(
    'Guest on chapter 3 gets the guest box, not the article; chapters 1-2 stay open',
    { tag: '@REQ-CRS-03' },
    async ({ courseStep, course }) => {
      // 1. As a guest open /course/playwright/<chapter at position 3>/article/1
      await courseStep.gotoArticle(chapterAt(course, 3).id, 1);
      await expect(courseStep.root).toBeVisible();
      await expect(courseStep.guestBox).toBeVisible();
      await expect(courseStep.guestLogin).toBeVisible();
      await expect(courseStep.guestRegister).toBeVisible();
      await expect(courseStep.article).toHaveCount(0);
      await expect(courseStep.outlineItems).toHaveCount(0);

      // 2. As a guest open /course/playwright/<chapter at position 2>/article/1
      await courseStep.gotoArticle(chapterAt(course, 2).id, 1);
      await expect(courseStep.article).toBeVisible();
      await expect(courseStep.guestBox).toHaveCount(0);
    },
  );

  test(
    'Unknown chapter or article number lands on the course page',
    { tag: '@REQ-CRS-03' },
    async ({ courseStep, coursePage, course, user, signIn, page }) => {
      const full = chapterOf(course, 'full');
      const noCode = chapterOf(course, 'noCode');
      const noCards = chapterOf(course, 'noCards');
      // table per visit: what is opened; every one ends on the course page
      const missing = [
        () => courseStep.gotoArticle('nope', 1),
        () => courseStep.gotoArticle(full.id, full.articles.length + 1),
        () => courseStep.gotoArticle(full.id, 0),
        () => courseStep.gotoStep(noCode.id, 'practice'),
        () => courseStep.gotoStep(noCards.id, 'cards'),
      ];
      await signIn(user);

      // 1-3. Open the missing chapter, the article after the last and before the first, the steps that do not exist
      for (const open of missing) {
        await open();
        await expect(page).toHaveURL(onCoursePage);
        await expect(coursePage.root).toBeVisible();
        await expect(courseStep.article).toHaveCount(0);
      }
    },
  );
});
