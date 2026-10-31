// spec: specs/phase2-quiz.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';

test.describe('Quiz: keyboard', () => {
  test.beforeEach(async ({ quiz, catalog }) => {
    const section = catalog.sections.find((s) => s.questionCount > 0);
    if (!section) throw new Error('No section with questions in the catalog');
    await quiz.goto(section.id);
  });

  test(
    'A digit key chooses the option at that screen position',
    { tag: ['@REQ-QUIZ-10'] },
    async ({ page, quiz, api }) => {
      // 1. Guest starts a run; press the digit of a shuffled position with no option focused
      await quiz.startRun();
      const shownKeys = () =>
        quiz.options.evaluateAll((els) => els.map((el) => el.getAttribute('data-key')));
      // Needs a position whose stored key differs, so "digit = stored index" cannot pass by
      // chance; a question shown in stored order is skipped.
      let step = 1;
      let keys = await shownKeys();
      while (keys.every((key, i) => key === String(i))) {
        expect(step, 'no question with shuffled options in this run').toBeLessThan(10);
        await page.keyboard.press('0');
        await expect(quiz.verdict).toHaveAttribute('data-state', 'skipped');
        await page.keyboard.press('Enter');
        await expect(quiz.progress).toHaveAttribute('data-value', String(++step));
        keys = await shownKeys();
      }
      const chosen = keys.findIndex((key, i) => key !== String(i)) + 1;
      const chosenKey = keys[chosen - 1];
      const correct = await api.correctIndex(await quiz.currentQuestionId());
      await page.keyboard.press(String(chosen));
      for (let position = 1; position <= keys.length; position++) {
        await expect(quiz.optionAt(position)).toHaveAttribute(
          'aria-pressed',
          position === chosen ? 'true' : 'false',
        );
      }
      await expect(quiz.verdict).toHaveAttribute(
        'data-state',
        chosenKey === String(correct) ? 'correct' : 'wrong',
      );

      // 2. Press Enter
      await page.keyboard.press('Enter');
      await expect(quiz.progress).toHaveAttribute('data-value', String(step + 1));
      await expect(quiz.options).not.toHaveCount(0);
      await expect(quiz.optionsInState('correct')).toHaveCount(0);
      await expect(quiz.optionsInState('wrong')).toHaveCount(0);
    },
  );

  test(
    'S and 0 skip a question, Enter goes next only after the verdict',
    { tag: ['@REQ-QUIZ-10'] },
    async ({ page, quiz, api }) => {
      // 1. Guest starts a run, presses Enter on the unanswered question
      await quiz.startRun();
      const id = await quiz.currentQuestionId();
      await page.keyboard.press('Enter');
      await expect(quiz.progress).toHaveAttribute('data-value', '1');
      await expect(quiz.verdict).toHaveCount(0);

      // 2. Press s
      await page.keyboard.press('s');
      await expect(quiz.verdict).toHaveAttribute('data-state', 'skipped');
      await expect(quiz.optionsInState('correct')).toHaveCount(1);
      await expect(quiz.optionsInState('correct')).toHaveAttribute(
        'data-key',
        String(await api.correctIndex(id)),
      );
      await expect(quiz.counts).toHaveAttribute('data-skipped', '1');

      // 3. Press Enter, then 0
      await page.keyboard.press('Enter');
      await expect(quiz.progress).toHaveAttribute('data-value', '2');
      await page.keyboard.press('0');
      await expect(quiz.verdict).toHaveAttribute('data-state', 'skipped');
      await expect(quiz.counts).toHaveAttribute('data-skipped', '2');
    },
  );
});
