import { expect, test } from '../../src/fixtures';

// The server half of "answers follow the account" (QUIZ-12); the UI half is e2e/quiz-account.
test.describe('GET /me/progress: quiz answers', () => {
  test(
    'keeps the latest answer per question, so another device sees the same',
    { tag: ['@REQ-QUIZ-12'] },
    async ({ api, catalog, user }) => {
      const [a, b, c] = catalog.questions.map((q) => q.id);
      const right = async (id: string) => api.correctIndex(id);
      await api.checkAnswer(a!, await right(a!), user.token);
      await api.checkAnswer(b!, ((await right(b!)) + 1) % 2, user.token);
      await api.checkAnswer(c!, null, user.token);

      const { questions } = await api.progress(user.token);
      expect(questions[a!]).toMatchObject({ lastResult: 1 });
      expect(questions[b!]).toMatchObject({ lastResult: 0 });
      expect(questions[b!]?.skipped).toBeFalsy();
      expect(questions[c!]).toMatchObject({ lastResult: 0, skipped: true });

      // A new answer replaces the old one instead of adding to it.
      await api.checkAnswer(b!, await right(b!), user.token);
      const after = await api.progress(user.token);
      expect(after.questions[b!]).toMatchObject({ lastResult: 1 });
      expect(Object.keys(after.questions)).toHaveLength(3);
    },
  );
});
