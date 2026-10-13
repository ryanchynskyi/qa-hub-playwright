import { expect, test } from '../../src/fixtures';

const SECTION = 'sql';

test.describe('guest quiz', () => {
  test.beforeEach(async ({ quiz }) => {
    await quiz.goto(SECTION);
  });

  test('an answer gets a server verdict and reveals exactly one correct option', async ({
    quiz,
  }) => {
    await quiz.startRun('10');
    await expect(quiz.progress).toHaveAttribute('data-value', '1');

    // Security: before the server answers, no option tells which one is right.
    const optionCount = await quiz.options.count();
    expect(optionCount).toBeGreaterThanOrEqual(2);
    await expect(quiz.optionsInState('idle')).toHaveCount(optionCount);

    const verdict = await quiz.answer(0);
    expect(['correct', 'wrong']).toContain(verdict);
    await expect(quiz.optionsInState('correct')).toHaveCount(1);

    await quiz.goNext();
    await expect(quiz.progress).toHaveAttribute('data-value', '2');
  });

  test('all answers correct: 100 %, a bonus, and XP grows by at least the shown gains', async ({
    quiz,
    shell,
    api,
  }) => {
    const xpBefore = await shell.totalXp();
    await quiz.startRun('10');
    const total = await quiz.progress.getAttribute('data-total');

    let shownGains = 0;
    for (let i = 0; i < Number(total); i++) {
      await quiz.answerCorrectly(api);
      shownGains += await quiz.shownXpGain();
      await quiz.goNext();
    }

    await expect(quiz.resultPercent).toHaveAttribute('data-value', '100');
    // ≥10 answers and ≥80 % correct earn the quiz bonus (20); daily tasks may add more on top.
    await expect(quiz.resultBonus).toBeVisible();
    const bonus = Number(await quiz.resultBonus.getAttribute('data-value'));
    expect(bonus).toBeGreaterThanOrEqual(20);
    // Relative assertion: daily-task rewards can land during the run (docs/brief.md §9).
    await expect.poll(() => shell.totalXp()).toBeGreaterThanOrEqual(xpBefore + shownGains + bonus);
  });

  test('guest progress survives a reload', async ({ page, quiz, shell, api }) => {
    await quiz.startRun('10');
    await quiz.answerCorrectly(api);
    const gain = await quiz.shownXpGain();
    expect(gain).toBeGreaterThan(0);
    await expect.poll(() => shell.totalXp()).toBeGreaterThanOrEqual(gain);
    const xp = await shell.totalXp();

    await page.reload();
    await expect.poll(() => shell.totalXp()).toBe(xp);
  });

  test('a legacy hash link opens the right section', async ({ page, quiz }) => {
    await page.goto('#/quiz/pwfix');
    await expect(quiz.section('pwfix')).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/\/quiz\/pwfix\/?$/);
  });
});
