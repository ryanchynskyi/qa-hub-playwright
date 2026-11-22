import type { Page } from '@playwright/test';
import type { ApiClient } from '../../src/api/client';
import type { Catalog, Plan } from '../../src/api/schemas';
import { day, ddmm, noon, topicChapters, wholeNumber } from '../../src/helpers/clock';
import { DashboardPage } from '../../src/pages/dashboard-page';
import { expect, test, type TestUser } from '../../src/fixtures';

// spec: specs/phase2-plan-clock.md (scenarios 1.1–1.5)
// seed: tests/seed.spec.ts

/** Answers every question of the day's started round correctly. */
async function answerAll(api: ApiClient, token: string, questionIds: string[]): Promise<void> {
  for (const id of questionIds) await api.checkAnswer(id, await api.correctIndex(id), token);
}

type ServerClock = (at: string) => Promise<void>;

/**
 * Clock D0, interview on D0+`interviewIn` (30 min) over `topics` topics, clock D0+1: D0 went by
 * untouched. Returns a fresh token and the plan as it was on D0.
 */
async function missedDay(
  api: ApiClient,
  catalog: Catalog,
  serverClock: ServerClock,
  user: TestUser,
  { interviewIn = 3, topics = 1 } = {},
): Promise<{ token: string; onD0: Plan }> {
  await serverClock(noon(0));
  let token = (await api.login(user)).accessToken;
  await api.createInterview(token, {
    date: day(interviewIn),
    level: 'middle',
    chapterIds: topicChapters(catalog, topics),
    minutesPerDay: 30,
  });
  const onD0 = await api.plan(token);
  await serverClock(noon(1));
  token = (await api.login(user)).accessToken;
  return { token, onD0 };
}

/** The dashboard of a signed-in user with the browser clock on the server's instant. */
async function openDash(
  page: Page,
  signIn: (user: TestUser) => Promise<void>,
  user: TestUser,
  at: string,
): Promise<void> {
  await signIn(user);
  await page.clock.install({ time: at });
  await new DashboardPage(page).goto();
}

