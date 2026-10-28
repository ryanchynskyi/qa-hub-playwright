// spec: specs/phase2-import.md
import type { ImportPayload } from '../../src/api/client';
import { expect, test } from '../../src/fixtures';

// The server half of the guest import; the banner and the backup are e2e/import.
test.describe('POST /me/import', () => {
  let payload: ImportPayload;
  let right: string;
  let wrong: string;

  test.beforeEach(({ catalog }) => {
    [right, wrong] = catalog.questions.map((q) => q.id) as [string, string];
    payload = {
      source: 'guest',
      questions: {
        [right]: { lastResult: 1 },
        [wrong]: { lastResult: 0, attempts: 2 },
        'not-a-question': { lastResult: 1 },
      },
      cards: {},
      articlesRead: {},
      attempts: {},
    };
  });

  test(
    'moves the answers and recomputes the XP on the server',
    { tag: ['@REQ-PROG-13'] },
    async ({ api, user }) => {
      const result = await api.importProgress(user.token, payload);
      expect(result.imported.questions).toBe(2);
      expect(result.skipped.questions, 'the unknown id').toBe(1);
      expect(result.xpGained).toBeGreaterThan(0);

      const progress = await api.progress(user.token);
      expect(progress.stats.totalXp).toBe(result.xpGained);
      expect(progress.questions[right]).toMatchObject({ lastResult: 1 });
      expect(progress.questions[wrong]).toMatchObject({ lastResult: 0, attempts: 2 });
      // The app logs the import as grants per item kind (refId `guest:questions`), not per answer.
      expect(new Set(progress.xpLog.map((g) => g.reason))).toEqual(new Set(['import']));
    },
  );

  test(
    'a wrong answer and an unknown id add no XP',
    { tag: ['@REQ-PROG-13'] },
    async ({ api, user }) => {
      const { [right]: correct, ...rest } = payload.questions;
      await api.importProgress(user.token, { ...payload, questions: { [right]: correct! } });

      const result = await api.importProgress(user.token, { ...payload, questions: rest });
      expect(result.imported.questions, 'the wrong answer').toBe(1);
      expect(result.skipped.questions, 'the unknown id').toBe(1);
      expect(result.xpGained).toBe(0);
    },
  );

  test('the same payload again adds nothing', { tag: ['@REQ-PROG-14'] }, async ({ api, user }) => {
    await api.importProgress(user.token, payload);
    const xpAfterFirst = (await api.progress(user.token)).stats.totalXp;

    const again = await api.importProgress(user.token, payload);
    expect(again.xpGained).toBe(0);
    expect(again.imported).toEqual({ questions: 0, cards: 0, articles: 0, attempts: 0 });
    expect((await api.progress(user.token)).stats.totalXp).toBe(xpAfterFirst);
  });
});
