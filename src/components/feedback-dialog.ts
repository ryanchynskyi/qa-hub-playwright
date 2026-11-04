import { expect, type Locator, type Page } from '@playwright/test';
import { numberValue } from '../helpers/locators';
import type { Shell } from './shell';

/** "Feedback form" dialog, on every page, for guests too. */
export class FeedbackDialog {
  readonly form: Locator;
  readonly text: Locator;
  readonly fileInput: Locator;
  readonly images: Locator;
  readonly submit: Locator;
  readonly thanks: Locator;

  constructor(
    readonly page: Page,
    private readonly shell: Shell,
  ) {
    this.form = page.getByTestId('feedback-form');
    this.text = page.getByTestId('feedback-text');
    this.fileInput = page.getByTestId('feedback-file-input');
    this.images = page.getByTestId('feedback-image');
    this.submit = page.getByTestId('feedback-submit');
    this.thanks = page.getByTestId('feedback-thanks');
  }

  /** A star keeps its rating in `data-value` (no `data-key`); `data-state` is `selected|idle`. */
  star(rating: number): Locator {
    return this.page.locator(`[data-testid="feedback-rating"][data-value="${rating}"]`);
  }

  async open(): Promise<void> {
    await this.shell.open('feedback');
    await expect(this.form).toHaveAttribute('data-state', 'open');
  }

  /** Clicks send, waits for the thanks and returns the number in its `data-value`. */
  async send(): Promise<number> {
    await this.submit.click();
    await expect(this.thanks).toBeVisible();
    return numberValue(this.thanks);
  }
}
