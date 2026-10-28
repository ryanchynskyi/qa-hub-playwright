import { QUESTION_STAT_MIN } from '../../src/api/schemas';
import { expect, test } from '../../src/fixtures';

// The stat is global and cumulative in the test DB, so every check is relative to what the
// question already has, never a literal number. Not prod-safe: `first: true` writes to it.
// shortcut: a random question keeps parallel tests off each other's aggregate; a collision is
// possible but rare, move to a per-test question pool if these ever flake.
test.describe('POST /quiz/check: correct-answer share', () => {
  let questionId: string;
  let correctIndex: number;

  test.beforeEach(async ({ api, catalog }) => {
    const { questions } = catalog;
    questionId = questions[Math.floor(Math.random() * questions.length)]!.id;
    correctIndex = await api.correctIndex(questionId);
    for (let i = 0; i < QUESTION_STAT_MIN; i++) {
      await api.checkAnswer(questionId, correctIndex, undefined, true);
    }
  });

  test(
    "a guest's first answer counts, a repeat and a skip do not",
    { tag: ['@REQ-QUIZ-09'] },
    async ({ api }) => {
      const before = (await api.checkAnswer(questionId, null)).stat!.answered;
      const first = await api.checkAnswer(questionId, correctIndex, undefined, true);
      expect(first.stat!.answered).toBe(before + 1);
      const repeat = await api.checkAnswer(questionId, correctIndex);
      expect(repeat.stat!.answered).toBe(before + 1);
      const skip = await api.checkAnswer(questionId, null, undefined, true);
      expect(skip.stat!.answered).toBe(before + 1);
    },
  );

  test(
    "a signed-in user's answer counts once, whatever the client sends as first",
    { tag: ['@REQ-QUIZ-09'] },
    async ({ api, user }) => {
      const before = (await api.checkAnswer(questionId, null)).stat!.answered;
      const first = await api.checkAnswer(questionId, correctIndex, user.token, false);
      expect(first.stat!.answered).toBe(before + 1);
      const again = await api.checkAnswer(questionId, correctIndex, user.token, true);
      expect(again.stat!.answered).toBe(before + 1);
    },
  );
});
