import type { Locator, Page } from '@playwright/test';

/** Sheet announcing the owner's reply to feedback; `data-key` is the feedback number. */
export class ReplyOffer {
  readonly sheet: Locator;
  readonly view: Locator;
  readonly later: Locator;

  constructor(page: Page) {
    this.sheet = page.getByTestId('feedback-reply-offer');
    this.view = page.getByTestId('feedback-reply-offer-open');
    this.later = page.getByTestId('feedback-reply-offer-later');
  }
}
