import type { Locator, Page } from '@playwright/test';

/**
 * The fake Google consent screen of the e2e API (`/api/__e2e/google`). It is not part of the app
 * and has no test ids, so this is the one page object that uses role and label locators.
 */
export class FakeGoogle {
  readonly email: Locator;
  readonly name: Locator;
  readonly continue: Locator;
  readonly cancel: Locator;

  constructor(readonly page: Page) {
    this.email = page.getByLabel('Email');
    this.name = page.getByLabel('Name');
    this.continue = page.getByRole('button', { name: 'Continue' });
    this.cancel = page.getByRole('button', { name: 'Cancel' });
  }

  async submit(email: string, name?: string): Promise<void> {
    await this.email.fill(email);
    if (name !== undefined) await this.name.fill(name);
    await this.continue.click();
  }
}
