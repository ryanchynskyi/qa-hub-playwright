// spec: specs/phase2-quiz.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';
import { QUESTION_STAT_MIN } from '../../src/api/schemas';

test.describe('Quiz: feedback after the verdict', () => {
  test.beforeEach(async ({ quiz, catalog }) => {
    const section = catalog.sections.find((s) => s.questionCount > 0);
    if (!section) throw new Error('No section with questions in the catalog');
    await quiz.goto(section.id);
  });

  test(
    'The correct-answer share appears only after the verdict',
    { tag: ['@REQ-QUIZ-09'] },
    async ({ quiz, api }) => {
      // 1. Guest starts a run; seed QUESTION_STAT_MIN first answers of that question through the API
      await quiz.startRun();
      const id = await quiz.currentQuestionId();
      for (let i = 0; i < QUESTION_STAT_MIN; i++) {
        await api.checkAnswer(id, 0, undefined, true);
      }
      await expect(quiz.feedback).toHaveCount(0);
      await expect(quiz.stat).toHaveCount(0);

      // 2. Answer in the UI
      await quiz.answerCorrectly(api);
      await expect(quiz.stat).toBeVisible();

      // 3. The shown share equals the API aggregate (a skip check does not change it)
      const { stat } = await api.checkAnswer(id, null);
      expect(stat, 'stat after the threshold').toBeDefined();
      await expect(quiz.stat).toHaveAttribute('data-value', String(stat!.pct));
      await expect(quiz.stat).toContainText(`${stat!.pct}`);
      await expect(quiz.stat).toContainText('%');
    },
  );

  test(
    'The comments button appears only after the verdict',
    { tag: ['@REQ-QUIZ-19'] },
    async ({ quiz, api }) => {
      // 1. Guest starts a run and looks at the first question
      await quiz.startRun();
      const id = await quiz.currentQuestionId();
      await expect(quiz.commentsOpen).toHaveCount(0);

      // 2. Answer the question
      await quiz.answerCorrectly(api);
      await expect(quiz.commentsOpen).toBeVisible();
      await expect(quiz.next).toBeVisible();

      // 3. The count on the button equals the API total
      const total = (await api.comments(id)).length;
      await expect(quiz.commentsOpen).toHaveAttribute('data-value', String(total));
    },
  );
});
