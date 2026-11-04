import { expect, type Locator, type Page } from '@playwright/test';
import { byTestId } from '../helpers/locators';

export type SignInMethod = 'password' | 'google';

/** `/profile`: stats card, account settings (password, sign-in methods) and account deletion. */
export class ProfilePage {
  readonly card: Locator;
  readonly register: Locator;
  readonly currentPassword: Locator;
  readonly newPassword: Locator;
  readonly savePassword: Locator;
  readonly passwordMessage: Locator;
  readonly deleteConfirm: Locator;
  readonly deleteButton: Locator;
  readonly dailyCount: Locator;
  readonly dailyPending: Locator;
  readonly dailyError: Locator;
  readonly feedback: Locator;
  readonly feedbackItems: Locator;
  readonly feedbackEmpty: Locator;

  constructor(readonly page: Page) {
    this.card = page.getByTestId('profile');
    this.register = page.getByTestId('profile-register');
    this.currentPassword = page.getByTestId('profile-password-current');
    this.newPassword = page.getByTestId('profile-password-new');
    this.savePassword = page.getByTestId('profile-password-save');
    this.passwordMessage = page.getByTestId('profile-password-message');
    this.deleteConfirm = page.getByTestId('profile-delete-confirm');
    this.deleteButton = page.getByTestId('profile-delete');
    this.dailyCount = page.getByTestId('profile-daily-count');
    this.dailyPending = page.getByTestId('profile-daily-pending');
    this.dailyError = page.getByTestId('profile-daily-error');
    this.feedback = page.getByTestId('profile-feedback');
    this.feedbackItems = page.getByTestId('profile-feedback-item');
    this.feedbackEmpty = page.getByTestId('profile-feedback-empty');
  }

  /** "Мої відгуки": `data-key` = number, `data-value` = rating, `data-state` = `replied|waiting`. */
  feedbackItem(number: number): Locator {
    return byTestId(this.page, 'profile-feedback-item', number);
  }

  /** The reply block; it also holds a label and a date, so assert the text with toContainText. */
  feedbackReply(number: number): Locator {
    return this.feedbackItem(number).getByTestId('profile-feedback-reply');
  }

  feedbackWaiting(number: number): Locator {
    return this.feedbackItem(number).getByTestId('profile-feedback-waiting');
  }

  /** `data-state` on the method row is `on|off`. */
  method(key: SignInMethod): Locator {
    return byTestId(this.page, 'profile-method', key);
  }

  dailyOption(count: number): Locator {
    return byTestId(this.page, 'profile-daily-option', count);
  }

  /** Saved on click (guests: localStorage; signed in: PUT /me/daily-count). */
  async setDailyCount(count: number): Promise<void> {
    await this.dailyOption(count).click();
    await expect(this.dailyCount).toHaveAttribute('data-value', String(count));
  }

  async goto(): Promise<void> {
    await this.page.goto('profile');
    await expect(this.card).toBeVisible();
  }

  async changePassword(next: string, current: string): Promise<void> {
    await this.currentPassword.fill(current);
    await this.newPassword.fill(next);
    await this.savePassword.click();
  }

  async deleteAccount(email: string): Promise<void> {
    await this.deleteConfirm.fill(email);
    await this.deleteButton.click();
  }
}
