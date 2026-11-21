import type { Page } from '@playwright/test';
import type { ApiClient } from '../../src/api/client';
import type { Finish } from '../../src/components/finish';
import { day, ddmm, interviewWithMistakes, noon } from '../../src/helpers/clock';
import type { DashboardPage } from '../../src/pages/dashboard-page';
import { expect, test, type TestUser } from '../../src/fixtures';

// spec: specs/phase2-plan-clock.md (scenarios 4.1–4.4)
// seed: tests/seed.spec.ts

type ServerClock = (at: string) => Promise<void>;
type SignIn = (user: TestUser) => Promise<void>;

/**
 * D0+1: the «Фініш» played through the UI (8 cards rated 3, 7 questions wrong), so the warm-up
 * builds from it. Leaves the page on the result.
 */
async function playFinish(
  page: Page,
  api: ApiClient,
  serverClock: ServerClock,
  signIn: SignIn,
  user: TestUser,
  dashboard: DashboardPage,
  finish: Finish,
): Promise<void> {
  await serverClock(noon(1));
  await signIn(user);
  await page.clock.install({ time: noon(1) });
  await dashboard.goto();
  await finish.start.click();
  await finish.play(api, Array<number>(8).fill(3), Array<boolean>(7).fill(false));
  await expect(finish.result).toHaveAttribute('data-kind', 'finish');
}

/** The server and the browser on D0+2 12:00 Kyiv, the dashboard open. */
async function openInterviewDay(
  page: Page,
  serverClock: ServerClock,
  signIn: SignIn,
  user: TestUser,
  dashboard: DashboardPage,
): Promise<void> {
  await serverClock(noon(2));
  await signIn(user);
  await page.clock.setSystemTime(noon(2));
  await dashboard.goto();
}

