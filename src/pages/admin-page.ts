import { expect, type Locator, type Page } from '@playwright/test';
import { AdminBugReports } from '../api/schemas';
import { byTestId } from '../helpers/locators';

/**
 * `/admin`, the Інбокс tab: lists and counters are shared with parallel tests, so tests find their
 * own row. A row's body (toggle, reply form, images) exists only while it is expanded: `expand`.
 */
export class AdminPage {
  readonly root: Locator;
  readonly bugs: Locator;
  readonly bugsCount: Locator;
  readonly bugError: Locator;
  /** Guest prompt and its link; `forbidden` is the 403 alert for a signed-in non-admin. */
  readonly signIn: Locator;
  readonly signInLink: Locator;
  readonly forbidden: Locator;
  readonly kpis: Locator;
  /** Inbox counter cards. */
  readonly bugsCard: Locator;
  readonly feedbackCard: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('admin');
    this.bugs = page.getByTestId('admin-bug');
    this.bugsCount = page.getByTestId('admin-bugs-count');
    this.bugError = page.getByTestId('admin-bug-error');
    this.signIn = page.getByTestId('admin-signin');
    this.signInLink = page.getByTestId('admin-signin-link');
    this.forbidden = page.getByTestId('admin-forbidden');
    this.kpis = page.getByTestId('admin-kpis');
    this.bugsCard = page.getByTestId('admin-bugs');
    this.feedbackCard = page.getByTestId('admin-feedback');
  }

  /**
   * Nothing polls the lists, so a fresh load of the inbox is the deterministic way to get new rows.
   * Status `all`: a row marked done leaves the default (`open`) list. `root` proves the page only:
   * assert a row before any absence check.
   */
  async reload(): Promise<void> {
    await this.page.goto('admin?tab=inbox');
    await expect(this.root).toBeVisible();
    await this.page.getByTestId('admin-inbox-status').selectOption('all');
  }

  /** Opens a bug or feedback row; its body ids exist only while it is expanded. */
  async expand(row: Locator): Promise<void> {
    const toggle = row.getByTestId('admin-inbox-toggle');
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }

  /** A KPI tile, key `users-total`, `dau`, …; `data-value` = the raw number. */
  kpi(key: string): Locator {
    return byTestId(this.page, 'admin-kpi', key);
  }

  bug(id: number): Locator {
    return byTestId(this.page, 'admin-bug', id);
  }

  bugToggle(id: number): Locator {
    return this.bug(id).getByTestId('admin-bug-toggle');
  }

  /**
   * Toggles a report and returns the list the page re-fetched and rendered: the counter is
   * database-wide, so this response is its only oracle while other tests write reports.
   */
  async toggleBug(id: number): Promise<AdminBugReports> {
    await this.expand(this.bug(id));
    const listed = this.page.waitForResponse(
      (res) => res.url().endsWith('/admin/bug-reports') && res.request().method() === 'GET',
    );
    await this.bugToggle(id).click();
    return AdminBugReports.parse(await (await listed).json());
  }

  /** An item's `data-key` is a UUID; the number the user sees is on its child. */
  feedbackItem(number: number): Locator {
    const mark = this.page.locator(`[data-testid="admin-feedback-number"][data-value="${number}"]`);
    return this.page.getByTestId('admin-feedback-item').filter({ has: mark });
  }

  /** The reply controls of one feedback item. */
  feedbackReply(number: number) {
    const item = this.feedbackItem(number);
    return {
      block: item.getByTestId('admin-feedback-reply'),
      seen: item.getByTestId('admin-feedback-reply-seen'),
      input: item.getByTestId('admin-feedback-reply-input'),
      save: item.getByTestId('admin-feedback-reply-save'),
      edit: item.getByTestId('admin-feedback-reply-edit'),
      cancel: item.getByTestId('admin-feedback-reply-cancel'),
      none: item.getByTestId('admin-feedback-no-reply'),
    };
  }

  feedbackImages(number: number): Locator {
    return this.feedbackItem(number).getByTestId('admin-feedback-image');
  }

  /** A type chip of the inbox (`all|bug|feedback|comment|asked`), `data-state` active/idle. */
  filter(key: string): Locator {
    return byTestId(this.page, 'admin-inbox-filter', key);
  }

  /**
   * An own question (PLAN-12). Bug and asked ids are both numbers, so the row is also matched by
   * its kind; `body` (`admin-asked`, with `toggle`) exists only while the row is expanded.
   */
  asked(id: number) {
    const row = this.page.locator(
      `[data-testid="admin-inbox-item"][data-key="${id}"][data-value="asked"]`,
    );
    const body = byTestId(this.page, 'admin-asked', id);
    return { row, body, toggle: body.getByTestId('admin-asked-toggle') };
  }
}
