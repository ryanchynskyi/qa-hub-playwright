import { bearer, expectError, expectStatus, type ApiClient } from '../../src/api/client';
import type { Catalog, Plan } from '../../src/api/schemas';
import { expect, test } from '../../src/fixtures';
import { localDate } from '../../src/helpers/data';

// spec: specs/phase2-plan.md (scenarios 5.1, 5.2, 6.1–6.4)

const today = localDate(0);

/** Topic id of every chapter. */
const topicOf = (catalog: Catalog) => new Map(catalog.chapters.map((c) => [c.id, c.topicId]));

/** Chapters of the topic with the most questions: enough for two 60-minute days. */
function biggestTopicChapters(catalog: Catalog): string[] {
  const topics = topicOf(catalog);
  const count = new Map<string, number>();
  for (const q of catalog.questions) {
    const t = topics.get(q.chapterId)!;
    count.set(t, (count.get(t) ?? 0) + 1);
  }
  const [biggest] = [...count].sort((a, b) => b[1] - a[1])[0]!;
  return catalog.chapters.filter((c) => c.topicId === biggest).map((c) => c.id);
}

/**
 * Per topic, its first chapter with ≥ 2 middle questions (a chapter is scored from 2 answers), and
 * two of those questions; topics in catalogue order.
 */
function scorableChapters(catalog: Catalog) {
  const byChapter = new Map<string, string[]>();
  for (const q of catalog.questions.filter((q) => q.level === 'middle'))
    byChapter.set(q.chapterId, [...(byChapter.get(q.chapterId) ?? []), q.id]);
  const topics = topicOf(catalog);
  const byTopic = new Map<string, { topicId: string; chapterId: string; questionIds: string[] }>();
  for (const [chapterId, ids] of byChapter) {
    const topicId = topics.get(chapterId)!;
    if (ids.length >= 2 && !byTopic.has(topicId))
      byTopic.set(topicId, { topicId, chapterId, questionIds: ids.slice(0, 2) });
  }
  return [...byTopic.values()];
}

async function wrongIndex(api: ApiClient, questionId: string): Promise<number> {
  return (await api.correctIndex(questionId)) === 0 ? 1 : 0;
}

/** Interview in 3 days: plan days today, tomorrow and «Фініш» (the day after tomorrow). */
async function threeDayPlan(
  api: ApiClient,
  catalog: Catalog,
  token: string,
  minutesPerDay: 15 | 30 | 60 = 15,
): Promise<Plan> {
  const chapterIds = biggestTopicChapters(catalog);
  await api.createInterview(token, {
    date: localDate(3),
    level: 'middle',
    chapterIds,
    minutesPerDay,
  });
  return api.plan(token);
}

/** Starts today's test round and answers every question of it (option 0, right or wrong). */
async function answerTodaysRound(api: ApiClient, token: string): Promise<void> {
  const { questionIds } = await api.startPlanDay(token, today);
  for (const id of questionIds) await api.checkAnswer(id, 0, token);
}

test.describe('plan days', () => {
  for (const minutes of [15, 30, 60] as const) {
    test(
      `${minutes} min a day: day size ${minutes}, ${minutes / 5} cards, «Фініш» 15 questions and no cards`,
      { tag: ['@REQ-PLAN-05'] },
      async ({ api, catalog, user }) => {
        const plan = await threeDayPlan(api, catalog, user.token, minutes);
        const finish = plan.days.at(-1)!;
        const regular = plan.days.slice(0, -1);

        expect(plan.perDay).toBe(minutes);
        expect(plan.cardsPerDay).toBe(minutes / 5);
        expect(regular.map((d) => [d.size, d.cards.size])).toEqual(
          regular.map(() => [minutes, minutes / 5]),
        );
        expect(finish).toMatchObject({ date: localDate(2), size: 15, topicIds: [] });
        expect(finish.cards.size).toBe(0);
      },
    );
  }

  test(
    'days carry topic ids, weakest topic first, and «Фініш» has none',
    { tag: ['@REQ-PLAN-05'] },
    async ({ api, catalog, user }) => {
      const [t1, t2, t3] = scorableChapters(catalog);
      expect(t3, 'three topics with a scorable chapter').toBeDefined();

      // T1 strong (2 right), T2 weak (2 wrong), T3 unscored: weakest first is T2, T1, T3; the
      // catalogue order would be T1, T2, T3.
      for (const id of t1!.questionIds)
        await api.checkAnswer(id, await api.correctIndex(id), user.token);
      for (const id of t2!.questionIds)
        await api.checkAnswer(id, await wrongIndex(api, id), user.token);
      await api.createInterview(user.token, {
        date: localDate(3),
        level: 'middle',
        chapterIds: [t1!, t2!, t3!].map((t) => t.chapterId),
        minutesPerDay: 15,
      });

      const { days } = await api.plan(user.token);
      expect([...new Set(days.flatMap((d) => d.topicIds))]).toEqual([
        t2!.topicId,
        t1!.topicId,
        t3!.topicId,
      ]);
      expect(days.at(-1)!.topicIds).toEqual([]);
    },
  );
});