test.describe('PLAN-10 the interview day (UI + server clock)', () => {
  test(
    'the interview day shows the day dashboard with the warm-up from what was unclear',
    { tag: ['@REQ-PLAN-10'] },
    async ({ api, catalog, checklist, dashboard, finish, page, serverClock, signIn, user }) => {
      // 1. Clock D0, interview D0+2, 10 cards rated 1; the «Фініш» played on D0+1; clock D0+2.
      await interviewWithMistakes(api, catalog, serverClock, user, 10);
      await playFinish(page, api, serverClock, signIn, user, dashboard, finish);
      await openInterviewDay(page, serverClock, signIn, user, dashboard);

      await expect(dashboard.root).toHaveAttribute('data-state', 'day');
      await expect(dashboard.dayDate).toContainText(ddmm(day(2)));
      await expect(finish.warmupCard).toHaveAttribute('data-state', 'todo');
      await expect(finish.warmupCard).toHaveAttribute('data-from', 'finish');
      await expect(finish.warmupCard).toHaveAttribute('data-cards', '5');
      await expect(finish.warmupCard).toHaveAttribute('data-questions', '0');
      const warmup = (await api.plan((await api.login(user)).accessToken)).warmup;
      expect(warmup).toMatchObject({ from: 'finish', size: 5, cards: 5, questions: 0 });

      await expect(checklist.root).toHaveAttribute('data-state', 'day');
      await expect(checklist.root).toHaveAttribute('data-value', '0');
      // The day checklist shows three rows and «усі ›».
      await expect(checklist.items).toHaveCount(3);
      await expect(checklist.all).toBeVisible();

      await expect(dashboard.days).toHaveCount(0);
      await expect(finish.card).toHaveCount(0);
      const keys = ['interview', 'streak', 'luck'];
      await expect(dashboard.tickerItems).toHaveCount(keys.length);
      for (const [i, key] of keys.entries()) {
        await expect(dashboard.tickerItems.nth(i)).toHaveAttribute('data-key', key);
      }
    },
  );

  test(
    'the warm-up round, its result and the redo',
    { tag: ['@REQ-PLAN-10'] },
    async ({ api, catalog, dashboard, finish, page, plan, serverClock, signIn, user }) => {
      // 1. Setup as above; click «Почати» on the warm-up.
      await interviewWithMistakes(api, catalog, serverClock, user, 10);
      await playFinish(page, api, serverClock, signIn, user, dashboard, finish);
      await openInterviewDay(page, serverClock, signIn, user, dashboard);
      await finish.warmupStart.click();

      await expect(page).toHaveURL(new RegExp(`/plan/day\\?d=${day(2)}$`));
      await expect(plan.run).toHaveAttribute('data-kind', 'warmup');
      await expect(finish.phase).toHaveAttribute('data-value', '1');
      await expect(finish.phase).toHaveAttribute('data-total', '5');

      // 2. Reveal and rate every card 5.
      await finish.play(api, Array<number>(5).fill(5));
      await expect(finish.result).toHaveAttribute('data-kind', 'warmup');
      await expect(finish.score).toHaveAttribute('data-value', '5');
      await expect(finish.score).toHaveAttribute('data-total', '5');
      await expect(finish.verdict).toHaveAttribute('data-state', 'ok');
      await expect(finish.checklistGo).toHaveAttribute('data-value', '0');
      await expect(finish.checklistGo).toHaveAttribute('data-total', '6');

      // 3. «До чекліста».
      await finish.checklistGo.click();
      await expect(dashboard.root).toHaveAttribute('data-state', 'day');
      await expect(finish.warmupCard).toHaveAttribute('data-state', 'done');
      await expect(finish.warmupScore).toHaveAttribute('data-value', '5');
      await expect(finish.warmupScore).toHaveAttribute('data-total', '5');

      // 4. Redo: a new round starts.
      await finish.warmupStart.click();
      await expect(plan.run).toHaveAttribute('data-kind', 'warmup');
      await expect(page).toHaveURL(new RegExp(`/plan/day\\?d=${day(2)}&run=1$`));
    },
  );

  test(
    'the warm-up source falls back to recent answers when no Фініш was done',
    { tag: ['@REQ-PLAN-10'] },
    async ({ api, catalog, dashboard, finish, page, serverClock, signIn, user }) => {
      // 1. Clock D0, interview D0+2; 3 cards rated 1, then 3 wrong answers on D0; no «Фініш».
      const token = await interviewWithMistakes(api, catalog, serverClock, user, 3);
      const { questionIds } = await api.startPlanDay(token, day(0));
      for (const id of questionIds.slice(0, 3)) {
        const correct = await api.correctIndex(id);
        const result = await api.checkAnswer(id, 1 - Math.min(correct, 1), token);
        expect(result.outcome).toBe('wrong');
      }

      // Clock D0+2: the latest mistakes (3 questions, then 2 of the 3 cards) fill the 5 places.
      await serverClock(noon(2));
      const plan = await api.plan((await api.login(user)).accessToken);
      expect(plan.warmup).toMatchObject({ from: 'recent', size: 5, cards: 2, questions: 3 });
      await signIn(user);
      await page.clock.install({ time: noon(2) });
      await dashboard.goto();

      await expect(dashboard.root).toHaveAttribute('data-state', 'day');
      await expect(finish.warmupCard).toHaveAttribute('data-from', 'recent');
      await expect(finish.warmupCard).toHaveAttribute('data-cards', '2');
      await expect(finish.warmupCard).toHaveAttribute('data-questions', '3');
    },
  );

  test(
    'the day after the interview the usual dashboard returns',
    { tag: ['@REQ-PLAN-10'] },
    async ({ api, askCard, catalog, dashboard, finish, page, serverClock, signIn, user }) => {
      // 1. Setup as the interview-day scenario with the warm-up done; clock D0+3; open /dash.
      await interviewWithMistakes(api, catalog, serverClock, user, 10);
      await playFinish(page, api, serverClock, signIn, user, dashboard, finish);
      await openInterviewDay(page, serverClock, signIn, user, dashboard);
      await finish.warmupStart.click();
      await finish.play(api, Array<number>(5).fill(5));

      await serverClock(noon(3));
      await signIn(user);
      await page.clock.setSystemTime(noon(3));
      await dashboard.goto();

      // The plan answered «no active interview» (the tile shows only then, not while loading): the
      // usual dashboard without a plan state, and «Як пройшла?» for the past interview.
      await expect(dashboard.addDate).toBeVisible();
      await expect(dashboard.root).not.toHaveAttribute('data-state');
      await expect(askCard.root).toHaveAttribute('data-state', 'day1');
      await expect(askCard.root).toHaveAttribute('data-value', day(2));
      await expect(finish.warmupCard).toHaveCount(0);
      await expect(finish.card).toHaveCount(0);
      await expect(dashboard.days).toHaveCount(0);
    },
  );
});
