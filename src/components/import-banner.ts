import type { Locator, Page } from '@playwright/test';

/**
 * Offer to move guest (or legacy) progress into the account, shown on every page right after
 * sign-in while importable data exists. After "Move" the banner goes and `done` reports the
 * outcome (`role=status`); it is local state, so a reload removes it too.
 */
export class ImportBanner {
  readonly banner: Locator;
  readonly move: Locator;
  readonly later: Locator;
  readonly never: Locator;
  readonly error: Locator;
  readonly done: Locator;
  readonly doneMessage: Locator;
  readonly doneClose: Locator;

  constructor(readonly page: Page) {
    this.banner = page.getByTestId('import-banner');
    this.move = page.getByTestId('import-move');
    this.later = page.getByTestId('import-later');
    this.never = page.getByTestId('import-never');
    this.error = page.getByTestId('import-error');
    this.done = page.getByTestId('import-done');
    this.doneMessage = page.getByTestId('import-done-message');
    this.doneClose = page.getByTestId('import-done-close');
  }
}