test.describe('plan cards', () => {
  test(
    'the card step is picked once and a card can be re-rated',
    { tag: ['@REQ-PLAN-06'] },
    async ({ api, catalog, user }) => {
      const plan = await threeDayPlan(api, catalog, user.token);
      const first = await api.startPlanCards(user.token, today);
      expect(first.cardIds).toHaveLength(plan.days[0]!.cards.size);
      expect(await api.startPlanCards(user.token, today), 'same cards on a second start').toEqual(
        first,
      );

      const card = first.cardIds[0]!;
      const states = plan.days.map((d) => d.state);
      const rated = await api.ratePlanCard(user.token, today, card, 5);
      const rerated = await api.ratePlanCard(user.token, today, card, 2);

      // A card rating is recall activity: the first one starts the streak (app owner, 2026-11-21).
      expect(rated.result.stats.streak, 'the first rating starts the streak').toBe(1);
      const { streak, longestStreak, lastActiveDate } = rerated.result.stats;
      expect({ streak, longestStreak, lastActiveDate }).toEqual({
        streak: rated.result.stats.streak,
        longestStreak: rated.result.stats.longestStreak,
        lastActiveDate: rated.result.stats.lastActiveDate,
      });
      const after = await api.plan(user.token);
      expect(after.days.map((d) => d.state)).toEqual(states);
      expect(after.days[0]!.cards.rated).toBe(1);
      expect((await api.startPlanCards(user.token, today)).ratings[0], 'the re-rating wins').toBe(
        2,
      );
    },
  );

  test(
    'cards can be rated after the day’s test is done',
    { tag: ['@REQ-PLAN-06'] },
    async ({ api, catalog, user }) => {
      await threeDayPlan(api, catalog, user.token);
      await answerTodaysRound(api, user.token);
      await api.finishPlanDay(user.token, today);
      expect((await api.plan(user.token)).days[0]!.state).toBe('done');

      const [card] = (await api.startPlanCards(user.token, today)).cardIds;
      await api.ratePlanCard(user.token, today, card!, 4);
      await api.ratePlanCard(user.token, today, card!, 1);
      const { days } = await api.plan(user.token);
      expect(days[0]).toMatchObject({ state: 'done', cards: { rated: 1 } });
    },
  );

  test(
    'cards/start: «Фініш» ahead is 409 plan_not_today, a day outside the plan 404, bad input 400/401',
    { tag: ['@REQ-PLAN-06'] },
    async ({ api, catalog, user }) => {
      const plan = await threeDayPlan(api, catalog, user.token);
      const start = (date: string, token?: string) =>
        api.raw.post(`me/plan/days/${date}/cards/start`, { headers: bearer(token) });

      await expectError(await start(plan.days.at(-1)!.date, user.token), 409, 'plan_not_today');
      await expectError(await start(localDate(-1), user.token), 404, 'not_found');
      await expectError(await start(localDate(30), user.token), 404, 'not_found');
      await expectError(await start('abc', user.token), 400, 'bad_request');
      await expectStatus(await start(today), 401);
    },
  );

  test(
    'cards/start on «Фініш» day itself is a 404: it has no card step',
    { tag: ['@REQ-PLAN-06'] },
    async ({ api, catalog, user }) => {
      // Interview tomorrow: today is «Фініш», the only plan day.
      const chapterIds = biggestTopicChapters(catalog);
      await api.createInterview(user.token, {
        date: localDate(1),
        level: 'middle',
        chapterIds,
        minutesPerDay: 15,
      });
      expect((await api.plan(user.token)).days.map((d) => d.date)).toEqual([today]);

      const res = await api.raw.post(`me/plan/days/${today}/cards/start`, {
        headers: bearer(user.token),
      });
      await expectError(res, 404, 'not_found');
    },
  );

  test(
    'a rating outside 0…5 is a 400',
    { tag: ['@REQ-PLAN-06'] },
    async ({ api, catalog, user }) => {
      await threeDayPlan(api, catalog, user.token);
      const [card] = (await api.startPlanCards(user.token, today)).cardIds;
      const res = await api.raw.post(`me/plan/days/${today}/cards/${card}`, {
        data: { rating: 9 },
        headers: bearer(user.token),
      });
      await expectError(res, 400, 'bad_request');
      expect((await api.startPlanCards(user.token, today)).ratings[0]).toBe(0);
    },
  );

  test(
    'rated cards alone do not finish the day: 409 not_answered until the test is answered',
    { tag: ['@REQ-PLAN-06'] },
    async ({ api, catalog, user }) => {
      await threeDayPlan(api, catalog, user.token);
      const { cardIds } = await api.startPlanCards(user.token, today);
      for (const card of cardIds) await api.ratePlanCard(user.token, today, card, 5);

      const finish = () =>
        api.raw.post(`me/plan/days/${today}/finish`, { headers: bearer(user.token) });
      await expectError(await finish(), 409, 'not_answered');
      expect((await api.plan(user.token)).days[0]!.state).toBe('todo');

      await answerTodaysRound(api, user.token);
      await expectStatus(await finish(), 200);
      expect((await api.plan(user.token)).days[0]!.state).toBe('done');
    },
  );
});
