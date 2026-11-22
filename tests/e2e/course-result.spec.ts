// spec: specs/phase2-courses.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';
import {
  answerInCourse,
  chapterAt,
  chapterOf,
  completeChapter,
  GUEST_CHAPTERS,
  missInCourse,
} from '../../src/helpers/course';
import { CourseStepPage } from '../../src/pages/course-step-page';

test.describe('CRS-06 Chapter result', () => {
  test(
    'Result score and score bar match the answers',
    { tag: '@REQ-CRS-06' },
    async ({ courseStep, api, course, user, signIn }) => {
      const full = chapterOf(course, 'full');
      const total = String(full.plain.length);
      await signIn(user);

      // 1. The first two plain questions right, the rest wrong; open /result
      for (const id of full.plain.slice(0, 2)) await answerInCourse(api, user.token, id);
      for (const id of full.plain.slice(2)) await missInCourse(api, user.token, id);
      await courseStep.gotoStep(full.id, 'result');
      await expect(courseStep.result).toHaveAttribute('data-key', full.id);
      await expect(courseStep.score).toHaveAttribute('data-value', '2');
      await expect(courseStep.score).toHaveAttribute('data-total', total);

      // 2. Read the score bar (which segment is wrong has no attribute, A15)
      await expect(courseStep.scoreSegments).toHaveCount(full.plain.length);
    },
  );

  test(
    'course-xp equals the XP of the first correct answers and is absent at zero',
    { tag: '@REQ-CRS-06' },
    async ({ courseStep, api, course, user, signIn, otherUser, otherPage }) => {
      const full = chapterOf(course, 'full');
      const otherStep = new CourseStepPage(otherPage);
      await signIn(user);

      // 1. Fresh account A: every plain question wrong; open /result
      for (const id of full.plain) await missInCourse(api, user.token, id);
      await courseStep.gotoStep(full.id, 'result');
      await expect(courseStep.score).toHaveAttribute('data-value', '0');
      await expect(courseStep.xp).toHaveCount(0);

      // 2. Fresh account B: every plain question right (no reads, no ratings); open /result
      for (const id of full.plain) await answerInCourse(api, otherUser.token, id);
      // the chip counts the first-correct grants only; the day's streak grant is not the chapter's
      const { xpLog } = await api.progress(otherUser.token);
      const answerXp = xpLog
        .filter((g) => g.reason === 'answer_first_correct')
        .reduce((n, g) => n + g.amount, 0);
      await otherStep.gotoStep(full.id, 'result');
      await expect(otherStep.score).toHaveAttribute('data-value', String(full.plain.length));
      await expect(otherStep.xp).toHaveAttribute('data-value', String(answerXp));
    },
  );

  test(
    'course-xp adds the first read of each article',
    { tag: '@REQ-CRS-06' },
    async ({ courseStep, api, course, user, signIn }) => {
      const full = chapterOf(course, 'full');
      await signIn(user);

      // 1. Read every article and answer the plain questions right (scoped); open /result
      for (const id of full.articles) await api.readArticle(user.token, id, 'playwright');
      for (const id of full.plain) await answerInCourse(api, user.token, id);
      // the chapter's grants: first correct answers and first article reads (not the streak)
      const { xpLog } = await api.progress(user.token);
      const reasons = ['answer_first_correct', 'article_read'];
      const chapterXp = xpLog
        .filter((g) => reasons.includes(g.reason))
        .reduce((n, g) => n + g.amount, 0);
      expect(xpLog.filter((g) => g.reason === 'article_read')).toHaveLength(full.articles.length);
      await courseStep.gotoStep(full.id, 'result');
      await expect(courseStep.xp).toHaveAttribute('data-value', String(chapterXp));
    },
  );

  test(
    'result-step rows show done and todo with a/b',
    { tag: '@REQ-CRS-06' },
    async ({ courseStep, api, course, user, signIn }) => {
      const full = chapterOf(course, 'full');
      const [missed, ...rest] = full.plain;
      await signIn(user);

      // 1. Read every article, code questions wrong, one plain wrong, the rest right, no cards
      for (const id of full.articles) await api.readArticle(user.token, id, 'playwright');
      for (const id of full.code) await missInCourse(api, user.token, id);
      await missInCourse(api, user.token, missed!);
      for (const id of rest) await answerInCourse(api, user.token, id);
      await courseStep.gotoStep(full.id, 'result');
      // [row, state, value, total]; the «· помилка» marker has no attribute (A15)
      const rows = [
        ['article', 'done', full.articles.length, full.articles.length],
        ['practice', 'done', 0, full.code.length],
        ['test', 'done', full.plain.length - 1, full.plain.length],
        ['cards', 'todo', 0, full.cards.length],
      ] as const;
      for (const [key, state, value, total] of rows) {
        const row = courseStep.resultStep(key);
        await expect(row).toHaveAttribute('data-state', state);
        await expect(row).toHaveAttribute('data-value', String(value));
        await expect(row).toHaveAttribute('data-total', String(total));
      }
    },
  );

  test(
    'Повторити помилки: retry run, skip, finish and the fixed line',
    { tag: '@REQ-CRS-06' },
    async ({ courseStep, quiz, api, course, user, signIn, page }) => {
      const full = chapterOf(course, 'full');
      const wrong = [...full.code, ...full.plain];
      const mistakes = wrong.length;
      await signIn(user);
      for (const id of wrong) await missInCourse(api, user.token, id);

      // 1. Open /result, read the retry count and click it
      await courseStep.gotoStep(full.id, 'result');
      await expect(courseStep.failRetry).toBeVisible();
      await expect.poll(() => courseStep.failRetryCount()).toBe(mistakes);
      await courseStep.failRetry.click();
      await expect(page).toHaveURL(new RegExp(`/${full.id}/retry$`));
      await expect(courseStep.retry).toHaveAttribute('data-key', full.id);
      await expect(courseStep.counter).toHaveAttribute('data-total', String(mistakes));
      const first = await quiz.currentQuestionId();
      expect(wrong).toContain(first);

      // 2. Answer the first correctly (XP rises by the verdict's gain), Enter, skip the second
      const before = (await api.progress(user.token)).stats.totalXp;
      await quiz.answerCorrectly(api);
      const gain = await quiz.shownXpGain();
      expect(gain).toBeGreaterThan(0);
      await expect
        .poll(async () => (await api.progress(user.token)).stats.totalXp)
        .toBe(before + gain);
      await page.keyboard.press('Enter');
      await expect(courseStep.counter).toHaveAttribute('data-value', '2');
      const second = await quiz.currentQuestionId();
      expect(wrong).toContain(second);
      expect(second).not.toBe(first);
      await courseStep.retrySkip.click();
      await expect(courseStep.counter).toHaveAttribute('data-value', '3');
      await expect(quiz.verdict).toHaveCount(0);
      const third = await quiz.currentQuestionId();
      expect(wrong).toContain(third);
      expect([first, second]).not.toContain(third);

      // 3. Finish on the third question
      await courseStep.retryFinish.click();
      await expect(page).toHaveURL(new RegExp(`/${full.id}/result$`));
      await expect(courseStep.retryFixed).toHaveAttribute('data-value', '1');
      await expect(courseStep.retryFixed).toHaveAttribute('data-total', String(mistakes));
      await expect.poll(() => courseStep.failRetryCount()).toBe(mistakes - 1);
      // the fixed question counts right in the row it belongs to
      await expect(courseStep.resultStep('practice')).toHaveAttribute(
        'data-value',
        String(full.code.filter((id) => id === first).length),
      );
      await expect(courseStep.resultStep('test')).toHaveAttribute(
        'data-value',
        String(full.plain.filter((id) => id === first).length),
      );

      // 4. Open /result on a fresh visit (a reload keeps the line, A16): it is gone, W - 1 stays
      await courseStep.gotoStepFresh(full.id, 'result');
      await expect(courseStep.failRetry).toBeVisible();
      await expect(courseStep.retryFixed).toHaveCount(0);
      await expect.poll(() => courseStep.failRetryCount()).toBe(mistakes - 1);
    },
  );

  test(
    'Skip on the last retry question leaves for the result; nothing to retry redirects',
    { tag: '@REQ-CRS-06' },
    async ({ courseStep, quiz, api, course, user, signIn, page, otherUser, otherPage }) => {
      const full = chapterOf(course, 'full');
      const otherStep = new CourseStepPage(otherPage);
      await signIn(user);

      // 1. Exactly one wrong question; open /retry: the run holds that question only
      await missInCourse(api, user.token, full.plain[0]!);
      for (const id of [...full.code, ...full.plain.slice(1)])
        await answerInCourse(api, user.token, id);
      await courseStep.gotoStep(full.id, 'retry');
      await expect(courseStep.counter).toHaveAttribute('data-value', '1');
      await expect(courseStep.counter).toHaveAttribute('data-total', '1');
      await expect(quiz.question).toHaveAttribute('data-key', full.plain[0]!);
      await expect(courseStep.retrySkip).toBeVisible();

      // 2. Skip: the last one leaves for the result, the mistake is still counted
      await courseStep.retrySkip.click();
      await expect(page).toHaveURL(new RegExp(`/${full.id}/result$`));
      await expect(courseStep.failRetry).toBeVisible();
      await expect.poll(() => courseStep.failRetryCount()).toBe(1);

      // 3. Fresh account, every question right: /retry redirects to the result
      await completeChapter(api, otherUser.token, full);
      await otherStep.gotoStep(full.id, 'retry');
      await expect(otherPage).toHaveURL(new RegExp(`/${full.id}/result$`));
      await expect(otherStep.next).toBeVisible();
      await expect(otherStep.failRetry).toHaveCount(0);
    },
  );

  test(
    'Next-step button: next undone step, then next chapter',
    { tag: '@REQ-CRS-06' },
    async ({ courseStep, api, course, user, signIn, otherUser, otherPage }) => {
      const full = chapterOf(course, 'full');
      const following = chapterAt(course, full.position + 1);
      const otherStep = new CourseStepPage(otherPage);
      await signIn(user);

      // 1. Fresh account: articles read and plain questions answered; open /result. The first
      // undone step is Практика, not the chapter's first step.
      for (const id of full.articles) await api.readArticle(user.token, id, 'playwright');
      for (const id of full.plain) await answerInCourse(api, user.token, id);
      await courseStep.gotoStep(full.id, 'result');
      await expect(courseStep.next).toHaveAttribute('data-key', 'practice');

      // 2. Fresh account: the whole chapter done; next-chapter opens the following chapter
      await completeChapter(api, otherUser.token, full);
      await otherStep.gotoStep(full.id, 'result');
      await expect(otherStep.next).toHaveAttribute('data-key', 'next-chapter');
      await otherStep.next.click();
      await expect(otherPage).toHaveURL(new RegExp(`/${following.id}/article/1$`));
      await expect(otherStep.ctx).toHaveAttribute('data-key', following.id);
    },
  );

  test(
    'After the last chapter the result leads to the course summary',
    { tag: '@REQ-CRS-06' },
    async ({ courseStep, api, course, user, signIn, page }) => {
      const last = chapterAt(course, course.length);
      await signIn(user);

      // 1. The last chapter done; open its /result
      await completeChapter(api, user.token, last);
      await courseStep.gotoStep(last.id, 'result');
      await expect(courseStep.next).toHaveAttribute('data-key', 'done');
      await expect(courseStep.summaryLink).toHaveAttribute('href', /\/course\/playwright\/done$/);

      // 2. Open the result of a chapter that does not exist
      await courseStep.gotoStep('nope', 'result');
      await expect(page).toHaveURL((url) => url.pathname === '/course/playwright');
      await expect(courseStep.result).toHaveCount(0);
    },
  );

  test(
    'Guest on a locked chapter gets the guest box on the retry run',
    { tag: '@REQ-CRS-06' },
    async ({ courseStep, course }) => {
      await courseStep.gotoStep(chapterAt(course, GUEST_CHAPTERS + 1).id, 'retry');
      await expect(courseStep.guestBox).toBeVisible();
      await expect(courseStep.retry).toHaveCount(0);
    },
  );

  test(
    'Guest on a locked chapter gets the guest box instead of the result',
    { tag: '@REQ-CRS-06' },
    async ({ courseStep, course }) => {
      // 3. As a guest open /result of the first locked chapter (split from the test above: a
      // guest and two accounts do not fit one test, authedPage-is-page)
      await courseStep.gotoStep(chapterAt(course, GUEST_CHAPTERS + 1).id, 'result');
      await expect(courseStep.guestBox).toBeVisible();
      await expect(courseStep.score).toHaveCount(0);
    },
  );
});
