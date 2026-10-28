import type { ApiClient } from '../../src/api/client';
import type { Catalog } from '../../src/api/schemas';
import { env } from '../../src/config/env';
import { expect, test, type TestUser } from '../../src/fixtures';
import { DEFAULT_PASSWORD, uniqueEmail } from '../../src/helpers/data';

/** One correct answer gives XP, so the user gets a row (the board lists users with XP only). */
async function earnXp(
  api: ApiClient,
  user: Pick<TestUser, 'token'>,
  catalog: Catalog,
): Promise<void> {
  const questionId = catalog.questions[0]!.id;
  const correct = await api.correctIndex(questionId);
  await api.checkAnswer(questionId, correct, user.token);
}

test.describe('leaderboard API', () => {
  test.beforeEach(async ({ api, user, catalog }) => earnXp(api, user, catalog));

  test('the caller sees their own row', { tag: ['@REQ-SOC-02'] }, async ({ api, user }) => {
    const board = await api.leaderboard('all', user.token);
    expect(board.me).toMatchObject({ isMe: true, name: user.displayName });
    expect(board.me!.xp).toBeGreaterThan(0);
  });
});

test(
  'the board shows the top 20, ranked by XP',
  { tag: ['@REQ-SOC-01'] },
  async ({ api, catalog }) => {
    // 21 players with XP, so the board has more rows than it shows. Each is recorded as soon as
    // it exists, so a failed setup still deletes the ones already on the shared board.
    const players: { email: string; token: string }[] = [];
    try {
      await Promise.all(
        Array.from({ length: 21 }, async () => {
          const email = uniqueEmail('pw-board');
          const { accessToken } = await api.register({ email, password: DEFAULT_PASSWORD });
          players.push({ email, token: accessToken });
          await earnXp(api, { token: accessToken }, catalog);
        }),
      );
      const { top } = await api.leaderboard('all');
      expect(top).toHaveLength(20);
      expect(top.map((row) => row.rank)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
      const xp = top.map((row) => row.xp);
      expect(xp).toEqual([...xp].sort((a, b) => b - a));
    } finally {
      await Promise.all(players.map(({ email, token }) => api.deleteAccount(token, email)));
    }
  },
);

test.describe('public leaderboard', { tag: ['@prod-safe'] }, () => {
  // Prod has real players; the local board is empty until a fresh user earns XP.
  if (!env.isProd) test.beforeEach(async ({ api, user, catalog }) => earnXp(api, user, catalog));

  // Security invariant: the public ranking never exposes who is behind a row. Raw JSON on purpose:
  // the zod schema would drop an unexpected field instead of showing it.
  for (const period of ['all', 'week'] as const) {
    // On prod the weekly board can be empty right after the weekly reset.
    const minRows = period === 'week' && env.isProd ? 0 : 1;

    test(`${period} rows carry no ids or emails`, { tag: ['@REQ-SOC-01'] }, async ({ api }) => {
      const res = await api.raw.get(`leaderboard?period=${period}`);
      expect(res.status()).toBe(200);
      const body = (await res.json()) as { top: Record<string, unknown>[] };
      expect(body.top.length).toBeGreaterThanOrEqual(minRows);
      for (const row of body.top) {
        expect(Object.keys(row).sort()).toEqual(['isMe', 'level', 'name', 'rank', 'xp']);
      }
      expect(JSON.stringify(body)).not.toContain('@');
    });
  }
});
