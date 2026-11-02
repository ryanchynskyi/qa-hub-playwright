import { expect, type Locator, type Page } from '@playwright/test';
import { Leaderboard } from '../api/schemas';
import { byTestId } from '../helpers/locators';

/** `/leaderboard`: the shared board, so tests look at relations and rows they can identify. */
export class LeaderboardPage {
  readonly root: Locator;
  readonly title: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly guestCta: Locator;
  readonly login: Locator;
  readonly register: Locator;
  readonly me: Locator;
  readonly ownRow: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('leaderboard');
    this.title = page.getByTestId('leaderboard-title');
    this.table = page.getByTestId('leaderboard-table');
    this.rows = page.getByTestId('leaderboard-row');
    this.guestCta = page.getByTestId('leaderboard-guest-cta');
    this.login = page.getByTestId('leaderboard-login');
    this.register = page.getByTestId('leaderboard-register');
    this.me = page.getByTestId('leaderboard-me');
    this.ownRow = page.getByTestId('leaderboard-own-row');
  }

  period(key: 'all' | 'week'): Locator {
    return byTestId(this.page, 'leaderboard-period', key);
  }

  row(rank: number): Locator {
    return byTestId(this.page, 'leaderboard-row', rank);
  }

  /**
   * Opens the board and returns the response the page rendered: the only oracle that cannot race
   * with parallel tests changing the shared board between a separate API read and the DOM.
   */
  async goto(): Promise<Leaderboard> {
    const [response] = await Promise.all([
      this.page.waitForResponse((res) => res.url().includes('/leaderboard?')),
      this.page.goto('leaderboard'),
    ]);
    await expect(this.table).toBeVisible();
    return Leaderboard.parse(await response.json());
  }
}
