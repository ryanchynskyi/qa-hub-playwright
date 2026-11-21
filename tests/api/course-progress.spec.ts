// spec: specs/phase2-courses.md
// seed: tests/seed.spec.ts

import { bearer, expectError, expectStatus } from '../../src/api/client';
import { answerInCourse, chapterOf } from '../../src/helpers/course';
import { expect, test } from '../../src/fixtures';

test.describe('CRS-08 API tests', () => {
  test(
    'Scoped read, answer and rating write the course record and the global one',
    { tag: '@REQ-CRS-08' },
    async ({ api, user, course }) => {
      const chapter = chapterOf(course, 'full');
      const [article, question, card] = [
        chapter.articles[0]!,
        chapter.plain[0]!,
        chapter.cards[0]!,
      ];

      // 1. Fresh account. Scoped readArticle, correct checkAnswer and rateCard 3. Read progress.
      await api.readArticle(user.token, article, 'playwright');
      expect(await answerInCourse(api, user.token, question, 'playwright')).toBe('correct');
      await api.rateCard(user.token, card, 3, 'playwright');
      const progress = await api.progress(user.token);

      const record = progress.courses.playwright!;
      expect(record.articlesRead[article]).toBeGreaterThan(0);
      expect(record.cards[card]).toBeGreaterThan(0);
      expect(record.questions[question]).toEqual({ lastResult: 1, skipped: false });
      expect(progress.articlesRead[article]).toBeGreaterThan(0);
      expect(progress.questions[question]).toMatchObject({ lastResult: 1 });
      expect(Object.keys(progress.cards)).toEqual([card]);
      // each scoped step still earns its own XP (CRS-006), not just one of the three
      const grants = progress.xpLog.map(({ reason, refId }) => ({ reason, refId }));
      expect(grants).toEqual(
        expect.arrayContaining([
          { reason: 'article_read', refId: article },
          { reason: 'answer_first_correct', refId: question },
          { reason: 'recall', refId: card },
        ]),
      );
    },
  );

  test(
    'Unscoped writes leave courses empty',
    { tag: '@REQ-CRS-08' },
    async ({ api, user, course }) => {
      const chapter = chapterOf(course, 'full');
      const [article, question, card] = [
        chapter.articles[0]!,
        chapter.plain[0]!,
        chapter.cards[0]!,
      ];

      // 1. Fresh account: unscoped read, correct answer and rating of the same chapter.
      await api.readArticle(user.token, article);
      await api.checkAnswer(question, await api.correctIndex(question), user.token);
      await api.rateCard(user.token, card, 3);
      const progress = await api.progress(user.token);

      expect(progress.courses).toEqual({});
      expect(progress.articlesRead[article]).toBeGreaterThan(0);
      expect(progress.questions[question]).toMatchObject({ lastResult: 1 });
      expect(Object.keys(progress.cards)).toEqual([card]);
    },
  );

  test(
    'A scoped skip is recorded as skipped',
    { tag: '@REQ-CRS-08' },
    async ({ api, user, course }) => {
      const question = chapterOf(course, 'full').plain[0]!;

      // 1. Scoped checkAnswer(q, null, token, undefined, 'playwright').
      const result = await api.checkAnswer(question, null, user.token, undefined, 'playwright');
      expect(result.outcome).toBe('skipped');

      const progress = await api.progress(user.token);
      expect(progress.courses.playwright!.questions[question]).toEqual({
        lastResult: 0,
        skipped: true,
      });
      expect(progress.stats.totalXp).toBe(0);
    },
  );

  test(
    'Reset clears only its course and keeps XP, streak, KB, quiz and Recall',
    { tag: '@REQ-CRS-08' },
    async ({ api, user, course, catalog }) => {
      const chapter = chapterOf(course, 'full');
      const apiChapter = catalog.chapters.find((c) => c.topicId === 'api');
      const apiQuestion = catalog.questions.find((q) => q.chapterId === apiChapter?.id)!;
      expect(apiQuestion, 'a question of an API course chapter').toBeDefined();

      // 1. Fresh account with records in both courses plus an unscoped read, answer and rating.
      await api.readArticle(user.token, chapter.articles[0]!, 'playwright');
      await answerInCourse(api, user.token, chapter.plain[0]!, 'playwright');
      await api.rateCard(user.token, chapter.cards[0]!, 3, 'playwright');
      await answerInCourse(api, user.token, apiQuestion.id, 'api');
      await api.readArticle(user.token, chapter.articles[1]!);
      await api.checkAnswer(
        chapter.plain[1]!,
        await api.correctIndex(chapter.plain[1]!),
        user.token,
      );
      await api.rateCard(user.token, chapter.cards[1]!, 3);
      const before = await api.progress(user.token);
      expect(Object.keys(before.courses).sort()).toEqual(['api', 'playwright']);
      expect(before.stats.totalXp).toBeGreaterThan(0);
      expect(before.stats.streak).toBeGreaterThan(0);

      const res = await api.raw.post('me/courses/playwright/reset', {
        headers: bearer(user.token),
      });
      await expectStatus(res, 204);
      expect(await res.text()).toBe('');

      const after = await api.progress(user.token);
      expect(Object.keys(after.courses)).toEqual(['api']);
      expect(after.courses.api).toEqual(before.courses.api);
      expect(after.courses.api!.questions[apiQuestion.id]).toEqual({
        lastResult: 1,
        skipped: false,
      });
      expect(after.stats.totalXp).toBe(before.stats.totalXp);
      expect(after.stats.streak).toBe(before.stats.streak);
      expect(after.daily).toEqual(before.daily);
      expect(after.questions).toEqual(before.questions);
      expect(after.cards).toEqual(before.cards);
      expect(after.articlesRead).toEqual(before.articlesRead);

      // 2. resetCourse 'api', then 'api' again.
      await api.resetCourse(user.token, 'api');
      await api.resetCourse(user.token, 'api');
      expect((await api.progress(user.token)).courses).toEqual({});
    },
  );

  test(
    'After a reset the same answer earns no second XP',
    { tag: '@REQ-CRS-08' },
    async ({ api, user, course }) => {
      const question = chapterOf(course, 'full').plain[0]!;

      // 1. Scoped correct answer to q, note totalXp; resetCourse; scoped correct answer again.
      expect(await answerInCourse(api, user.token, question, 'playwright')).toBe('correct');
      const xp = (await api.progress(user.token)).stats.totalXp;
      expect(xp).toBeGreaterThan(0);

      await api.resetCourse(user.token, 'playwright');
      expect((await api.progress(user.token)).courses).toEqual({});

      expect(await answerInCourse(api, user.token, question, 'playwright')).toBe('correct');
      const progress = await api.progress(user.token);
      expect(progress.stats.totalXp).toBe(xp);
      expect(progress.courses.playwright!.questions[question]).toEqual({
        lastResult: 1,
        skipped: false,
      });
    },
  );

  test(
    'Unknown course slug is rejected with 400 everywhere',
    { tag: '@REQ-CRS-08' },
    async ({ api, user, course }) => {
      const chapter = chapterOf(course, 'full');
      const [article, question, card] = [
        chapter.articles[0]!,
        chapter.plain[0]!,
        chapter.cards[0]!,
      ];
      const headers = bearer(user.token);
      const choice = await api.correctIndex(question);

      // 1. resetCourse with slugs nope and Playwright, body-less.
      for (const slug of ['nope', 'Playwright']) {
        const res = await api.raw.post(`me/courses/${slug}/reset`, { headers });
        await expectError(res, 400, 'bad_request');
        const { message } = (await res.json()) as { message: string };
        expect(message).toContain('Invalid option');
        expect(message).toContain('"playwright"|"api"');
      }
      expect((await api.progress(user.token)).courses).toEqual({});

      // 2. Scoped checkAnswer, rateCard, readArticle with course 'nope'.
      const rejected = [
        await api.raw.post('quiz/check', {
          data: { questionId: question, choice, course: 'nope' },
          headers,
        }),
        await api.raw.post('me/recall/rate', {
          data: { cardId: card, rating: 3, course: 'nope' },
          headers,
        }),
        await api.raw.post(`me/articles/${article}/read`, { data: { course: 'nope' }, headers }),
      ];
      for (const res of rejected) {
        await expectError(res, 400, 'bad_request');
        expect(((await res.json()) as { message: string }).message).toMatch(/^course:/);
      }

      const progress = await api.progress(user.token);
      expect(progress.questions).toEqual({});
      expect(progress.cards).toEqual({});
      expect(progress.articlesRead).toEqual({});
      expect(progress.courses).toEqual({});
      expect(progress.stats.totalXp).toBe(0);
    },
  );

  test('Reset without a token is 401', { tag: '@REQ-CRS-08' }, async ({ api, user, course }) => {
    const question = chapterOf(course, 'full').plain[0]!;
    await answerInCourse(api, user.token, question, 'playwright');

    // 1. POST /me/courses/playwright/reset with no Authorization header.
    await expectError(await api.raw.post('me/courses/playwright/reset'), 401, 'unauthorized');

    // the record of the account the test made is still there
    const progress = await api.progress(user.token);
    expect(progress.courses.playwright!.questions[question]).toEqual({
      lastResult: 1,
      skipped: false,
    });
  });

  test(
    'A read inside the course still advances the READ_ARTICLE task',
    { tag: '@REQ-CRS-08' },
    async ({ api, user }) => {
      // 1. Fresh account, setDailyCount 5: a READ_ARTICLE task with its chapter's first article.
      await api.setDailyCount(user.token, 5);
      const before = await api.progress(user.token);
      const task = before.daily!.tasks.find((t) => t.type === 'READ_ARTICLE')!;
      expect(task).toBeDefined();
      const [article] = (await api.chapter(task.params.chapterId!)).articles;
      expect(task.progress).toBe(0);

      // 2. Scoped readArticle(token, article, 'playwright').
      // the task's chapter may lie outside the course: the server takes it anyway (A14)
      await api.readArticle(user.token, article!.id, 'playwright');
      const progress = await api.progress(user.token);
      const after = progress.daily!.tasks.find((t) => t.id === task.id)!;
      expect(after.progress).toBe(task.target);
      expect(after.completedAt).not.toBeNull();
      expect(
        progress.xpLog.filter((g) => g.reason === 'daily_task' && g.refId === task.id),
      ).toEqual([expect.objectContaining({ amount: task.rewardXp })]);
      expect(progress.courses.playwright!.articlesRead[article!.id]).toBeGreaterThan(0);
    },
  );
});
