import { expect, type Locator, type Page } from '@playwright/test';
import { AdminBugReports } from '../api/schemas';
import { byTestId } from '../helpers/locators';

/** `/admin`: lists and counters are shared with parallel tests, so tests find their own row. */
export class AdminPage {
  readonly root: Locator;
  readonly bugs: Locator;
  readonly bugsCount: Locator;
  readonly bugError: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('admin');
    this.bugs = page.getByTestId('admin-bug');
    this.bugsCount = page.getByTestId('admin-bugs-count');
    this.bugError = page.getByTestId('admin-bug-error');
  }

  /**
   * Nothing polls the lists and `admin-refresh` covers only stats, so a reload is the deterministic
   * way to get new rows. `root` proves stats only: assert a row before any absence check.
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await expect(this.root).toBeVisible();
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
}
