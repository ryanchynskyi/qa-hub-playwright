import type { ApiClient } from '../../src/api/client';
import type { Catalog } from '../../src/api/schemas';
import { expect, test } from '../../src/fixtures';
import { localDate } from '../../src/helpers/data';

// spec: specs/phase2-plan.md
// seed: tests/seed.spec.ts

/** An interview over the first topic's chapters; `in3` keeps the dashboard in plan state. */
function arrange(
  api: ApiClient,
  token: string,
  catalog: Catalog,
  minutesPerDay: 15 | 30 | 60 = 15,
) {
  const topicId = catalog.topics[0]!.id;
  return api.createInterview(token, {
    date: localDate(3),
    level: 'middle',
    chapterIds: catalog.chapters.filter((c) => c.topicId === topicId).map((c) => c.id),
    minutesPerDay,
  });
}

test.describe('PLAN-04 dashboard plan state and /plan', () => {
  test(
    'the dashboard in plan state: days and ticker',
    { tag: ['@REQ-PLAN-04'] },
    async ({ authedPage, user, api, catalog, dashboard }) => {
      // 1. Arrange an interview for today+3 and open /dash
      await arrange(api, user.token, catalog);
      const { days } = await api.plan(user.token);
      await dashboard.goto();
      await expect(dashboard.root).toHaveAttribute('data-state', 'plan');
      await expect(dashboard.tickerItems.nth(0)).toHaveAttribute('data-key', 'interview');
      await expect(dashboard.tickerItems.nth(1)).toHaveAttribute('data-key', 'days');
      await expect(dashboard.days).toHaveAttribute('data-value', '3');
      expect(days.map((d) => d.date)).toEqual([localDate(0), localDate(1), localDate(2)]);
      for (const day of days)
        await expect(dashboard.day(day.date)).toHaveAttribute('data-state', 'todo');
      // the interview day itself is not a block
      await expect(dashboard.day(localDate(3))).toHaveCount(0);
      await expect(dashboard.day(days[0]!.date)).toHaveAttribute('aria-current', 'date');
      await expect(dashboard.day(days[1]!.date)).not.toHaveAttribute('aria-current', 'date');
      // the last block is the «Фініш» day: no topics in the plan
      expect(days.at(-1)!.topicIds).toEqual([]);
      await expect(authedPage).toHaveURL(/\/dash$/);
    },
  );

  test(
    '/plan lists the days with today first and the finish day last',
    { tag: ['@REQ-PLAN-04'] },
    async ({ authedPage, user, api, catalog, plan }) => {
      // 1. Arrange the same interview and open /plan
      const interview = await arrange(api, user.token, catalog);
      const { days } = await api.plan(user.token);
      await plan.goto();
      expect(await plan.dayKeys()).toEqual(days.map((d) => d.date));
      await expect(plan.dayList.first()).toHaveAttribute('data-today', 'true');
      await expect(plan.dayList.last()).not.toHaveAttribute('data-today', 'true');
      // the other regular days show their cards; the finish day has none
      await expect(plan.dayCards(days[1]!.date)).toHaveAttribute(
        'data-value',
        String(days[1]!.cards.size),
      );
      await expect(plan.dayCards(days.at(-1)!.date)).toHaveCount(0);
      // the interview day is its own tile, not a day of the list
      await expect(plan.interview).toHaveAttribute('data-key', interview.date);
      await expect(plan.dayList).toHaveCount(days.length);
      await expect(authedPage).toHaveURL(/\/plan$/);
    },
  );

  test(
    'the plan explainer is hidden for good after OK',
    { tag: ['@REQ-PLAN-04'] },
    async ({ authedPage, user, api, catalog, dashboard }) => {
      // 1. Arrange the interview, open /dash
      await arrange(api, user.token, catalog);
      await dashboard.goto();
      await expect(dashboard.planHow).toBeVisible();

      // 2. Click OK, then reload
      await dashboard.planHowOk.click();
      await expect(dashboard.planHow).toHaveCount(0);
      await authedPage.reload();
      await expect(dashboard.root).toHaveAttribute('data-state', 'plan');
      await expect(dashboard.planHow).toHaveCount(0);
    },
  );

  test(
    'minutes per day rebuild the days and survive a reload',
    { tag: ['@REQ-PLAN-04'] },
    async ({ authedPage, user, api, catalog, plan }) => {
      // 1. Arrange 60 minutes, open /plan and pick 15
      await arrange(api, user.token, catalog, 60);
      await plan.goto();
      await expect(plan.day(localDate(0))).toHaveAttribute('data-value', '60');
      await plan.minutesOption(15).click();
      await expect(plan.minutes).toHaveAttribute('data-value', '15');
      await expect(plan.minutesOption(15)).toHaveAttribute('data-state', 'on');
      await expect(plan.day(localDate(0))).toHaveAttribute('data-value', '15');
      await expect(plan.day(localDate(1))).toHaveAttribute('data-value', '15');

      // 2. Reload and read the plan through the API
      await authedPage.reload();
      await expect(plan.minutes).toHaveAttribute('data-value', '15');
      await expect(plan.day(localDate(0))).toHaveAttribute('data-value', '15');
      expect((await api.plan(user.token)).perDay).toBe(15);
      expect((await api.interviews(user.token)).active?.minutesPerDay).toBe(15);
    },
  );

  test(
    'tasks per day persist across a reload',
    { tag: ['@REQ-PLAN-04'] },
    async ({ authedPage, user, api, catalog, plan }) => {
      // 1. Arrange, open /plan and pick 5 tasks
      await arrange(api, user.token, catalog);
      await plan.goto();
      await expect(plan.tasks).toHaveAttribute('data-value', '3');
      await plan.tasksOption(5).click();
      await expect(plan.tasks).toHaveAttribute('data-value', '5');
      await expect(plan.tasksOption(5)).toHaveAttribute('data-state', 'on');
      await expect(plan.bonus).toBeVisible();

      // 2. Reload
      await authedPage.reload();
      await expect(plan.tasks).toHaveAttribute('data-value', '5');
    },
  );

  test(
    'a day opens its round in the quiz frame, the result closes it and Again runs again',
    { tag: ['@REQ-PLAN-04'] },
    async ({ authedPage, user, api, catalog, plan, quiz }) => {
      const today = localDate(0);

      // 1. Arrange 15 minutes, open /plan and click today's «Тест» row
      await arrange(api, user.token, catalog, 15);
      await plan.goto();
      await plan.step('test').click();
      await expect(authedPage).toHaveURL(new RegExp(`/plan/day\\?d=${today}$`));
      await expect(plan.run).toHaveAttribute('data-key', today);
      await expect(quiz.progress).toHaveAttribute('data-value', '1');
      await expect(quiz.progress).toHaveAttribute('data-total', '15');

      // 2. Answer all 15 questions correctly
      for (let i = 0; i < 14; i++) {
        await quiz.answerCorrectly(api);
        await quiz.goNext();
      }
      // the last «next» leads to the plan result, not to the quiz results that goNext waits for
      await quiz.answerCorrectly(api);
      await quiz.next.click();
      await expect(plan.result).toBeAttached();
      await expect(plan.resultPercent).toHaveAttribute('data-value', '100');
      await expect(plan.resultSummary).toHaveAttribute('data-value', '15');
      await expect(plan.resultDay).toHaveAttribute('data-state', 'done');

      // 3. Again
      await plan.again.click();
      await expect(authedPage).toHaveURL(new RegExp(`/plan/day\\?d=${today}&run=1$`));
      await expect(plan.run).toHaveAttribute('data-key', today);
      await expect(quiz.progress).toHaveAttribute('data-value', '1');
      await expect(quiz.progress).toHaveAttribute('data-total', '15');

      // 4. Leave the second run unfinished: the day stays done
      await plan.goto();
      await expect(plan.day(today)).toHaveAttribute('data-state', 'done');
      await expect(plan.step('test')).toHaveAttribute('data-state', 'done');
    },
  );

  test(
    'a guest on /plan or /plan/day goes to the login',
    { tag: ['@REQ-PLAN-04'] },
    async ({ page, plan }) => {
      // 1. Open /plan, then /plan/day as a guest. Observed: both end at next=%2Fplan
      // (the day is not kept in next; test-ids.md names only /login?next=%2Fplan)
      await page.goto('plan');
      await expect(page).toHaveURL(/\/login\?next=%2Fplan$/);
      await expect(plan.root).toHaveCount(0);

      await page.goto(`plan/day?d=${localDate(0)}`);
      await expect(page).toHaveURL(/\/login\?next=%2Fplan$/);
      await expect(plan.root).toHaveCount(0);
      await expect(plan.run).toHaveCount(0);
    },
  );
});
