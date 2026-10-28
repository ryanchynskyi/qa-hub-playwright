// spec: specs/phase2-recall.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';
import { readGuest } from '../../src/helpers/guest-storage';
import type { ApiClient } from '../../src/api/client';
import { RecallPage } from '../../src/pages/recall-page';

/** The API answer is markdown: a plain run of letters from it is what the UI text must contain. */
const plainFragment = (answer: string): string => {
  const fragment = answer.match(/[\p{L} ]{12,}/u)?.[0].trim();
  if (!fragment) throw new Error(`No plain fragment in the answer: ${answer}`);
  return fragment;
};

const cardById = async (api: ApiClient, id: string) => {
  const card = (await api.recallCards()).find((c) => c.id === id);
  if (!card) throw new Error(`Card ${id} is not in the API`);
  return card;
};

test.describe('Recall: card front', () => {
  test(
    'the front shows the question and hides the answer',
    { tag: ['@REQ-REC-04'] },
    async ({ recall, api }) => {
      // 1. Open /recall and click recall-start (default 10 cards, all topics)
      await recall.goto();
      await recall.startSession();

      // 2. Read recall-card[data-key] and look the card up in the API
      const id = await recall.currentCardId();
      const card = await cardById(api, id);
      await expect(recall.card).toHaveAttribute('data-state', 'front');
      await expect(recall.question).toHaveText(card.question);
      await expect(recall.reveal).toBeVisible();
      await expect(recall.back).toBeHidden();
      await expect(recall.answer).toBeHidden();
      await expect(recall.rates).toHaveCount(0);
      await expect(recall.card).not.toContainText(plainFragment(card.answer));
      await expect(recall.progress).toHaveAttribute('data-value', '1');
      await expect(recall.progress).toHaveAttribute('data-total', '10');
    },
  );
});

test.describe('Recall: reveal', () => {
  test(
    'the button shows the model answer and rating buttons 1 to 5',
    { tag: ['@REQ-REC-04'] },
    async ({ recall, api }) => {
      // 1. Open /recall, click recall-start, remember the card id
      await recall.goto();
      await recall.startSession();
      const id = await recall.currentCardId();
      const card = await cardById(api, id);

      // 2. Click recall-reveal
      await recall.showAnswer();
      await expect(recall.answer).toBeVisible();
      await expect(recall.answer).toContainText(plainFragment(card.answer));
      await expect(recall.question).toHaveText(card.question);
      await expect(recall.rates).toHaveCount(5);
      for (let n = 1; n <= 5; n++) {
        await expect(recall.rate(n)).toBeEnabled();
      }
      await expect(recall.reveal).toHaveCount(0);
      await expect(recall.progress).toHaveAttribute('data-value', '1');
    },
  );

  for (const key of ['Space', 'Enter'] as const) {
    test(`${key} shows the answer`, { tag: ['@REQ-REC-04'] }, async ({ recall }) => {
      // 1. Open /recall, click recall-start
      await recall.goto();
      await recall.startSession();

      // 2. Press the key without focusing any element
      await recall.showAnswer(key);
      await expect(recall.rates).toHaveCount(5);

      // Negative: Space again changes nothing
      await recall.page.keyboard.press('Space');
      await expect(recall.card).toHaveAttribute('data-state', 'back');
      await expect(recall.progress).toHaveAttribute('data-value', '1');
    });
  }
});

test.describe('Recall: rating', () => {
  test(
    'a rating moves to the next card and the counter updates',
    { tag: ['@REQ-REC-05'] },
    async ({ page, recall }) => {
      // 1. Open /recall, click recall-start, remember card id A
      await recall.goto();
      await recall.startSession();
      const a = await recall.currentCardId();

      // 2. Reveal and rate 4
      await recall.showAnswer();
      await recall.rateCard(4);
      await expect(recall.progress).toHaveAttribute('data-value', '2');
      await expect(recall.progress).toHaveAttribute('data-total', '10');
      await expect(recall.card).toHaveAttribute('data-state', 'front');
      await expect(recall.card).not.toHaveAttribute('data-key', a);
      await expect(recall.bar.nth(0)).toHaveAttribute('data-state', 'ok');
      await expect(recall.bar.nth(1)).toHaveAttribute('data-state', 'current');
      await expect
        .poll(async () => {
          const state = (await readGuest(page))?.cards[a];
          return state && { rating: state.rating, reviews: state.reviews };
        })
        .toEqual({ rating: 4, reviews: 1 });
    },
  );

  test('a digit key rates the card', { tag: ['@REQ-REC-05'] }, async ({ recall }) => {
    // 1. Open /recall, click recall-start, press Space
    await recall.goto();
    await recall.startSession();
    await recall.showAnswer('Space');

    // 2. Press 3
    await recall.rateCard(3, true);
    await expect(recall.bar.nth(0)).toHaveAttribute('data-state', 'warn');
    await expect(recall.progress).toHaveAttribute('data-value', '2');
    await expect(recall.progress).toHaveAttribute('data-total', '10');
  });

  test(
    'a card rated 1 comes back in the same session',
    { tag: ['@REQ-REC-05'] },
    async ({ recall }) => {
      // 1. Open /recall, click recall-start, remember card id A, reveal, rate 1
      await recall.goto();
      await recall.startSession();
      const a = await recall.currentCardId();
      await recall.showAnswer();
      await recall.rateCard(1);
      await expect(recall.progress).toHaveAttribute('data-value', '2');
      await expect(recall.progress).toHaveAttribute('data-total', '11');
      await expect(recall.bar.nth(0)).toHaveAttribute('data-state', 'bad');
      await expect(recall.bar).toHaveCount(11);

      // 2. Rate the next three cards 5: the app puts a card rated 1 back three places later, once
      for (let i = 0; i < 3; i++) {
        await recall.showAnswer();
        await recall.rateCard(5);
      }
      await expect(recall.progress).toHaveAttribute('data-value', '5');
      await expect(recall.card).toHaveAttribute('data-key', a);
      await expect(recall.card).toHaveAttribute('data-state', 'front');
    },
  );

  test(
    'a signed-in rating is saved on the server and survives a reload',
    { tag: ['@REQ-REC-05'] },
    async ({ authedPage, api, user }) => {
      const recall = new RecallPage(authedPage);
      // 1. Open /recall, click recall-start, remember card A, reveal, rate 5
      await recall.goto();
      await recall.startSession();
      const a = await recall.currentCardId();
      await recall.showAnswer();
      await recall.rateCard(5);
      await expect
        .poll(async () =>
          (await api.progress(user.token)).xpLog.some(
            (e) => e.reason === 'recall' && e.refId === a,
          ),
        )
        .toBe(true);

      // 2. Reload the page, open /recall
      await recall.goto();
      // A is reviewed and not due (14 days): it moved from "new" to "later" for this account.
      await expect(recall.pool).toHaveAttribute('data-later', '1');
      await expect(recall.pool).toHaveAttribute('data-due', '0');
    },
  );
});
