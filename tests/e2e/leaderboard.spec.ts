// spec: specs/phase2-social.md
// seed: tests/seed.spec.ts

import { expect, test } from '../../src/fixtures';
import { DEFAULT_PASSWORD, uniqueEmail } from '../../src/helpers/data';
import { numberValue } from '../../src/helpers/locators';
import { earnXp } from '../../src/helpers/xp';

test.describe('Leaderboard UI', () => {
  test(
    'guest sees the board (max 20 rows) and a sign-in prompt, no own row',
    { tag: ['@REQ-SOC-01'] },
    async ({ api, user, catalog, leaderboard }) => {
      // 1. Arrange: the user earns XP so the board is not empty. Open /leaderboard as a guest.
      await earnXp(api, user.token, catalog);
      await leaderboard.goto();
      await expect(leaderboard.root).toBeVisible();
      await expect(leaderboard.title).toBeVisible();
      await expect(leaderboard.period('all')).toHaveAttribute('aria-pressed', 'true');

      // 2. Read the table value and count the rows.
      const shown = await numberValue(leaderboard.table);
      expect(shown).toBeGreaterThanOrEqual(1);
      expect(shown).toBeLessThanOrEqual(20);
      await expect(leaderboard.rows).toHaveCount(shown);

      // 3. Look at the guest prompt.
      await expect(leaderboard.guestCta).toBeVisible();
      await expect(leaderboard.login).toHaveAttribute('href', '/login?next=%2Fleaderboard');
      await expect(leaderboard.register).toHaveAttribute('href', '/register?next=%2Fleaderboard');

      // 4. Look for the user's standing: a guest has none.
      await expect(leaderboard.me).toHaveCount(0);
      await expect(leaderboard.ownRow).toHaveCount(0);
      for (const row of await leaderboard.rows.all()) {
        await expect(row).not.toHaveAttribute('data-state', 'me');
        await expect(row).not.toHaveAttribute('aria-current', /.*/);
      }
    },
  );

  test(
    'the board shows at most 20 rows when more players have XP',
    { tag: ['@REQ-SOC-01'] },
    async ({ api, catalog, leaderboard }) => {
      // 1. Arrange: 21 players with XP, each recorded as soon as it exists so teardown deletes it.
      const players: { email: string; token: string }[] = [];
      try {
        await Promise.all(
          Array.from({ length: 21 }, async () => {
            const email = uniqueEmail('pw-board');
            const { accessToken } = await api.register({ email, password: DEFAULT_PASSWORD });
            players.push({ email, token: accessToken });
            await earnXp(api, accessToken, catalog);
          }),
        );
        await leaderboard.goto();

        // 2. Count the rows: 20 shown, the 21st player is not.
        await expect(leaderboard.rows).toHaveCount(20);
        expect(await numberValue(leaderboard.table)).toBe(20);
        await expect(leaderboard.ownRow).toHaveCount(0);
      } finally {
        await Promise.all(players.map(({ email, token }) => api.deleteAccount(token, email)));
      }
    },
  );

  test(
    'a row shows rank, name, level and XP',
    { tag: ['@REQ-SOC-02'] },
    async ({ api, user, catalog, leaderboard }) => {
      // 1. Arrange: the user earns XP. The response the page rendered is the oracle.
      await earnXp(api, user.token, catalog);
      const board = await leaderboard.goto();
      const expected = board.top[0]!;

      // 2. Take the row with rank 1.
      const row = leaderboard.row(1);
      await expect(leaderboard.cell(row, 'rank')).toBeVisible();
      await expect(leaderboard.cell(row, 'level')).toBeVisible();
      await expect(leaderboard.cell(row, 'xp')).toBeVisible();

      // 3. Compare the cells with the API row.
      await expect(leaderboard.cell(row, 'rank')).toHaveAttribute('data-value', '1');
      await expect(leaderboard.cell(row, 'xp')).toHaveAttribute('data-value', String(expected.xp));
      const level = leaderboard.cell(row, 'level');
      await expect(level).toHaveAttribute('data-value', String(expected.level));
      await expect(level).toHaveText(`LVL ${expected.level}`);
      await expect(leaderboard.cell(row, 'name')).toHaveText(expected.name!);
    },
  );

  test(
    'a row without a name shows as Anonymous',
    { tag: ['@REQ-SOC-02'] },
    async ({ api, user, catalog, leaderboard }) => {
      // 1. Arrange: only old accounts have a null name and no API call can make one, so the
      // response is patched. This proves the rendering, not the server rule.
      await earnXp(api, user.token, catalog);
      await leaderboard.dropFirstRowName();
      await leaderboard.goto();

      // 2. The first row shows the label instead of a name, its other cells stay.
      const row = leaderboard.row(1);
      await expect(leaderboard.cell(row, 'anonymous')).toHaveText('Анонім');
      await expect(leaderboard.cell(row, 'name')).toHaveCount(0);
      await expect(leaderboard.cell(row, 'xp')).toBeVisible();
    },
  );

  test(
    'rows are sorted by XP descending with consecutive ranks',
    { tag: ['@REQ-SOC-01', '@REQ-SOC-02'] },
    async ({ api, user, otherUser, catalog, leaderboard }) => {
      // 1. Arrange: user A answers 2 distinct questions, user B 1.
      await earnXp(api, user.token, catalog, 2);
      await earnXp(api, otherUser.token, catalog, 1);
      const board = await leaderboard.goto();
      expect(board.top.length).toBeGreaterThanOrEqual(2);
      await expect(leaderboard.rows).toHaveCount(board.top.length);

      // 2. Collect XP and ranks in DOM order: relations only, no specific rows.
      const xp = await leaderboard.column('xp');
      const ranks = await leaderboard.column('rank');
      expect(xp).toEqual([...xp].sort((a, b) => b - a));
      expect(ranks).toEqual(xp.map((_, i) => i + 1));
    },
  );
});
