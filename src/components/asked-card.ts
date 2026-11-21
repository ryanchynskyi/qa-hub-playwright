import type { Locator, Page } from '@playwright/test';
import { byTestId } from '../helpers/locators';

/**
 * «Які питання тобі ставили?» after the result: on the dashboard (`asked-card`, `data-state`
 * `list` / `search` (phone) / `thanks`) and inside the history sheet (`asked-sheet`). Questions
 * are native checkboxes (`data-key` = question id, `data-state` on/off); search is debounced, 2+
 * characters. «Пізніше» hides the card until tomorrow.
 */
export class AskedCard {
  readonly root: Locator;
  readonly options: Locator;
  readonly search: Locator;
  readonly results: Locator;
  readonly none: Locator;
  /** One own question, ≤ 300 characters. */
  readonly text: Locator;
  /** «Зберегти · N»: `data-value` = marks + a non-empty own question. */
  readonly save: Locator;
  readonly later: Locator;
  readonly close: Locator;
  readonly error: Locator;
  readonly thanks: Locator;
  /** `data-value` = marks + own questions saved. */
  readonly thanksCount: Locator;
  /** «Повтори їхні розділи»: `data-key` = section id. */
  readonly sections: Locator;
  readonly sheet: Locator;
  /** Stored own questions (history sheet): `data-value` = count. */
  readonly stored: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('asked-card');
    this.options = page.getByTestId('asked-option');
    this.search = page.getByTestId('asked-search');
    this.results = page.getByTestId('asked-result');
    this.none = page.getByTestId('asked-none');
    this.text = page.getByTestId('asked-text');
    this.save = page.getByTestId('asked-save');
    this.later = page.getByTestId('asked-later');
    this.close = page.getByTestId('asked-close');
    this.error = page.getByTestId('asked-error');
    this.thanks = page.getByTestId('asked-thanks');
    this.thanksCount = page.getByTestId('asked-thanks-count');
    this.sections = page.getByTestId('asked-section');
    this.sheet = page.getByTestId('asked-sheet');
    this.stored = page.getByTestId('asked-stored');
  }

  option = (questionId: string) => byTestId(this.page, 'asked-option', questionId);
  result = (questionId: string) => byTestId(this.page, 'asked-result', questionId);
}
