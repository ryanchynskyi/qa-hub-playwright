import { bearer, expectError } from '../../src/api/client';
import { day, noon, topicChapters } from '../../src/helpers/clock';
import { expect, test } from '../../src/fixtures';

// spec: specs/phase2-plan-clock.md (scenarios 2.1–2.4)
// seed: tests/seed.spec.ts

test.describe('PLAN-07 / PLAN-08 API tests (server clock)', () => {
  test(
    'a past plan date is 409 plan_not_today and stays in plan.days',
    { tag: ['@REQ-PLAN-07'] },
    async ({ api, catalog, serverClock, user }) => {
      // 1. Clock D0, interview D0+3; clock D0+1, log in; POST start, cards/start, finish for D0.
      await serverClock(noon(0));
      let token = (await api.login(user)).accessToken;
      await api.createInterview(token, {
        date: day(3),
        level: 'middle',
        chapterIds: topicChapters(catalog),
        minutesPerDay: 15,
      });
      await serverClock(noon(1));
      token = (await api.login(user)).accessToken;

      for (const verb of ['start', 'cards/start', 'finish']) {
        const res = await api.raw.post(`me/plan/days/${day(0)}/${verb}`, {
          headers: bearer(token),
        });
        await expectError(res, 409, 'plan_not_today');
      }

      const { days } = await api.plan(token);
      expect(days.find((d) => d.date === day(0))?.state).toBe('missed');

      // A date outside the plan is a different code: 404, not 409.
      const outside = await api.raw.post(`me/plan/days/${day(10)}/start`, {
        headers: bearer(token),
      });
      await expectError(outside, 404, 'not_found');
    },
  );

  test(
    '«Фініш» and the warm-up on any date other than their own are 409 plan_not_today',
    { tag: ['@REQ-PLAN-08'] },
    async ({ api, catalog, serverClock, user }) => {
      // 1. Clock D0, interview D0+2 (D0 regular, D0+1 «Фініш»); a few card mistakes so the
      // interview day has a warm-up to look at.
      const chapterIds = topicChapters(catalog);
      const cards = (await api.recallCards()).filter((c) => chapterIds.includes(c.chapterId));
      await serverClock(noon(0));
      let token = (await api.login(user)).accessToken;
      await api.createInterview(token, {
        date: day(2),
        level: 'middle',
        chapterIds,
        minutesPerDay: 15,
      });
      for (const card of cards.slice(0, 3)) await api.rateCard(token, card.id, 1);

      // Clock D0+1: the interview date (warm-up, ahead) and D0 (past).
      await serverClock(noon(1));
      token = (await api.login(user)).accessToken;
      for (const date of [day(2), day(0)]) {
        for (const verb of ['start', 'finish']) {
          const res = await api.raw.post(`me/plan/days/${date}/${verb}`, {
            headers: bearer(token),
          });
          await expectError(res, 409, 'plan_not_today');
        }
      }

      // 2. Clock D0+2 (interview day): the finish date is past now.
      await serverClock(noon(2));
      token = (await api.login(user)).accessToken;
      for (const verb of ['start', 'finish']) {
        const res = await api.raw.post(`me/plan/days/${day(1)}/${verb}`, {
          headers: bearer(token),
        });
        await expectError(res, 409, 'plan_not_today');
      }
      const plan = await api.plan(token);
      expect(plan.warmup, 'the warm-up exists on the interview day').not.toBeNull();
      expect(plan.finish, '«Фініш» is over on the interview day').toBeNull();
    },
  );

  test(
    'card-step endpoints on a finish or warm-up day are 404, card ratings follow the round',
    { tag: ['@REQ-PLAN-08'] },
    async ({ api, catalog, serverClock, user }) => {
      const chapterIds = topicChapters(catalog);
      const cards = (await api.recallCards()).filter((c) => chapterIds.includes(c.chapterId));
      await serverClock(noon(0));
      let token = (await api.login(user)).accessToken;
      await api.createInterview(token, {
        date: day(2),
        level: 'middle',
        chapterIds,
        minutesPerDay: 15,
      });
      // Card mistakes give «Фініш» cards to rate.
      const mistakes = cards.slice(0, 3);
      for (const card of mistakes) await api.rateCard(token, card.id, 1);

      // 1. Clock D0+1 (finish day): no card step.
      await serverClock(noon(1));
      token = (await api.login(user)).accessToken;
      const rateRaw = (cardId: string) =>
        api.raw.post(`me/plan/days/${day(1)}/cards/${cardId}`, {
          data: { rating: 3 },
          headers: bearer(token),
        });
      const finishCards = await api.raw.post(`me/plan/days/${day(1)}/cards/start`, {
        headers: bearer(token),
      });
      await expectError(finishCards, 404, 'not_found');

      // 3. Ratings (owner): no started round → 409 not_answered; a card outside the round → 404;
      // after the finish → 409 already_finished.
      await expectError(await rateRaw(mistakes[0]!.id), 409, 'not_answered');
      const round = await api.startPlanDay(token, day(1));
      expect(round.cardIds).toHaveLength(mistakes.length);
      const outside = cards.find((c) => !round.cardIds.includes(c.id));
      expect(outside, 'a card of the topic outside the round').toBeDefined();
      await expectError(await rateRaw(outside!.id), 404, 'not_found');
      for (const id of round.questionIds)
        await api.checkAnswer(id, await api.correctIndex(id), token);
      for (const cardId of round.cardIds) await api.ratePlanCard(token, day(1), cardId, 3);
      await api.finishPlanDay(token, day(1));

      await expectError(await rateRaw(round.cardIds[0]!), 409, 'already_finished');
      const startAfter = await api.raw.post(`me/plan/days/${day(1)}/cards/start`, {
        headers: bearer(token),
      });
      await expectError(startAfter, 404, 'not_found');

      // 2. Clock D0+2 (interview day, the warm-up's date): no card step either.
      await serverClock(noon(2));
      token = (await api.login(user)).accessToken;
      const warmupCards = await api.raw.post(`me/plan/days/${day(2)}/cards/start`, {
        headers: bearer(token),
      });
      await expectError(warmupCards, 404, 'not_found');
    },
  );

  for (const [mistakes, cardsExpected, questionsExpected] of [
    [0, 0, 15],
    [3, 3, 12],
    [10, 8, 7],
  ] as const) {
    test(
      `«Фініш» with ${mistakes} mistake cards: ${cardsExpected} cards + ${questionsExpected} questions, 15 in all`,
      { tag: ['@REQ-PLAN-08'] },
      async ({ api, catalog, serverClock, user }) => {
        const chapterIds = topicChapters(catalog);
        const cards = (await api.recallCards()).filter((c) => chapterIds.includes(c.chapterId));
        expect(cards.length, 'enough cards of the topic').toBeGreaterThanOrEqual(mistakes);

        // 1. Clock D0, interview D0+2, rate `mistakes` cards with 1; clock D0+1, log in, read plan.finish.
        await serverClock(noon(0));
        let token = (await api.login(user)).accessToken;
        await api.createInterview(token, {
          date: day(2),
          level: 'middle',
          chapterIds,
          minutesPerDay: 15,
        });
        for (const card of cards.slice(0, mistakes)) await api.rateCard(token, card.id, 1);
        await serverClock(noon(1));
        token = (await api.login(user)).accessToken;

        const { finish } = await api.plan(token);
        expect(finish, 'plan.finish on the day before the interview').not.toBeNull();
        expect({ cards: finish!.cards, questions: finish!.questions }).toEqual({
          cards: cardsExpected,
          questions: questionsExpected,
        });
        expect(finish!.cards + finish!.questions).toBe(15);
        expect(finish!.chapterIds.length).toBeGreaterThan(0);
        expect(chapterIds).toEqual(expect.arrayContaining(finish!.chapterIds));
      },
    );
  }
});
