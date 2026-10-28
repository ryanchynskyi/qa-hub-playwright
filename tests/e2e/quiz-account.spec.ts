// spec: specs/phase2-quiz.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';
import { QuizPage } from '../../src/pages/quiz-page';

test.describe('Quiz: answers of a signed-in user live on the server', () => {
  test(
    "A signed-in user's answers are seen from another device",
    { tag: ['@REQ-QUIZ-12'] },
    async ({ authedPage, secondPage, catalog, api }) => {
      const section = catalog.sections.find((s) => s.questionCount >= 3);
      expect(section, 'a section with 3+ questions').toBeDefined();
      const quiz = new QuizPage(authedPage);

      // 1. Context A starts a run: one correct, one wrong, one skipped answer, then finishes
      await quiz.goto(section!.id);
      await quiz.startRun();
      await quiz.answerCorrectly(api);
      await quiz.goNext();
      await quiz.answerWrong(api);
      await quiz.goNext();
      await quiz.skipQuestion();
      await quiz.finishRun();

      // 2. Open the section in context A again (reload)
      await quiz.goto(section!.id);
      const tileA = quiz.section(section!.id);
      await expect(tileA).toHaveAttribute('data-correct', '1');
      await expect(tileA).toHaveAttribute('data-wrong', '1');
      await expect(tileA).toHaveAttribute('data-skipped', '1');

      // 3. Context B (same user, no local state from A) shows the same counters
      const quizB = new QuizPage(secondPage);
      await quizB.goto(section!.id);
      const tileB = quizB.section(section!.id);
      await expect(tileB).toHaveAttribute('data-correct', '1');
      await expect(tileB).toHaveAttribute('data-wrong', '1');
      await expect(tileB).toHaveAttribute('data-skipped', '1');
    },
  );
});
