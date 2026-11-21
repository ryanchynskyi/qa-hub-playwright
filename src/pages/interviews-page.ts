import { expect, type Locator, type Page } from '@playwright/test';
import { byTestId } from '../helpers/locators';

export type InterviewTile = 'past' | 'offer' | 'waiting' | 'failed';

/**
 * `/profile/interviews`: past interviews newest first (`interview-row`: `data-key` = id,
 * `data-value` = date, `data-state` offer/waiting/failed/none). A row opens the sheet
 * `interview-result` (radio rows, `aria-checked`; save is disabled until an answer) with the row
 * «Питання» (`interviews-questions`, `data-value` = marks). The same tiles sit on the profile.
 */
export class InterviewsPage {
  readonly root: Locator;
  readonly rows: Locator;
  readonly empty: Locator;
  readonly sheet: Locator;
  readonly save: Locator;
  readonly error: Locator;
  readonly questions: Locator;
  readonly questionsBack: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('interviews-page');
    this.rows = page.getByTestId('interviews-list').getByTestId('interview-row');
    this.empty = page.getByTestId('interviews-empty');
    this.sheet = page.getByTestId('interview-result');
    this.save = page.getByTestId('interview-result-save');
    this.error = page.getByTestId('interview-result-error');
    this.questions = page.getByTestId('interviews-questions');
    this.questionsBack = page.getByTestId('interviews-questions-back');
  }

  row = (id: string) => byTestId(this.page, 'interview-row', id);
  option = (outcome: 'offer' | 'waiting' | 'failed') =>
    byTestId(this.page, 'interview-result-option', outcome);
  /** `data-value` = the count; on this page and on the profile. */
  tile = (key: InterviewTile) => byTestId(this.page, 'interview-tile', key);

  /** `data-key` (interview id) of every row, in order. */
  async rowKeys(): Promise<string[]> {
    return this.rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-key') ?? ''));
  }

  async goto(): Promise<void> {
    await this.page.goto('profile/interviews');
    await expect(this.root).toBeVisible();
  }
}
