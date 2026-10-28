import { bearer, expectStatus } from '../../src/api/client';
import type { RateResult } from '../../src/api/schemas';
import { expect, test } from '../../src/fixtures';

// spec: specs/phase2-recall.md (API tests A–F)

const DAY = 86_400_000;

/** XP the rating itself gave; a daily-task bonus in the same response is not the card's. */
const recallXp = ({ result }: RateResult) =>
  result.grants.filter((g) => g.reason === 'recall').reduce((sum, g) => sum + g.amount, 0);

test.describe('POST /me/recall/rate', () => {
  test(
    'a new card gives +3 XP for ratings 1–3 and +5 for 4–5',
    { tag: ['@REQ-REC-06'] },
    async ({ api, catalog, user }) => {
      const table = [
        [1, 3],
        [2, 3],
        [3, 3],
        [4, 5],
        [5, 5],
      ] as const;
      const cards = catalog.recallCards.slice(0, table.length).map((c) => c.id);
      let gained = 0;

      for (const [i, [rating, xp]] of table.entries()) {
        const res = await api.rateCard(user.token, cards[i]!, rating);
        expect(recallXp(res), `XP for rating ${rating}`).toBe(xp);
        gained += res.result.xpGained;
      }

      const { xpLog, stats } = await api.progress(user.token);
      const log = xpLog.filter((e) => e.reason === 'recall');
      expect(log.map((e) => [e.refId, e.amount])).toEqual(table.map(([, xp], i) => [cards[i], xp]));
      // A daily-task bonus may come with a rating, so the total is the sum of what the calls gave.
      expect(stats.totalXp).toBe(gained);
    },
  );

  test(
    'ratings 1–5 schedule the card in 0, 1, 3, 7 and 14 days',
    { tag: ['@REQ-REC-06'] },
    async ({ api, catalog, user }) => {
      const days = [0, 1, 3, 7, 14];
      const cards = catalog.recallCards.slice(0, days.length).map((c) => c.id);

      for (const [i, interval] of days.entries()) {
        const rating = i + 1;
        const { at, card } = await api.rateCard(user.token, cards[i]!, rating);
        expect(card.state.dueAt - at, `interval of rating ${rating}`).toBe(interval * DAY);
        expect(card.state).toMatchObject({ rating, reviews: 1, history: [rating] });
      }
    },
  );

  test(
    'a card that is not due gives no XP and is rescheduled from the new rating',
    { tag: ['@REQ-REC-06'] },
    async ({ api, catalog, user }) => {
      const id = catalog.recallCards[0]!.id;
      await api.rateCard(user.token, id, 5);

      for (const rating of [5, 3, 1]) {
        const res = await api.rateCard(user.token, id, rating);
        expect(recallXp(res), `XP for a repeat ${rating}`).toBe(0);
      }
      const last = await api.rateCard(user.token, id, 4);
      expect(last.card.state).toMatchObject({ reviews: 5, history: [5, 5, 3, 1, 4] });
      expect(last.card.state.dueAt - last.at).toBe(7 * DAY);

      const { xpLog } = await api.progress(user.token);
      expect(xpLog.filter((e) => e.reason === 'recall' && e.refId === id)).toHaveLength(1);
    },
  );

  test(
    'a due card rated again the same day gives no XP a second time',
    { tag: ['@REQ-REC-06'] },
    async ({ api, catalog, user }) => {
      const id = catalog.recallCards[0]!.id;
      const first = await api.rateCard(user.token, id, 1);
      expect(first.card.state.dueAt, 'rating 1 is due at once').toBe(first.at);
      expect(recallXp(first)).toBe(3);

      const again = await api.rateCard(user.token, id, 5);
      expect(recallXp(again), 'XP is once per card per local day').toBe(0);

      const { xpLog } = await api.progress(user.token);
      const log = xpLog.filter((e) => e.reason === 'recall' && e.refId === id);
      expect(log.map((e) => e.amount)).toEqual([3]);
    },
  );

  test(
    'rejects a bad rating, an unknown card and a missing token without giving XP',
    { tag: ['@REQ-REC-06'] },
    async ({ api, catalog, user }) => {
      const cardId = catalog.recallCards[0]!.id;
      const post = (data: object, token?: string) =>
        api.raw.post('me/recall/rate', { data, headers: bearer(token) });

      for (const rating of [0, 6, 2.5, '3', undefined]) {
        const res = await post({ cardId, rating }, user.token);
        await expectStatus(res, 400);
        expect(await res.json()).toMatchObject({ error: 'bad_request' });
      }
      const unknown = await post({ cardId: 'no-such-card', rating: 3 }, user.token);
      await expectStatus(unknown, 404);
      expect(await unknown.json()).toMatchObject({ error: 'not_found' });
      await expectStatus(await post({ cardId, rating: 3 }), 401);

      const { xpLog, stats } = await api.progress(user.token);
      expect(xpLog).toEqual([]);
      expect(stats.totalXp).toBe(0);
    },
  );
});
