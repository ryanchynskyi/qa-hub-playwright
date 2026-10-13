import { expect, test } from '../../src/fixtures';

test.describe('leaderboard API', () => {
  test.beforeEach(async ({ api, user, catalog }) => {
    // Earn XP with one correct answer, so the user has a row (the board lists users with XP only).
    const questionId = catalog.questions[0]!.id;
    const correct = await api.correctIndex(questionId);
    await api.checkAnswer(questionId, correct, user.token);
  });

  test('the caller sees their own row', async ({ api, user }) => {
    const board = await api.leaderboard('all', user.token);
    expect(board.me).toMatchObject({ isMe: true, name: user.displayName });
    expect(board.me!.xp).toBeGreaterThan(0);
  });

  // Security invariant: the public ranking never exposes who is behind a row. Raw JSON on purpose:
  // the zod schema would drop an unexpected field instead of showing it.
  for (const period of ['all', 'week'] as const) {
    test(`${period} rows carry no ids or emails`, async ({ api }) => {
      const res = await api.raw.get(`leaderboard?period=${period}`);
      expect(res.status()).toBe(200);
      const body = (await res.json()) as { top: Record<string, unknown>[] };
      expect(body.top.length).toBeGreaterThan(0);
      for (const row of body.top) {
        expect(Object.keys(row).sort()).toEqual(['isMe', 'level', 'name', 'rank', 'xp']);
      }
      expect(JSON.stringify(body)).not.toContain('@');
    });
  }
});
