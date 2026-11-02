import { bearer, type ApiClient } from '../../src/api/client';
import type { Catalog, DailyTask, Progress } from '../../src/api/schemas';
import { expect, test } from '../../src/fixtures';

function taskOfType(progress: Progress, type: DailyTask['type']): DailyTask {
  const task = progress.daily!.tasks.find((t) => t.type === type);
  if (!task) throw new Error(`No ${type} task in the set`);
  return task;
}

function taskById(progress: Progress, id: string): DailyTask {
  return progress.daily!.tasks.find((t) => t.id === id)!;
}

function rewardsFor(progress: Progress, taskId: string) {
  return progress.xpLog.filter((grant) => grant.reason === 'daily_task' && grant.refId === taskId);
}

/**
 * A fresh account has no weak chapters and no due cards, so 5 tasks are ANSWER_N, ACCURACY,
 * CODE_REVIEW and READ_ARTICLE in any order, then an ANSWER_N with a topic in the last slot.
 */
async function fullSet(api: ApiClient, token: string): Promise<Progress> {
  await api.setDailyCount(token, 5);
  return api.progress(token);
}

/** The right option, or the one after it for a wrong answer. */
function wrongUnless(isRight: boolean, right: number, options: number): number {
  return isRight ? right : (right + 1) % options;
}

async function answerCorrectly(api: ApiClient, token: string, questionId: string): Promise<void> {
  await api.checkAnswer(questionId, await api.correctIndex(questionId), token);
}

/** Answers `answered` questions of one section, `correct` of them right, and finishes the quiz. */
async function finishRun(
  api: ApiClient,
  token: string,
  catalog: Catalog,
  answered: number,
  correct: number,
): Promise<void> {
  const section = catalog.sections.find((s) => !s.codeReview && s.questionCount >= answered)!;
  const questions = (await api.questions(section.id)).slice(0, answered);
  for (const [index, question] of questions.entries()) {
    const right = await api.correctIndex(question.id);
    const choice = wrongUnless(index < correct, right, question.options.length);
    await api.checkAnswer(question.id, choice, token);
  }
  await api.finishQuiz(
    token,
    section.id,
    questions.map((q) => q.id),
  );
}

function codeReviewQuestions(catalog: Catalog, task: DailyTask): string[] {
  const sections = task.params.sectionIds!;
  return catalog.questions.filter((q) => sections.includes(q.sectionId)).map((q) => q.id);
}

function firstQuestionOf(catalog: Catalog, match: (topicId: string) => boolean): string {
  const sections = catalog.sections.filter((s) => match(s.topicId)).map((s) => s.id);
  return catalog.questions.find((q) => sections.includes(q.sectionId))!.id;
}

