import type { Locator, Page } from '@playwright/test';

/** Dashboard, `/dash` (also rendered at the root `/`). */
export class DashboardPage {
  readonly root: Locator;
  readonly title: Locator;
  readonly cta: Locator;
  readonly today: Locator;
  readonly topics: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('dash');
    this.title = page.getByTestId('dash-title');
    this.cta = page.getByTestId('dash-cta');
    this.today = page.getByTestId('today');
    this.topics = page.getByTestId('topics');
  }

  async goto(): Promise<void> {
    // Relative to baseURL (which ends with '/'): works for any base path, local or prod.
    await this.page.goto('dash');
  }
}
