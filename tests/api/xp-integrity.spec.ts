import { bearer } from '../../src/api/client';
import { expect, test } from '../../src/fixtures';

test(
  'parallel correct answers to one question pay its XP once',
  { tag: ['@REQ-NFR-02'] },
  async ({ api, user, catalog }) => {
    const questionId = catalog.questions[0]!.id;
    const choice = await api.correctIndex(questionId);

    await Promise.all(
      Array.from({ length: 5 }, () => api.checkAnswer(questionId, choice, user.token)),
    );

    const { stats, xpLog } = await api.progress(user.token);
    const grants = xpLog.filter((grant) => grant.refId === questionId);
    expect(grants).toHaveLength(1);
    expect(grants[0]!.amount).toBeGreaterThan(0);
    // A fresh account: every XP point it has must come from a logged grant.
    expect(stats.totalXp).toBe(xpLog.reduce((sum, grant) => sum + grant.amount, 0));
  },
);

test.describe('finishing a quiz run', () => {
  test(
    'a run is recorded once; finishing it again is 409 already_finished',
    { tag: ['@REQ-QUIZ-17'] },
    async ({ api, user, catalog }) => {
      const { id, sectionId } = catalog.questions[0]!;
      await api.checkAnswer(id, 0, user.token);
      await api.finishQuiz(user.token, sectionId, [id]);

      const again = await api.raw.post('me/quiz/finish', {
        data: { sectionId, questionIds: [id] },
        headers: bearer(user.token),
      });
      expect(again.status()).toBe(409);
      expect(await again.json()).toMatchObject({ error: 'already_finished' });
      expect((await api.progress(user.token)).attempts[sectionId]).toHaveLength(1);
    },
  );

  test(
    'questions not answered in this sitting are 409 not_answered',
    { tag: ['@REQ-QUIZ-17'] },
    async ({ api, user, catalog }) => {
      const { id, sectionId } = catalog.questions[0]!;
      const res = await api.raw.post('me/quiz/finish', {
        data: { sectionId, questionIds: [id] },
        headers: bearer(user.token),
      });
      expect(res.status()).toBe(409);
      expect(await res.json()).toMatchObject({ error: 'not_answered' });
    },
  );

  test(
    'only the newest 20 runs of a section are kept',
    { tag: ['@REQ-QUIZ-17'] },
    async ({ api, user, catalog }) => {
      const { id, sectionId } = catalog.questions[0]!;
      const finishRun = async () => {
        // A new answer opens a new run: one that started after the previous finished run.
        await api.checkAnswer(id, 0, user.token);
        await api.finishQuiz(user.token, sectionId, [id]);
      };
      await finishRun();
      const oldest = (await api.progress(user.token)).attempts[sectionId]![0]!.at;
      for (let run = 1; run < 21; run++) await finishRun();

      const attempts = (await api.progress(user.token)).attempts[sectionId]!;
      expect(attempts).toHaveLength(20);
      const times = attempts.map((attempt) => attempt.at);
      expect(times).toEqual([...times].sort((a, b) => b - a));
      expect(times).not.toContain(oldest);
    },
  );
});
