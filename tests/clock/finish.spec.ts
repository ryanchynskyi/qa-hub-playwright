import type { ApiClient } from '../../src/api/client';
import type { Catalog } from '../../src/api/schemas';
import {
  day,
  interviewWithMistakes,
  noon,
  topicChapters,
  wholeNumber,
} from '../../src/helpers/clock';
import { expect, test, type TestUser } from '../../src/fixtures';

// spec: specs/phase2-plan-clock.md (scenarios 3.1–3.4)
// seed: tests/seed.spec.ts

/** 10 cards rated 1 on D0, clock D0+1: the «Фініш» day (8 mistake cards + 7 questions). */
async function eveOfInterview(
  api: ApiClient,
  catalog: Catalog,
  serverClock: (at: string) => Promise<void>,
  user: TestUser,
): Promise<void> {
  await interviewWithMistakes(api, catalog, serverClock, user, 10);
  await serverClock(noon(1));
}

/** The round: 8 cards (2 rated 5, 6 rated 3), then 7 questions (2 right, 5 wrong). */
const ROUND = {
  ratings: [5, 5, 3, 3, 3, 3, 3, 3],
  answers: [true, true, false, false, false, false, false],
};

test.describe('PLAN-08 «Фініш» the day before the interview (UI + server clock)', () => {
  test(
    'the day before the interview the dashboard is in the finish state without daily tasks',
    { tag: ['@REQ-PLAN-08'] },
    async ({ api, catalog, checklist, dashboard, finish, page, serverClock, signIn, user }) => {
      // 1. Clock D0, interview D0+2, 10 cards rated 1; clock D0+1; open /dash on the same instant.
      await eveOfInterview(api, catalog, serverClock, user);
      await signIn(user);
      await page.clock.install({ time: noon(1) });
      await dashboard.goto();

      await expect(dashboard.root).toHaveAttribute('data-state', 'finish');
      await expect(finish.card).toHaveAttribute('data-state', 'todo');
      await expect(finish.parts).toHaveAttribute('data-cards', '8');
      await expect(finish.parts).toHaveAttribute('data-questions', '7');
      await expect(finish.paused).toBeVisible();
      await expect(finish.note).toBeVisible();

      // 2. Look for the usual plan elements.
      await expect(dashboard.days).toHaveCount(0);
      await expect(dashboard.planMissed).toHaveCount(0);
      await expect(dashboard.tasks).toHaveCount(0);
      await expect(checklist.root).toHaveAttribute('data-state', 'eve');
      await expect(checklist.root).toHaveAttribute('data-value', '0');
      await expect(checklist.root).toHaveAttribute('data-total', '6');
      await expect(checklist.items).toHaveCount(6);
      const keys = ['interview', 'when', 'finish', 'streak', 'mistakes'];
      await expect(dashboard.tickerItems).toHaveCount(keys.length);
      for (const [i, key] of keys.entries()) {
        await expect(dashboard.tickerItems.nth(i)).toHaveAttribute('data-key', key);
      }
    },
  );

  test(
    'the round runs cards first, then questions',
    { tag: ['@REQ-PLAN-08'] },
    async ({
      api,
      catalog,
      dashboard,
      finish,
      page,
      plan,
      quiz,
      recall,
      serverClock,
      signIn,
      user,
    }) => {
      // 1. Clock D0+1; click «Почати».
      await eveOfInterview(api, catalog, serverClock, user);
      await signIn(user);
      await page.clock.install({ time: noon(1) });
      await dashboard.goto();
      await finish.start.click();

      await expect(page).toHaveURL(new RegExp(`/plan/day\\?d=${day(1)}$`));
      await expect(plan.run).toHaveAttribute('data-kind', 'finish');
      await expect(plan.run).toHaveAttribute('data-key', day(1));
      await expect(finish.phase).toHaveAttribute('data-state', 'cards');
      await expect(finish.phase).toHaveAttribute('data-value', '1');
      await expect(finish.phase).toHaveAttribute('data-total', '8');
      await expect(quiz.progress).toHaveAttribute('data-value', '1');
      await expect(quiz.progress).toHaveAttribute('data-total', '15');

      // 2. Rate the 8 cards: after the 8th the phase turns to questions, 9 / 15.
      for (const [i, rating] of ROUND.ratings.entries()) {
        await expect(recall.card).toHaveAttribute('data-state', 'front');
        await recall.showAnswer();
        await recall.rate(rating).click();
        const questions = i === ROUND.ratings.length - 1;
        await expect(finish.phase).toHaveAttribute('data-state', questions ? 'questions' : 'cards');
        await expect(finish.phase).toHaveAttribute('data-value', String(questions ? 1 : i + 2));
        await expect(finish.phase).toHaveAttribute('data-total', questions ? '7' : '8');
        await expect(quiz.progress).toHaveAttribute('data-value', String(i + 2));
      }

      // 3. Answer the 7 questions: the round ends on the result page.
      await finish.play(api, [], ROUND.answers);
      await expect(finish.result).toHaveAttribute('data-kind', 'finish');
    },
  );

  test(
    'the result shows right/total, what is still unclear and leads to the checklist',
    { tag: ['@REQ-PLAN-08'] },
    async ({ api, catalog, checklist, dashboard, finish, page, serverClock, signIn, user }) => {
      // 1. Finish the round (2 cards rated 5, 6 rated 3, 2 questions right, 5 wrong).
      await eveOfInterview(api, catalog, serverClock, user);
      await signIn(user);
      await page.clock.install({ time: noon(1) });
      await dashboard.goto();
      await finish.start.click();
      await finish.play(api, ROUND.ratings, ROUND.answers);

      await expect(finish.score).toHaveAttribute('data-value', '4');
      await expect(finish.score).toHaveAttribute('data-total', '15');
      await expect(finish.verdict).toHaveAttribute('data-state', 'mixed');
      await expect(finish.verdict).toContainText(wholeNumber(11));
      // «повторимо до 5 з них»: the warm-up cap.
      await expect(finish.verdict).toContainText(wholeNumber(5));

      // 2. The list under the score: 6 cards, then 5 questions.
      await expect(finish.confused).toHaveAttribute('data-value', '11');
      await expect(finish.confusedItems).toHaveCount(11);
      const states = [...Array<string>(6).fill('card'), ...Array<string>(5).fill('question')];
      for (const [i, state] of states.entries()) {
        await expect(finish.confusedItems.nth(i)).toHaveAttribute('data-state', state);
      }
      // Each row's «Теорія» leads to one of the interview's chapters.
      await expect(finish.theory).toHaveCount(11);
      const chapter = new RegExp(`^(${topicChapters(catalog).join('|')})$`);
      for (const i of states.keys()) {
        await expect(finish.theoryOf(i)).toHaveAttribute('data-key', chapter);
      }

      // 3. «До чекліста».
      await expect(finish.checklistGo).toHaveAttribute('data-value', '0');
      await expect(finish.checklistGo).toHaveAttribute('data-total', '6');
      await finish.checklistGo.click();
      await expect(page).toHaveURL(/\/dash$/);
      await expect(dashboard.root).toHaveAttribute('data-state', 'finish');
      await expect(checklist.root).toHaveAttribute('data-state', 'eve');
    },
  );

  test(
    'the done card stays «пройдено» and the round can be repeated',
    { tag: ['@REQ-PLAN-08'] },
    async ({ api, catalog, dashboard, finish, page, plan, serverClock, signIn, user }) => {
      // 1. After the result, press «До чекліста».
      await eveOfInterview(api, catalog, serverClock, user);
      await signIn(user);
      await page.clock.install({ time: noon(1) });
      await dashboard.goto();
      await finish.start.click();
      await finish.play(api, ROUND.ratings, ROUND.answers);
      await finish.checklistGo.click();

      await expect(finish.card).toHaveAttribute('data-state', 'done');
      await expect(finish.cardScore).toHaveAttribute('data-value', '4');
      await expect(finish.cardScore).toHaveAttribute('data-total', '15');

      // 2. Reload: the same server instant, the state is server-side.
      await page.reload();
      await expect(finish.card).toHaveAttribute('data-state', 'done');
      await expect(finish.cardScore).toHaveAttribute('data-value', '4');
      await expect(finish.cardScore).toHaveAttribute('data-total', '15');

      // 3. «Ще раз»: a new round of the same day starts.
      await finish.start.click();
      await expect(plan.run).toHaveAttribute('data-kind', 'finish');
      await expect(page).toHaveURL(new RegExp(`/plan/day\\?d=${day(1)}&run=1$`));
    },
  );
});