test.describe('daily task count', { tag: ['@REQ-PROG-02'] }, () => {
  test('a new user has 3 untouched tasks', async ({ api, user }) => {
    const { dailyTaskCount, daily } = await api.progress(user.token);
    expect(dailyTaskCount).toBe(3);
    // register() sends this time zone
    expect(daily!.date).toBe(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Kyiv' }));
    expect(daily!.tasks.map((t) => t.id)).toEqual(
      [0, 1, 2].map((slot) => `${daily!.date}:${slot}`),
    );
    for (const task of daily!.tasks) {
      expect(task).toMatchObject({ progress: 0, completedAt: null });
    }
  });

  for (const count of [3, 4, 5]) {
    test(`accepts a count of ${count}`, async ({ api, user }) => {
      const saved = await api.setDailyCount(user.token, count);
      expect(saved.dailyTaskCount).toBe(count);
      expect(saved.daily!.tasks).toHaveLength(count);

      const { dailyTaskCount, daily } = await api.progress(user.token);
      expect(dailyTaskCount).toBe(count);
      expect(daily).toEqual(saved.daily);
    });
  }

  for (const body of [
    { count: 2 },
    { count: 6 },
    { count: 0 },
    { count: -1 },
    { count: 4.5 },
    { count: '4' },
    { count: null },
    {},
  ]) {
    test(`rejects ${JSON.stringify(body)}`, async ({ api, user }) => {
      const res = await api.raw.put('me/daily-count', {
        data: body,
        headers: bearer(user.token),
      });
      expect(res.status()).toBe(400);
      expect(await res.json()).toMatchObject({ error: 'bad_request' });
      expect((await api.progress(user.token)).dailyTaskCount).toBe(3);
    });
  }

  for (const [name, token] of [
    ['no token', undefined],
    ['a bad token', 'not-a-token'],
  ] as const) {
    test(`needs a session: ${name}`, async ({ api, user }) => {
      const res = await api.raw.put('me/daily-count', {
        data: { count: 4 },
        headers: bearer(token),
      });
      expect(res.status()).toBe(401);
      expect((await api.progress(user.token)).dailyTaskCount).toBe(3);
    });
  }

  test('an untouched set resizes at once and keeps its first tasks', async ({ api, user }) => {
    const original = (await api.progress(user.token)).daily!.tasks;

    const larger = await api.setDailyCount(user.token, 5);
    expect(larger.daily!.tasks.slice(0, 3)).toEqual(original);

    const back = await api.setDailyCount(user.token, 3);
    expect(back.daily!.tasks).toEqual(original);
  });

  test('a started set keeps its tasks and size', async ({ api, user, catalog }) => {
    await api.setDailyCount(user.token, 4);
    const before = await api.progress(user.token);
    const [questionId] = codeReviewQuestions(catalog, taskOfType(before, 'CODE_REVIEW'));
    await answerCorrectly(api, user.token, questionId!);
    const started = (await api.progress(user.token)).daily;
    expect(started!.tasks.some((t) => t.progress > 0)).toBe(true);

    const saved = await api.setDailyCount(user.token, 5);
    expect(saved.dailyTaskCount).toBe(5);
    expect(saved.daily).toEqual(started);

    const after = await api.progress(user.token);
    expect(after.dailyTaskCount).toBe(5);
    expect(after.daily).toEqual(started);
  });
});

test.describe('daily task progress', { tag: ['@REQ-PROG-03'] }, () => {
  test('rewardXp by task type', async ({ api, user }) => {
    const { daily } = await fullSet(api, user.token);
    const rewards = new Map(daily!.tasks.map((t) => [t.type, t.rewardXp]));
    expect(Object.fromEntries(rewards)).toEqual({
      ANSWER_N: 30,
      ACCURACY: 40,
      CODE_REVIEW: 35,
      READ_ARTICLE: 20,
    });
  });

  test('CODE_REVIEW counts only correct answers of its sections', async ({
    api,
    user,
    catalog,
  }) => {
    const set = await fullSet(api, user.token);
    const task = taskOfType(set, 'CODE_REVIEW');
    const [questionId] = codeReviewQuestions(catalog, task);
    const progress = async () => taskById(await api.progress(user.token), task.id).progress;

    const correct = await api.correctIndex(questionId!);
    const options = (
      await api.questions(catalog.questions.find((q) => q.id === questionId)!.sectionId)
    ).find((q) => q.id === questionId)!.options.length;
    await api.checkAnswer(questionId!, (correct + 1) % options, user.token);
    expect(await progress()).toBe(0);

    const elsewhere = catalog.questions.find((q) => !task.params.sectionIds!.includes(q.sectionId));
    await answerCorrectly(api, user.token, elsewhere!.id);
    expect(await progress()).toBe(0);

    await api.checkAnswer(questionId!, correct, user.token);
    expect(await progress()).toBe(1);
  });

  test('ANSWER_N counts answers of its topic, not skips', async ({ api, user, catalog }) => {
    const set = await fullSet(api, user.token);
    const task = set.daily!.tasks[4]!;
    expect(task.type).toBe('ANSWER_N');
    const progress = async () => taskById(await api.progress(user.token), task.id).progress;

    const inTopic = firstQuestionOf(catalog, (topicId) => topicId === task.params.topicId);
    const otherTopic = firstQuestionOf(catalog, (topicId) => topicId !== task.params.topicId);

    await answerCorrectly(api, user.token, otherTopic);
    expect(await progress()).toBe(0);

    await api.checkAnswer(inTopic, null, user.token);
    expect(await progress()).toBe(0);

    await answerCorrectly(api, user.token, inTopic);
    expect(await progress()).toBe(1);
  });

  test('ANSWER_N counts a wrong answer and is done at its target', async ({
    api,
    user,
    catalog,
  }) => {
    const set = await fullSet(api, user.token);
    const task = set.daily!.tasks[4]!;
    expect(task.type).toBe('ANSWER_N');
    const sections = catalog.sections.filter((s) => s.topicId === task.params.topicId);
    const asked = await Promise.all(sections.map((s) => api.questions(s.id)));
    const [first, ...rest] = asked.flat().slice(0, task.target);

    const right = await api.correctIndex(first!.id);
    await api.checkAnswer(first!.id, wrongUnless(false, right, first!.options.length), user.token);
    expect(taskById(await api.progress(user.token), task.id).progress).toBe(1);

    for (const question of rest) await answerCorrectly(api, user.token, question.id);
    const progress = await api.progress(user.token);
    expect(taskById(progress, task.id).progress).toBe(task.target);
    expect(taskById(progress, task.id).completedAt).not.toBeNull();
    expect(rewardsFor(progress, task.id)).toEqual([
      expect.objectContaining({ amount: task.rewardXp }),
    ]);
  });

  test('a task is done at its target and pays once', async ({ api, user, catalog }) => {
    const set = await fullSet(api, user.token);
    const task = taskOfType(set, 'CODE_REVIEW');
    const questions = codeReviewQuestions(catalog, task);
    const answer = (index: number) => answerCorrectly(api, user.token, questions[index]!);

    await answer(0);
    await answer(1);
    let progress = await api.progress(user.token);
    expect(taskById(progress, task.id)).toMatchObject({
      progress: task.target - 1,
      completedAt: null,
    });
    expect(rewardsFor(progress, task.id)).toEqual([]);

    await answer(2);
    progress = await api.progress(user.token);
    expect(taskById(progress, task.id).progress).toBe(task.target);
    expect(taskById(progress, task.id).completedAt).not.toBeNull();
    expect(rewardsFor(progress, task.id)).toEqual([
      expect.objectContaining({ amount: task.rewardXp }),
    ]);

    await answer(3);
    await answer(4);
    progress = await api.progress(user.token);
    expect(taskById(progress, task.id).progress).toBe(task.target);
    expect(rewardsFor(progress, task.id)).toHaveLength(1);
  });

  test('READ_ARTICLE needs an article of its chapter and pays once', async ({
    api,
    user,
    catalog,
  }) => {
    const set = await fullSet(api, user.token);
    const task = taskOfType(set, 'READ_ARTICLE');
    const other = catalog.chapters.find(
      (c) => c.id !== task.params.chapterId && c.articleCount > 0,
    );
    const [elsewhere] = (await api.chapter(other!.id)).articles;
    const [article] = (await api.chapter(task.params.chapterId!)).articles;

    await api.readArticle(user.token, elsewhere!.id);
    expect(taskById(await api.progress(user.token), task.id).progress).toBe(0);

    await api.readArticle(user.token, article!.id);
    await api.readArticle(user.token, article!.id);
    const progress = await api.progress(user.token);
    expect(taskById(progress, task.id).progress).toBe(task.target);
    expect(rewardsFor(progress, task.id)).toEqual([
      expect.objectContaining({ amount: task.rewardXp }),
    ]);
  });

  // minAnswered 10 and minRatio 0.8 ($APP_DIR packages/shared/src/engine/xp.ts).
  for (const { answered, correct, done } of [
    { answered: 10, correct: 8, done: true },
    { answered: 10, correct: 7, done: false },
    { answered: 9, correct: 9, done: false },
  ]) {
    test(`ACCURACY after a run of ${answered} with ${correct} correct: ${done ? 'done' : 'not done'}`, async ({
      api,
      user,
      catalog,
    }) => {
      const set = await fullSet(api, user.token);
      const task = taskOfType(set, 'ACCURACY');
      await finishRun(api, user.token, catalog, answered, correct);

      const progress = await api.progress(user.token);
      expect(taskById(progress, task.id).progress).toBe(done ? 1 : 0);
      expect(rewardsFor(progress, task.id).map((grant) => grant.amount)).toEqual(
        done ? [task.rewardXp] : [],
      );
    });
  }

  test('ACCURACY pays once when the run is finished again', async ({ api, user, catalog }) => {
    const set = await fullSet(api, user.token);
    const task = taskOfType(set, 'ACCURACY');

    await finishRun(api, user.token, catalog, 10, 10);
    await finishRun(api, user.token, catalog, 10, 10);

    const progress = await api.progress(user.token);
    expect(taskById(progress, task.id).progress).toBe(task.target);
    expect(rewardsFor(progress, task.id)).toHaveLength(1);
  });

  test('one user completing a task does not touch another', async ({ api, user, otherUser }) => {
    const set = await fullSet(api, user.token);
    const task = taskOfType(set, 'READ_ARTICLE');
    const before = await api.progress(otherUser.token);

    const [article] = (await api.chapter(task.params.chapterId!)).articles;
    await api.readArticle(user.token, article!.id);

    expect(taskById(await api.progress(user.token), task.id).completedAt).not.toBeNull();
    expect((await api.progress(otherUser.token)).daily).toEqual(before.daily);
  });
});
