import type { Locator, Page } from '@playwright/test';
import { byTestId } from '../helpers/locators';
import type { InterviewChip } from '../pages/interview-page';

export type AskAnswer = 'offer' | 'waiting' | 'failed' | 'moved';

/**
 * «Як пройшла?» on the dashboard, days 1–7 after the interview: `data-state` `day1` / `late`,
 * `data-value` = the interview date. Answers are native radios (`check()`); «Перенесли» shows the
 * date block (`move`, chips `interview-chip`), a clash opens `interview-replace`. «Пізніше» / ×
 * hide it until tomorrow.
 */
export class AskCard {
  readonly root: Locator;
  readonly title: Locator;
  readonly readiness: Locator;
  /** `data-value` = the picked date. */
  readonly move: Locator;
  readonly save: Locator;
  readonly later: Locator;
  readonly close: Locator;
  readonly error: Locator;
  readonly replace: Locator;
  readonly replaceConfirm: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('ask-card');
    this.title = page.getByTestId('ask-title');
    this.readiness = page.getByTestId('ask-readiness');
    this.move = page.getByTestId('ask-move');
    this.save = page.getByTestId('ask-save');
    this.later = page.getByTestId('ask-later');
    this.close = page.getByTestId('ask-close');
    this.error = page.getByTestId('ask-error');
    this.replace = page.getByTestId('interview-replace');
    this.replaceConfirm = page.getByTestId('interview-replace-confirm');
  }

  option = (answer: AskAnswer) => byTestId(this.page, 'ask-option', answer);
  /** A date chip of the «Перенесли» block. */
  chip = (key: InterviewChip) => byTestId(this.move, 'interview-chip', key);
}