test.describe('PLAN-07 rest day and missed day (UI + server clock)', () => {
  test(
    'a day done ahead is a rest day on its date',
    { tag: ['@REQ-PLAN-07'] },
    async ({ api, catalog, dashboard, page, serverClock, signIn, user }) => {
      // 1. Clock D0, interview D0+4 (15 min); D0 and, ahead, D0+1 done through the API; clock D0+1.
      await serverClock(noon(0));
      let token = (await api.login(user)).accessToken;
      await api.createInterview(token, {
        date: day(4),
        level: 'middle',
        chapterIds: topicChapters(catalog),
        minutesPerDay: 15,
      });
      // D0 is done too, so nothing is missed: the rest day alone is under test.
      await answerAll(api, token, (await api.startPlanDay(token, day(0))).questionIds);
      await api.finishPlanDay(token, day(0));
      const { questionIds } = await api.startPlanDay(token, day(1));
      await answerAll(api, token, questionIds);
      await api.finishPlanDay(token, day(1));
      await serverClock(noon(1));
      token = (await api.login(user)).accessToken;
      await openDash(page, signIn, user, noon(1));

      await expect(dashboard.root).toHaveAttribute('data-state', 'plan');
      await expect(dashboard.planRest).toBeVisible();

      // 2. Read the day blocks.
      const today = dashboard.day(day(1));
      await expect(today).toHaveAttribute('data-state', 'done');
      await expect(today).toHaveAttribute('aria-current', 'date');
      await expect(dashboard.day(day(0))).toHaveAttribute('data-state', 'done');
      await expect(dashboard.day(day(2))).toHaveAttribute('data-state', 'todo');
      // The last block is «Фініш» on D0+3.
      await expect(dashboard.dayBlocks.last()).toHaveAttribute('data-key', day(3));

      await expect(dashboard.planNext).toHaveAttribute('data-state', 'rest');
      await expect(dashboard.planNext).toContainText(ddmm(day(2)));
      await expect(dashboard.planTaskResult).toContainText(
        `${questionIds.length} / ${questionIds.length}`,
      );
      await expect(dashboard.planAheadRow).toHaveAttribute('data-key', day(2));
      // The rest day is not a missed day: the plan carries no `missed` either.
      await expect(dashboard.planMissed).toHaveCount(0);
      expect((await api.plan(token)).missed).toBeNull();
    },
  );

  test(
    'the streak survives a rest day and lapses after it',
    { tag: ['@REQ-PLAN-07'] },
    async ({ api, catalog, dashboard, page, serverClock, shell, signIn, user }) => {
      // 1. Clock D0, interview D0+6, the day D0+1 done ahead (last activity D0).
      await serverClock(noon(0));
      let token = (await api.login(user)).accessToken;
      await api.createInterview(token, {
        date: day(6),
        level: 'middle',
        chapterIds: topicChapters(catalog),
        minutesPerDay: 15,
      });
      // D0 is done too, so nothing is missed: the rest day alone is under test.
      await answerAll(api, token, (await api.startPlanDay(token, day(0))).questionIds);
      await api.finishPlanDay(token, day(0));
      const { questionIds } = await api.startPlanDay(token, day(1));
      await answerAll(api, token, questionIds);
      await api.finishPlanDay(token, day(1));

      // 2. Nothing answered on D0+1, D0+2, D0+3. Owner: the server never writes 0, the lapse is
      // computed on the client: the streak shows 1 on D0+1 (rest day) and D0+2, 0 from D0+3.
      // D0+3 follows a really missed D0+2, so only then does the plan carry a `missed` day.
      await page.clock.install({ time: noon(1) });
      for (const [n, streak, missed] of [
        [1, 1, false],
        [2, 1, false],
        [3, 0, true],
      ] as const) {
        await serverClock(noon(n));
        token = (await api.login(user)).accessToken;
        await signIn(user);
        await page.clock.setSystemTime(noon(n));
        await dashboard.goto();

        await expect(dashboard.root).toHaveAttribute('data-state', 'plan');
        await expect(shell.streak, `streak on D0+${n}`).toHaveAttribute(
          'data-value',
          String(streak),
        );
        const plan = await api.plan(token);
        expect(plan.days.find((d) => d.date === day(1))?.state, `D0+1 on D0+${n}`).toBe('done');
        expect(plan.missed !== null, `missed on D0+${n}`).toBe(missed);
      }
    },
  );

  test(
    'a missed day shows the «Учора без плану» notice and re-packs the plan',
    { tag: ['@REQ-PLAN-07'] },
    async ({ api, catalog, dashboard, page, serverClock, signIn, user }) => {
      // 1. Clock D0, interview D0+3 (30 min) over two topics, so D0 and D0+1 get one each; clock
      // D0+1; open /dash on the same instant.
      const { token, onD0 } = await missedDay(api, catalog, serverClock, user, { topics: 2 });
      await openDash(page, signIn, user, noon(1));

      await expect(dashboard.planMissed).toBeVisible();
      await expect(dashboard.planMissed).toHaveAttribute('data-key', day(0));
      await expect(dashboard.planMissedHour).toBeVisible();
      await expect(dashboard.planMissedKeep).toBeVisible();
      await expect(dashboard.planMissedClose).toBeVisible();

      // 2. Read the day blocks and the API plan.
      const plan = await api.plan(token);
      await expect(dashboard.day(day(0))).toHaveAttribute('data-state', 'missed');
      const today = dashboard.day(day(1));
      await expect(today).toHaveAttribute('data-state', 'todo');
      await expect(today).toHaveAttribute('aria-current', 'date');
      await expect(today).toContainText(wholeNumber(plan.todayQuestions));
      // The last block is «Фініш» on D0+2.
      await expect(dashboard.dayBlocks.last()).toHaveAttribute('data-key', day(2));

      expect(plan.today).toBe(day(1));
      expect(plan.missed?.date).toBe(day(0));
      // The missed day stays in plan.days.
      expect(plan.days.find((d) => d.date === day(0))?.state).toBe('missed');
      expect(plan.todayOverride).toBe(false);
      expect(plan.todayQuestions).toBe(30);
      // The re-pack: today held none of the missed day's topics on D0; now it holds them all.
      const topicsOn = (p: Plan, date: string) =>
        p.days.find((d) => d.date === date)?.topicIds ?? [];
      const missedTopics = topicsOn(onD0, day(0));
      expect(missedTopics.length, 'D0 had topics').toBeGreaterThan(0);
      expect(
        topicsOn(onD0, day(1)).filter((t) => missedTopics.includes(t)),
        'D0+1 before the miss',
      ).toEqual([]);
      expect(plan.missed?.topicIds).toEqual(missedTopics);
      expect(topicsOn(plan, day(1))).toEqual(expect.arrayContaining(missedTopics));
    },
  );

  test(
    '«Сьогодні 1 год» makes today’s round 60 questions',
    { tag: ['@REQ-PLAN-07'] },
    async ({ api, catalog, dashboard, page, serverClock, signIn, user }) => {
      // 1. A missed day with the interview on D0+5, so D0+2 and D0+3 stay regular days.
      const { token } = await missedDay(api, catalog, serverClock, user, { interviewIn: 5 });
      const before = await api.plan(token);
      await openDash(page, signIn, user, noon(1));
      await expect(dashboard.planMissed).toBeVisible();
      await dashboard.planMissedHour.click();

      await expect(dashboard.planMissed).toHaveCount(0);
      await expect(dashboard.day(day(1))).toContainText(wholeNumber(60));

      // 2. Read the plan through the API and start today's round.
      const plan = await api.plan(token);
      const today = plan.days.find((d) => d.date === day(1))!;
      expect(plan.todayOverride).toBe(true);
      expect(plan.todayQuestions).toBe(60);
      expect(today.size).toBe(60);
      expect(today.cards.size).toBe(2 * before.cardsPerDay);
      expect((await api.startPlanDay(token, day(1))).questionIds).toHaveLength(60);

      // Owner: the missed day stays in the DTO and in days; later days keep perDay (no growth).
      expect(plan.missed?.date).toBe(day(0));
      expect(plan.days.find((d) => d.date === day(0))?.state).toBe('missed');
      for (const later of [day(2), day(3)]) {
        expect(before.days.find((d) => d.date === later)?.size, `${later} before`).toBe(30);
        expect(plan.days.find((d) => d.date === later)?.size, `${later} after`).toBe(30);
      }
      // The interview's own minutes stay.
      expect((await api.interviews(token)).active?.minutesPerDay).toBe(30);
    },
  );

  test(
    '«Лишити» only hides the notice',
    { tag: ['@REQ-PLAN-07'] },
    async ({ api, catalog, dashboard, page, serverClock, signIn, user }) => {
      // 1. Same setup as the missed-day scenario; click «Лишити».
      const { token } = await missedDay(api, catalog, serverClock, user);
      await openDash(page, signIn, user, noon(1));
      await expect(dashboard.planMissed).toBeVisible();
      // A4 (open question to the owner): the hide is stored per date in the browser.
      await dashboard.planMissedKeep.click();
      await expect(dashboard.planMissed).toHaveCount(0);

      // 2. Reload the dashboard (same server and browser clock).
      await page.reload();
      await expect(dashboard.day(day(1))).toBeVisible();
      await expect(dashboard.planMissed).toHaveCount(0);

      // 3. Read the API plan: nothing was re-sized.
      const plan = await api.plan(token);
      expect(plan.todayOverride).toBe(false);
      expect(plan.todayQuestions).toBe(30);
      expect(plan.days.find((d) => d.date === day(1))?.size).toBe(30);
      expect(plan.days.find((d) => d.date === day(0))?.state).toBe('missed');
    },
  );
});
