// spec: specs/phase2-courses.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';
import { answerInCourse, chapterAt, chapterOf, completeChapter } from '../../src/helpers/course';
import { articleStep } from '../../src/pages/course-step-page';

test.describe('CRS-08 Own course progress and reset', () => {
  test(
    'KB read, plain quiz answer and Recall rating do not count into the course',
    { tag: '@REQ-CRS-08' },
    async ({ courses, coursePage, kb, api, course, user, signIn }) => {
      const full = chapterOf(course, 'full');
      const [article, question, card] = [full.articles[0]!, full.plain[0]!, full.cards[0]!];

      // 1. Unscoped read, correct answer and rating of the first article, question and card
      await api.readArticle(user.token, article);
      await api.checkAnswer(question, await api.correctIndex(question), user.token);
      await api.rateCard(user.token, card, 3);
      const progress = await api.progress(user.token);
      expect(progress.courses).toEqual({});
      expect(progress.articlesRead[article]).toBeGreaterThan(0);
      expect(progress.questions[question]).toMatchObject({ lastResult: 1 });
      expect(Object.keys(progress.cards)).toContain(card);

      // 1b. Sign in and read the first Playwright article in /kb (the KB UI sends no course)
      await signIn(user);
      await kb.gotoTopic('playwright');
      const kbArticle = await kb.firstArticleId();
      await kb.openArticle(kbArticle);
      await expect
        .poll(async () => (await api.progress(user.token)).articlesRead[kbArticle])
        .toBeGreaterThan(0);
      expect((await api.progress(user.token)).courses).toEqual({});

      // 2. Open /course/playwright
      await coursePage.goto();
      await expect(coursePage.panelCta).toHaveAttribute('data-state', 'start');
      await expect(coursePage.reset).toHaveCount(0);
      await expect(coursePage.progress).toHaveAttribute('data-value', '0');
      const [first, ...rest] = course;
      await expect(coursePage.chapter(first!.id)).toHaveAttribute('data-state', 'current');
      for (const row of rest) {
        await expect(coursePage.chapter(row.id)).toHaveAttribute('data-state', 'todo');
      }
      // only the open chapter lists its steps; `full` is not the current one today
      await coursePage.toggle(full.id).click();
      await expect(coursePage.toggle(full.id)).toHaveAttribute('data-state', 'open');
      await expect(coursePage.step(full.id, articleStep(article))).toHaveAttribute(
        'data-state',
        'todo',
      );

      // 3. Open /course
      await courses.goto();
      await expect(courses.cta('playwright')).toHaveAttribute('data-state', 'start');
      await expect(courses.progress('playwright')).toHaveAttribute('data-value', '0');
      await expect(courses.bar('playwright')).toHaveCount(0);
    },
  );

  test(
    'The same step inside the course counts and earns XP',
    { tag: '@REQ-CRS-08' },
    async ({ courseStep, coursePage, quiz, api, course, user, signIn }) => {
      const full = chapterOf(course, 'full');
      await signIn(user);

      // 1. Open /test in the UI and answer the first question correctly
      await courseStep.gotoStep(full.id, 'test');
      await expect(quiz.question).toHaveAttribute('data-key', full.plain[0]!);
      await quiz.answerCorrectly(api);
      const gain = await quiz.shownXpGain();
      expect(gain).toBeGreaterThan(0);
      const progress = await api.progress(user.token);
      const answers = progress.xpLog.filter((g) => g.reason === 'answer_first_correct');
      expect(answers).toEqual([
        { amount: gain, reason: 'answer_first_correct', refId: full.plain[0]! },
      ]);
      const streak = progress.xpLog
        .filter((g) => g.reason === 'streak')
        .reduce((n, g) => n + g.amount, 0);
      expect(progress.stats.totalXp).toBe(gain + streak);
      expect(progress.courses.playwright?.questions[full.plain[0]!]).toEqual({
        lastResult: 1,
        skipped: false,
      });

      // 2. Open /course/playwright
      await coursePage.goto();
      await expect(coursePage.panelCta).toHaveAttribute('data-state', 'continue');
      await expect(coursePage.progress).toHaveAttribute('data-value', '0');
      await expect(coursePage.reset).toHaveAttribute('data-key', 'playwright');
    },
  );

  test(
    'Reset dialog: cancel keeps the course, confirm clears only its record',
    { tag: '@REQ-CRS-08' },
    async ({ coursePage, api, course, catalog, user, signIn }) => {
      const full = chapterOf(course, 'full');
      const apiChapter = catalog.chapters.find((c) => c.topicId === 'api');
      const apiQuestion = catalog.questions.find((q) => q.chapterId === apiChapter?.id)!;
      expect(apiQuestion, 'a question of an API course chapter').toBeDefined();

      // 1. Arrange the two courses; sign in; open /course/playwright; click reset
      await completeChapter(api, user.token, full);
      await answerInCourse(api, user.token, apiQuestion.id, 'api');
      const before = await api.progress(user.token);
      expect(Object.keys(before.courses).sort()).toEqual(['api', 'playwright']);
      await signIn(user);
      await coursePage.goto();
      await expect(coursePage.chapter(full.id)).toHaveAttribute('data-state', 'done');
      await expect(coursePage.progress).toHaveAttribute('data-value', '1');
      await coursePage.reset.click();
      await expect(coursePage.resetDialog).toBeVisible();
      await expect(coursePage.resetDialog).toHaveAttribute('data-key', 'playwright');
      await expect(coursePage.resetDialog).toHaveAttribute('role', 'alertdialog');

      // 2. Click cancel
      await coursePage.resetCancel.click();
      await expect(coursePage.resetDialog).toHaveCount(0);
      await expect(coursePage.reset).toBeVisible();
      await expect(coursePage.progress).toHaveAttribute('data-value', '1');
      // and the server kept the record too
      expect((await api.progress(user.token)).courses.playwright).toEqual(
        before.courses.playwright,
      );

      // 3. Click reset, then confirm
      await coursePage.reset.click();
      await expect(coursePage.resetDialog).toBeVisible();
      await coursePage.resetConfirm.click();
      await expect(coursePage.resetDialog).toHaveCount(0);
      await expect(coursePage.reset).toHaveCount(0);
      await expect(coursePage.progress).toHaveAttribute('data-value', '0');
      await expect(coursePage.panelCta).toHaveAttribute('data-state', 'start');
      await expect(coursePage.chapter(chapterAt(course, 1).id)).toHaveAttribute(
        'data-state',
        'current',
      );
      for (const row of course.slice(1)) {
        await expect(coursePage.chapter(row.id)).toHaveAttribute('data-state', 'todo');
      }

      // 4. Read progress through the ApiClient
      const after = await api.progress(user.token);
      expect(Object.keys(after.courses)).toEqual(['api']);
      expect(after.courses.api).toEqual(before.courses.api);
      expect(after.questions).toEqual(before.questions);
      expect(after.cards).toEqual(before.cards);
      expect(after.articlesRead).toEqual(before.articlesRead);
      expect(after.stats.totalXp).toBe(before.stats.totalXp);
    },
  );
});
