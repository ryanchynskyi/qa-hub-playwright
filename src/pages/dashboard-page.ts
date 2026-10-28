import type { Locator, Page } from '@playwright/test';

/** Dashboard, `/dash` (also rendered at the root `/`). */
export class DashboardPage {
  readonly root: Locator;
  readonly title: Locator;
  readonly today: Locator;
  readonly topics: Locator;
  readonly ready: Locator;
  readonly quickstart: Locator;
  readonly topicsLock: Locator;
  /** Blocks a new visitor's short dashboard leaves out until the tour (DASH-020). */
  readonly fullOnly: Locator[];

  constructor(readonly page: Page) {
    this.root = page.getByTestId('dash');
    this.title = page.getByTestId('dash-title');
    this.today = page.getByTestId('today');
    this.topics = page.getByTestId('topics');
    this.ready = page.getByTestId('dash-ready');
    this.quickstart = page.getByTestId('dash-quickstart');
    this.topicsLock = page.getByTestId('topics-lock');
    this.fullOnly = [
      'dash-ready',
      'dash-summary-quiz',
      'dash-summary-recall',
      'dash-leaderboard',
      'dash-chat',
      'today',
      'weak',
    ].map((id) => page.getByTestId(id));
  }

  async goto(): Promise<void> {
    // Relative to baseURL (which ends with '/'): works for any base path, local or prod.
    await this.page.goto('dash');
  }
}
