import { ApiError, CheckResult } from '../../src/api/schemas';
import { expect, test } from '../../src/fixtures';

test.describe('POST /quiz/check', () => {
  let questionId: string;

  test.beforeAll(({ catalog }) => {
    questionId = catalog.questions[0]!.id;
  });

  test(
    'the correct option gets "correct" with an explanation',
    { tag: ['@REQ-QUIZ-08'] },
    async ({ api }) => {
      const { correctIndex } = await api.checkAnswer(questionId, null);
      const result = await api.checkAnswer(questionId, correctIndex);
      expect(result.outcome).toBe('correct');
      expect(result.correctIndex).toBe(correctIndex);
      expect(result.explanation).not.toBe('');
    },
  );

  test(
    'a wrong option gets "wrong" and reveals the right one',
    { tag: ['@REQ-QUIZ-08'] },
    async ({ api }) => {
      const { correctIndex } = await api.checkAnswer(questionId, null);
      const wrong = (correctIndex + 1) % 2; // every question has at least 2 options
      const result = await api.checkAnswer(questionId, wrong);
      expect(result).toMatchObject({ outcome: 'wrong', correctIndex });
    },
  );

  test('no choice counts as skipped', { tag: ['@REQ-QUIZ-08'] }, async ({ api }) => {
    expect((await api.checkAnswer(questionId, null)).outcome).toBe('skipped');
  });

  test('an unknown question id is 404', { tag: ['@REQ-NFR-05'] }, async ({ api }) => {
    const res = await api.raw.post('quiz/check', { data: { questionId: 'nope00', choice: 0 } });
    expect(res.status()).toBe(404);
  });

  const badBodies = [
    { name: 'choice above 9', data: { choice: 10 } },
    { name: 'negative choice', data: { choice: -1 } },
    { name: 'missing question id', data: { questionId: undefined, choice: 0 } },
  ];
  for (const { name, data } of badBodies) {
    test(`${name} is 400 bad_request`, { tag: ['@REQ-NFR-05'] }, async ({ api }) => {
      const res = await api.raw.post('quiz/check', { data: { questionId, ...data } });
      expect(res.status()).toBe(400);
      const body = ApiError.parse(await res.json()); // the common error format
      expect(body.error).toBe('bad_request');
      expect(CheckResult.safeParse(body).success).toBe(false);
    });
  }
});
