// spec: specs/phase2-courses.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';
import { chapterAt, chapterOf, GUEST_CHAPTERS } from '../../src/helpers/course';
import { numberValue } from '../../src/helpers/locators';

test.describe('CRS-05 Cards', () => {
  test(
    "Cards step hosts Recall's card in the course layout",
    { tag: '@REQ-CRS-05' },
    async ({ courseStep, recall, course, user, signIn }) => {
      const full = chapterOf(course, 'full');
      await signIn(user);

      // 1. Signed-in fresh account; open /course/playwright/<full>/cards
      await courseStep.gotoStep(full.id, 'cards');
      await expect(courseStep.cards).toHaveAttribute('data-key', full.id);
      await expect(courseStep.counter).toHaveAttribute('data-value', '1');
      await expect(courseStep.counter).toHaveAttribute('data-total', String(full.cards.length));
      await expect(recall.card).toHaveAttribute('data-state', 'front');
      expect(full.cards).toContain(await recall.currentCardId());
      await expect(recall.bar).toHaveCount(0);

      // 2. Press Enter (reveals the answer)
      await recall.showAnswer('Enter');
      await expect(recall.answer).toBeVisible();
      await expect(recall.kbLink).toHaveAttribute('data-key', full.id);
      // Recall's own panel shows comments on the back only; the course layout has none
      await expect(recall.commentsOpen).toHaveCount(0);
      await expect(recall.rates).toHaveCount(3);
      // table per rating: the three buttons sent as 1, 3, 5
      for (const rating of [1, 3, 5]) {
        await expect(recall.rate(rating)).toHaveCount(1);
      }
    },
  );

  test(
    'Rating 1 is not requeued, the last rating goes to the result',
    { tag: '@REQ-CRS-05' },
    async ({ courseStep, recall, api, course, user, signIn, page }) => {
      const full = chapterOf(course, 'full');
      const total = String(full.cards.length);
      // 1 first, 5 last, 3 between: per card [rating, counter shown after it]
      const middle = full.cards.slice(1, -1).map((_, i) => [3, String(i + 3)] as const);
      await signIn(user);
      await courseStep.gotoStep(full.id, 'cards');
      await expect(recall.card).toHaveAttribute('data-state', 'front');
      const firstId = await recall.currentCardId();

      // 1. Reveal the first card and rate it 1
      await recall.showAnswer();
      await recall.rate(1).click();
      await expect(courseStep.counter).toHaveAttribute('data-value', '2');
      await expect(courseStep.counter).toHaveAttribute('data-total', total);
      await expect(recall.card).toHaveAttribute('data-state', 'front');
      await expect(recall.card).not.toHaveAttribute('data-key', firstId);

      // 2. Reveal and rate the remaining cards (3 for the middle ones, 5 for the last)
      for (const [rating, shown] of middle) {
        await recall.showAnswer();
        await recall.rate(rating).click();
        await expect(courseStep.counter).toHaveAttribute('data-value', shown);
        await expect(courseStep.counter).toHaveAttribute('data-total', total);
      }
      await recall.showAnswer();
      await recall.rate(5).click();
      await expect(page).toHaveURL(new RegExp(`/${full.id}/result$`));
      await expect(courseStep.resultStep('cards')).toHaveAttribute('data-state', 'done');
      await expect(courseStep.resultStep('cards')).toHaveAttribute('data-value', total);
      await expect(courseStep.resultStep('cards')).toHaveAttribute('data-total', total);

      // 3. Read the course record through the ApiClient
      await expect
        .poll(async () =>
          Object.keys((await api.progress(user.token)).courses.playwright?.cards ?? {}).sort(),
        )
        .toEqual([...full.cards].sort());
    },
  );

  test(
    'Recall sessions keep requeueing a card rated 1',
    { tag: '@REQ-CRS-05' },
    async ({ recall, user, signIn }) => {
      await signIn(user);

      // 1. Open /recall, pick the playwright topic, start; read recall-progress
      await recall.goto();
      await recall.topic('playwright').click();
      await recall.start.click();
      await expect(recall.card).toHaveAttribute('data-state', 'front');
      await expect(recall.progress).toHaveAttribute('data-value', '1');
      const total = await numberValue(recall.progress, 'data-total');

      // 2. Reveal the card and rate 1: the session is one longer, unlike the course
      await recall.showAnswer();
      await recall.rate(1).click();
      await expect(recall.progress).toHaveAttribute('data-value', '2');
      await expect(recall.progress).toHaveAttribute('data-total', String(total + 1));
    },
  );

  test(
    'Guest on a locked chapter gets the guest box instead of cards',
    { tag: '@REQ-CRS-05' },
    async ({ courseStep, recall, course }) => {
      // 1. As a guest open /course/playwright/<first locked chapter>/cards
      await courseStep.gotoStep(chapterAt(course, GUEST_CHAPTERS + 1).id, 'cards');
      await expect(courseStep.guestBox).toBeVisible();
      await expect(courseStep.cards).toHaveCount(0);
      await expect(recall.card).toHaveCount(0);
    },
  );
});
