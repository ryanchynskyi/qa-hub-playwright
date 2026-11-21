// spec: specs/phase2-courses.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';
import { articleStep } from '../../src/pages/course-step-page';
import { answerInCourse, chapterOf } from '../../src/helpers/course';
import { recordApiRequests } from '../../src/helpers/network';

test.describe('CRS-04 Практика and Тест', () => {
  test(
    'Практика: counter, no skip, verdict only after the check',
    { tag: '@REQ-CRS-04' },
    async ({ courseStep, quiz, api, course, user, signIn }) => {
      const full = chapterOf(course, 'full');
      await signIn(user);

      // 1. Signed in fresh account; open /course/playwright/<full>/practice
      await courseStep.gotoStep(full.id, 'practice');
      await expect(courseStep.practice).toHaveAttribute('data-key', full.id);
      await expect(courseStep.counter).toHaveAttribute('data-value', '1');
      await expect(courseStep.counter).toHaveAttribute('data-total', String(full.code.length));
      await expect(courseStep.code).toBeVisible();
      await expect(quiz.skip).toHaveCount(0);
      await expect(courseStep.reread).toHaveAttribute('data-key', articleStep(full.articles[0]!));
      // absences after the state has drawn (the code and the reread link are there)
      await expect(quiz.verdict).toHaveCount(0);
      await expect(courseStep.explanation).toHaveCount(0);
      await expect(courseStep.theory).toHaveCount(0);

      // 2. Choose a wrong option (the correct index comes from the guest checkAnswer)
      const correct = await api.correctIndex(await quiz.currentQuestionId());
      const wrong = await quiz.answerWrong(api);
      await expect(quiz.option(wrong)).toHaveAttribute('data-state', 'wrong');
      await expect(quiz.option(correct)).toHaveAttribute('data-state', 'correct');
      await expect(quiz.verdict).toHaveAttribute('data-state', 'wrong');
      await expect(courseStep.theory).toHaveAttribute('data-key', articleStep(full.articles[0]!));
      await expect(quiz.next).toBeVisible();
      await expect(courseStep.reread).toHaveCount(0);
    },
  );

  test(
    'Тест: no code, keys 1-9 pick the option, Enter moves on, finish goes to result',
    { tag: '@REQ-CRS-04' },
    async ({ courseStep, quiz, api, course, user, signIn, page }) => {
      const full = chapterOf(course, 'full');
      await signIn(user);

      // 1. Open /course/playwright/<full>/test
      await courseStep.gotoStep(full.id, 'test');
      await expect(courseStep.test).toHaveAttribute('data-key', full.id);
      await expect(courseStep.counter).toHaveAttribute('data-value', '1');
      await expect(courseStep.counter).toHaveAttribute('data-total', String(full.plain.length));
      await expect(courseStep.levelLabel).toBeVisible();
      await expect(courseStep.finish).toBeVisible();
      await expect(courseStep.code).toHaveCount(0);
      await expect(quiz.skip).toHaveCount(0);
      const first = await quiz.currentQuestionId();
      // the quiz skips on s / 0; the course run has no skip keys (CRS-017)
      await page.keyboard.press('s');
      await page.keyboard.press('0');
      await expect(courseStep.finish).toBeVisible();
      await expect(quiz.verdict).toHaveCount(0);
      await expect(courseStep.counter).toHaveAttribute('data-value', '1');
      await expect(quiz.question).toHaveAttribute('data-key', first);

      // 2. Press key 1: it picks the first option on screen (stored keys are shuffled)
      const picked = Number(await quiz.optionAt(1).getAttribute('data-key'));
      const expected = (['wrong', 'correct'] as const)[
        Number(picked === (await api.correctIndex(first)))
      ]!;
      await page.keyboard.press('1');
      await expect(quiz.verdict).toHaveAttribute('data-state', expected);
      await expect(quiz.optionAt(1)).toHaveAttribute('data-state', expected);
      await expect(quiz.optionsInState('wrong')).toHaveCount(Number(expected === 'wrong'));
      await expect(quiz.next).toBeVisible();
      await expect(courseStep.finish).toHaveCount(0);

      // 3. Press Enter
      await page.keyboard.press('Enter');
      await expect(courseStep.counter).toHaveAttribute('data-value', '2');
      await expect(quiz.question).not.toHaveAttribute('data-key', first);
      await expect(quiz.verdict).toHaveCount(0);

      // 4. Open /course/playwright/<full>/test again and click course-finish
      await courseStep.gotoStep(full.id, 'test');
      await courseStep.finish.click();
      await expect(page).toHaveURL(new RegExp(`/${full.id}/result$`));
      await expect(courseStep.result).toHaveAttribute('data-key', full.id);
    },
  );

  test(
    'Re-entry starts at the first unanswered question, all answered starts at 1',
    { tag: '@REQ-CRS-04' },
    async ({ courseStep, quiz, api, course, user, signIn }) => {
      const full = chapterOf(course, 'full');
      const [first, second, third] = full.plain as [string, string, string, ...string[]];
      await signIn(user);

      // 1. Answer the first two plain questions through the API; open /test
      await answerInCourse(api, user.token, first);
      await answerInCourse(api, user.token, second);
      await courseStep.gotoStep(full.id, 'test');
      await expect(courseStep.counter).toHaveAttribute('data-value', '3');
      await expect(quiz.question).toHaveAttribute('data-key', third);

      // 2. Answer all remaining plain questions through the API and reopen /test
      for (const id of full.plain.slice(2)) await answerInCourse(api, user.token, id);
      await courseStep.gotoStep(full.id, 'test');
      await expect(courseStep.counter).toHaveAttribute('data-value', '1');
      await expect(quiz.question).toHaveAttribute('data-key', first);

      // 3. Reset the course, answer only the SECOND question, reopen /test
      await api.resetCourse(user.token, 'playwright');
      await answerInCourse(api, user.token, second);
      await courseStep.gotoStep(full.id, 'test');
      await expect(courseStep.counter).toHaveAttribute('data-value', '1');
      await expect(quiz.question).toHaveAttribute('data-key', first);
    },
  );

  test(
    'A skip is not an answer for the course',
    { tag: '@REQ-CRS-04' },
    async ({ courseStep, coursePage, quiz, api, course, user, signIn }) => {
      const full = chapterOf(course, 'full');
      const [first, skipped, ...rest] = full.plain as [string, string, ...string[]];
      await signIn(user);

      // 1. Answer the first, skip the second, answer the rest (all in the course); open /test.
      // If a skip counted, every question would be answered and the run would start at 1.
      await answerInCourse(api, user.token, first);
      await api.checkAnswer(skipped, null, user.token, undefined, 'playwright');
      for (const id of rest) await answerInCourse(api, user.token, id);
      await courseStep.gotoStep(full.id, 'test');
      await expect(courseStep.counter).toHaveAttribute('data-value', '2');
      await expect(quiz.question).toHaveAttribute('data-key', skipped);

      // 2. Open /course/playwright
      await coursePage.goto();
      await expect(coursePage.chapter(full.id)).toBeVisible();
      await coursePage.toggle(full.id).click();
      // `cards` is the anchor that the row is drawn; the test step is not done
      await expect(coursePage.step(full.id, 'cards')).toHaveAttribute('data-state', 'todo');
      await expect(coursePage.step(full.id, 'test')).toHaveAttribute(
        'data-state',
        /^(todo|current)$/,
      );
    },
  );

  test(
    'Answering every question turns the programme row done and sends no quiz finish',
    { tag: '@REQ-CRS-04' },
    async ({ courseStep, coursePage, quiz, api, course, user, signIn, page }) => {
      const full = chapterOf(course, 'full');
      await signIn(user);

      // 1. Start the request spy; answer all plain questions in the UI with the option keys and Enter
      const finishes = recordApiRequests(page, 'me/quiz/finish');
      const checks = recordApiRequests(page, 'quiz/check');
      await courseStep.gotoStep(full.id, 'test');
      await expect(courseStep.counter).toHaveAttribute('data-value', '1');
      await page.keyboard.press('1');
      await expect(quiz.verdict).toBeVisible();
      // table per remaining question: [counter value after Enter]
      const counters = full.plain.slice(1).map((_, i) => String(i + 2));
      for (const value of counters) {
        await page.keyboard.press('Enter');
        await expect(courseStep.counter).toHaveAttribute('data-value', value);
        await page.keyboard.press('1');
        await expect(quiz.verdict).toBeVisible();
      }
      const bodies = checks.map((c) => c.body as { questionId: string; course?: string });
      expect(bodies.map((b) => b.course)).toEqual(full.plain.map(() => 'playwright'));
      expect(bodies.map((b) => b.questionId).sort()).toEqual([...full.plain].sort());
      // the last Enter leaves the run for the next step (A9): where the quiz would send its finish
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`/${full.id}/cards$`));

      // 2. Open /course/playwright
      await coursePage.goto();
      await expect(coursePage.chapter(full.id)).toBeVisible();
      await coursePage.toggle(full.id).click();
      await expect(coursePage.step(full.id, 'test')).toHaveAttribute('data-state', 'done');
      await expect(coursePage.step(full.id, 'practice')).toHaveAttribute(
        'data-state',
        /^(todo|current)$/,
      );
      // the spy kept recording across the leave and the reload
      expect(finishes).toHaveLength(0);

      // 3. Read the course record through the ApiClient
      const answered = Object.keys(
        (await api.progress(user.token)).courses.playwright?.questions ?? {},
      );
      // exact: the plain questions and none of the code ones
      expect(answered.sort()).toEqual([...full.plain].sort());
    },
  );
});
