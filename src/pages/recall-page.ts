import { expect, type Locator, type Page } from '@playwright/test';
import { byTestId, numberValue } from '../helpers/locators';

/**
 * Active Recall, `/recall`: setup (scope, presets, count) → session (one card at a time: front
 * with the question, reveal, back with the answer and ratings 1..5) → result. Card order in a
 * session is not fixed, so tests read the card id from `recall-card[data-key]`.
 */
export class RecallPage {
  readonly start: Locator;
  readonly hero: Locator;
  readonly caughtUp: Locator;
  readonly know: Locator;
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

  constructor(readonly page: Page) {
    this.start = page.getByTestId('recall-start');
    this.hero = page.getByTestId('recall-hero');
    this.caughtUp = page.getByTestId('recall-caught-up');
    this.know = page.getByTestId('recall-know');
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
  }

  rate(rating: number): Locator {
    return byTestId(this.page, 'recall-rate', rating);
  }

  async goto(): Promise<void> {
    await this.page.goto('recall');
    await expect(this.start).toBeVisible();
  }

  /** Starts a session with the default scope and count; waits for the first card's front. */
  async startSession(): Promise<void> {
    await this.start.click();
    await expect(this.card).toHaveAttribute('data-state', 'front');
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
   * Rates the shown answer (button, or digit key with `byKey`) and waits for the next card, or
   * for the result view after the last one. Rating 1 puts the card back at the end of the queue,
   * so a session never ends on it.
   */
  async rateCard(rating: number, byKey = false): Promise<void> {
    const position = await numberValue(this.progress);
    const total = await numberValue(this.progress, 'data-total');
    await (byKey ? this.page.keyboard.press(String(rating)) : this.rate(rating).click());
    if (position < total || rating === 1) {
      await expect(this.progress).toHaveAttribute('data-value', String(position + 1));
    } else {
      await expect(this.done).toBeVisible();
    }
  }
}
