import { expect, type Locator, type Page } from '@playwright/test';
import { byTestId, numberValue } from '../helpers/locators';

/**
 * Active Recall, `/recall`: setup (scope, presets, count) → session (one card at a time: front
 * with the question, reveal, back with the answer and three ratings «Не знаю / Частково / Знаю» sent as 1 / 3 / 5) → result. Card order in a
 * session is not fixed, so tests read the card id from `recall-card[data-key]`.
 */
export class RecallPage {
  readonly start: Locator;
  readonly hero: Locator;
  readonly caughtUp: Locator;
  /** «Налаштувати» on the caught-up page: opens the setup for this visit. */
  readonly caughtSetup: Locator;
  readonly know: Locator;
  readonly pool: Locator;
  readonly progress: Locator;
  readonly bar: Locator;
  readonly card: Locator;
  readonly question: Locator;
  readonly reveal: Locator;
  readonly back: Locator;
  readonly answer: Locator;
  readonly rates: Locator;
  readonly finish: Locator;
  readonly done: Locator;
  /** «Детальніше: … →» link of the shown answer (key = chapter id). */
  readonly kbLink: Locator;
  readonly commentsOpen: Locator;

  constructor(readonly page: Page) {
    this.start = page.getByTestId('recall-start');
    this.hero = page.getByTestId('recall-hero');
    this.caughtUp = page.getByTestId('recall-caught-up');
    this.caughtSetup = page.getByTestId('recall-caught-setup');
    this.know = page.getByTestId('recall-know');
    this.pool = page.getByTestId('recall-pool');
    this.progress = page.getByTestId('recall-progress');
    this.bar = page.getByTestId('recall-bar').locator('span');
    this.card = page.getByTestId('recall-card');
    this.question = this.card.getByTestId('recall-front');
    this.reveal = page.getByTestId('recall-reveal');
    this.back = this.card.getByTestId('recall-back');
    this.answer = this.card.getByTestId('recall-answer');
    this.rates = page.getByTestId('recall-rate');
    this.finish = page.getByTestId('recall-finish');
    this.done = page.getByTestId('recall-done');
    this.kbLink = page.getByTestId('recall-kb-link');
    this.commentsOpen = page.getByTestId('comments-open');
  }

  /** A topic row of the setup (wide screens): key = topic id or `all`, `aria-pressed`. */
  topic(topicId: string): Locator {
    return byTestId(this.page, 'recall-topic', topicId);
  }

  rate(rating: number): Locator {
    return byTestId(this.page, 'recall-rate', rating);
  }

  async goto(): Promise<void> {
    await this.page.goto('recall');
    await expect(this.start).toBeVisible();
  }

  /**
   * Starts a session with the default preset (core) and count 10 (the bar draws one segment per
   * card only up to 20 cards); waits for the first card's front. Returns the session size the
   * start button announced (`data-value`).
   */
  async startSession(): Promise<number> {
    await byTestId(this.page, 'recall-count', '10').click();
    const size = await numberValue(this.start);
    await this.start.click();
    await expect(this.card).toHaveAttribute('data-state', 'front');
    return size;
  }

  async currentCardId(): Promise<string> {
    const id = await this.card.getAttribute('data-key');
    if (!id) throw new Error('No recall card on screen');
    return id;
  }

  /** Shows the answer with the button, or with a key when `key` is given. */
  async showAnswer(key?: 'Space' | 'Enter'): Promise<void> {
    await (key ? this.page.keyboard.press(key) : this.reveal.click());
    await expect(this.card).toHaveAttribute('data-state', 'back');
  }

  /**
   * Rates the shown answer with the rating sent (1, 3 or 5): the button, or with `byKey` its key
   * (1, 2, 3 for ratings 1, 3, 5). Waits for the next card, or
   * for the result view after the last one. The first rating 1 of a card puts it back three places
   * later (Recall.tsx `rate()`), so the session goes on; pass `requeued: false` for a second 1.
   */
  async rateCard(rating: number, byKey = false, requeued = rating === 1): Promise<void> {
    const position = await numberValue(this.progress);
    const total = await numberValue(this.progress, 'data-total');
    await (byKey ? this.page.keyboard.press(String((rating + 1) / 2)) : this.rate(rating).click());
    if (position < total || requeued) {
      await expect(this.progress).toHaveAttribute('data-value', String(position + 1));
    } else {
      await expect(this.done).toBeVisible();
    }
  }
}
