import { expect, test } from '../../src/fixtures';
import { CYRILLIC } from '../../src/helpers/data';

test.describe('language', () => {
  test('the UA/EN switch moves to /en/ and survives a reload', async ({
    page,
    dashboard,
    shell,
  }) => {
    await dashboard.goto();
    await shell.expectLanguage('uk');

    await shell.switchLanguage('en');
    await expect(page).toHaveURL(/\/en\/dash\/?$/);

    await page.reload();
    await shell.expectLanguage('en');
    await expect(page).toHaveURL(/\/en\/dash\/?$/);
  });

  test.describe('in English', () => {
    test.use({ lang: 'en' });

    test('a Ukrainian URL opens its English twin', async ({ page, quiz, shell }) => {
      await quiz.goto('sql');
      await expect(page).toHaveURL(/\/en\/quiz\/sql\/?$/);
      await shell.expectLanguage('en');
    });

    test('quiz questions have no Cyrillic text', async ({ quiz }) => {
      await quiz.goto('sql');
      await quiz.startRun('10');
      await expect(quiz.question.getByTestId('quiz-question-text')).not.toHaveText(CYRILLIC);
      for (const option of await quiz.options.all()) {
        await expect(option).not.toHaveText(CYRILLIC);
      }
    });
  });
});
