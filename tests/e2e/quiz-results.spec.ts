// spec: specs/phase2-quiz.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';
import type { ApiClient } from '../../src/api/client';
import { stripInlineCode } from '../../src/helpers/data';
import type { QuizPage } from '../../src/pages/quiz-page';

/** Correct, wrong, skipped, in this order; ends the run early so the results count 3 questions. */
async function answerThree(quiz: QuizPage, api: ApiClient) {
  await quiz.startRun();
  const correctId = await quiz.currentQuestionId();
  await quiz.answerCorrectly(api);
  await quiz.goNext();
  const wrongId = await quiz.currentQuestionId();
  const chosenKey = await quiz.answerWrong(api);
  await quiz.goNext();
  const skippedId = await quiz.currentQuestionId();
  await quiz.skipQuestion();
  await quiz.finishRun();
  return { correctId, wrongId, chosenKey, skippedId };
}

test.describe('Quiz: results screen and redo', () => {
  test.beforeEach(async ({ quiz, catalog }) => {
    const section = catalog.sections.find((s) => s.questionCount >= 3);
    if (!section) throw new Error('No section with at least 3 questions in the catalog');
    await quiz.goto(section.id);
  });

  test(
    'The results show three scales, chapter rows and a miss list with both answers',
    { tag: ['@REQ-QUIZ-13'] },
    async ({ page, quiz, api }) => {
      // 1. Guest starts a run, answers correct, wrong and skipped, then finishes the run
      const { wrongId, chosenKey, skippedId } = await answerThree(quiz, api);
      await expect(quiz.results).toBeVisible();
      await expect(quiz.progress).toHaveAttribute('data-state', 'finished');

      // 2. Read the three scales
      for (const [key, value] of [
        ['pass', '1'],
        ['fail', '1'],
        ['skipped', '1'],
      ] as const) {
        await expect(quiz.resultScale(key)).toHaveAttribute('data-value', value);
        await expect(quiz.resultScale(key)).toHaveAttribute('data-total', '3');
      }

      // 3. Read the chapter rows
      const rows = await quiz.resultRows.all();
      let total = 0;
      let value = 0;
      for (const row of rows) {
        total += Number(await row.getAttribute('data-total'));
        value += Number(await row.getAttribute('data-value'));
      }
      expect(total, 'sum of row totals').toBe(3);
      expect(value, 'sum of row values').toBe(1);

      // 4. Read the miss list
      await expect(quiz.resultMisses).toHaveCount(2);
      const wrongMiss = quiz.resultMiss(wrongId);
      const skippedMiss = quiz.resultMiss(skippedId);
      await expect(wrongMiss).toHaveAttribute('data-state', 'fail');
      await expect(skippedMiss).toHaveAttribute('data-state', 'skipped');

      const section = new URL(page.url()).pathname.split('/').pop()!;
      const questions = await api.questions(section);
      const optionText = (id: string, key: number) =>
        stripInlineCode(questions.find((q) => q.id === id)!.options[key]!);
      await expect(wrongMiss).toContainText(optionText(wrongId, chosenKey));
      await expect(wrongMiss).toContainText(optionText(wrongId, await api.correctIndex(wrongId)));
      await expect(skippedMiss).toContainText(
        optionText(skippedId, await api.correctIndex(skippedId)),
      );
    },
  );

  test(
    '"Повторити Fail і Skipped" restarts exactly the missed questions',
    { tag: ['@REQ-QUIZ-14'] },
    async ({ quiz, api }) => {
      // 1. Guest answers three questions (correct, wrong, skipped) and finishes the run
      const { correctId, wrongId, skippedId } = await answerThree(quiz, api);
      await expect(quiz.redo).toBeEnabled();
      await expect(quiz.redo).toHaveAttribute('data-value', '2');

      // 2. Click the redo button
      await quiz.redo.click();
      await expect(quiz.question).toBeVisible();
      await expect(quiz.progress).toHaveAttribute('data-total', '2');
      await expect(quiz.progress).toHaveAttribute('data-state', 'running');

      // 3. Step through the redo run, skipping each question
      const seen: string[] = [];
      for (let i = 0; i < 2; i++) {
        seen.push(await quiz.currentQuestionId());
        await quiz.skipQuestion();
        await quiz.goNext();
      }
      expect(new Set(seen)).toEqual(new Set([wrongId, skippedId]));
      expect(seen).not.toContain(correctId);
    },
  );

  test(
    "The Recall link leads to the missed chapter's cards",
    { tag: ['@REQ-QUIZ-14'] },
    async ({ page, quiz, api, catalog }) => {
      // 1. Run in a section where every question's chapter has recall cards, answer the first question wrong
      const chaptersWithCards = new Set(catalog.recallCards.map((c) => c.chapterId));
      const section = catalog.sections.find((s) => {
        const own = catalog.questions.filter((q) => q.sectionId === s.id);
        return own.length > 0 && own.every((q) => chaptersWithCards.has(q.chapterId));
      });
      expect(section, 'a section whose questions all have recall cards').toBeDefined();
      await quiz.goto(section!.id);
      await quiz.startRun();
      const id = await quiz.currentQuestionId();
      const chapterId = (await api.questions(section!.id)).find((q) => q.id === id)!.chapterId;
      await quiz.answerWrong(api);
      await quiz.finishRun();
      await expect(quiz.results).toBeVisible();

      // 2. Read the Recall link
      const cards = (await api.recallCards()).filter((c) => c.chapterId === chapterId);
      await expect(quiz.resultRecall).toHaveAttribute('data-key', chapterId);
      await expect(quiz.resultRecall).toHaveAttribute('data-value', String(cards.length));
      await expect(quiz.resultRecall).toHaveAttribute(
        'href',
        new RegExp(`/recall/ch/${chapterId}$`),
      );

      // 3. Click it
      await quiz.resultRecall.click();
      await expect(page).toHaveURL(new RegExp(`/recall/ch/${chapterId}$`));
    },
  );
});
